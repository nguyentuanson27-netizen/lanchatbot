const fs = require('fs');
const path = require('path');

const workflowPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'n8n', '01C_P2_3_Approved_Qdrant_Ingestion.json');
const parsed = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflow = Array.isArray(parsed) ? parsed[0] : parsed;

const node = (name) => {
  const found = workflow.nodes.find((item) => item.name === name);
  if (!found) throw new Error(`Missing node: ${name}`);
  return found;
};

const replaceOnce = (source, before, after, label) => {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Patch target missing: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Patch target ambiguous: ${label}`);
  return source.slice(0, index) + after + source.slice(index + before.length);
};

node('Build Cutout Base64').parameters.jsCode = [
  "const before = $('Build Raw Base64').item.json;",
  "const { raw_base64, ...job } = before;",
  "const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');",
  "return [{ json: { ...job, cutout_base64: buffer.toString('base64') } }];",
].join('\n');

node('Clamp Vertex Text').parameters.jsCode = [
  "const { cutout_base64, ...job } = $json;",
  "const source=String(job.contextual_text || '').normalize('NFC');",
  'const parts=[];',
  'let bytes=0;',
  'for (const char of source) {',
  "  const size=Buffer.byteLength(char,'utf8');",
  '  if (bytes + size > 900) break;',
  '  parts.push(char);',
  '  bytes += size;',
  '}',
  "return {json:{...job,contextual_text:parts.join(''),contextual_text_bytes:bytes}};",
].join('\n');

node('Vertex Raw and Text').parameters.jsonBody =
  "={{ JSON.stringify({ instances: [{ image: { bytesBase64Encoded: $('Build Raw Base64').item.json.raw_base64 }, text: $json.contextual_text }], parameters: { dimension: 1408 } }) }}";

node('Extract Raw Vectors').parameters.jsCode = [
  "const source = $('Clamp Vertex Text').item.json;",
  'const prediction = $json.predictions?.[0] || {};',
  "if (!Array.isArray(prediction.imageEmbedding) || prediction.imageEmbedding.length !== 1408) throw new Error('invalid_raw_image_embedding');",
  "if (!Array.isArray(prediction.textEmbedding) || prediction.textEmbedding.length !== 1408) throw new Error('invalid_product_text_embedding');",
  'return [{ json: { ...source, vector_image_raw: prediction.imageEmbedding, vector_product_text: prediction.textEmbedding } }];',
].join('\n');

node('Vertex Cutout').parameters.jsonBody =
  "={{ JSON.stringify({ instances: [{ image: { bytesBase64Encoded: $('Build Cutout Base64').item.json.cutout_base64 } }], parameters: { dimension: 1408 } }) }}";

let qdrantCode = node('Build Qdrant Point').parameters.jsCode;
qdrantCode = replaceOnce(
  qdrantCode,
  'const { cutout_base64, vector_image_raw, vector_product_text, ...job } = source;',
  'const { vector_image_raw, vector_product_text, ...job } = source;',
  'remove obsolete base64 destructuring',
);
node('Build Qdrant Point').parameters.jsCode = qdrantCode;

const qdrantConnection = workflow.connections['Build Qdrant Point'];
if (!qdrantConnection?.main?.[0]?.[0]) throw new Error('Build Qdrant Point success connection missing');
qdrantConnection.main[0][0].node = 'Upsert Qdrant Point';
workflow.nodes = workflow.nodes.filter((item) => item.name !== 'Finalize Approved Qdrant Point');
delete workflow.connections['Finalize Approved Qdrant Point'];

const note = node('README - Approved Qdrant Publisher');
note.parameters.content = String(note.parameters.content || '') + [
  '',
  '### Memory/CPU optimization 2026-07-21',
  '- Raw Base64 exists only in Build Raw Base64; Vertex references that node directly.',
  '- Cutout Base64 exists only in Build Cutout Base64; Vertex references that node directly.',
  '- Clamp/rate/vector intermediate nodes no longer carry Base64.',
  '- Redundant Finalize vector-copy node removed.',
  '- CLI shard logs keep stderr only; backlog defaults to 2 shards, daily remains 1 × 50.',
].join('\n');

workflow.active = false;
workflow.settings = {
  ...(workflow.settings || {}),
  saveDataSuccessExecution: 'none',
  saveDataErrorExecution: 'all',
  saveManualExecutions: true,
  binaryMode: 'separate',
};

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  workflow: workflow.name,
  active: workflow.active,
  nodes: workflow.nodes.length,
  rawReference: node('Vertex Raw and Text').parameters.jsonBody,
  cutoutReference: node('Vertex Cutout').parameters.jsonBody,
  qdrantSuccessTarget: workflow.connections['Build Qdrant Point'].main[0][0].node,
}, null, 2));

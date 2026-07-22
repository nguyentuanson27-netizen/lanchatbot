const fs = require('fs');
const path = require('path');

const workflowPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'n8n', '01C_P2_3_Approved_Qdrant_Ingestion.json');
const parsedWorkflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const workflow = Array.isArray(parsedWorkflow) ? parsedWorkflow[0] : parsedWorkflow;

const node = (name) => {
  const value = workflow.nodes.find((item) => item.name === name);
  if (!value) throw new Error(`Missing workflow node: ${name}`);
  return value;
};

const replaceOnce = (source, before, after, label) => {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Patch target not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Patch target is ambiguous: ${label}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
};

let registryCode = node('Build Registry Map').parameters.jsCode;
registryCode = replaceOnce(
  registryCode,
  "const registry = {};\nconst errors = [];",
  "const registry = {};\nconst errors = [];\nconst duplicateCodes = new Set();",
  'registry duplicate set',
);
registryCode = replaceOnce(
  registryCode,
  "  if (registry[maSp]) errors.push('DUPLICATE_MA_SP:' + maSp);\n  registry[maSp] = {",
  "  if (registry[maSp]) {\n    errors.push('DUPLICATE_MA_SP:' + maSp);\n    duplicateCodes.add(maSp);\n    continue;\n  }\n  registry[maSp] = {",
  'registry duplicate handling',
);
registryCode = replaceOnce(
  registryCode,
  "    material_override: String(r.MATERIAL_OVERRIDE || '').trim(),\n    description_override: String(r.DESCRIPTION_OVERRIDE || '').trim(),",
  "    title_override: String(r.TITLE_OVERRIDE || '').trim(),\n    material_override: String(r.MATERIAL_OVERRIDE || '').trim(),\n    description_override: String(r.DESCRIPTION_OVERRIDE || '').trim(),",
  'registry title override',
);
registryCode = replaceOnce(
  registryCode,
  "}\nreturn [{ json: { registry, registry_count: Object.keys(registry).length, registry_errors: errors } }];",
  "}\nfor (const maSp of duplicateCodes) delete registry[maSp];\nreturn [{ json: { registry, registry_count: Object.keys(registry).length, registry_errors: [...new Set(errors)].sort(), duplicate_count: duplicateCodes.size } }];",
  'registry duplicate removal',
);
node('Build Registry Map').parameters.jsCode = registryCode;

let profileCode = node('Build XML Profiles').parameters.jsCode;
profileCode = replaceOnce(
  profileCode,
  "const EXTRACTION_VERSION = '2.0.0-structured-vi';",
  "const EXTRACTION_VERSION = '2.1.0-canonical-parent';",
  'profile extraction version',
);
profileCode = replaceOnce(
  profileCode,
  "const merge = (...sets) => unique(sets.flat());",
  "const compareStable = (a, b) => String(a).localeCompare(String(b), 'vi', { sensitivity: 'base', numeric: true }) || String(a).localeCompare(String(b));\nconst uniqueSorted = (values) => unique(values).sort(compareStable);\nconst merge = (...sets) => uniqueSorted(sets.flat());",
  'stable set helpers',
);
profileCode = replaceOnce(
  profileCode,
  "  return query.length ? base + '?' + query.join('&') : base;\n};\n\nconst root = input;",
  `  return query.length ? base + '?' + query.join('&') : base;
};
const normalizedValue = (value) => unicodeText(value).replace(/\\s+/g, ' ').trim();
const stableMode = (values, preferLongest = false) => {
  const counts = new Map();
  for (const raw of values || []) {
    const value = normalizedValue(raw);
    if (!value) continue;
    const key = lowerVi(value);
    const current = counts.get(key) || { count: 0, values: [] };
    current.count += 1;
    current.values.push(value);
    counts.set(key, current);
  }
  const ranked = [...counts.values()].map(entry => ({
    count: entry.count,
    value: [...new Set(entry.values)].sort(compareStable)[0]
  })).sort((a, b) => b.count - a.count || (preferLongest ? b.value.length - a.value.length : 0) || compareStable(a.value, b.value));
  return ranked[0]?.value || '';
};
const cleanParentTitle = (raw) => {
  let value = normalizedValue(raw);
  const sections = value.split(/\\s+[-–—]\\s+/).map(part => part.trim()).filter(Boolean);
  if (sections.length > 1 && sections[0].length >= 3) value = sections[0];
  value = value
    .replace(/\\s*[\\/|-]\\s*(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|\\d{2,3})(?:\\s*[\\/|-]\\s*[^\\/|-]+)?\\s*$/iu, '')
    .replace(/\\s+/g, ' ')
    .trim();
  return value;
};
const itemStableId = (item) => normalizedValue(text(item['g:id'] ?? item.id)) || [
  normalizedValue(text(item['g:title'] ?? item.title)),
  normalizedValue(text(item['g:link'] ?? item.link)),
  normalizedValue(text(item['g:image_link'] ?? item.image_link))
].join('|');
const canonicalForSourceHash = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const items = value.map(canonicalForSourceHash).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return items.filter((item, index) => index === 0 || JSON.stringify(item) !== JSON.stringify(items[index - 1]));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalForSourceHash(value[key])]));
  }
  if (typeof value === 'string') return normalizedValue(value);
  return value;
};

const root = input;`,
  'canonical profile helpers',
);
profileCode = replaceOnce(
  profileCode,
  "  const group = groups.get(groupId);\n  const first = group.items[0] || {};\n  const rawTitle = text(first['g:title'] ?? first.title);\n  const title = rawTitle.replace(/\\s+-\\s+(S|M|L|XL|XXL)$/i, '').trim();\n  const descriptionXml = unicodeText(text(first['g:description'] ?? first.description));\n  const link = text(first['g:link'] ?? first.link);\n  const brandXml = text(first['g:brand'] ?? first.brand);\n  const searchable = ascii([title, descriptionXml, ...group.attrs.map(attr => attr.value)].join(' '));",
  `  const group = groups.get(groupId);
  const items = [...group.items].sort((a, b) => compareStable(itemStableId(a), itemStableId(b)));
  const rawTitles = items.map(item => normalizedValue(text(item['g:title'] ?? item.title))).filter(Boolean);
  const parentTitles = rawTitles.map(cleanParentTitle).filter(Boolean);
  const title = normalizedValue(reg.title_override) || stableMode(parentTitles) || groupId;
  const descriptions = items.map(item => unicodeText(text(item['g:description'] ?? item.description))).filter(Boolean);
  const descriptionXml = normalizedValue(reg.description_override) || stableMode(descriptions, true);
  const links = items.map(item => text(item['g:link'] ?? item.link)).filter(Boolean).map(value => {
    try { return normalizeUrl(value); } catch (_) { return ''; }
  }).filter(Boolean);
  const link = stableMode(links);
  const brandXml = stableMode(items.map(item => text(item['g:brand'] ?? item.brand)).filter(Boolean));
  const sortedAttrs = [...group.attrs].sort((a, b) => compareStable(ascii(a.label) + '|' + lowerVi(a.value), ascii(b.label) + '|' + lowerVi(b.value)));
  const searchable = ascii([title, ...parentTitles, descriptionXml, ...sortedAttrs.map(attr => attr.value)].join(' '));`,
  'replace first item profile',
);
profileCode = replaceOnce(
  profileCode,
  "  const colorResult = parseColors(descriptionXml, group.attrs, title, reg.color_override);",
  "  const colorResult = parseColors(descriptionXml, sortedAttrs, title, reg.color_override);",
  'stable color attrs',
);
profileCode = replaceOnce(
  profileCode,
  "  const aliases = merge(reg.aliases, [title, groupId]);",
  "  const aliases = merge(reg.aliases, parentTitles, [title, groupId]);",
  'aggregate aliases',
);
profileCode = replaceOnce(
  profileCode,
  "  const primaryImages = new Set([...group.primaryImages].map(raw => { try { return normalizeUrl(raw); } catch (_) { return ''; } }).filter(Boolean));\n  const sizes = unique(group.attrs.filter(attr => ascii(attr.label).trim() === 'size').map(attr => attr.value));\n  const classifications = unique(group.attrs.filter(attr => ascii(attr.label).includes('phan loai')).map(attr => attr.value));",
  "  const primaryImages = [...new Set([...group.primaryImages].map(raw => { try { return normalizeUrl(raw); } catch (_) { return ''; } }).filter(Boolean))].sort(compareStable);\n  const sizes = uniqueSorted(sortedAttrs.filter(attr => ascii(attr.label).trim() === 'size').map(attr => attr.value));\n  const classifications = uniqueSorted(sortedAttrs.filter(attr => ascii(attr.label).includes('phan loai')).map(attr => attr.value));",
  'stable profile arrays',
);
profileCode = replaceOnce(
  profileCode,
  "  const sourceHash = crypto.createHash('sha256').update(JSON.stringify({\n    extraction_version: EXTRACTION_VERSION, groupId, title, descriptionXml, link, images,\n    color_primary: colorResult.primary, color_detail: colorResult.detail,\n    material_components: materialResult.components, styles: styleResult.styles\n  })).digest('hex');",
  "  const sourceHashInput = canonicalForSourceHash({\n    extraction_version: EXTRACTION_VERSION, groupId, title, descriptionXml, link, images, primaryImages, sizes, classifications, aliases,\n    color_primary: colorResult.primary, color_detail: colorResult.detail,\n    material_components: materialResult.components, styles: styleResult.styles\n  });\n  const sourceHash = crypto.createHash('sha256').update(JSON.stringify(sourceHashInput)).digest('hex');",
  'canonical source hash',
);
profileCode = replaceOnce(
  profileCode,
  "    product_link: link, brand_xml: brandXml, images, primary_images: [...primaryImages], sizes, classifications,",
  "    product_link: link, brand_xml: brandXml, images, primary_images: primaryImages, sizes, classifications,",
  'stable primary images output',
);
node('Build XML Profiles').parameters.jsCode = profileCode;

let jobsCode = node('Build Approved Qdrant Jobs').parameters.jsCode;
jobsCode = replaceOnce(
  jobsCode,
  "  const normalizedImageUrl = String(row.NORMALIZED_IMAGE_URL || '').trim() || normalizeUrl(imageUrl);",
  "  const normalizedImageUrl = normalizeUrl(String(row.NORMALIZED_IMAGE_URL || '').trim() || imageUrl);",
  'normalize supplied image URL',
);
node('Build Approved Qdrant Jobs').parameters.jsCode = jobsCode;

let summaryCode = node('Build Run Summary').parameters.jsCode;
summaryCode = replaceOnce(
  summaryCode,
  "const errors=failures.slice(0,10).map(row => [row.ma_sp,row.image_url,row.error].filter(Boolean).join(' | '));\nreturn [{json:{RUN_ID:run.run_id,STARTED_AT:run.started_at,FINISHED_AT:now,TOTAL:rows.length,SUCCESS:progress.success,SKIPPED:progress.skipped,DELETED:progress.deleted,FAILED:progress.failed,LOCK_RELEASED:lockReleased,ERROR_SAMPLE:(['APPROVED_QDRANT','PENDING=' + progress.pending_before,'SELECTED=' + progress.selected,'REMAINING=' + progress.remaining,'HELD=' + progress.held_row_count,'RETRYABLE=' + progress.retryable_failed,'FATAL=' + progress.fatal_failed,...errors].join(' | ')).slice(0,45000)}}];",
  "const errors=failures.slice(0,10).map(row => [row.ma_sp,row.image_url,row.error].filter(Boolean).join(' | '));\nlet registryErrors=[]; try { registryErrors=$('Build Registry Map').first().json.registry_errors || []; } catch (_) {}\nconst registrySummary=registryErrors.length ? ['REGISTRY_ERRORS=' + registryErrors.length,...registryErrors.slice(0,10)] : [];\nreturn [{json:{RUN_ID:run.run_id,STARTED_AT:run.started_at,FINISHED_AT:now,TOTAL:rows.length,SUCCESS:progress.success,SKIPPED:progress.skipped,DELETED:progress.deleted,FAILED:progress.failed,LOCK_RELEASED:lockReleased,ERROR_SAMPLE:(['APPROVED_QDRANT','PENDING=' + progress.pending_before,'SELECTED=' + progress.selected,'REMAINING=' + progress.remaining,'HELD=' + progress.held_row_count,'RETRYABLE=' + progress.retryable_failed,'FATAL=' + progress.fatal_failed,...registrySummary,...errors].join(' | ')).slice(0,45000)}}];",
  'registry errors in summary',
);
node('Build Run Summary').parameters.jsCode = summaryCode;

node('Schedule Approved Publisher Daily').parameters = {
  rule: {
    interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 1 }],
  },
};

workflow.active = false;
workflow.settings = {
  ...(workflow.settings || {}),
  timezone: 'Asia/Ho_Chi_Minh',
};

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  workflow: workflow.name,
  active: workflow.active,
  extractionVersion: '2.1.0-canonical-parent',
  schedule: node('Schedule Approved Publisher Daily').parameters.rule.interval[0],
}, null, 2));

const fs = require('fs');

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('input and output paths are required');
const document = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const credential = Array.isArray(document) ? document[0] : document;
const data = credential?.data;
if (
  credential?.type !== 'googleApi' ||
  !data ||
  typeof data.email !== 'string' ||
  typeof data.privateKey !== 'string' ||
  typeof data.region !== 'string'
) {
  throw new Error('unexpected Vertex credential structure');
}
fs.writeFileSync(outputPath, JSON.stringify({
  email: data.email,
  privateKey: data.privateKey,
  region: data.region,
}), { mode: 0o600 });


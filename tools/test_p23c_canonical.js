const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function main() {
const workflowPath = path.resolve(__dirname, '..', 'n8n', '01C_P2_3_Approved_Qdrant_Ingestion.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const codeOf = (name) => {
  const node = workflow.nodes.find((item) => item.name === name);
  assert(node, `Missing node ${name}`);
  return node.parameters.jsCode;
};

const runCode = async (code, inputItems, lookup = {}) => {
  const input = {
    first: () => inputItems[0],
    all: () => inputItems,
  };
  const select = (name) => ({
    first: () => ({ json: lookup[name] || {} }),
  });
  return new AsyncFunction('$input', '$', 'require', code)(input, select, require);
};

const shuffle = (values) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const variants = [
  {
    'g:id': 'SD438-FULL-L',
    'g:item_group_id': 'SD438',
    'g:title': 'Áo dài Trân Sắc - Full set(ad + quần) / L',
    'g:description': 'Thiết kế thanh lịch. Chất liệu: áo dài tơ kính; quần lụa.',
    'g:link': 'https://www.lanadesign.vn/products/sd438?utm_source=facebook&color=cream',
    'g:brand': 'La.na Design',
    'g:image_link': 'https://cdn.example.com/sd438-b.jpg?utm_source=feed',
    additional_image_link: ['https://cdn.example.com/sd438-detail.jpg?gclid=123'],
    additional_variant_attribute: [
      { label: 'Size', value: 'L' },
      { label: 'Phân loại', value: 'Full set' },
      { label: 'Màu', value: 'Kem' },
    ],
  },
  {
    'g:id': 'SD438-AO-M',
    'g:item_group_id': 'SD438',
    'g:title': 'Áo dài Trân Sắc - Áo dài lẻ+choàng / M',
    'g:description': 'Thiết kế thanh lịch. Chất liệu: áo dài tơ kính; quần lụa.',
    'g:link': 'https://www.lanadesign.vn/products/sd438?color=cream&utm_medium=cpc',
    'g:brand': 'La.na Design',
    'g:image_link': 'https://cdn.example.com/sd438-a.jpg',
    additional_image_link: ['https://cdn.example.com/sd438-detail.jpg'],
    additional_variant_attribute: [
      { label: 'Size', value: 'M' },
      { label: 'Phân loại', value: 'Áo dài lẻ+choàng' },
      { label: 'Màu', value: 'Kem' },
    ],
  },
  {
    'g:id': 'SD438-AO-S',
    'g:item_group_id': 'SD438',
    'g:title': 'Áo dài Trân Sắc - Áo dài lẻ+choàng / S',
    'g:description': 'Thiết kế thanh lịch. Chất liệu: áo dài tơ kính; quần lụa.',
    'g:link': 'https://www.lanadesign.vn/products/sd438?color=cream',
    'g:brand': 'La.na Design',
    'g:image_link': 'https://cdn.example.com/sd438-a.jpg',
    additional_image_link: [],
    additional_variant_attribute: [
      { label: 'Size', value: 'S' },
      { label: 'Phân loại', value: 'Áo dài lẻ+choàng' },
      { label: 'Màu', value: 'Kem' },
    ],
  },
];

const registry = {
  SD438: {
    ma_sp: 'SD438',
    xml_group_id: 'SD438',
    shop_alias: 'LANA',
    brand: 'lanadesign',
    rule_type: '',
    category: 'AO_DAI',
    title_override: '',
    material_override: '',
    description_override: '',
    color_override: [],
    style_override: [],
    material_components_override: '',
    aliases: ['TRÂN SẮC'],
    search_silhouettes: [],
    search_occasions: [],
    source_hash: '',
    xml_updated_at: '',
  },
};

const profileCode = codeOf('Build XML Profiles');
let expected;
for (let attempt = 0; attempt < 100; attempt += 1) {
  const root = {
    registry,
    rss: { channel: { item: shuffle(variants).map((item) => ({
      ...item,
      additional_variant_attribute: shuffle(item.additional_variant_attribute),
      additional_image_link: shuffle(item.additional_image_link),
    })) } },
  };
  const result = await runCode(profileCode, [{ json: root }], {
    'Acquire Ingestion Lock': { run_id: 'test', started_at: '2026-07-20T00:00:00.000Z' },
  });
  const profile = result[0].json.profiles[0];
  assert.strictEqual(profile.title, 'Áo dài Trân Sắc');
  assert.deepStrictEqual(profile.sizes, ['L', 'M', 'S']);
  assert.deepStrictEqual(profile.images, [...profile.images].sort());
  assert.deepStrictEqual(profile.primary_images, [...profile.primary_images].sort());
  const stable = {
    title: profile.title,
    description_xml: profile.description_xml,
    product_link: profile.product_link,
    brand_xml: profile.brand_xml,
    images: profile.images,
    primary_images: profile.primary_images,
    sizes: profile.sizes,
    classifications: profile.classifications,
    aliases: profile.aliases,
    source_hash: profile.source_hash,
  };
  if (!expected) expected = stable;
  else assert.deepStrictEqual(stable, expected, `Canonical profile changed on shuffle ${attempt}`);
}

const registryCode = codeOf('Build Registry Map');
const duplicateResult = await runCode(registryCode, [
  { json: { MA_SP: 'SQ752', ACTIVE: true } },
  { json: { MA_SP: 'SQ752', ACTIVE: true } },
  { json: { MA_SP: 'SD438', ACTIVE: true } },
]);
assert.strictEqual(duplicateResult[0].json.duplicate_count, 1);
assert(!duplicateResult[0].json.registry.SQ752, 'Duplicate MA_SP must be excluded');
assert(duplicateResult[0].json.registry.SD438, 'Unique MA_SP must remain');
assert.deepStrictEqual(duplicateResult[0].json.registry_errors, ['DUPLICATE_MA_SP:SQ752']);

const schedule = workflow.nodes.find((item) => item.name === 'Schedule Approved Publisher Daily').parameters;
assert.deepStrictEqual(schedule.rule.interval[0], { field: 'days', daysInterval: 1, triggerAtHour: 1 });
assert.strictEqual(workflow.active, false);

console.log(JSON.stringify({
  shuffledRuns: 100,
  canonicalTitle: expected.title,
  canonicalSourceHash: expected.source_hash,
  duplicateGuard: 'PASS',
  schedule: 'daily 01:00 Asia/Ho_Chi_Minh',
  active: workflow.active,
}, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function main() {
  const workflowPath = path.resolve(__dirname, '..', 'n8n', '01C_P2_3_Approved_Qdrant_Ingestion.json');
  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
  const profileNode = workflow.nodes.find((node) => node.name === 'Build XML Profiles');
  assert(profileNode, 'Build XML Profiles node missing');
  const jobsNode = workflow.nodes.find((node) => node.name === 'Build Approved Qdrant Jobs');
  assert(jobsNode, 'Build Approved Qdrant Jobs node missing');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  const fixtures = process.argv.slice(2).map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
  assert(fixtures.length >= 2, 'At least two XML fixtures are required');

  const allCodes = new Set();
  for (const fixture of fixtures) {
    for (const item of fixture.rss.channel.item || []) {
      const code = String(item['g:item_group_id'] || '').trim().toUpperCase();
      if (code) allCodes.add(code);
    }
  }
  const registry = Object.fromEntries([...allCodes].map((code) => [code, {
    ma_sp: code,
    xml_group_id: code,
    shop_alias: 'LANA',
    brand: 'lanadesign',
    rule_type: '',
    category: '',
    title_override: '',
    material_override: '',
    description_override: '',
    color_override: [],
    style_override: [],
    material_components_override: '',
    aliases: [],
    search_silhouettes: [],
    search_occasions: [],
    source_hash: '',
    xml_updated_at: '',
  }]));

  const evaluate = async (fixture) => {
    const input = { first: () => ({ json: { ...fixture, registry } }) };
    const select = () => ({ first: () => ({ json: { run_id: 'live-fixture-test' } }) });
    const result = await new AsyncFunction('$input', '$', 'require', profileNode.parameters.jsCode)(input, select, require);
    return result[0].json.profiles;
  };

  const stableProfile = (profile) => ({
    group_id: profile.group_id,
    title: profile.title,
    description_xml: profile.description_xml,
    material_xml: profile.material_xml,
    material_components: profile.material_components,
    color_primary: profile.color_primary,
    color_detail: profile.color_detail,
    style_primary: profile.style_primary,
    style_secondary: profile.style_secondary,
    product_link: profile.product_link,
    brand_xml: profile.brand_xml,
    images: profile.images,
    primary_images: profile.primary_images,
    sizes: profile.sizes,
    classifications: profile.classifications,
    aliases: profile.aliases,
    source_hash: profile.source_hash,
  });

  const runs = [];
  const profileRuns = [];
  for (const fixture of fixtures) {
    const profiles = await evaluate(fixture);
    profileRuns.push(profiles);
    runs.push(new Map(profiles.map((profile) => [profile.group_id, stableProfile(profile)])));
  }

  const baseline = runs[0];
  const changes = [];
  for (let index = 1; index < runs.length; index += 1) {
    for (const [code, expected] of baseline) {
      const actual = runs[index].get(code);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) changes.push({ fixture: index + 1, code });
    }
  }
  assert.deepStrictEqual(changes, [], `Canonical output changed between live XML downloads: ${JSON.stringify(changes.slice(0, 20))}`);

  const evaluateJobs = async (profiles) => {
    let rowNumber = 2;
    const imageRegistryRows = profiles.flatMap((profile) => profile.images.map((image) => ({
      MA_SP: profile.reg.ma_sp,
      IMAGE_URL: image,
      NORMALIZED_IMAGE_URL: image,
      REVIEW_STATUS: 'APPROVED',
      ACTIVE: true,
      VERIFIED: true,
      ROW_NUMBER: rowNumber++,
    })));
    const input = { first: () => ({ json: { profiles, image_registry_rows: imageRegistryRows } }) };
    const select = () => ({ first: () => ({ json: { run_id: 'content-hash-test', shard_count: 1, shard_index: 0, shard_label: '1/1' } }) });
    const output = await new AsyncFunction('$input', '$', 'require', jobsNode.parameters.jsCode)(input, select, require);
    return new Map(output.map((item) => [item.json.point_id, item.json.source_hash]));
  };

  const jobRuns = [];
  for (const profiles of profileRuns) jobRuns.push(await evaluateJobs(profiles));
  const baselineJobs = jobRuns[0];
  const changedPointHashes = [];
  for (let index = 1; index < jobRuns.length; index += 1) {
    assert.strictEqual(jobRuns[index].size, baselineJobs.size, `Point count changed in fixture ${index + 1}`);
    for (const [pointId, expectedHash] of baselineJobs) {
      if (jobRuns[index].get(pointId) !== expectedHash) changedPointHashes.push({ fixture: index + 1, pointId });
    }
  }
  assert.deepStrictEqual(changedPointHashes, [], `Qdrant content_hash changed between fixtures: ${JSON.stringify(changedPointHashes.slice(0, 20))}`);

  const targetCodes = ['SD009', 'SD016', 'SD023', 'SD438'];
  const samples = Object.fromEntries(targetCodes.filter((code) => baseline.has(code)).map((code) => [code, {
    title: baseline.get(code).title,
    source_hash: baseline.get(code).source_hash,
    image_count: baseline.get(code).images.length,
  }]));

  console.log(JSON.stringify({
    fixtures: fixtures.length,
    groups: baseline.size,
    changedCanonicalProfiles: changes.length,
    qdrantPointsChecked: baselineJobs.size,
    changedPointHashes: changedPointHashes.length,
    samples,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

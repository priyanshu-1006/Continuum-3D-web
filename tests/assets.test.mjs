import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'lib/asset-manifest.json'), 'utf8'));

function publicFile(uri) {
  assert.ok(/^\/(?:assets|continuum\/(?:layers|events|chrome|destinations|people))\//.test(uri), `Unexpected public asset URI: ${uri}`);
  const filename = path.resolve(publicRoot, `.${uri}`);
  assert.ok(filename.startsWith(publicRoot + path.sep), `Asset URI escapes public: ${uri}`);
  return filename;
}

function glbDocument(buffer, uri) {
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF', `${uri}: GLB magic`);
  assert.equal(buffer.readUInt32LE(4), 2, `${uri}: GLB version`);
  assert.equal(buffer.readUInt32LE(8), buffer.length, `${uri}: GLB total length`);
  assert.equal(buffer.toString('ascii', 16, 20), 'JSON', `${uri}: first chunk type`);
  const jsonLength = buffer.readUInt32LE(12);
  assert.ok(20 + jsonLength <= buffer.length, `${uri}: JSON chunk is in bounds`);
  return JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).trim());
}

test('bundled public assets match recorded sizes and SHA-256 digests', async () => {
  const uniquePaths = new Set();
  assert.ok(manifest.assets.length > 0, 'The asset manifest must not be empty');
  for (const asset of manifest.assets) {
    assert.ok(!uniquePaths.has(asset.path), `Duplicate asset URI: ${asset.path}`);
    uniquePaths.add(asset.path);
    const contents = await fs.readFile(publicFile(asset.path));
    assert.equal(contents.length, asset.bytes, `${asset.path}: byte length`);
    assert.equal(createHash('sha256').update(contents).digest('hex'), asset.sha256, `${asset.path}: SHA-256`);
  }
});

test('castle gzip transport expands to the exact standalone GLB', async () => {
  const [compressed, model] = await Promise.all([
    fs.readFile(publicFile('/assets/models/castle.glb.gz')),
    fs.readFile(publicFile('/assets/models/castle.glb')),
  ]);
  assert.deepEqual(gunzipSync(compressed), model);
  const document = glbDocument(model, '/assets/models/castle.glb');
  assert.ok(document.extensionsRequired?.includes('EXT_meshopt_compression'), 'The compressed castle must declare Meshopt as required');
  assert.ok(document.extensionsRequired?.includes('KHR_mesh_quantization'), 'The quantized castle must declare its required extension');
});

test('all shipped GLBs embed their dependencies', async () => {
  for (const asset of manifest.assets.filter((item) => item.path.endsWith('.glb'))) {
    const document = glbDocument(await fs.readFile(publicFile(asset.path)), asset.path);
    for (const buffer of document.buffers ?? []) {
      assert.ok(!buffer.uri || buffer.uri.startsWith('data:'), `${asset.path}: external buffer ${buffer.uri}`);
    }
    for (const image of document.images ?? []) {
      assert.ok(image.bufferView !== undefined || image.uri?.startsWith('data:'), `${asset.path}: external image ${image.uri}`);
    }
  }
});

test('local variable fonts retain their Open Font License files', async () => {
  for (const font of ['fraunces', 'dm-sans']) {
    const [contents, license] = await Promise.all([
      fs.readFile(publicFile(`/assets/fonts/${font}.ttf`)),
      fs.readFile(publicFile(`/assets/fonts/${font}-OFL.txt`), 'utf8'),
    ]);
    assert.equal(contents.readUInt32BE(0), 0x00010000, `${font}: TrueType signature`);
    assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(license, /Copyright/);
  }
});

async function sourceFiles(directory) {
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const results = [];
  for (const entry of entries) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await sourceFiles(filename));
    else if (/\.(?:css|js|jsx|mjs|ts|tsx)$/.test(entry.name)) results.push(filename);
  }
  return results;
}

test('literal public asset URLs referenced by the app resolve locally', async () => {
  const files = (await Promise.all(['app', 'components', 'lib'].map((directory) => sourceFiles(path.join(root, directory))))).flat();
  const checked = new Set();
  for (const filename of files) {
    const contents = await fs.readFile(filename, 'utf8');
    for (const match of contents.matchAll(/["'`](\/(?:assets|continuum\/(?:layers|events|chrome|destinations|people))\/[^"'`\s]*)["'`]/g)) {
      if (match[1].includes('${')) continue;
      const uri = match[1].split(/[?#]/, 1)[0];
      if (checked.has(uri)) continue;
      checked.add(uri);
      await assert.doesNotReject(fs.access(publicFile(uri)), `${path.relative(root, filename)} references missing ${uri}`);
    }
  }
  assert.ok(checked.size > 0, 'No public asset references were checked');
});

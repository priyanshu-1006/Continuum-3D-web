import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFlag = process.argv.indexOf('--source');
if (sourceFlag !== -1 && !process.argv[sourceFlag + 1]) {
  throw new Error('Pass the preparation package directory after --source.');
}
const candidates = [
  process.argv[sourceFlag + 1] && sourceFlag !== -1 ? path.resolve(process.argv[sourceFlag + 1]) : undefined,
  process.env.CONTINUUM_ASSET_SOURCE,
  path.resolve(projectRoot, '../../outputs/CONTINUUM-2027-preparation'),
  path.resolve(projectRoot, '../CONTINUUM-2027-preparation'),
].filter(Boolean);
let sourceRoot;
for (const candidate of candidates) {
  try {
    await fs.access(path.join(candidate, 'PACKAGE-MANIFEST.json'));
    sourceRoot = candidate;
    break;
  } catch {}
}
if (!sourceRoot) {
  throw new Error('Preparation package not found. Run npm run prepare:assets -- --source "path/to/CONTINUUM-2027-preparation".');
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  const fallback = process.env.CONTINUUM_SHARP_PATH
    || createRequire(path.resolve(projectRoot, '../asset-tools/package.json')).resolve('sharp');
  sharp = (await import(pathToFileURL(fallback).href)).default;
}

const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const posix = (value) => value.split(path.sep).join('/');
const sourceFile = (relative) => path.join(sourceRoot, relative);
const publicRoot = path.join(projectRoot, 'public');
const destination = (relative) => path.join(publicRoot, relative);
const outputs = [];

async function snapshot(directory, prefix = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const records = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) records.push(...await snapshot(path.join(directory, entry.name), relative));
    else if (entry.isFile()) {
      const buffer = await fs.readFile(path.join(directory, entry.name));
      records.push({ path: posix(relative), bytes: buffer.length, sha256: hash(buffer) });
    }
  }
  return records;
}

async function record(relative, source, extra = {}) {
  const buffer = await fs.readFile(destination(relative));
  const result = { path: `/${posix(relative)}`, bytes: buffer.length, sha256: hash(buffer), source, ...extra };
  outputs.push(result);
  return result;
}

async function copy(source, target, extra = {}) {
  await fs.mkdir(path.dirname(destination(target)), { recursive: true });
  await fs.copyFile(sourceFile(source), destination(target));
  return record(target, source, extra);
}

async function raster(source, target, width, quality, extract) {
  await fs.mkdir(path.dirname(destination(target)), { recursive: true });
  const input = sharp(sourceFile(source));
  const metadata = await input.metadata();
  if (extract) input.extract(extract);
  const info = await input.resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6 }).toFile(destination(target));
  return record(target, source, {
    width: info.width, height: info.height,
    sourceWidth: metadata.width, sourceHeight: metadata.height,
    conversion: { format: 'webp', quality, maxWidth: width, ...(extract ? { crop: extract } : {}) },
  });
}

const before = await snapshot(sourceRoot);
const suppliedManifest = JSON.parse(await fs.readFile(sourceFile('PACKAGE-MANIFEST.json'), 'utf8'));
for (const expected of suppliedManifest.files) {
  const actual = before.find((item) => item.path === expected.path);
  if (!actual || actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) {
    throw new Error(`Preparation package does not match its supplied manifest: ${expected.path}`);
  }
}

await copy('assets/castle/castle-meshopt16-candidate.glb', 'assets/models/castle.glb', {
  format: 'glb', requiredExtensions: ['EXT_meshopt_compression', 'KHR_mesh_quantization'],
  triangles: 571150, quantization: '16-bit positions and UVs',
});
await copy('assets/castle/castle-meshopt16-candidate.glb.gz', 'assets/models/castle.glb.gz', {
  contentEncoding: 'gzip', uncompressedPath: '/assets/models/castle.glb',
});
const compressedCastle = await fs.readFile(destination('assets/models/castle.glb.gz'));
const uncompressedCastle = await fs.readFile(destination('assets/models/castle.glb'));
if (!gunzipSync(compressedCastle).equals(uncompressedCastle)) throw new Error('Castle gzip representation failed its byte comparison.');

for (const name of ['tree-1', 'tree-4', 'tree-7', 'stone-1', 'stone-3', 'bush-1', 'forest-4', 'path-straight-3', 'path-curve-3']) {
  await copy(`assets/nature/${name}.glb`, `assets/models/nature/${name}.glb`, { format: 'glb', license: 'CC0-1.0' });
}
for (const slug of ['neural-nexsus', 'promptx', 'nexathon', 'redstone-rush', 'battleforge']) {
  await raster(`screen-art/${slug}.png`, `assets/posters/${slug}.webp`, 1600, 88);
  await raster(`screen-art/reference-posters/${slug}-original.png`, `assets/posters/originals/${slug}.webp`, 1000, 86);
}
await raster('previews/castle-geometry-opposite.png', 'assets/castle-fallback.webp', 1400, 88, {
  left: 0, top: 116, width: 1500, height: 956,
});

for (const [name, source] of [
  ['castle-daylight.webp', 'Raster view of patrix’s castle, CC BY-SA 4.0'],
  ['castle-map.webp', 'Top-down raster map of patrix’s castle, CC BY-SA 4.0'],
  ['continuum-title.webp', 'Generated CONTINUUM 2027 raster title'],
]) {
  const relative = `assets/${name}`;
  const { width, height } = await sharp(destination(relative)).metadata();
  await record(relative, source, { width, height });
}

// A small raster site mark: four green blocks on the site's dark background.
// Created independently of the castle artwork and event posters.
const pixels = Buffer.alloc(64 * 64 * 4);
for (let y = 0; y < 64; y += 1) for (let x = 0; x < 64; x += 1) {
  const index = (y * 64 + x) * 4;
  const block = (x >= 12 && x < 27 && y >= 12 && y < 27)
    || (x >= 31 && x < 46 && y >= 12 && y < 27)
    || (x >= 12 && x < 27 && y >= 31 && y < 46)
    || (x >= 31 && x < 46 && y >= 31 && y < 46);
  pixels.set(block ? [184, 241, 77, 255] : [9, 17, 16, 255], index);
}
await sharp(pixels, { raw: { width: 64, height: 64, channels: 4 } }).png().toFile(destination('assets/favicon.png'));
await record('assets/favicon.png', 'Independent site mark created by this preparation script', { width: 64, height: 64 });

// Fonts are downloaded separately from the official Google Fonts repository.
// Rebuilding raster assets preserves their unmodified bundled font files.
for (const [name, source] of [
  ['fraunces.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf'],
  ['fraunces-OFL.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt'],
  ['dm-sans.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf'],
  ['dm-sans-OFL.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt'],
]) {
  try {
    await fs.access(destination(`assets/fonts/${name}`));
    await record(`assets/fonts/${name}`, source, { license: 'OFL-1.1', modification: 'None; renamed for a stable local URL' });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const sourceCredits = await fs.readFile(sourceFile('ASSET-CREDITS.md'), 'utf8');
const additionalCredits = `

## Website distribution notes

The website serves the supplied Meshopt candidate as \`models/castle.glb\` and its exact gzip representation as \`models/castle.glb.gz\`. The adapted castle retains source attribution and is distributed under CC BY-SA 4.0. Preparation removed normals from its unlit material, deduplicated identical position/UV records, repacked indices, and applied 16-bit position/UV quantization and Meshopt compression; it did not simplify the 571,150 triangles. Meshopt is required for loading this file.

The \`castle-fallback.webp\` image is a cropped, resized WebP adaptation of the package's opposite-exterior geometry preview. Diagnostic labels were cropped away; the original attribution is retained here. This is an illustrative geometry preview with per-face atlas color and shading, rather than a full texture render. It is also distributed under CC BY-SA 4.0.

\`castle-daylight.webp\` and \`castle-map.webp\` are raster illustrations rendered from patrix's castle geometry and texture atlas. Both adaptations are distributed under CC BY-SA 4.0. \`continuum-title.webp\` is independently generated raster title artwork for this site.

Nine Kytric GLBs are copied without changes. The five generated raster event-screen adaptations are only resized and encoded as WebP at quality 88. The five user-supplied reference posters are only resized and encoded as WebP at quality 86 in \`posters/originals\`; their original PNG files in the preparation package remain unchanged. Full image-generation prompts remain in the supplied preparation package. Generative badge lettering is not a guarantee of official institutional logo fidelity. The raster site favicon is independent geometric artwork made for the website.

No optional audio is bundled. This asset notice applies to the named artwork and models; it does not assign the castle license to unrelated website code or independent branding.

## Locally bundled fonts

- Fraunces — Copyright 2018 The Fraunces Project Authors. Source: https://github.com/google/fonts/tree/main/ofl/fraunces. Unmodified variable font, renamed to \`fonts/fraunces.ttf\` for its public URL. License: SIL Open Font License 1.1; full copyright and license notice in \`fonts/fraunces-OFL.txt\`.
- DM Sans — Copyright 2014 The DM Sans Project Authors. Source: https://github.com/google/fonts/tree/main/ofl/dmsans. Unmodified variable font, renamed to \`fonts/dm-sans.ttf\` for its public URL. License: SIL Open Font License 1.1; full copyright and license notice in \`fonts/dm-sans-OFL.txt\`.
`;
await fs.writeFile(destination('assets/CREDITS.md'), sourceCredits.trimEnd() + additionalCredits, 'utf8');
await record('assets/CREDITS.md', 'ASSET-CREDITS.md', { additions: 'Website distribution and raster conversion notices' });

const after = await snapshot(sourceRoot);
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('A preparation source file changed while assets were being prepared.');
await fs.mkdir(path.join(projectRoot, 'lib'), { recursive: true });
const manifest = {
  schemaVersion: 1,
  preparationPackage: 'CONTINUUM-2027-preparation',
  rasterEncoder: { sharp: sharp.versions.sharp, vips: sharp.versions.vips },
  sourceFilesVerifiedUnchanged: true,
  sourceFileCount: before.length,
  sourceFiles: before,
  assets: outputs,
};
await fs.writeFile(path.join(projectRoot, 'lib/asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  sourceFilesVerifiedUnchanged: before.length,
  assets: outputs.map(({ path, bytes, width, height }) => ({ path, bytes, ...(width ? { width, height } : {}) })),
}, null, 2));

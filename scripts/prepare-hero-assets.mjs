import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const project = path.resolve(process.argv[2] ?? '.');
const output = path.resolve(process.argv[3] ?? path.join(project, 'public/continuum/layers'));
const require = createRequire(path.join(project, 'package.json'));
const sharp = require('sharp');
const assets = path.join(project, 'public/assets');
const layers = [
  ['Cinematic Sunrise Gradient Sky.png', 'sky', 84, 960, false],
  ['Floating Voxel Clouds in Sunlight.png', 'clouds', 88, 960, true],
  ['Voxel Snowcap Mountain Range.png', 'mountains', 86, 1160, true],
  ['Voxel River Valley Landscape Layer.png', 'landscape', 87, 1160, true],
  ['Symmetrical Voxel Castle Entrance Pathway.png', 'castle-pathway', 88, 960, true],
  ['Voxel Forest Framing Elements.png', 'foreground-trees', 88, 1320, true],
  ['Futuristic Chrome Continuum Emblem.png', 'official-emblem', 91, 360, true],
];

await fs.mkdir(output, { recursive: true });
for (const [source, name, quality, mobileWidth, transparent] of layers) {
  const emblem = name === 'official-emblem';
  const sourcePath = path.join(assets, emblem ? '' : 'Hero-Assets', source);
  const metadata = await sharp(sourcePath).metadata();
  if (metadata.hasAlpha !== transparent) throw new Error('Unexpected alpha channel for ' + source);
  const fullWidth = emblem ? 720 : metadata.width;
  for (const [suffix, width] of [['', fullWidth], ['-mobile', mobileWidth]]) {
    const destination = path.join(output, name + suffix + '.webp');
    const pipeline = sharp(sourcePath);
    // Trim generous blank padding on the emblem. Preserve the authored framing for scenery.
    if (emblem) pipeline.extract({ left: 146, top: 20, width: 1665, height: 777 });
    const info = await pipeline.resize({ width, withoutEnlargement: true })
      .webp({ quality, alphaQuality: 100, effort: 5, smartSubsample: true })
      .toFile(destination);
    const outputMeta = await sharp(destination).metadata();
    if (outputMeta.hasAlpha !== transparent) throw new Error('Lost transparency in ' + name + suffix);
    console.log(path.basename(destination), info.width + '×' + info.height, info.size);
  }
}

// Individual authored cloud clusters drift at their own pace. Crops retain native alpha.
const cloudSource = path.join(assets, 'Hero-Assets/Floating Voxel Clouds in Sunlight.png');
for (const [name, left, top, width, height, displayWidth] of [
  ['cloud-near', 882, 503, 783, 317, 620],
  ['cloud-mid', 11, 628, 540, 216, 485],
  ['cloud-far', 1420, 367, 212, 87, 212],
]) {
  const info = await sharp(cloudSource).extract({ left, top, width, height })
    .resize({ width: displayWidth, withoutEnlargement: true })
    .webp({ quality: 87, alphaQuality: 100, effort: 5, smartSubsample: true })
    .toFile(path.join(output, name + '.webp'));
  console.log(name + '.webp', info.width + '×' + info.height, info.size);
}

// These narrow crops preserve both tree trunks on portrait screens.
const forestSource = path.join(assets, 'Hero-Assets/Voxel Forest Framing Elements.png');
for (const [name, left] of [['forest-left-mobile', 0], ['forest-right-mobile', 1452]]) {
  const info = await sharp(forestSource).extract({ left, top: 0, width: 720, height: 724 })
    .resize({ width: 520 })
    .webp({ quality: 87, alphaQuality: 100, effort: 5, smartSubsample: true })
    .toFile(path.join(output, name + '.webp'));
  console.log(name + '.webp', info.width + '×' + info.height, info.size);
}

// Reuse the supplied infinity mark at icon size. The separate wordmark begins below row 640.
const icon = await sharp(path.join(assets, 'Futuristic Chrome Continuum Emblem.png'))
  .extract({ left: 194, top: 21, width: 1573, height: 617 })
  .resize({ width: 120, height: 120, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 4, right: 4, bottom: 4, left: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(output, 'official-icon.png'));
console.log('official-icon.png', icon.width + '×' + icon.height, icon.size);

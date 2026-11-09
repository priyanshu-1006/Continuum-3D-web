import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const base = process.argv[2] || 'http://127.0.0.1:3000';
const source = await readFile(join(process.cwd(), 'public/assets/models/castle.glb'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = hash(source);
const checks = [];
const redirect = await fetch(new URL('/api/castle?v=transport-check', base), { redirect: 'manual', headers: { 'Accept-Encoding': 'gzip' } });
assert.equal(redirect.status, 307);
assert.equal(redirect.headers.get('location'), '/assets/models/castle.glb.gz?v=transport-check', 'Keep model redirects on the browser origin');
checks.push('Same-origin versioned model redirect');

for (const encoding of ['gzip', 'identity', 'gzip;q=0']) {
  const response = await fetch(new URL('/api/castle', base), { headers: { 'Accept-Encoding': encoding } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /model\/gltf-binary/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(hash(bytes), expected, `${encoding}: HTTP decoding must produce the original GLB`);
  assert.equal(bytes.subarray(0, 4).toString(), 'glTF');
  if (encoding === 'gzip') assert.equal(response.headers.get('content-encoding'), 'gzip');
  else assert.notEqual(response.headers.get('content-encoding'), 'gzip');
  checks.push(`Model transport: ${encoding}`);
}

const head = await fetch(new URL('/api/castle', base), { method: 'HEAD', headers: { 'Accept-Encoding': 'gzip' } });
assert.equal(head.status, 200);
assert.equal((await head.arrayBuffer()).byteLength, 0);
checks.push('Model HEAD response');

const home = await fetch(base);
assert.equal(home.status, 200);
const html = await home.text();
assert.ok(html.includes('Scroll to explore') && html.includes('All events'));
assert.ok(html.includes('/continuum/layers/castle-opening.webp') && html.includes('/continuum/chrome/unstop-logo.svg'));
assert.ok(!html.includes('Lite mode'));
checks.push('Server-rendered home content');

assert.ok(html.includes('Play tour') && html.includes('href="/explore"'));
const explore = await fetch(new URL('/explore', base));
assert.equal(explore.status, 200);
const gameMarkup = await explore.text();
assert.ok(gameMarkup.includes('Castle Relic Hunt') && gameMarkup.includes('Relics found: 0 of 5'));
assert.ok(gameMarkup.includes('href="/"') && gameMarkup.includes('Castle tour'));
checks.push('Home tour links to the playable castle hunt');

const festival = 'https://unstop.com/college-fests/continuum-madan-mohan-malaviya-university-of-technology-mmmut-gorakhpur-524153';
assert.ok(html.includes(festival), 'Home footer links to the official festival');
const destinations = { sponsors: 'Choose what you', about: 'Built by students at MMMUT', contact: 'Official event resources' };
for (const [slug, title] of Object.entries(destinations)) {
  const response = await fetch(new URL('/' + slug, base));
  assert.equal(response.status, 200, slug);
  const markup = await response.text();
  assert.ok(markup.includes(title), slug + ': useful server-rendered content');
  assert.ok(markup.includes('/continuum/destinations/' + slug + '.webp'), slug + ': illustrated hero');
  assert.ok(markup.includes('aria-current="page"'), slug + ': active navigation');
  if (slug === 'contact') assert.ok(markup.includes(festival), 'Contact links to the official festival');
  checks.push('Shareable destination: ' + slug);
}

const team = await fetch(new URL('/team', base));
assert.equal(team.status, 200);
const roster = await team.text();
assert.ok(roster.includes('Priyanshu Chaurasia') && roster.includes('Amitesh Vishwakarma'));
checks.push('Team roster and leadership');

const signIn = await fetch(new URL('/sign-in', base));
assert.equal(signIn.status, 200);
const signInMarkup = await signIn.text();
assert.ok(signInMarkup.includes('Continue with Google') && signInMarkup.includes('Email'));
checks.push('Google and email sign-in entry points');

const names = { 'neural-nexsus': 'Neural Nexsus', promptx: 'PromptX', nexathon: 'Nexathon', 'redstone-rush': 'RedStone Rush', battleforge: 'Battleforge' };
const rulebooks = {
  'redstone-rush': '77ab0c55-a413-4a73-b499-9fb26ad0cb42',
  nexathon: '29c4b7ef-4745-4e44-8542-d8463135e2de',
  promptx: '9b2da400-a84f-4969-9e53-965df84c2472',
};
for (const [slug, title] of Object.entries(names)) {
  const response = await fetch(new URL(`/events/${slug}`, base));
  assert.equal(response.status, 200, slug);
  const text = await response.text();
  assert.ok(text.includes(title), `${slug}: visible event title`);
  assert.ok(!text.includes('₹XX'), `${slug}: no placeholder prize`);
  assert.ok(text.includes('Link to be announced') || text.includes('Register on Unstop'));
  if (slug in rulebooks) {
    assert.ok(text.includes('https://d8it4huxumps7.cloudfront.net/uploads/attachements/files/' + rulebooks[slug] + '.pdf'), slug + ': exact official rulebook link');
  }
  checks.push(`Shareable event page: ${slug}`);
}
for (const slug of Object.keys(destinations)) {
  for (const suffix of ['', '-mobile']) {
    const asset = await fetch(new URL('/continuum/destinations/' + slug + suffix + '.webp', base), { method: 'HEAD' });
    assert.equal(asset.status, 200, slug + suffix);
    assert.match(asset.headers.get('content-type') ?? '', /^image\/webp/);
  }
  checks.push('Desktop and mobile artwork: ' + slug);
}
for (const path of [
  '/continuum/layers/castle-opening.webp',
  '/continuum/layers/castle-opening-mobile.webp',
  '/continuum/chrome/continuum-wordmark.webp',
  '/continuum/destinations/portal.webp',
  '/continuum/destinations/portal-mobile-v2.webp',
  '/continuum/destinations/portal-door-left.webp',
  '/continuum/destinations/portal-door-right.webp',
]) {
  const asset = await fetch(new URL(path, base), { method: 'HEAD' });
  assert.equal(asset.status, 200, path);
  assert.match(asset.headers.get('content-type') ?? '', /^image\/webp/);
}
checks.push('Castle opening, navbar and animated gate artwork');
for (const path of ['/events/not-a-real-event', '/not-a-real-page']) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 404, path);
  checks.push(`Correct 404: ${path}`);
}
for (const check of checks) console.log(`PASS ${check}`);
console.log(`${checks.length} HTTP checks passed.`);


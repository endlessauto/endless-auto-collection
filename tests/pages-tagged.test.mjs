import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TAG = '<script src="/js/analytics.js" defer></script>';
const SKIP = new Set(['raffle1.html', 'ppf-front.html', 'ppf-full.html']);

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const count = (s) => s.split('/js/analytics.js').length - 1;

test('every public root page has exactly one tracker tag', () => {
  const bad = readdirSync('.')
    .filter((f) => f.endsWith('.html') && !SKIP.has(f))
    .filter((f) => count(readFileSync(f, 'utf8')) !== 1 || !readFileSync(f, 'utf8').includes(TAG));
  assert.deepEqual(bad, [], `pages without exactly one tag: ${bad.join(', ')}`);
});

test('redirect stubs and raffle1.html have no tracker tag', () => {
  for (const f of SKIP) assert.equal(count(readFileSync(f, 'utf8')), 0, f);
});

test('admin/ and EACMedia/ contain no tracker tag', () => {
  const bad = ['admin', 'EACMedia']
    .flatMap((d) => { try { return walk(d); } catch { return []; } })
    .filter((f) => /\.(html?|js|mjs)$/.test(f))
    .filter((f) => count(readFileSync(f, 'utf8')) > 0);
  assert.deepEqual(bad, [], `files with tracker tag: ${bad.join(', ')}`);
});

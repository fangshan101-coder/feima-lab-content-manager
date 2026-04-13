import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, '..', 'scripts', 'new-post.mjs');
const TMP = join(__dirname, 'tmp-newpost');

test.before(async () => { await mkdir(TMP, { recursive: true }); });
test.after(async () => { if (existsSync(TMP)) await rm(TMP, { recursive: true, force: true }); });

test('creates post skeleton', async () => {
  execSync(`node "${SCRIPT}" --slug 2026-04-09-hello --cwd "${TMP}"`, { encoding: 'utf8' });
  const postDir = join(TMP, 'posts', '2026-04-09-hello');
  assert.ok(existsSync(postDir));
  assert.ok(existsSync(join(postDir, 'images')));
  assert.ok(existsSync(join(postDir, 'meta.json')));
  const meta = JSON.parse(await readFile(join(postDir, 'meta.json'), 'utf8'));
  assert.equal(meta.slug, '2026-04-09-hello');
  assert.equal(meta.publish.status, 'draft');
});

test('fails when dir exists', () => {
  let code = 0;
  try {
    execSync(`node "${SCRIPT}" --slug 2026-04-09-hello --cwd "${TMP}"`, { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) { code = e.status; }
  assert.equal(code, 1);
});

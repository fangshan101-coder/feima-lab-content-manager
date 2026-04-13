import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, '..', 'scripts', 'image-localize.mjs');
const TMP = join(__dirname, 'tmp-imgloc');

test.before(async () => {
  await mkdir(join(TMP, 'posts', '2026-04-09-t', 'images'), { recursive: true });
  await mkdir(join(TMP, 'external'), { recursive: true });
  await writeFile(join(TMP, 'external', 'pic.png'), 'FAKE_PNG');
});
test.after(async () => { if (existsSync(TMP)) await rm(TMP, { recursive: true, force: true }); });

test('localizes absolute local path and rewrites md', async () => {
  const postDir = join(TMP, 'posts', '2026-04-09-t');
  const mdxPath = join(postDir, 'article.mdx');
  const extPath = join(TMP, 'external', 'pic.png');
  await writeFile(mdxPath, `# t\n\n![alt](${extPath})\n`);

  execSync(`node "${SCRIPT}" "${postDir}"`, { encoding: 'utf8' });

  assert.ok(existsSync(join(postDir, 'images', 'pic.png')));
  const rewritten = await readFile(mdxPath, 'utf8');
  assert.ok(rewritten.includes('./images/pic.png'));
  assert.ok(!rewritten.includes(extPath));
});

test('skips already-local ./images/ paths', async () => {
  const postDir = join(TMP, 'posts', '2026-04-09-t');
  await writeFile(join(postDir, 'article.mdx'), '# t\n\n![a](./images/pic.png)\n');
  execSync(`node "${SCRIPT}" "${postDir}"`, { encoding: 'utf8' });
  const md = await readFile(join(postDir, 'article.mdx'), 'utf8');
  assert.ok(md.includes('./images/pic.png'));
});

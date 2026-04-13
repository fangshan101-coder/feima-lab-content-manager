import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, '..', 'scripts', 'render.mjs');
const FIXTURES = join(__dirname, 'fixtures');
const TMP = join(__dirname, 'tmp');

test('render.mjs generates preview.html', async () => {
  await mkdir(TMP, { recursive: true });
  const mdxPath = join(TMP, 'article.mdx');
  const mdx = await readFile(join(FIXTURES, 'simple.mdx'), 'utf8');
  await writeFile(mdxPath, mdx);

  const out = execSync(
    `FEIMA_SNAPSHOT="${join(FIXTURES, 'mini-snapshot.json')}" node "${SCRIPT}" "${mdxPath}"`,
    { encoding: 'utf8' }
  );

  const htmlPath = join(TMP, 'preview.html');
  assert.ok(existsSync(htmlPath));
  const html = await readFile(htmlPath, 'utf8');
  assert.ok(html.includes('<h1>Hello</h1>'));
  assert.ok(html.includes('Remember this'));
  assert.ok(html.includes('Hidden content'));
  assert.ok(html.includes('💡'));
  assert.ok(html.includes('data-component="collapse"'));
  assert.ok(html.includes('bindCollapse'));
  assert.ok(out.includes('preview.html'));
});

test('render.mjs exits 3 on unknown component', async () => {
  await mkdir(TMP, { recursive: true });
  const mdxPath = join(TMP, 'bad.mdx');
  await writeFile(mdxPath, '# t\n\n<Foo>bar</Foo>\n');

  let code = 0;
  try {
    execSync(
      `FEIMA_SNAPSHOT="${join(FIXTURES, 'mini-snapshot.json')}" node "${SCRIPT}" "${mdxPath}"`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
  } catch (e) { code = e.status; }
  assert.equal(code, 3);
});

test.after(async () => {
  if (existsSync(TMP)) await rm(TMP, { recursive: true, force: true });
});

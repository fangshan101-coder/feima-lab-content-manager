#!/usr/bin/env node
/**
 * Render a feima-lab MDX article to a self-contained preview.html.
 * Usage: node scripts/render.mjs <path-to-article.mdx>
 * Env:   FEIMA_SNAPSHOT  override snapshot path (default: references/feima-style-snapshot.json)
 * Exit:  0 success / 1 parse error / 2 props invalid / 3 unknown component
 *
 * This file is the SOURCE. The version at scripts/render.mjs is a bundled
 * build that inlines all dependencies — regenerate via `node build-bundle.mjs`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMdx, renderTree } from './lib/mdx-parser.mjs';
import { buildStyleBlock } from './lib/base-styles.mjs';
import { buildInteractiveScript } from './lib/interactive-js.mjs';
import { UnknownComponentError } from './lib/component-renderers.mjs';

async function main() {
  const [, , mdxArg] = process.argv;
  if (!mdxArg) {
    console.error('Usage: node scripts/render.mjs <path-to-article.mdx>');
    process.exit(1);
  }

  const mdxPath = resolve(mdxArg);
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const snapshotPath = process.env.FEIMA_SNAPSHOT
    || join(__dirname, '..', 'references', 'feima-style-snapshot.json');

  const [mdxSrc, snapshotSrc] = await Promise.all([
    readFile(mdxPath, 'utf8'),
    readFile(snapshotPath, 'utf8'),
  ]);
  const snapshot = JSON.parse(snapshotSrc);

  let tree;
  try { tree = await parseMdx(mdxSrc); }
  catch (e) {
    console.error('[parse error]', e.message);
    process.exit(1);
  }

  const usedComponents = new Set();
  let bodyHtml;
  try {
    bodyHtml = await renderTree(tree, { snapshot, usedComponents });
  } catch (e) {
    if (e instanceof UnknownComponentError || e?.code === 'UNKNOWN_COMPONENT') {
      console.error('[unknown component]', e.message);
      process.exit(3);
    }
    if (/invalid.*type|Callout:/.test(e.message)) {
      console.error('[props invalid]', e.message);
      process.exit(2);
    }
    console.error('[render error]', e.message);
    process.exit(1);
  }

  const styleBlock = buildStyleBlock(snapshot);
  const scriptBlock = buildInteractiveScript(usedComponents);

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview</title>
${styleBlock}
<style>body{background:var(--color-bg-primary);font-family:var(--font-sans),system-ui,sans-serif;margin:0;padding:48px 24px}article.article-content{max-width:768px;margin:0 auto}</style>
</head>
<body>
<article class="article-content">
${bodyHtml}
</article>
${scriptBlock}
</body>
</html>`;

  const outPath = join(dirname(mdxPath), 'preview.html');
  await writeFile(outPath, html, 'utf8');
  console.log(outPath);
}

main().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * MAINTAINER-ONLY tool. Gitignored, not shipped.
 *
 * Compare references/feima-style-snapshot.json against feima-lab source code
 * to detect style drift. Parses TSX with @babel/parser and CSS with regex.
 *
 * Usage: node scripts/check-drift.mjs [--feima-lab-path /path/to/feima-lab]
 *
 * Exit: 0 no drift / 1 drift detected / 2 source parse error
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--feima-lab-path') out.path = args[++i];
  }
  return out;
}

function getFeimaLabPath(args) {
  return args.path
    || process.env.FEIMA_LAB_PATH
    || '/Users/eamanc/Documents/pe/js/feima-lab';
}

function getGitCommit(dir) {
  try { return execSync('git rev-parse --short HEAD', { cwd: dir }).toString().trim(); }
  catch { return 'unknown'; }
}

async function extractFromSource(feimaLabPath) {
  const parser = (await import('@babel/parser')).default || await import('@babel/parser');
  const _traverseMod = await import('@babel/traverse');
  const traverse = _traverseMod.default?.default || _traverseMod.default;

  // feima-lab v1 使用 Next.js (src/app/...)，v2 起迁到 React Router v7 (app/...)
  const articleCss = await readFile(join(feimaLabPath, 'app/styles/article.css'), 'utf8');
  const globalsCss = await readFile(join(feimaLabPath, 'app/app.css'), 'utf8');

  const tokens = { colors: {}, radius: {}, fonts: {}, shadows: {} };
  const tokenRegex = /--([\w-]+):\s*([^;]+);/g;
  let m;
  while ((m = tokenRegex.exec(globalsCss)) !== null) {
    const [, key, value] = m;
    const v = value.trim();
    if (key.startsWith('color-')) tokens.colors[key.slice(6)] = v;
    else if (key.startsWith('radius-')) tokens.radius[key.slice(7)] = v;
    else if (key.startsWith('font-')) tokens.fonts[key.slice(5)] = v;
    else if (key.startsWith('shadow-')) tokens.shadows[key.slice(7)] = v;
  }

  // 8 个组件白名单（v1.3 新增 Video）
  const COMPONENTS = ['Callout', 'CodeTabs', 'Collapse', 'CompareCard', 'Timeline', 'ImageCarousel', 'Playground', 'Video'];
  const components = {};
  for (const name of COMPONENTS) {
    const src = await readFile(join(feimaLabPath, 'app/components/mdx', `${name}.tsx`), 'utf8');
    const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
    const comp = { variants: {}, inline_styles_count: 0 };
    traverse(ast, {
      VariableDeclarator(path) {
        if (path.node.id.name === 'styles' && path.node.init?.type === 'ObjectExpression') {
          for (const prop of path.node.init.properties) {
            if (prop.key?.name && prop.value?.type === 'ObjectExpression') {
              const variant = {};
              for (const inner of prop.value.properties) {
                if (inner.key?.name && inner.value?.type === 'StringLiteral') {
                  variant[inner.key.name] = inner.value.value;
                }
              }
              comp.variants[prop.key.name] = variant;
            }
          }
        }
      },
      JSXAttribute(path) {
        if (path.node.name.name === 'style' && path.node.value?.type === 'JSXExpressionContainer') {
          if (path.node.value.expression.type === 'ObjectExpression') {
            comp.inline_styles_count++;
          }
        }
      },
    });
    components[name] = comp;
  }

  return { tokens, article_base_css: articleCss, components };
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, path));
    } else {
      out[path] = v;
    }
  }
  return out;
}

function diff(sourceMap, snapshotMap) {
  const added = [];
  const removed = [];
  const changed = [];
  const allKeys = new Set([...Object.keys(sourceMap), ...Object.keys(snapshotMap)]);
  for (const k of allKeys) {
    const s = sourceMap[k];
    const n = snapshotMap[k];
    if (s === undefined) removed.push({ path: k, snapshot: n });
    else if (n === undefined) added.push({ path: k, source: s });
    else if (JSON.stringify(s) !== JSON.stringify(n)) changed.push({ path: k, source: s, snapshot: n });
  }
  return { added, removed, changed };
}

async function main() {
  const args = parseArgs();
  const feimaLabPath = getFeimaLabPath(args);

  if (!existsSync(feimaLabPath)) {
    console.log(`source not available at ${feimaLabPath}, skipping drift check`);
    process.exit(0);
  }

  const snapshotPath = join(__dirname, '..', 'references', 'feima-style-snapshot.json');
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));

  let source;
  try {
    source = await extractFromSource(feimaLabPath);
  } catch (e) {
    console.error('Failed to parse feima-lab source:', e.message);
    process.exit(2);
  }

  const sourceFlat = flatten({
    tokens: source.tokens,
    article_base_css: source.article_base_css,
    components: Object.fromEntries(
      Object.entries(source.components).map(([k, v]) => [k, { variants: v.variants }])
    ),
  });

  const snapshotFlat = flatten({
    tokens: snapshot.tokens,
    article_base_css: snapshot.article_base_css,
    components: Object.fromEntries(
      Object.entries(snapshot.components).map(([k, v]) => [k, { variants: v.variants || {} }])
    ),
  });

  const { added, removed, changed } = diff(sourceFlat, snapshotFlat);

  console.log('=== feima-lab style drift check ===');
  console.log(`feima-lab path: ${feimaLabPath}`);
  console.log(`feima-lab commit: ${getGitCommit(feimaLabPath)} (was ${snapshot.feima_lab_source?.git_commit} in snapshot)`);
  console.log(`snapshot extracted_at: ${snapshot.feima_lab_source?.extracted_at}`);
  console.log('');
  console.log(`Summary: ${added.length} added, ${removed.length} removed, ${changed.length} changed`);
  console.log('');

  for (const c of changed) {
    console.log(`[CHANGED] ${c.path}`);
    console.log(`  snapshot: ${JSON.stringify(c.snapshot)}`);
    console.log(`  source:   ${JSON.stringify(c.source)}`);
  }
  for (const a of added) {
    console.log(`[ADDED]   ${a.path}`);
    console.log(`  source:   ${JSON.stringify(a.source)}`);
  }
  for (const r of removed) {
    console.log(`[REMOVED] ${r.path}`);
    console.log(`  snapshot: ${JSON.stringify(r.snapshot)}`);
  }

  const total = added.length + removed.length + changed.length;
  if (total === 0) {
    console.log('No drift detected.');
    process.exit(0);
  } else {
    console.log('');
    console.log('To sync: review the diff, update references/feima-style-snapshot.json manually, bump snapshot_version.');
    process.exit(1);
  }
}

main().catch((e) => { console.error('[fatal]', e); process.exit(2); });

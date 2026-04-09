// tests/scratch/extract-snapshot.mjs
// One-time snapshot extractor. Reads feima-lab source, prints JSON to stdout.
// Usage: node tests/scratch/extract-snapshot.mjs > references/feima-style-snapshot.json

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;

const FEIMA_LAB = '/Users/eamanc/Documents/pe/js/feima-lab';
const MDX_DIR = join(FEIMA_LAB, 'src/components/mdx');
const ARTICLE_CSS = join(FEIMA_LAB, 'src/app/blog/[slug]/article.css');
const GLOBALS_CSS = join(FEIMA_LAB, 'src/app/globals.css');

const COMPONENTS = ['Callout', 'CodeTabs', 'Collapse', 'CompareCard', 'Timeline', 'ImageCarousel', 'Playground'];

async function extractTsxStyles(componentName) {
  const src = await readFile(join(MDX_DIR, `${componentName}.tsx`), 'utf8');
  const ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx', 'typescript'] });

  const result = { variants: {}, inline_styles: [] };

  traverse(ast, {
    VariableDeclarator(path) {
      if (path.node.id.name === 'styles' && path.node.init?.type === 'ObjectExpression') {
        for (const prop of path.node.init.properties) {
          if (prop.key?.name && prop.value?.type === 'ObjectExpression') {
            const variant = {};
            for (const innerProp of prop.value.properties) {
              if (innerProp.key?.name && innerProp.value?.type === 'StringLiteral') {
                variant[innerProp.key.name] = innerProp.value.value;
              }
            }
            result.variants[prop.key.name] = variant;
          }
        }
      }
    },
    JSXAttribute(path) {
      if (path.node.name.name === 'style' && path.node.value?.type === 'JSXExpressionContainer') {
        const expr = path.node.value.expression;
        if (expr.type === 'ObjectExpression') {
          const styleObj = {};
          for (const prop of expr.properties) {
            if (prop.type === 'ObjectProperty' && prop.key?.name) {
              if (prop.value.type === 'StringLiteral') styleObj[prop.key.name] = prop.value.value;
              else if (prop.value.type === 'NumericLiteral') styleObj[prop.key.name] = prop.value.value;
              else if (prop.value.type === 'TemplateLiteral') {
                styleObj[prop.key.name] = prop.value.quasis.map(q => q.value.raw).join('${?}');
              }
            }
          }
          if (Object.keys(styleObj).length > 0) {
            result.inline_styles.push(styleObj);
          }
        }
      }
    },
  });

  return result;
}

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: FEIMA_LAB }).toString().trim();
  } catch { return 'unknown'; }
}

async function main() {
  const articleCss = await readFile(ARTICLE_CSS, 'utf8');
  const globalsCss = await readFile(GLOBALS_CSS, 'utf8');

  const tokenRegex = /--([\w-]+):\s*([^;]+);/g;
  const tokens = { colors: {}, radius: {}, fonts: {} };
  let match;
  while ((match = tokenRegex.exec(globalsCss)) !== null) {
    const [, key, value] = match;
    const v = value.trim();
    if (key.startsWith('color-')) tokens.colors[key.slice('color-'.length)] = v;
    else if (key.startsWith('radius-')) tokens.radius[key.slice('radius-'.length)] = v;
    else if (key.startsWith('font-')) tokens.fonts[key.slice('font-'.length)] = v;
  }

  const components = {};
  for (const name of COMPONENTS) {
    components[name] = await extractTsxStyles(name);
  }

  const snapshot = {
    _maintainer_note: 'Extracted via tests/scratch/extract-snapshot.mjs. Updates via scripts/check-drift.mjs (gitignored).',
    $schema_version: '1.0',
    feima_lab_source: {
      path: FEIMA_LAB,
      extracted_at: new Date().toISOString(),
      git_commit: getGitCommit(),
    },
    tokens,
    article_base_css: articleCss,
    components,
  };

  console.log(JSON.stringify(snapshot, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

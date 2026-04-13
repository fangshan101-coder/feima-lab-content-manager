import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { renderers, UnknownComponentError } from './component-renderers.mjs';

/**
 * Parse MDX source into an mdast tree.
 *
 * remark-gfm enables GitHub Flavored Markdown extensions on top of CommonMark:
 *   - pipe tables   `| h | h | \n |---|---|\n | c | c |`
 *   - strikethrough `~~deleted~~`
 *   - task lists    `- [ ] todo`  /  `- [x] done`
 *   - autolinks     bare URLs become <a href>
 *   - footnotes     `[^1]` + `[^1]: note`
 *
 * Without this plugin, `| ... |` lines collapse into paragraphs and the
 * resulting HTML has no <table>. Tables in article.mdx would render as prose.
 */
export async function parseMdx(source) {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdx);
  return processor.parse(source);
}

/**
 * Extract props from an mdxJsxFlowElement node's attributes.
 */
/**
 * Convert a JS object/array literal source to JSON source, so we can parse
 * CMS-inserted templates like:
 *
 *   [{ title: "步骤一", description: "..." }, ...]
 *   { title: "方案 A", items: ['a', 'b'] }
 *
 * which are valid JS literals but NOT valid JSON (unquoted keys, single
 * quotes, trailing commas).
 *
 * Transforms (regex-based, handles 99% of CMS templates):
 *   1. Backtick template literals → double-quoted strings (no interpolation support)
 *   2. Single-quoted strings → double-quoted strings
 *   3. Unquoted object keys (`{foo: ...}` or `,foo: ...`) → quoted (`{"foo": ...}`)
 *   4. Trailing commas (`[1,2,]` / `{a:1,}`) → removed
 *
 * Edge cases NOT handled (fall through to fallback):
 *   - Template literal interpolation `${...}`
 *   - Computed keys `[expr]: value`
 *   - Arbitrary JS expressions (function calls, operators, etc.)
 */
function jsLiteralToJson(src) {
  // Step 1: backticks → double quotes (no interpolation handled)
  src = src.replace(/`([^`\\]*(?:\\.[^`\\]*)*)`/g, (_, body) => {
    return '"' + body
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r') + '"';
  });
  // Step 2: single-quoted strings → double-quoted strings
  src = src.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, body) => {
    return '"' + body
      .replace(/\\'/g, "'")   // \' → '
      .replace(/"/g, '\\"')    // " → \"
      + '"';
  });
  // Step 3: unquoted object keys → quoted
  //   match: { or , followed by optional ws, identifier, optional ws, :
  src = src.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*):/g, '$1"$2"$3:');
  // Step 4: trailing commas before ] or }
  src = src.replace(/,(\s*[\]}])/g, '$1');
  return src;
}

/**
 * Try to parse a raw JSX expression as a real JS value.
 * Handles: primitives (true/false/null/numbers), quoted/template strings,
 * JSON arrays/objects, and JS-literal arrays/objects (via jsLiteralToJson).
 * Returns the original raw string if nothing worked.
 */
function parseJsxExpressionValue(raw) {
  const trimmed = raw.trim();

  // Primitives
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  // Template literal (single backtick-delimited string)
  if (/^`[\s\S]*`$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }

  // Quoted string (single or double)
  if (/^"[\s\S]*"$/.test(trimmed) || /^'[\s\S]*'$/.test(trimmed)) {
    // Strip wrapping quotes (simple; edge cases like escaped quotes are rare here)
    return trimmed.slice(1, -1);
  }

  // Array or object: try JSON.parse first (strict), then js-literal-to-json
  if (/^[\[\{]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      try {
        return JSON.parse(jsLiteralToJson(trimmed));
      } catch {
        // fall through to raw string
      }
    }
  }

  // Fallback: return raw string (renderer may still handle it)
  return raw;
}

function extractProps(node) {
  const props = {};
  for (const attr of node.attributes || []) {
    if (attr.type !== 'mdxJsxAttribute') continue;
    const name = attr.name;
    const value = attr.value;
    if (value == null) { props[name] = true; continue; }
    if (typeof value === 'string') { props[name] = value; continue; }
    if (value.type === 'mdxJsxAttributeValueExpression') {
      props[name] = parseJsxExpressionValue(value.value);
    }
  }
  return props;
}

function isJsxNode(n) {
  return n && (n.type === 'mdxJsxFlowElement' || n.type === 'mdxJsxTextElement');
}

/**
 * Render an MDX JSX node (flow or text) to an HTML string via the renderer registry.
 */
async function renderJsxNode(node, ctx) {
  const name = node.name;
  if (!name || !renderers[name]) {
    throw new UnknownComponentError(name || '(anonymous)');
  }
  const props = extractProps(node);
  // Children may contain more MDX JSX — process recursively.
  const childrenHtml = await renderChildrenToHtml(node.children || [], ctx);
  const spec = ctx.snapshot?.components?.[name];
  if (spec?.interactive && spec.js_behavior_key) {
    ctx.usedComponents.add(spec.js_behavior_key);
  }
  return renderers[name](props, childrenHtml, ctx.snapshot);
}

/**
 * Render a list of child nodes, which may contain a mix of mdast and mdxJsx,
 * into an HTML string.
 */
async function renderChildrenToHtml(children, ctx) {
  // Replace all mdxJsx children with {type:'html', value:<rendered>} so the
  // mdast→hast conversion embeds the markup verbatim.
  const transformed = [];
  for (const child of children) {
    transformed.push(await transformNode(child, ctx));
  }
  // Wrap in a fake root and convert via toHast/toHtml.
  const fakeRoot = { type: 'root', children: transformed };
  const hast = toHast(fakeRoot, { allowDangerousHtml: true });
  if (!hast) return '';
  return toHtml(hast, { allowDangerousHtml: true });
}

/**
 * Deep-transform a node: any mdxJsx node becomes {type:'html', value:...}.
 * Regular nodes pass through but their children are recursively transformed.
 */
async function transformNode(node, ctx) {
  if (isJsxNode(node)) {
    const html = await renderJsxNode(node, ctx);
    return { type: 'html', value: html };
  }
  if (node.children && Array.isArray(node.children)) {
    const newChildren = [];
    for (const c of node.children) newChildren.push(await transformNode(c, ctx));
    return { ...node, children: newChildren };
  }
  return node;
}

/**
 * Render mdast tree to HTML. MDX JSX nodes (nested at any depth) get dispatched
 * to renderers via transformNode.
 */
export async function renderTree(tree, ctx) {
  return renderChildrenToHtml(tree.children || [], ctx);
}

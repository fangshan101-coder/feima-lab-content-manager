import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { renderers, UnknownComponentError } from './component-renderers.mjs';

/**
 * Parse MDX source into an mdast tree.
 */
export async function parseMdx(source) {
  const processor = unified().use(remarkParse).use(remarkMdx);
  return processor.parse(source);
}

/**
 * Extract props from an mdxJsxFlowElement node's attributes.
 */
function extractProps(node) {
  const props = {};
  for (const attr of node.attributes || []) {
    if (attr.type !== 'mdxJsxAttribute') continue;
    const name = attr.name;
    const value = attr.value;
    if (value == null) { props[name] = true; continue; }
    if (typeof value === 'string') { props[name] = value; continue; }
    if (value.type === 'mdxJsxAttributeValueExpression') {
      let raw = value.value;
      if (raw === 'true') props[name] = true;
      else if (raw === 'false') props[name] = false;
      else if (/^`[\s\S]*`$/.test(raw)) props[name] = raw.slice(1, -1);
      else if (/^['"][\s\S]*['"]$/.test(raw)) props[name] = raw.slice(1, -1);
      else props[name] = raw;
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

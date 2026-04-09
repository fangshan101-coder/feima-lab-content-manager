import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMdx, renderTree } from '../src/lib/mdx-parser.mjs';

test('parseMdx returns mdast root', async () => {
  const tree = await parseMdx('# Hello\n\nWorld');
  assert.equal(tree.type, 'root');
  assert.ok(tree.children.length >= 2);
});

test('renderTree renders simple md to HTML', async () => {
  const tree = await parseMdx('# Title\n\nHello **bold**');
  const html = await renderTree(tree, { snapshot: null, usedComponents: new Set() });
  assert.ok(html.includes('<h1>Title</h1>'));
  assert.ok(html.includes('<strong>bold</strong>'));
});

test('renderTree dispatches MDX JSX to component renderers', async () => {
  const snapshot = {
    components: {
      Callout: {
        variants: { info: { bg: '#EEF4FA', border: '#60a5fa', icon: 'ℹ️' } },
        static_styles: { container: '', header: '', body: '' },
      },
    },
  };
  const mdx = '<Callout type="info">Hello</Callout>';
  const tree = await parseMdx(mdx);
  const usedComponents = new Set();
  const html = await renderTree(tree, { snapshot, usedComponents });
  assert.ok(html.includes('ℹ️'));
  assert.ok(html.includes('Hello'));
});

test('renderTree throws UnknownComponentError on <Foo>', async () => {
  const tree = await parseMdx('<Foo>x</Foo>');
  await assert.rejects(
    renderTree(tree, { snapshot: { components: {} }, usedComponents: new Set() }),
    /UNKNOWN_COMPONENT|Foo/
  );
});

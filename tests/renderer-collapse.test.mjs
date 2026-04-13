import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers } from '../src/lib/component-renderers.mjs';

const snapshot = {
  components: {
    Collapse: {
      static_styles: {
        wrapper: 'margin:1rem 0;border-radius:16px;border:1px solid #E8E5E0;overflow:hidden',
        header: 'width:100%;display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1.25rem;background:#F3F1ED;border:none;cursor:pointer;font-size:0.9375rem;font-weight:600;color:#1A1A1A',
        icon: 'display:inline-block;transition:transform 0.2s;font-size:0.75rem',
        body: 'padding:1rem 1.25rem;font-size:0.9375rem;line-height:1.7',
      },
      interactive: true,
      js_behavior_key: 'collapse',
    },
  },
};

test('renderCollapse basic', () => {
  const html = renderers.Collapse({ title: 'More' }, '<p>detail</p>', snapshot);
  assert.ok(html.includes('data-component="collapse"'));
  assert.ok(html.includes('More'));
  assert.ok(html.includes('<p>detail</p>'));
  assert.ok(html.includes('data-default-open="false"'));
});

test('renderCollapse defaultOpen true', () => {
  const html = renderers.Collapse({ title: 'X', defaultOpen: true }, '', snapshot);
  assert.ok(html.includes('data-default-open="true"'));
});

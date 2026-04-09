import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers } from '../src/lib/component-renderers.mjs';

const snapshot = {
  components: {
    CompareCard: {
      static_styles: {
        grid: 'display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.5rem 0',
        card: 'border-radius:16px;padding:1.5rem',
        card_left_bg: 'background:#EEF4FA',
        card_right_bg: 'background:#EFF6F0',
        title: 'font-size:1rem;font-weight:600;margin-bottom:0.75rem;color:#1A1A1A',
        list: 'list-style:none;padding:0;margin:0',
        list_item: 'padding:0.375rem 0;font-size:0.875rem;color:#6B6560',
      },
    },
  },
};

test('renderCompareCard with object props', () => {
  const html = renderers.CompareCard({
    left: { title: 'Pros', items: ['fast', 'cheap'] },
    right: { title: 'Cons', items: ['buggy'] },
  }, '', snapshot);

  assert.ok(html.includes('Pros'));
  assert.ok(html.includes('Cons'));
  assert.ok(html.includes('fast'));
  assert.ok(html.includes('cheap'));
  assert.ok(html.includes('buggy'));
  assert.ok(html.includes('#EEF4FA'));
  assert.ok(html.includes('#EFF6F0'));
});

test('renderCompareCard parses JSON string props', () => {
  const html = renderers.CompareCard({
    left: '{"title":"A","items":["1","2"]}',
    right: '{"title":"B","items":["3"]}',
  }, '', snapshot);
  assert.ok(html.includes('A'));
  assert.ok(html.includes('B'));
});

test('renderCompareCard escapes HTML in items', () => {
  const html = renderers.CompareCard({
    left: { title: '<t>', items: ['<x>'] },
    right: { title: 'ok', items: [] },
  }, '', snapshot);
  assert.ok(html.includes('&lt;t&gt;'));
  assert.ok(html.includes('&lt;x&gt;'));
});

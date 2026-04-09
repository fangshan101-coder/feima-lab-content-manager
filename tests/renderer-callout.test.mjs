import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers } from '../src/lib/component-renderers.mjs';

const snapshot = {
  components: {
    Callout: {
      variants: {
        tip:     { bg: '#EFF6F0', border: '#4ade80', icon: '💡' },
        warning: { bg: '#FDF8EE', border: '#fbbf24', icon: '⚠️' },
        info:    { bg: '#EEF4FA', border: '#60a5fa', icon: 'ℹ️' },
        error:   { bg: '#FAF0F0', border: '#f87171', icon: '❌' },
      },
      static_styles: {
        container: 'border-radius:0 16px 16px 0;padding:1rem 1.25rem;margin:1.5rem 0',
        header: 'display:flex;align-items:center;gap:0.5rem',
        body: 'font-size:0.9375rem;line-height:1.7;color:#1A1A1A',
      },
    },
  },
};

test('renderCallout default type is info', () => {
  const html = renderers.Callout({}, '<p>hello</p>', snapshot);
  assert.ok(html.includes('#EEF4FA'));
  assert.ok(html.includes('ℹ️'));
  assert.ok(html.includes('<p>hello</p>'));
});

test('renderCallout with type=tip', () => {
  const html = renderers.Callout({ type: 'tip' }, '<p>x</p>', snapshot);
  assert.ok(html.includes('#EFF6F0'));
  assert.ok(html.includes('💡'));
});

test('renderCallout with title escapes HTML', () => {
  const html = renderers.Callout({ type: 'warning', title: '<script>' }, '', snapshot);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('renderCallout without title omits title element', () => {
  const html = renderers.Callout({ type: 'info' }, '', snapshot);
  assert.ok(!html.includes('<strong'));
});

test('renderCallout invalid type throws', () => {
  assert.throws(() => renderers.Callout({ type: 'warn' }, '', snapshot), /invalid.*type/i);
});

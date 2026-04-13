import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers } from '../src/lib/component-renderers.mjs';

const snapshot = {
  components: {
    Timeline: {
      static_styles: {
        wrapper: 'margin:1.5rem 0;padding-left:1rem',
        step: 'display:flex;gap:1rem',
        step_number: 'width:2rem;height:2rem;border-radius:50%;background:#D4845A;color:#FAF9F6;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0',
        step_connector: 'width:2px;flex-grow:1;background:#E8E5E0;margin-top:0.5rem',
        step_content: 'padding-top:0.25rem',
        step_title: 'font-size:1rem;font-weight:600;color:#1A1A1A;margin:0',
        step_desc: 'font-size:0.875rem;color:#6B6560;margin-top:0.375rem;line-height:1.6',
      },
    },
  },
};

test('renderTimeline with 3 steps', () => {
  const steps = [
    { title: 'Step 1', description: 'First' },
    { title: 'Step 2', description: 'Second' },
    { title: 'Step 3' },
  ];
  const html = renderers.Timeline({ steps }, '', snapshot);
  assert.ok(html.includes('Step 1'));
  assert.ok(html.includes('First'));
  assert.ok(html.includes('Step 3'));
  assert.ok(html.includes('>1<'));
  assert.ok(html.includes('>3<'));
});

test('renderTimeline parses JSON string steps', () => {
  const json = '[{"title":"A"},{"title":"B"}]';
  const html = renderers.Timeline({ steps: json }, '', snapshot);
  assert.ok(html.includes('A'));
  assert.ok(html.includes('B'));
});

test('renderTimeline empty returns empty string', () => {
  const html = renderers.Timeline({ steps: [] }, '', snapshot);
  assert.equal(html, '');
});

test('renderTimeline escapes HTML', () => {
  const html = renderers.Timeline({ steps: [{ title: '<x>', description: '<y>' }] }, '', snapshot);
  assert.ok(html.includes('&lt;x&gt;'));
  assert.ok(html.includes('&lt;y&gt;'));
});

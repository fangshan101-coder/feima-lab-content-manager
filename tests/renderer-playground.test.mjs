import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers } from '../src/lib/component-renderers.mjs';

const snapshot = {
  components: {
    Playground: {
      static_styles: {
        wrapper: 'margin:1.5rem 0;border-radius:16px;border:1px solid #E8E5E0;overflow:hidden',
        title_bar: 'display:flex;align-items:center;justify-content:space-between;padding:0.625rem 1rem;background:#1A1A1A',
        title_text: 'font-size:0.8125rem;color:#9B9590',
        button_group: 'display:flex;gap:0.5rem',
        button_copy: 'padding:0.25rem 0.75rem;font-size:0.75rem;color:#FAF9F6;background:#2A2A2A;border:1px solid #444;border-radius:6px;cursor:pointer',
        button_run: 'padding:0.25rem 0.75rem;font-size:0.75rem;color:#FAF9F6;background:#D4845A;border:none;border-radius:6px;cursor:pointer',
        code_area: 'margin:0;padding:1.25rem;background:#1A1A1A;color:#FAF9F6;font-size:0.875rem;line-height:1.6;overflow-x:auto',
        output_area: 'padding:1rem;background:#F3F1ED;border-top:1px solid #E8E5E0;font-size:0.875rem;font-family:monospace;color:#1A1A1A;white-space:pre-wrap',
      },
      interactive: true,
      js_behavior_key: 'playground',
    },
  },
};

test('renderPlayground with code', () => {
  const html = renderers.Playground(
    { code: 'console.log(1)', language: 'javascript', title: 'demo' },
    '',
    snapshot
  );
  assert.ok(html.includes('data-component="playground"'));
  assert.ok(html.includes('console.log(1)'));
  assert.ok(html.includes('demo'));
  assert.ok(html.includes('复制'));
});

test('renderPlayground with output shows run button', () => {
  const html = renderers.Playground(
    { code: 'x', output: '1' },
    '',
    snapshot
  );
  assert.ok(html.includes('运行'));
  assert.ok(html.includes('data-role="output"'));
});

test('renderPlayground without code returns empty', () => {
  assert.equal(renderers.Playground({}, '', snapshot), '');
});

test('renderPlayground unescapes \\n to newline in code', () => {
  const html = renderers.Playground({ code: 'a\\nb' }, '', snapshot);
  assert.ok(html.includes('a\nb'));
});

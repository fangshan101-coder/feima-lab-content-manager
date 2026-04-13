import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers } from '../src/lib/component-renderers.mjs';

const snapshot = {
  components: {
    CodeTabs: {
      static_styles: {
        wrapper: 'margin:1.5rem 0;border-radius:16px;overflow:hidden;border:1px solid #E8E5E0',
        tab_bar: 'display:flex;background:#F3F1ED;border-bottom:1px solid #E8E5E0',
        tab: 'padding:0.625rem 1.25rem;font-size:0.8125rem;border:none;background:transparent;cursor:pointer',
        tab_active: 'font-weight:600;color:#D4845A;background:#FFFFFF;border-bottom:2px solid #D4845A',
        panel: '',
      },
      interactive: true,
      js_behavior_key: 'code-tabs',
    },
  },
};

test('renderCodeTabs emits data-component and data-props', () => {
  const html = renderers.CodeTabs(
    { tabs: '["Python","JS"]' },
    '<pre>a</pre><pre>b</pre>',
    snapshot
  );
  assert.ok(html.includes('data-component="code-tabs"'));
  assert.ok(html.includes('data-props='));
  assert.ok(html.includes('Python'));
  assert.ok(html.includes('JS'));
  assert.ok(html.includes('<pre>a</pre>'));
  assert.ok(html.includes('<pre>b</pre>'));
});

test('renderCodeTabs auto labels when tabs missing', () => {
  const html = renderers.CodeTabs({}, '<pre>a</pre><pre>b</pre>', snapshot);
  assert.ok(html.includes('Tab 1'));
  assert.ok(html.includes('Tab 2'));
});

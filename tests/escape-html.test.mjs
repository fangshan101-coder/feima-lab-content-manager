import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/lib/component-renderers.mjs';

test('escapes < > &', () => {
  assert.equal(escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');
});

test('handles empty string', () => {
  assert.equal(escapeHtml(''), '');
});

test('handles undefined as empty', () => {
  assert.equal(escapeHtml(undefined), '');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers, UnknownComponentError } from '../src/lib/component-renderers.mjs';

test('all 7 components registered', () => {
  const expected = ['Callout', 'CodeTabs', 'Collapse', 'CompareCard', 'Timeline', 'ImageCarousel', 'Playground'];
  for (const name of expected) {
    assert.equal(typeof renderers[name], 'function', `${name} not registered`);
  }
});

test('UnknownComponentError has componentName', () => {
  const err = new UnknownComponentError('Foo');
  assert.equal(err.componentName, 'Foo');
  assert.equal(err.code, 'UNKNOWN_COMPONENT');
});

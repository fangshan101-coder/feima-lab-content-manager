import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildInteractiveScript, BEHAVIOR_KEYS } from '../src/lib/interactive-js.mjs';

test('BEHAVIOR_KEYS has 4 entries', () => {
  assert.deepEqual(new Set(BEHAVIOR_KEYS), new Set(['collapse', 'code-tabs', 'image-carousel', 'playground']));
});

test('buildInteractiveScript empty set returns empty string', () => {
  assert.equal(buildInteractiveScript(new Set()), '');
});

test('buildInteractiveScript includes only requested behaviors', () => {
  const js = buildInteractiveScript(new Set(['collapse']));
  assert.ok(js.includes('bindCollapse'));
  assert.ok(!js.includes('bindPlayground'));
  assert.ok(js.includes('<script>'));
  assert.ok(js.includes('</script>'));
});

test('buildInteractiveScript always includes bootstrap', () => {
  const js = buildInteractiveScript(new Set(['code-tabs']));
  assert.ok(js.includes('querySelectorAll'));
});

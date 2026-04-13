import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStyleBlock } from '../src/lib/base-styles.mjs';

const fakeSnapshot = {
  tokens: {
    colors: { brand: '#D4845A', 'bg-primary': '#FAF9F6' },
    radius: { md: '16px' },
    fonts: { sans: "'Inter', sans-serif" },
  },
  article_base_css: '.article-content { color: #1A1A1A; }',
};

test('buildStyleBlock includes article_base_css', () => {
  const html = buildStyleBlock(fakeSnapshot);
  assert.ok(html.includes('.article-content { color: #1A1A1A; }'));
});

test('buildStyleBlock includes token-derived CSS variables', () => {
  const html = buildStyleBlock(fakeSnapshot);
  assert.ok(html.includes('--color-brand: #D4845A'));
  assert.ok(html.includes('--color-bg-primary: #FAF9F6'));
  assert.ok(html.includes('--radius-md: 16px'));
});

test('buildStyleBlock wraps in <style> tag', () => {
  const html = buildStyleBlock(fakeSnapshot);
  assert.match(html, /^<style>/);
  assert.match(html, /<\/style>$/);
});

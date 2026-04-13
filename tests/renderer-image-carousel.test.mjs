import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderers } from '../src/lib/component-renderers.mjs';

const snapshot = {
  components: {
    ImageCarousel: {
      static_styles: {
        wrapper: 'margin:1.5rem 0',
        frame: 'position:relative;border-radius:16px;overflow:hidden;background:#F3F1ED',
        image: 'width:100%;height:auto',
        nav_button: 'position:absolute;top:50%;transform:translateY(-50%);width:2.5rem;height:2.5rem;border-radius:50%;border:none;background:rgba(255,255,255,0.85);cursor:pointer;z-index:2',
        nav_button_prev: 'left:0.75rem',
        nav_button_next: 'right:0.75rem',
        caption: 'text-align:center;font-size:0.8125rem;color:#9B9590;margin-top:0.75rem',
        dots: 'display:flex;justify-content:center;gap:0.5rem;margin-top:0.75rem',
        dot: 'width:0.5rem;height:0.5rem;border-radius:50%;border:none;background:#E8E5E0;cursor:pointer',
        dot_active: 'background:#D4845A',
      },
      interactive: true,
      js_behavior_key: 'image-carousel',
    },
  },
};

test('renderImageCarousel with 3 images', () => {
  const images = [
    { src: './images/a.png', alt: 'A', caption: 'First' },
    { src: './images/b.png' },
    { src: './images/c.png' },
  ];
  const html = renderers.ImageCarousel({ images }, '', snapshot);
  assert.ok(html.includes('data-component="image-carousel"'));
  assert.ok(html.includes('./images/a.png'));
  assert.ok(html.includes('./images/b.png'));
  assert.ok(html.includes('./images/c.png'));
  assert.ok(html.includes('First'));
});

test('renderImageCarousel with 1 image hides nav', () => {
  const html = renderers.ImageCarousel({ images: [{ src: 'x.png' }] }, '', snapshot);
  assert.ok(!html.includes('fmx-nav-prev'));
});

test('renderImageCarousel parses JSON string images', () => {
  const json = '[{"src":"a.png"},{"src":"b.png"}]';
  const html = renderers.ImageCarousel({ images: json }, '', snapshot);
  assert.ok(html.includes('a.png'));
  assert.ok(html.includes('b.png'));
});

test('renderImageCarousel empty returns empty', () => {
  assert.equal(renderers.ImageCarousel({ images: [] }, '', snapshot), '');
});

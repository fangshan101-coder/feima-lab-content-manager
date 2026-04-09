/**
 * Generate a <style> block that reproduces feima-lab article styles.
 * Inputs: parsed feima-style-snapshot.json
 * Output: self-contained <style>...</style> string for preview.html
 */
export function buildStyleBlock(snapshot) {
  const tokenCss = [];
  tokenCss.push(':root {');
  for (const [k, v] of Object.entries(snapshot.tokens.colors || {})) {
    tokenCss.push(`  --color-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(snapshot.tokens.radius || {})) {
    tokenCss.push(`  --radius-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(snapshot.tokens.fonts || {})) {
    tokenCss.push(`  --font-${k}: ${v};`);
  }
  tokenCss.push('}');

  return `<style>${tokenCss.join('\n')}\n${snapshot.article_base_css}</style>`;
}

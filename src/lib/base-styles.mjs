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
  if (snapshot.tokens.shadows) {
    for (const [k, v] of Object.entries(snapshot.tokens.shadows)) {
      tokenCss.push(`  --shadow-${k}: ${v};`);
    }
  }
  tokenCss.push('}');

  // Hover affordance for card-style components. Inline style can't express
  // :hover, so we inject real CSS rules here targeting the .fmx-* classes
  // the renderers already output. Shadow goes from --shadow-sm → --shadow-md
  // over 0.25s ease. Timeline is excluded (it's not a card).
  //
  // !important is required on the :hover box-shadow because inline style has
  // higher specificity than CSS rules without !important, and the renderers
  // set box-shadow via inline style on these containers. Without !important
  // the hover rule gets shadowed (no pun intended) by the inline value.
  const hoverCss = `
.fmx-callout,
.fmx-collapse,
.fmx-code-tabs,
.fmx-playground,
.fmx-video,
.fmx-image-carousel > div:first-child,
.fmx-compare-card > div {
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}
.fmx-callout:hover,
.fmx-collapse:hover,
.fmx-code-tabs:hover,
.fmx-playground:hover,
.fmx-video:hover,
.fmx-image-carousel > div:first-child:hover,
.fmx-compare-card > div:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10), 0 3px 10px rgba(0, 0, 0, 0.05) !important;
}
`;

  // MDX code blocks inside CodeTabs become <pre>, which inherit the
  // .article-content pre global rule (margin 1.5em, border-radius 20px).
  // That creates white strips and rounded corners inside the CodeTabs wrapper.
  // Override with a more specific selector (no !important needed since
  // specificity is higher than .article-content pre).
  //
  // Playground's own <pre> already has inline border-radius:0 + margin:0, so
  // doesn't need this — but we add .fmx-playground pre defensively in case
  // a user ever nests code inside Playground children.
  const innerCodeBlockCss = `
.article-content .fmx-code-tabs pre,
.article-content .fmx-playground pre {
  margin: 0;
  border-radius: 0;
}
`;

  return `<style>${tokenCss.join('\n')}\n${snapshot.article_base_css}\n${hoverCss}${innerCodeBlockCss}</style>`;
}

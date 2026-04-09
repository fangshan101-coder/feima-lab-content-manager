/**
 * HTML renderers for each feima-lab MDX component.
 * Each renderer: (props, childrenHtml, snapshot) => html string
 */

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Registry populated below
export const renderers = {};

// Unknown component sentinel
export class UnknownComponentError extends Error {
  constructor(name) {
    super(`未知组件 <${name}>。可用组件：${Object.keys(renderers).join(', ')}`);
    this.code = 'UNKNOWN_COMPONENT';
    this.componentName = name;
  }
}

// ---------------- uid helper (used by interactive components) ----------------
let _uidCounter = 0;
function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${_uidCounter++}`; }
export function resetUid() { _uidCounter = 0; }

// ---------------- Callout ----------------
const CALLOUT_TYPES = ['tip', 'warning', 'info', 'error'];

renderers.Callout = function renderCallout(props, childrenHtml, snapshot) {
  const type = props.type ?? 'info';
  if (!CALLOUT_TYPES.includes(type)) {
    throw new Error(`Callout: invalid type "${type}". Expected one of ${CALLOUT_TYPES.join('/')}`);
  }
  const spec = snapshot.components.Callout;
  const variant = spec.variants[type];
  const containerStyle = `background:${variant.bg};border-left:4px solid ${variant.border};${spec.static_styles.container}`;
  const headerStyle = spec.static_styles.header;
  const bodyStyle = spec.static_styles.body;

  const titleHtml = props.title
    ? `<strong style="font-size:0.9375rem">${escapeHtml(props.title)}</strong>`
    : '';

  return `<div class="fmx-callout" style="${containerStyle}">`
    + `<div style="${headerStyle}${props.title ? ';margin-bottom:0.5rem' : ''}">`
    + `<span>${variant.icon}</span>${titleHtml}`
    + `</div>`
    + `<div style="${bodyStyle}">${childrenHtml}</div>`
    + `</div>`;
};

// ---------------- CompareCard ----------------
function parseSide(val) {
  if (!val) return { title: '', items: [] };
  if (typeof val === 'object' && 'title' in val) return val;
  try { return JSON.parse(String(val)); }
  catch { return { title: '', items: [] }; }
}

renderers.CompareCard = function renderCompareCard(props, _childrenHtml, snapshot) {
  const left = parseSide(props.left);
  const right = parseSide(props.right);
  const s = snapshot.components.CompareCard.static_styles;

  function renderSide(side, which) {
    const bgStyle = which === 'left' ? s.card_left_bg : s.card_right_bg;
    const items = (side.items || []).map((item, i, arr) => {
      const borderStyle = i < arr.length - 1 ? ';border-bottom:1px solid rgba(0,0,0,0.06)' : '';
      return `<li style="${s.list_item}${borderStyle}">${escapeHtml(item)}</li>`;
    }).join('');
    return `<div style="${bgStyle};${s.card}">`
      + `<h4 style="${s.title}">${escapeHtml(side.title)}</h4>`
      + `<ul style="${s.list}">${items}</ul>`
      + `</div>`;
  }

  return `<div class="fmx-compare-card" style="${s.grid}">${renderSide(left, 'left')}${renderSide(right, 'right')}</div>`;
};

// ---------------- Timeline ----------------
function parseSteps(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(String(val)); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

renderers.Timeline = function renderTimeline(props, _childrenHtml, snapshot) {
  const steps = parseSteps(props.steps);
  if (steps.length === 0) return '';
  const s = snapshot.components.Timeline.static_styles;

  const items = steps.map((step, i) => {
    const isLast = i === steps.length - 1;
    const connector = isLast ? '' : `<div style="${s.step_connector}"></div>`;
    const desc = step.description
      ? `<p style="${s.step_desc}">${escapeHtml(step.description)}</p>`
      : '';
    const bottomPad = isLast ? '' : ';padding-bottom:1.5rem';
    return `<div style="${s.step}${bottomPad}">`
      + `<div style="display:flex;flex-direction:column;align-items:center">`
      + `<div style="${s.step_number}">${i + 1}</div>${connector}</div>`
      + `<div style="${s.step_content}">`
      + `<h4 style="${s.step_title}">${escapeHtml(step.title)}</h4>${desc}</div>`
      + `</div>`;
  }).join('');

  return `<div class="fmx-timeline" style="${s.wrapper}">${items}</div>`;
};

// ---------------- CodeTabs ----------------
function parseTabs(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(String(val)); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

renderers.CodeTabs = function renderCodeTabs(props, childrenHtml, snapshot) {
  const tabs = parseTabs(props.tabs);
  const s = snapshot.components.CodeTabs.static_styles;
  const id = uid('code-tabs');

  const displayTabs = tabs.length > 0 ? tabs : ['Tab 1', 'Tab 2', 'Tab 3', 'Tab 4', 'Tab 5'];
  const tabBarHtml = displayTabs.map((t, i) => {
    const active = i === 0 ? s.tab_active : '';
    return `<button type="button" style="${s.tab};${active}" data-tab-index="${i}">${escapeHtml(t)}</button>`;
  }).join('');

  const dataProps = JSON.stringify({ tabs: displayTabs });

  return `<div class="fmx-code-tabs" data-component="code-tabs" data-id="${id}" data-props='${escapeHtml(dataProps)}' style="${s.wrapper}">`
    + `<div class="fmx-tab-bar" style="${s.tab_bar}">${tabBarHtml}</div>`
    + `<div class="fmx-panels">${childrenHtml}</div>`
    + `</div>`;
};

// ---------------- Collapse ----------------
renderers.Collapse = function renderCollapse(props, childrenHtml, snapshot) {
  const s = snapshot.components.Collapse.static_styles;
  const id = uid('collapse');
  const defaultOpen = props.defaultOpen === true || props.defaultOpen === 'true';
  const title = props.title ?? '';

  return `<div class="fmx-collapse" data-component="collapse" data-id="${id}" data-default-open="${defaultOpen}" style="${s.wrapper}">`
    + `<button type="button" data-role="header" style="${s.header}">`
    + `<span>${escapeHtml(title)}</span>`
    + `<span data-role="icon" style="${s.icon}">▼</span>`
    + `</button>`
    + `<div data-role="body" style="${s.body};display:${defaultOpen ? 'block' : 'none'}">${childrenHtml}</div>`
    + `</div>`;
};

// ---------------- ImageCarousel ----------------
function parseImages(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(String(val)); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

renderers.ImageCarousel = function renderImageCarousel(props, _childrenHtml, snapshot) {
  const images = parseImages(props.images);
  if (images.length === 0) return '';
  const s = snapshot.components.ImageCarousel.static_styles;
  const id = uid('image-carousel');

  const imgs = images.map((img, i) => {
    const active = i === 0 ? '1' : '0';
    const pos = i === 0 ? 'relative' : 'absolute';
    return `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '')}" style="${s.image};display:block;position:${pos};top:0;left:0;opacity:${active};transition:opacity 0.3s ease" data-index="${i}">`;
  }).join('');

  const navHtml = images.length > 1
    ? `<button type="button" class="fmx-nav-prev" style="${s.nav_button};${s.nav_button_prev}" data-role="prev">←</button>`
      + `<button type="button" class="fmx-nav-next" style="${s.nav_button};${s.nav_button_next}" data-role="next">→</button>`
    : '';

  const dotsHtml = images.length > 1
    ? `<div style="${s.dots}">` + images.map((_, i) =>
        `<button type="button" style="${s.dot}${i === 0 ? ';' + s.dot_active : ''}" data-role="dot" data-index="${i}"></button>`
      ).join('') + `</div>`
    : '';

  const captionHtml = images[0].caption
    ? `<p data-role="caption" style="${s.caption}">${escapeHtml(images[0].caption)}</p>`
    : `<p data-role="caption" style="${s.caption};display:none"></p>`;

  const dataProps = JSON.stringify({ images });

  return `<div class="fmx-image-carousel" data-component="image-carousel" data-id="${id}" data-props='${escapeHtml(dataProps)}' style="${s.wrapper}">`
    + `<div style="${s.frame}"><div style="position:relative">${imgs}</div>${navHtml}</div>`
    + captionHtml
    + dotsHtml
    + `</div>`;
};

// ---------------- Playground ----------------
renderers.Playground = function renderPlayground(props, _childrenHtml, snapshot) {
  const rawCode = props.code || '';
  const displayCode = String(rawCode).replace(/\\n/g, '\n');
  if (!displayCode) return '';

  const s = snapshot.components.Playground.static_styles;
  const id = uid('playground');
  const language = props.language || 'javascript';
  const title = props.title || `${language} playground`;
  const output = props.output;

  const runBtn = output
    ? `<button type="button" data-role="run" style="${s.button_run}">▶ 运行</button>`
    : '';

  const outputHtml = output
    ? `<div data-role="output" style="${s.output_area};display:none">`
      + `<div style="font-size:0.75rem;color:#9B9590;margin-bottom:0.5rem">输出:</div>`
      + escapeHtml(output)
      + `</div>`
    : '';

  const dataProps = JSON.stringify({ code: displayCode, output: output ?? null });

  return `<div class="fmx-playground" data-component="playground" data-id="${id}" data-props='${escapeHtml(dataProps)}' style="${s.wrapper}">`
    + `<div style="${s.title_bar}">`
    + `<span style="${s.title_text}">${escapeHtml(title)}</span>`
    + `<div style="${s.button_group}">`
    + `<button type="button" data-role="copy" style="${s.button_copy}">复制</button>${runBtn}`
    + `</div></div>`
    + `<pre style="${s.code_area}"><code>${escapeHtml(displayCode)}</code></pre>`
    + outputHtml
    + `</div>`;
};

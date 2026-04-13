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
// v1.3: 白底 + 全边框 + 左上角彩色圆点 badge（对齐 feima-lab 首页卡片风格）
const CALLOUT_TYPES = ['tip', 'warning', 'info', 'error'];

renderers.Callout = function renderCallout(props, childrenHtml, snapshot) {
  const type = props.type ?? 'info';
  if (!CALLOUT_TYPES.includes(type)) {
    throw new Error(`Callout: invalid type "${type}". Expected one of ${CALLOUT_TYPES.join('/')}`);
  }
  const spec = snapshot.components.Callout;
  const variant = spec.variants[type];
  const s = spec.static_styles;

  // 圆点 badge 的背景色由 variant.accent 决定
  const dotStyle = `${s.badge_dot};background:${variant.accent}`;

  const titleHtml = props.title
    ? `<strong style="${s.title}">${escapeHtml(props.title)}</strong>`
    : '';

  const headerWithSpacing = props.title
    ? `${s.header};margin-bottom:0.625rem`
    : s.header;

  return `<div class="fmx-callout" data-type="${type}" style="${s.container}">`
    + `<div style="${headerWithSpacing}">`
    + `<span aria-hidden="true" style="${dotStyle}"></span>`
    + `<span style="${s.icon}">${variant.icon}</span>`
    + titleHtml
    + `</div>`
    + `<div style="${s.body}">${childrenHtml}</div>`
    + `</div>`;
};

// ---------------- CompareCard ----------------
function parseSide(val) {
  if (!val) return { title: '', items: [] };
  if (typeof val === 'object' && 'title' in val) return val;
  try { return JSON.parse(String(val)); }
  catch { return { title: '', items: [] }; }
}

// v1.3: 白底双卡 + 全边框 + title 前竖条 badge（左蓝右绿降饱和）
renderers.CompareCard = function renderCompareCard(props, _childrenHtml, snapshot) {
  const left = parseSide(props.left);
  const right = parseSide(props.right);
  const s = snapshot.components.CompareCard.static_styles;

  function renderSide(side, which) {
    const badgeStyle = which === 'left' ? s.badge_left : s.badge_right;
    const items = (side.items || []).map((item, i, arr) => {
      const borderStyle = i < arr.length - 1 ? ';border-bottom:1px solid #F0EDEA' : '';
      return `<li style="${s.list_item}${borderStyle}">${escapeHtml(item)}</li>`;
    }).join('');
    return `<div style="${s.card}">`
      + `<div style="${s.header}">`
      + `<span aria-hidden="true" style="${badgeStyle}"></span>`
      + `<h4 style="${s.title}">${escapeHtml(side.title)}</h4>`
      + `</div>`
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

  // Set the initial rotation in inline style so there's no flash-of-wrong-state
  // before interactive-js runs. Matches bindCollapse: 0deg when open, 90deg (CW, ◀)
  // when closed.
  const initialRotation = defaultOpen ? 'rotate(0deg)' : 'rotate(90deg)';

  return `<div class="fmx-collapse" data-component="collapse" data-id="${id}" data-default-open="${defaultOpen}" style="${s.wrapper}">`
    + `<button type="button" data-role="header" style="${s.header}">`
    + `<span>${escapeHtml(title)}</span>`
    + `<span data-role="icon" style="${s.icon};transform:${initialRotation}">▼</span>`
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

// ---------------- Video (v1.3) ----------------
// 支持 YouTube / Bilibili 自动转成 embed iframe；其他 src 直接用 <video>
function parseVideoSrc(src) {
  if (!src) return { kind: 'none', embedSrc: null };
  if (/youtube\.com|youtu\.be/.test(src)) {
    const m = src.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    if (m) return { kind: 'iframe', embedSrc: `https://www.youtube.com/embed/${m[1]}` };
  }
  if (/bilibili\.com/.test(src)) {
    const m = src.match(/\/(BV[\w]+)/);
    if (m) return { kind: 'iframe', embedSrc: `https://player.bilibili.com/player.html?bvid=${m[1]}&high_quality=1&autoplay=0` };
  }
  return { kind: 'native', embedSrc: null };
}

function boolProp(v) {
  return v === true || v === 'true' || v === '';
}

renderers.Video = function renderVideo(props, _childrenHtml, snapshot) {
  if (!props.src) return '';
  const s = snapshot.components.Video.static_styles;
  const { kind, embedSrc } = parseVideoSrc(String(props.src));

  const mediaHtml = kind === 'iframe' && embedSrc
    ? `<iframe src="${escapeHtml(embedSrc)}" style="${s.media}" `
      + `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" `
      + `referrerpolicy="strict-origin-when-cross-origin" `
      + `allowfullscreen></iframe>`
    : (() => {
        const autoplay = boolProp(props.autoplay);
        const loop = boolProp(props.loop);
        // autoplay 隐含 muted（浏览器要求）
        const muted = boolProp(props.muted) || autoplay;
        const controls = props.controls === undefined ? true : boolProp(props.controls);
        const attrs = [
          `src="${escapeHtml(String(props.src))}"`,
          props.poster ? `poster="${escapeHtml(String(props.poster))}"` : '',
          controls ? 'controls' : '',
          autoplay ? 'autoplay' : '',
          loop ? 'loop' : '',
          muted ? 'muted' : '',
          'playsinline',
          `style="${s.media}"`,
        ].filter(Boolean).join(' ');
        return `<video ${attrs}></video>`;
      })();

  const captionHtml = props.caption
    ? `<figcaption style="${s.caption}">${escapeHtml(String(props.caption))}</figcaption>`
    : '';

  return `<figure class="fmx-video" style="${s.wrapper}">`
    + `<div style="${s.frame}">${mediaHtml}</div>`
    + captionHtml
    + `</figure>`;
};

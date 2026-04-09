/**
 * Vanilla JS behaviors for interactive components.
 * Output: <script>...</script> string for preview.html footer.
 */

export const BEHAVIOR_KEYS = ['collapse', 'code-tabs', 'image-carousel', 'playground'];

const BEHAVIORS = {
  collapse: `
function bindCollapse(el) {
  var btn = el.querySelector('[data-role="header"]');
  var body = el.querySelector('[data-role="body"]');
  var icon = el.querySelector('[data-role="icon"]');
  var open = el.dataset.defaultOpen === 'true';
  body.style.display = open ? 'block' : 'none';
  if (icon) icon.style.transform = open ? 'rotate(0deg)' : 'rotate(-90deg)';
  btn.addEventListener('click', function() {
    open = !open;
    body.style.display = open ? 'block' : 'none';
    if (icon) icon.style.transform = open ? 'rotate(0deg)' : 'rotate(-90deg)';
  });
}`,
  'code-tabs': `
function bindCodeTabs(el) {
  var tabs = el.querySelectorAll('[data-tab-index]');
  var panels = el.querySelectorAll('.fmx-panels > *');
  panels.forEach(function(p, i) { p.style.display = i === 0 ? 'block' : 'none'; });
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var idx = parseInt(tab.dataset.tabIndex, 10);
      tabs.forEach(function(t, i) {
        var active = i === idx;
        t.style.fontWeight = active ? '600' : '400';
        t.style.color = active ? '#D4845A' : '#6B6560';
        t.style.background = active ? '#FFFFFF' : 'transparent';
        t.style.borderBottom = active ? '2px solid #D4845A' : '2px solid transparent';
      });
      panels.forEach(function(p, i) { p.style.display = i === idx ? 'block' : 'none'; });
    });
  });
}`,
  'image-carousel': `
function bindImageCarousel(el) {
  var props;
  try { props = JSON.parse(el.dataset.props); } catch (e) { return; }
  var images = props.images || [];
  var current = 0;
  var imgs = el.querySelectorAll('img[data-index]');
  var caption = el.querySelector('[data-role="caption"]');
  var dots = el.querySelectorAll('[data-role="dot"]');

  function update(i) {
    current = (i + images.length) % images.length;
    imgs.forEach(function(img, j) { img.style.opacity = j === current ? '1' : '0'; });
    if (caption) {
      var cap = images[current].caption;
      if (cap) { caption.textContent = cap; caption.style.display = 'block'; }
      else { caption.style.display = 'none'; }
    }
    dots.forEach(function(d, j) { d.style.background = j === current ? '#D4845A' : '#E8E5E0'; });
  }

  images.forEach(function(img) { var p = new Image(); p.src = img.src; });

  var prev = el.querySelector('[data-role="prev"]');
  var next = el.querySelector('[data-role="next"]');
  if (prev) prev.addEventListener('click', function() { update(current - 1); });
  if (next) next.addEventListener('click', function() { update(current + 1); });
  dots.forEach(function(d) {
    d.addEventListener('click', function() { update(parseInt(d.dataset.index, 10)); });
  });
}`,
  playground: `
function bindPlayground(el) {
  var props;
  try { props = JSON.parse(el.dataset.props); } catch (e) { return; }
  var copyBtn = el.querySelector('[data-role="copy"]');
  var runBtn = el.querySelector('[data-role="run"]');
  var output = el.querySelector('[data-role="output"]');
  if (copyBtn) copyBtn.addEventListener('click', function() {
    if (navigator.clipboard) navigator.clipboard.writeText(props.code);
  });
  if (runBtn && output) {
    var shown = false;
    runBtn.addEventListener('click', function() {
      shown = !shown;
      output.style.display = shown ? 'block' : 'none';
      runBtn.textContent = shown ? '隐藏输出' : '▶ 运行';
    });
  }
}`,
};

const BOOTSTRAP = `
(function() {
  var handlers = {
__HANDLERS__
  };
  document.querySelectorAll('[data-component]').forEach(function(el) {
    var h = handlers[el.dataset.component];
    if (h) h(el);
  });
})();`;

export function buildInteractiveScript(usedSet) {
  if (!usedSet || usedSet.size === 0) return '';
  const fns = [];
  const handlerLines = [];
  for (const key of usedSet) {
    if (!BEHAVIORS[key]) continue;
    fns.push(BEHAVIORS[key]);
    const fnName = 'bind' + key.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
    handlerLines.push(`    '${key}': ${fnName}`);
  }
  const boot = BOOTSTRAP.replace('__HANDLERS__', handlerLines.join(',\n'));
  return `<script>${fns.join('\n')}${boot}</script>`;
}

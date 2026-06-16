import { bindLhScoreTooltips } from './visualizations.js';

export function initLhStepGuide(section) {
  if (!section || section._lhGuideBound) return;
  section._lhGuideBound = true;

  const root = section.querySelector('.lh-dock-mount .devtools-shell') || section.querySelector('.lighthouse-dock');
  if (!root) return;

  root.querySelectorAll('[data-lh-step]').forEach((el) => {
    el.classList.remove('is-highlighted');
  });
  root.querySelector('.lh-step-config')?.classList.add('is-highlighted');

  const opp = root.querySelector('.lh-opportunities');
  if (opp) {
    opp.hidden = true;
    opp.classList.remove('visible');
  }
  root.querySelector('.lh-report')?.classList.remove('visible');
  root.querySelector('.lh-score-legend')?.classList.remove('is-highlighted');
}

export function initPerfStepGuide(section) {
  if (!section || section._perfGuideBound) return;
  section._perfGuideBound = true;

  const root = section.querySelector('.perf-panel-mount .perf-shell')
    || section.querySelector('.dt-perf-panel')?.closest('.devtools-shell');
  if (!root) return;

  root.querySelectorAll('[data-perf-step]').forEach((el) => {
    el.classList.remove('is-highlighted');
  });

  root.querySelector('.perf-step-frames')?.classList.add('is-highlighted');
  root.querySelector('.perf-step-longtask')?.classList.add('is-highlighted');
  root.querySelector('.perf-step-stack')?.classList.add('is-highlighted');
}

export function bindLhDockExtras(container) {
  if (!container) return;
  bindLhScoreTooltips(container);
}

function restartVizAnim(root) {
  if (!root) return;
  root.classList.remove('anim-run');
  void root.offsetWidth;
  root.classList.add('anim-run');
}

function parseCssTimeMs(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (raw.endsWith('ms')) return parseFloat(raw) || fallback;
  if (raw.endsWith('s')) return (parseFloat(raw) || 0) * 1000;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseCssPercent(value, fallback) {
  const n = parseFloat(String(value || '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function inpMsAtPhase(phaseMs, startMs, endMs, targetMs) {
  if (phaseMs < startMs) return 0;
  if (phaseMs >= endMs) return targetMs;
  const progress = (phaseMs - startMs) / (endMs - startMs);
  return Math.min(targetMs, Math.max(0, Math.round(progress * targetMs)));
}

function readInpTiming(root) {
  const style = getComputedStyle(root);
  const cycleMs = parseCssTimeMs(style.getPropertyValue('--inp-cycle'), 6000);
  const startPct = parseCssPercent(style.getPropertyValue('--inp-t-start'), 10);
  const beforeEndPct = parseCssPercent(style.getPropertyValue('--inp-t-before-done'), 50);
  const afterEndPct = parseCssPercent(style.getPropertyValue('--inp-t-after-done'), 19.14);
  return {
    cycleMs,
    startMs: cycleMs * startPct / 100,
    beforeEndMs: cycleMs * beforeEndPct / 100,
    afterEndMs: cycleMs * afterEndPct / 100,
    beforeTarget: 350,
    afterTarget: 80,
  };
}

function setInpCounterText(els, ms) {
  els.forEach(el => { if (el) el.textContent = String(ms); });
}

function resetInpCounterText(root) {
  root.querySelectorAll('.inp-block-ms, .inp-tag-ms').forEach(el => {
    el.textContent = '0';
  });
}

function stopInpCounterLoop(root) {
  if (root?._inpCounterRaf) {
    cancelAnimationFrame(root._inpCounterRaf);
    root._inpCounterRaf = 0;
  }
}

function startInpCounterLoop(root) {
  stopInpCounterLoop(root);
  if (!root) return;

  const timing = readInpTiming(root);
  const beforeEls = [
    root.querySelector('.metric-row.before .inp-block-ms'),
    root.querySelector('.metric-row.before .inp-tag-ms'),
  ];
  const afterEls = [
    root.querySelector('.metric-row.after .inp-block-ms'),
    root.querySelector('.metric-row.after .inp-tag-ms'),
  ];

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInpCounterText(beforeEls, timing.beforeTarget);
    setInpCounterText(afterEls, timing.afterTarget);
    return;
  }

  const t0 = performance.now();

  function tick(now) {
    if (!root.classList.contains('anim-run')) return;

    const phase = (now - t0) % timing.cycleMs;
    const beforeMs = inpMsAtPhase(phase, timing.startMs, timing.beforeEndMs, timing.beforeTarget);
    const afterMs = inpMsAtPhase(phase, timing.startMs, timing.afterEndMs, timing.afterTarget);

    setInpCounterText(beforeEls, beforeMs);
    setInpCounterText(afterEls, afterMs);

    root._inpCounterRaf = requestAnimationFrame(tick);
  }

  resetInpCounterText(root);
  root._inpCounterRaf = requestAnimationFrame(tick);
}

function clsScoreFromSteps(phasePct, steps) {
  let score = 0;
  for (const step of steps) {
    if (phasePct < step.atPct) continue;
    if (phasePct >= step.endPct) {
      score = step.to;
      continue;
    }
    const progress = (phasePct - step.atPct) / (step.endPct - step.atPct);
    score = step.from + progress * (step.to - step.from);
    break;
  }
  return score;
}

function formatClsScore(value) {
  return value.toFixed(2);
}

const CLS_SCORE_STEPS = {
  ad: [
    { atPct: 30, endPct: 40, from: 0, to: 0.20 },
    { atPct: 56, endPct: 66, from: 0.20, to: 0.32 },
  ],
  font: [
    { atPct: 30, endPct: 42, from: 0, to: 0.14 },
  ],
};

function readClsTiming(root) {
  const style = getComputedStyle(root);
  const cycleMs = parseCssTimeMs(style.getPropertyValue('--cls-cycle'), 12000);
  const tab = root.dataset.clsActive || 'ad';
  const poorTargetRaw = parseFloat(style.getPropertyValue('--cls-poor-target'));
  return {
    cycleMs,
    steps: CLS_SCORE_STEPS[tab] || CLS_SCORE_STEPS.ad,
    poorTarget: Number.isFinite(poorTargetRaw) ? poorTargetRaw : (tab === 'font' ? 0.14 : 0.32),
    goodTarget: 0,
  };
}

function updateClsLabels(root, tab) {
  const key = tab === 'font' ? 'labelFont' : 'labelAd';
  root.querySelectorAll('[data-label-ad]').forEach(el => {
    if (el.dataset[key]) el.textContent = el.dataset[key];
  });
}

function setClsTab(root, tab) {
  if (!root) return;
  root.dataset.clsActive = tab;
  root.querySelectorAll('.cls-scenario-tab').forEach(btn => {
    const on = btn.dataset.clsTab === tab;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  root.querySelectorAll('.cls-scenario').forEach(panel => {
    const on = panel.dataset.clsScenario === tab;
    panel.hidden = !on;
    panel.classList.toggle('active', on);
  });
  updateClsLabels(root, tab);
  syncClsShiftOverlays(root);
  restartClsColumns(root);
  if (root.classList.contains('anim-run')) startClsCounterLoop(root);
}

function initClsTabs(root) {
  if (!root || root._clsTabsBound) return;
  root._clsTabsBound = true;
  root.querySelectorAll('.cls-scenario-tab').forEach(btn => {
    btn.addEventListener('click', () => setClsTab(root, btn.dataset.clsTab));
  });
  setClsTab(root, root.dataset.clsActive || 'ad');
}

function setClsCounterText(els, value) {
  const text = formatClsScore(value);
  els.forEach(el => { if (el) el.textContent = text; });
}

function resetClsCounterText(root) {
  if (!root) return;
  root.querySelectorAll('.cls-counter--poor, .cls-counter--good').forEach(el => {
    el.textContent = '0.00';
  });
  root.querySelectorAll('.metric-preview-col--poor .metric-preview-score').forEach(el => {
    el.textContent = 'CLS 0.00 / Poor';
  });
  root.querySelectorAll('.metric-preview-col--good .metric-preview-score').forEach(el => {
    el.textContent = 'CLS 0 / Good';
  });
}

function stopClsCounterLoop(root) {
  if (root?._clsCounterRaf) {
    cancelAnimationFrame(root._clsCounterRaf);
    root._clsCounterRaf = 0;
  }
}

function startClsCounterLoop(root) {
  stopClsCounterLoop(root);
  if (!root) return;

  const timing = readClsTiming(root);
  const poorCounters = root.querySelectorAll('.cls-counter--poor');
  const goodCounters = root.querySelectorAll('.cls-counter--good');
  const activeTab = root.dataset.clsActive || 'ad';
  const poorPreview = root.querySelector(`.cls-scenario--${activeTab} .metric-preview-col--poor .metric-preview-score`);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setClsCounterText(poorCounters, timing.poorTarget);
    setClsCounterText(goodCounters, timing.goodTarget);
    if (poorPreview) poorPreview.textContent = `CLS ${formatClsScore(timing.poorTarget)} / Poor`;
    return;
  }

  const t0 = performance.now();

  function tick(now) {
    if (!root.classList.contains('anim-run')) return;

    const phase = (now - t0) % timing.cycleMs;
    const phasePct = (phase / timing.cycleMs) * 100;
    const poorScore = clsScoreFromSteps(phasePct, timing.steps);

    setClsCounterText(poorCounters, poorScore);
    setClsCounterText(goodCounters, timing.goodTarget);
    if (poorPreview) {
      poorPreview.textContent = `CLS ${formatClsScore(poorScore)} / Poor`;
    }

    root._clsCounterRaf = requestAnimationFrame(tick);
  }

  resetClsCounterText(root);
  root._clsCounterRaf = requestAnimationFrame(tick);
}

function restartClsColumns(root) {
  if (!root) return;
  const tab = root.dataset.clsActive || 'ad';
  const before = root.querySelector(tab === 'font' ? '.cls-font-col-before' : '.cls-col-before');
  const after = root.querySelector(tab === 'font' ? '.cls-font-col-after' : '.cls-col-after');
  before?.classList.remove('anim-run');
  after?.classList.remove('anim-run');
  void root.offsetWidth;
  before?.classList.add('anim-run');
  after?.classList.add('anim-run');
}

function rectToPct(vpRect, rect) {
  return {
    top: ((rect.top - vpRect.top) / vpRect.height) * 100,
    left: ((rect.left - vpRect.left) / vpRect.width) * 100,
    width: (rect.width / vpRect.width) * 100,
    height: (rect.height / vpRect.height) * 100,
  };
}

function unionDomRects(a, b) {
  const top = Math.min(a.top, b.top);
  const left = Math.min(a.left, b.left);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
}

function applyRectVars(el, prefix, rectPct) {
  el.style.setProperty(`--${prefix}-top`, `${rectPct.top.toFixed(2)}%`);
  el.style.setProperty(`--${prefix}-left`, `${rectPct.left.toFixed(2)}%`);
  el.style.setProperty(`--${prefix}-width`, `${rectPct.width.toFixed(2)}%`);
  el.style.setProperty(`--${prefix}-height`, `${rectPct.height.toFixed(2)}%`);
}

function stashInlineStyle(el) {
  if (!el) return null;
  return { el, value: el.getAttribute('style') };
}

function restoreInlineStyle(stash) {
  if (!stash?.el) return;
  if (stash.value == null) stash.el.removeAttribute('style');
  else stash.el.setAttribute('style', stash.value);
}

function syncAdPoorOverlay(col) {
  const viewport = col.querySelector('.metric-preview-viewport');
  const overlay = viewport?.querySelector('.cls-shift-overlay--poor.cls-shift-overlay--ad');
  const ad = viewport?.querySelector('.cls-ad-drop');
  const sky = viewport?.querySelector('.cls-ad-sky-drop');
  const mainCol = viewport?.querySelector('.cls-main-col');
  if (!overlay || !ad || !sky || !mainCol) return;

  const stashes = [
    stashInlineStyle(ad),
    stashInlineStyle(sky),
  ];
  const wasAnim = col.classList.contains('anim-run');
  col.classList.remove('anim-run');

  const vpRect = viewport.getBoundingClientRect();
  const hideAd = () => {
    ad.style.setProperty('max-height', '0', 'important');
    ad.style.setProperty('opacity', '0', 'important');
    ad.style.setProperty('margin-bottom', '0', 'important');
  };
  const showAd = () => {
    ad.style.setProperty('max-height', '44px', 'important');
    ad.style.setProperty('opacity', '1', 'important');
    ad.style.setProperty('margin-bottom', '0.35rem', 'important');
  };
  const hideSky = () => {
    sky.style.setProperty('max-height', '0', 'important');
    sky.style.setProperty('opacity', '0', 'important');
    sky.style.setProperty('min-height', '0', 'important');
    sky.style.setProperty('padding', '0', 'important');
  };
  const showSky = () => {
    sky.style.setProperty('max-height', '80px', 'important');
    sky.style.setProperty('opacity', '1', 'important');
    sky.style.setProperty('min-height', '72px', 'important');
    sky.style.setProperty('padding', '0.3rem', 'important');
  };

  hideAd();
  hideSky();
  void viewport.offsetHeight;
  const mainFrom = mainCol.getBoundingClientRect();

  showAd();
  hideSky();
  void viewport.offsetHeight;
  const mainTo = mainCol.getBoundingClientRect();

  showAd();
  showSky();
  void viewport.offsetHeight;
  const skyRect = sky.getBoundingClientRect();

  stashes.forEach(restoreInlineStyle);
  if (wasAnim) col.classList.add('anim-run');

  const fromP = rectToPct(vpRect, mainFrom);
  const toP = rectToPct(vpRect, mainTo);
  const skyP = rectToPct(vpRect, skyRect);
  const distHeight = ((mainTo.top - mainFrom.top) / vpRect.height) * 100;
  const distLeft = fromP.left + fromP.width + 0.25;

  applyRectVars(overlay, 'cls-from', fromP);
  applyRectVars(overlay, 'cls-to', toP);
  overlay.style.setProperty('--cls-impact-leader-top', `${fromP.top.toFixed(2)}%`);
  overlay.style.setProperty('--cls-impact-leader-left', `${fromP.left.toFixed(2)}%`);
  overlay.style.setProperty('--cls-impact-leader-width', `${fromP.width.toFixed(2)}%`);
  overlay.style.setProperty('--cls-impact-leader-height', `${Math.max(distHeight, 0.8).toFixed(2)}%`);
  applyRectVars(overlay, 'cls-impact-sky', skyP);
  overlay.style.setProperty('--cls-dist-leader-top', `${fromP.top.toFixed(2)}%`);
  overlay.style.setProperty('--cls-dist-leader-left', `${distLeft.toFixed(2)}%`);
  overlay.style.setProperty('--cls-dist-leader-height', `${Math.max(distHeight, 0.8).toFixed(2)}%`);
}

function syncAdGoodOverlay(col) {
  const viewport = col.querySelector('.metric-preview-viewport');
  const overlay = viewport?.querySelector('.cls-shift-overlay--good.cls-shift-overlay--ad');
  const mainCol = viewport?.querySelector('.cls-main-col');
  const skySlot = viewport?.querySelector('.cls-ad-slot--sky');
  if (!overlay || !mainCol || !skySlot) return;

  const vpRect = viewport.getBoundingClientRect();
  applyRectVars(overlay, 'cls-slot-main', rectToPct(vpRect, mainCol.getBoundingClientRect()));
  applyRectVars(overlay, 'cls-slot-sky', rectToPct(vpRect, skySlot.getBoundingClientRect()));
}

function syncFontPoorOverlay(col) {
  const viewport = col.querySelector('.metric-preview-viewport');
  const overlay = viewport?.querySelector('.cls-shift-overlay--poor.cls-shift-overlay--font');
  const head = viewport?.querySelector('.cls-font-head--bad');
  const rest = viewport?.querySelector('.cls-font-rest--shift');
  if (!overlay || !head || !rest) return;

  const stashes = [stashInlineStyle(head), stashInlineStyle(rest)];
  const wasAnim = col.classList.contains('anim-run');
  col.classList.remove('anim-run');

  const vpRect = viewport.getBoundingClientRect();

  head.style.setProperty('min-height', '15px', 'important');
  rest.style.setProperty('transform', 'translateY(0)', 'important');
  void viewport.offsetHeight;
  const restFrom = rest.getBoundingClientRect();
  const headFrom = head.getBoundingClientRect();

  head.style.setProperty('min-height', '22px', 'important');
  rest.style.setProperty('transform', 'translateY(5px)', 'important');
  void viewport.offsetHeight;
  const restTo = rest.getBoundingClientRect();
  const headTo = head.getBoundingClientRect();

  stashes.forEach(restoreInlineStyle);
  if (wasAnim) col.classList.add('anim-run');

  const headFromP = rectToPct(vpRect, headFrom);
  const headToP = rectToPct(vpRect, headTo);
  const fromP = rectToPct(vpRect, restFrom);
  const toP = rectToPct(vpRect, restTo);
  const distHeight = ((restTo.top - restFrom.top) / vpRect.height) * 100;
  const distLeft = fromP.left + fromP.width + 0.25;

  applyRectVars(overlay, 'cls-head-from', headFromP);
  applyRectVars(overlay, 'cls-head-to', headToP);
  applyRectVars(overlay, 'cls-from', fromP);
  applyRectVars(overlay, 'cls-to', toP);
  overlay.style.setProperty('--cls-impact-font-top', `${fromP.top.toFixed(2)}%`);
  overlay.style.setProperty('--cls-impact-font-left', `${fromP.left.toFixed(2)}%`);
  overlay.style.setProperty('--cls-impact-font-width', `${fromP.width.toFixed(2)}%`);
  overlay.style.setProperty('--cls-impact-font-height', `${Math.max(distHeight, 0.6).toFixed(2)}%`);
  overlay.style.setProperty('--cls-dist-font-top', `${fromP.top.toFixed(2)}%`);
  overlay.style.setProperty('--cls-dist-font-left', `${distLeft.toFixed(2)}%`);
  overlay.style.setProperty('--cls-dist-font-height', `${Math.max(distHeight, 0.6).toFixed(2)}%`);
}

function syncFontGoodOverlay(col) {
  const viewport = col.querySelector('.metric-preview-viewport');
  const overlay = viewport?.querySelector('.cls-shift-overlay--good.cls-shift-overlay--font');
  const head = viewport?.querySelector('.cls-font-head--good');
  const rest = viewport?.querySelector('.cls-font-rest');
  if (!overlay || !head || !rest) return;

  const vpRect = viewport.getBoundingClientRect();
  applyRectVars(overlay, 'cls-slot-head', rectToPct(vpRect, head.getBoundingClientRect()));
  applyRectVars(overlay, 'cls-slot-rest', rectToPct(vpRect, rest.getBoundingClientRect()));
}

function syncClsShiftOverlays(root) {
  if (!root) return;
  syncAdPoorOverlay(root.querySelector('.cls-col-before'));
  syncAdGoodOverlay(root.querySelector('.cls-col-after'));
  syncFontPoorOverlay(root.querySelector('.cls-font-col-before'));
  syncFontGoodOverlay(root.querySelector('.cls-font-col-after'));
}

function bindClsOverlaySync(root) {
  if (!root || root._clsOverlaySyncBound) return;
  root._clsOverlaySyncBound = true;
  const run = () => syncClsShiftOverlays(root);
  run();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(run);
    root.querySelectorAll('.metric-preview-viewport').forEach((el) => ro.observe(el));
    root._clsOverlayRo = ro;
  }
  window.addEventListener('resize', run);
}

export function initClsViz(root, options = {}) {
  const { autoStart = true } = options;
  if (!root) return;
  if (!root._clsBound) root._clsBound = true;
  initClsTabs(root);
  bindClsOverlaySync(root);
  if (autoStart) startClsViz(root);
}

export function startClsViz(root) {
  if (!root) return;
  restartClsColumns(root);
  restartVizAnim(root);
  startClsCounterLoop(root);
}

export function resetClsViz(root) {
  stopClsCounterLoop(root);
  resetClsCounterText(root);
  root?.classList.remove('anim-run');
  root?.querySelector('.cls-col-before')?.classList.remove('anim-run');
  root?.querySelector('.cls-col-after')?.classList.remove('anim-run');
  root?.querySelector('.cls-font-col-before')?.classList.remove('anim-run');
  root?.querySelector('.cls-font-col-after')?.classList.remove('anim-run');
}

export function initLcpViz(root, options = {}) {
  const { autoStart = true } = options;
  if (!root) return;
  if (!root._lcpBound) root._lcpBound = true;
  if (autoStart) startLcpViz(root);
}

export function startLcpViz(root) {
  if (!root) return;
  restartVizAnim(root);
}

export function resetLcpViz(root) {
  root?.classList.remove('anim-run');
}

export function initInpViz(root, options = {}) {
  const { autoStart = true } = options;
  if (!root) return;
  if (!root._inpBound) root._inpBound = true;
  if (autoStart) startInpViz(root);
}

export function startInpViz(root) {
  if (!root) return;
  restartVizAnim(root);
  startInpCounterLoop(root);
}

export function resetInpViz(root) {
  stopInpCounterLoop(root);
  resetInpCounterText(root);
  root?.classList.remove('anim-run');
}

export function startMainthreadViz(root) {
  if (!root) return;
  restartVizAnim(root);
}

export function resetMainthreadViz(root) {
  root?.classList.remove('anim-run');
}

export function startWorkerFlowViz(root) {
  if (!root) return;
  restartVizAnim(root);
}

export function resetWorkerFlowViz(root) {
  root?.classList.remove('anim-run');
}

export function initCwvCards(root) {
  if (!root || root._cwvBound) return;
  root._cwvBound = true;
}

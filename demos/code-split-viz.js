import { BUNDLE_FILE_CODE, VISIT_TIMELINES } from './code-split-bundles.js';

const AUTO_DELAY_MS = 400;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function segmentProgress(elapsed, start, end) {
  if (elapsed <= start) return 0;
  if (elapsed >= end) return 1;
  return (elapsed - start) / (end - start);
}

function highlightSource(codeEl) {
  if (!codeEl || !window.hljs) return;
  codeEl.removeAttribute('data-highlighted');
  codeEl.classList.remove('hljs');
  window.hljs.highlightElement(codeEl);
}

export function initCodeSplitViz(root) {
  if (!root || root._csvInit) return;
  root._csvInit = true;

  const fcpBefore = root.querySelector('.csv-fcp-before');
  const fcpAfter = root.querySelector('.csv-fcp-after');
  const axisTicks = root.querySelector('.csv-axis-ticks');
  const panelBefore = root.querySelector('.csv-source-panel--before');
  const panelAfter = root.querySelector('.csv-source-panel--after');
  const bodyBefore = root.querySelector('.csv-source-body-before');
  const bodyAfter = root.querySelector('.csv-source-body-after');
  const visitBtns = root.querySelectorAll('.csv-visit-btn');
  const afterTabs = root.querySelectorAll('.csv-source-tab[data-side="after"]');
  const barBefore = root.querySelector('[data-bar="before-bundle"]');
  const barMain = root.querySelector('[data-bar="after-main"]');
  const barChunk = root.querySelector('[data-bar="after-chunk"]');
  const metaBefore = root.querySelector('[data-bar-meta="before-bundle"]');
  const metaMain = root.querySelector('[data-bar-meta="after-main"]');
  const metaChunk = root.querySelector('[data-bar-meta="after-chunk"]');
  const markerBefore = root.querySelector('[data-fcp="before"]');
  const markerAfter = root.querySelector('[data-fcp="after"]');
  const playhead = root.querySelector('.csv-playhead');
  const waterfall = root.querySelector('.csv-waterfall');
  const trackBefore = root.querySelector('.csv-row-before .csv-track');
  const screenBefore = root.querySelector('.csv-screen-before');
  const screenAfter = root.querySelector('.csv-screen-after');
  const chartBefore = root.querySelector('.csv-screen-before [data-dash-chart]');
  const chartAfter = root.querySelector('.csv-screen-after [data-dash-chart]');
  const badgeBefore = root.querySelector('[data-screen-badge="before"]');
  const badgeAfter = root.querySelector('[data-screen-badge="after"]');

  if (!barBefore || !barMain || !barChunk || !bodyBefore || !bodyAfter) return;

  let visit = 'first';
  let timeline = VISIT_TIMELINES[visit];
  let rafId = null;
  let autoTimer = null;
  let running = false;
  let pinAfterFile = null;
  let afterFile = 'main.js';

  function totalMs() {
    return timeline.totalMs;
  }

  function msToPct(ms) {
    return (ms / totalMs()) * 100;
  }

  function renderBeforePanel() {
    const info = BUNDLE_FILE_CODE['bundle.js'];
    bodyBefore.textContent = info.code;
    highlightSource(bodyBefore);
  }

  function renderAfterPanel(file, { pin = false } = {}) {
    const info = BUNDLE_FILE_CODE[file];
    if (!info) return;

    if (pin) pinAfterFile = file;
    afterFile = file;

    panelAfter.dataset.color = info.color;
    bodyAfter.textContent = info.code;
    highlightSource(bodyAfter);

    afterTabs.forEach((tab) => {
      const on = tab.dataset.file === file;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function setPanelActive(side, active) {
    const panel = side === 'before' ? panelBefore : panelAfter;
    panel?.classList.toggle('csv-source-panel--live', active);
  }

  function updateAxisLabels() {
    if (!axisTicks || !timeline.axisLabels) return;
    axisTicks.innerHTML = timeline.axisLabels.map((label) => `<span>${label}</span>`).join('');
  }

  function applyVisitMode(nextVisit) {
    visit = nextVisit;
    timeline = VISIT_TIMELINES[visit];
    const cached = visit === 'return';

    visitBtns.forEach((btn) => {
      const on = btn.dataset.visit === visit;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    updateAxisLabels();

    markerBefore.style.left = `${msToPct(timeline.beforeFcp)}%`;
    markerAfter.style.left = `${msToPct(timeline.afterFcp)}%`;
    barChunk.style.left = `${msToPct(timeline.afterChunk[0])}%`;

    const cacheLabel = cached ? ', cache' : '';
    if (metaBefore) metaBefore.textContent = `${BUNDLE_FILE_CODE['bundle.js'].size}${cacheLabel}`;
    if (metaMain) metaMain.textContent = `${BUNDLE_FILE_CODE['main.js'].size}${cacheLabel}`;
    if (metaChunk) metaChunk.textContent = `${BUNDLE_FILE_CODE['chunk.HeavyChart.js'].size}${cacheLabel}`;

    root.classList.toggle('csv-visit-return', cached);
  }

  function pickAfterFile(elapsed) {
    const t = timeline;
    const mainP = segmentProgress(elapsed, t.afterMain[0], t.afterMain[1]);
    const chunkP = segmentProgress(elapsed, t.afterChunk[0], t.afterChunk[1]);

    if (chunkP > 0 && chunkP < 1) return 'chunk.HeavyChart.js';
    if (mainP > 0 && mainP < 1) return 'main.js';
    if (chunkP >= 1) return 'chunk.HeavyChart.js';
    if (mainP >= 1) return 'chunk.HeavyChart.js';
    return 'main.js';
  }

  function setBar(bar, startMs, endMs, elapsed) {
    const p = segmentProgress(elapsed, startMs, endMs);
    const left = msToPct(startMs);
    const full = msToPct(endMs - startMs);
    bar.style.left = `${left}%`;
    bar.style.width = `${full * p}%`;
    bar.classList.toggle('csv-bar-active', p > 0 && p < 1);
    bar.classList.toggle('csv-bar-done', p >= 1);
    return p;
  }

  function resetScreens() {
    screenBefore?.classList.remove('csv-screen-painted', 'csv-screen-fcp');
    screenAfter?.classList.remove('csv-screen-painted', 'csv-screen-fcp', 'csv-screen-chunk');
    chartBefore?.classList.remove('csv-dash-chart--loaded');
    chartAfter?.classList.remove('csv-dash-chart--loaded');
    fcpBefore.textContent = '-';
    fcpAfter.textContent = '-';
    fcpBefore.classList.remove('csv-fcp-hit');
    fcpAfter.classList.remove('csv-fcp-hit');
    markerBefore?.classList.remove('csv-fcp-marker--hit');
    markerAfter?.classList.remove('csv-fcp-marker--hit');
    if (badgeBefore) {
      badgeBefore.textContent = '대기 중';
      badgeBefore.classList.remove('csv-screen-badge--hit');
    }
    if (badgeAfter) {
      badgeAfter.textContent = '대기 중';
      badgeAfter.classList.remove('csv-screen-badge--hit');
    }
  }

  function positionPlayhead(t) {
    if (!playhead || !trackBefore || !waterfall) return;
    const wfRect = waterfall.getBoundingClientRect();
    const trackRect = trackBefore.getBoundingClientRect();
    const trackLeft = trackRect.left - wfRect.left;
    const pct = clamp(t / totalMs(), 0, 1);
    playhead.style.left = `${trackLeft + trackRect.width * pct}px`;
  }

  function resetSourcePanels() {
    pinAfterFile = null;
    panelBefore?.classList.remove('csv-source-panel--live');
    panelAfter?.classList.remove('csv-source-panel--live');
    root.querySelectorAll('.csv-bar[data-file]').forEach((bar) => {
      bar.classList.remove('csv-bar--source-active', 'csv-bar-active', 'csv-bar-done');
    });
    renderBeforePanel();
    renderAfterPanel('main.js');
  }

  function stopAnimation() {
    if (rafId) cancelAnimationFrame(rafId);
    if (autoTimer) clearTimeout(autoTimer);
    rafId = null;
    autoTimer = null;
    running = false;
    root.classList.remove('running', 'ran');
  }

  function reset() {
    stopAnimation();

    setBar(barBefore, timeline.beforeBundle[0], timeline.beforeBundle[1], 0);
    setBar(barMain, timeline.afterMain[0], timeline.afterMain[1], 0);
    setBar(barChunk, timeline.afterChunk[0], timeline.afterChunk[1], 0);
    barChunk.style.opacity = '0.35';

    positionPlayhead(0);
    resetScreens();
    resetSourcePanels();
  }

  function update(elapsed) {
    const t = clamp(elapsed, 0, totalMs());
    const tl = timeline;

    const bundleP = setBar(barBefore, tl.beforeBundle[0], tl.beforeBundle[1], t);
    const mainP = setBar(barMain, tl.afterMain[0], tl.afterMain[1], t);
    const chunkP = setBar(barChunk, tl.afterChunk[0], tl.afterChunk[1], t);
    barChunk.style.opacity = t >= tl.afterChunk[0] ? '1' : '0.35';

    positionPlayhead(t);

    const bundleLive = bundleP > 0 && bundleP < 1;
    const mainLive = mainP > 0 && mainP < 1;
    const chunkLive = chunkP > 0 && chunkP < 1;

    setPanelActive('before', bundleLive);
    setPanelActive('after', mainLive || chunkLive);

    barBefore.classList.toggle('csv-bar--source-active', bundleLive || bundleP >= 1);
    barMain.classList.toggle('csv-bar--source-active', mainLive || (mainP >= 1 && chunkLive));
    barChunk.classList.toggle('csv-bar--source-active', chunkLive || chunkP >= 1);

    if (!pinAfterFile) {
      const nextAfter = pickAfterFile(t);
      if (nextAfter !== afterFile || mainLive || chunkLive) {
        renderAfterPanel(nextAfter);
      }
    }

    if (t >= tl.beforeFcp) {
      screenBefore?.classList.add('csv-screen-painted', 'csv-screen-fcp');
      chartBefore?.classList.add('csv-dash-chart--loaded');
      markerBefore?.classList.add('csv-fcp-marker--hit');
      fcpBefore.textContent = `FCP ${tl.fcpBeforeLabel}`;
      fcpBefore.classList.add('csv-fcp-hit');
      if (badgeBefore) {
        badgeBefore.textContent = `FCP ${tl.fcpBeforeLabel}`;
        badgeBefore.classList.add('csv-screen-badge--hit');
      }
    }

    if (t >= tl.afterFcp) {
      screenAfter?.classList.add('csv-screen-painted', 'csv-screen-fcp');
      markerAfter?.classList.add('csv-fcp-marker--hit');
      fcpAfter.textContent = tl.fcpAfterLabel;
      fcpAfter.classList.add('csv-fcp-hit');
      if (badgeAfter) {
        badgeAfter.textContent = `FCP ${tl.fcpAfterLabel}`;
        badgeAfter.classList.add('csv-screen-badge--hit');
      }
      if (t >= tl.beforeFcp) {
        fcpBefore.textContent = tl.fcpBeforeLabel;
      }
    }

    if (chunkP >= 1) {
      screenAfter?.classList.add('csv-screen-chunk');
      chartAfter?.classList.add('csv-dash-chart--loaded');
      if (badgeAfter) badgeAfter.textContent = visit === 'return' ? '차트 (cache)' : '차트 로드';
    }
  }

  function run() {
    stopAnimation();
    reset();

    running = true;
    root.classList.add('running');

    const speed = timeline.speed;
    const endMs = totalMs();
    const t0 = performance.now();

    function tick(now) {
      const elapsed = (now - t0) * speed;
      update(elapsed);

      if (elapsed < endMs) {
        rafId = requestAnimationFrame(tick);
      } else {
        update(endMs);
        running = false;
        root.classList.remove('running');
        root.classList.add('ran');
        setPanelActive('before', false);
        setPanelActive('after', false);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function scheduleRun(delay = AUTO_DELAY_MS) {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      autoTimer = null;
      run();
    }, delay);
  }

  function switchVisit(nextVisit) {
    stopAnimation();
    applyVisitMode(nextVisit);
    reset();
    scheduleRun(180);
  }

  visitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchVisit(btn.dataset.visit);
    });
  });

  afterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      renderAfterPanel(tab.dataset.file, { pin: true });
    });
  });

  barBefore.addEventListener('click', () => {
    pinAfterFile = null;
    renderBeforePanel();
    barBefore.classList.add('csv-bar--source-active');
  });

  barMain.addEventListener('click', () => {
    pinAfterFile = 'main.js';
    renderAfterPanel('main.js', { pin: true });
  });

  barChunk.addEventListener('click', () => {
    pinAfterFile = 'chunk.HeavyChart.js';
    renderAfterPanel('chunk.HeavyChart.js', { pin: true });
  });

  bodyBefore.textContent = BUNDLE_FILE_CODE['bundle.js'].code;
  bodyAfter.textContent = BUNDLE_FILE_CODE['main.js'].code;
  highlightSource(bodyBefore);
  highlightSource(bodyAfter);

  applyVisitMode('first');
  reset();

  root._csvReset = reset;
  root._csvRun = run;
  root._csvScheduleRun = scheduleRun;
}

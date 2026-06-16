import { LCP_OPT_CODE, LCP_OPT_TIMELINE } from './lcp-opt-data.js';

const AUTO_DELAY_MS = 380;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function segmentProgress(elapsed, start, end) {
  if (elapsed <= start) return 0;
  if (elapsed >= end) return 1;
  return (elapsed - start) / (end - start);
}

function highlightCode(codeEl) {
  if (!codeEl || !window.hljs) return;
  codeEl.removeAttribute('data-highlighted');
  codeEl.classList.remove('hljs');
  window.hljs.highlightElement(codeEl);
}

export function initLcpOptViz(root) {
  if (!root || root._lovInit) return;
  root._lovInit = true;

  const tl = LCP_OPT_TIMELINE;
  const fcpBefore = root.querySelector('.lov-fcp-before');
  const fcpAfter = root.querySelector('.lov-fcp-after');
  const axisTicks = root.querySelector('.lov-axis-ticks');
  const playhead = root.querySelector('.lov-playhead');
  const waterfall = root.querySelector('.lov-waterfall');
  const lanesBefore = root.querySelector('.lov-row-before .lov-lanes');
  const barBefore = {
    html: root.querySelector('[data-lov="before-html"]'),
    css: root.querySelector('[data-lov="before-css"]'),
    hero: root.querySelector('[data-lov="before-hero"]'),
  };
  const barAfter = {
    html: root.querySelector('[data-lov="after-html"]'),
    hero: root.querySelector('[data-lov="after-hero"]'),
    css: root.querySelector('[data-lov="after-css"]'),
  };
  const markerBefore = root.querySelector('[data-lov-fcp="before"]');
  const markerAfter = root.querySelector('[data-lov-fcp="after"]');
  const screenBefore = root.querySelector('.lov-screen-before');
  const screenAfter = root.querySelector('.lov-screen-after');
  const heroBefore = root.querySelector('.lov-screen-before [data-lov-hero]');
  const heroAfter = root.querySelector('.lov-screen-after [data-lov-hero]');
  const badgeBefore = root.querySelector('[data-lov-badge="before"]');
  const badgeAfter = root.querySelector('[data-lov-badge="after"]');
  const codeBody = root.closest('section')?.querySelector('.lov-code-body');
  const codePanel = root.closest('section')?.querySelector('.lov-left-code');
  const replayBtn = root.querySelector('.lov-replay-btn');

  if (!barBefore.html || !barAfter.hero || !codeBody) return;

  codeBody.textContent = LCP_OPT_CODE;
  highlightCode(codeBody);

  let rafId = null;
  let autoTimer = null;
  let running = false;

  function msToPct(ms) {
    return (ms / tl.totalMs) * 100;
  }

  function setBar(bar, start, end, elapsed) {
    const p = segmentProgress(elapsed, start, end);
    const left = msToPct(start);
    const full = msToPct(end) - msToPct(start);
    const width = p <= 0 ? 0 : Math.max(full * p, 0.5);
    bar.style.left = `${left}%`;
    bar.style.width = `${width}%`;
    bar.classList.toggle('lov-bar--active', p > 0 && p < 1);
    bar.classList.toggle('lov-bar--done', p >= 1);
    return p;
  }

  function updateAxis() {
    if (!axisTicks) return;
    axisTicks.innerHTML = tl.axisLabels.map((l) => `<span>${l}</span>`).join('');
  }

  function resetScreens() {
    screenBefore?.classList.remove('lov-screen-painted', 'lov-screen-lcp');
    screenAfter?.classList.remove('lov-screen-painted', 'lov-screen-lcp');
    heroBefore?.classList.remove('lov-hero--loaded');
    heroAfter?.classList.remove('lov-hero--loaded');
    markerBefore?.classList.remove('lov-fcp-marker--hit');
    markerAfter?.classList.remove('lov-fcp-marker--hit');
    if (badgeBefore) badgeBefore.textContent = '대기 중';
    if (badgeAfter) badgeAfter.textContent = '대기 중';
    if (fcpBefore) fcpBefore.textContent = '-';
    if (fcpAfter) fcpAfter.textContent = '-';
    fcpBefore?.classList.remove('lov-fcp-hit');
    fcpAfter?.classList.remove('lov-fcp-hit');
    codePanel?.classList.remove('slide-code-stack--live');
    Object.values(barBefore).forEach((b) => b?.classList.remove('lov-bar--active', 'lov-bar--done'));
    Object.values(barAfter).forEach((b) => b?.classList.remove('lov-bar--active', 'lov-bar--done'));
  }

  function reset() {
    stopAnimation();
    resetScreens();
    if (playhead) playhead.style.left = '0px';
    markerBefore?.style.setProperty('left', `${msToPct(tl.before.lcp)}%`);
    markerAfter?.style.setProperty('left', `${msToPct(tl.after.lcp)}%`);
    root.classList.remove('running', 'ran');
    updateAxis();
  }

  function stopAnimation() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    running = false;
  }

  function updatePlayhead(elapsed) {
    if (!playhead || !waterfall || !lanesBefore) return;
    const pct = msToPct(elapsed);
    const wf = waterfall.getBoundingClientRect();
    const lanes = lanesBefore.getBoundingClientRect();
    const x = (lanes.width * pct) / 100;
    playhead.style.left = `${lanes.left - wf.left + x}px`;
  }

  function update(elapsed) {
    const t = clamp(elapsed, 0, tl.totalMs);
    const b = tl.before;
    const a = tl.after;

    setBar(barBefore.html, b.html[0], b.html[1], t);
    setBar(barBefore.css, b.css[0], b.css[1], t);
    setBar(barBefore.hero, b.hero[0], b.hero[1], t);

    setBar(barAfter.html, a.html[0], a.html[1], t);
    setBar(barAfter.hero, a.hero[0], a.hero[1], t);
    setBar(barAfter.css, a.css[0], a.css[1], t);

    updatePlayhead(t);

    if (t >= b.css[0] * 0.5) {
      screenBefore?.classList.add('lov-screen-painted');
    }
    if (t >= a.hero[0]) {
      screenAfter?.classList.add('lov-screen-painted');
      codePanel?.classList.add('slide-code-stack--live');
    }

    if (t >= b.hero[1]) {
      heroBefore?.classList.add('lov-hero--loaded');
    }
    if (t >= a.hero[1]) {
      heroAfter?.classList.add('lov-hero--loaded');
    }

    if (t >= b.lcp) {
      markerBefore?.classList.add('lov-fcp-marker--hit');
      screenBefore?.classList.add('lov-screen-lcp');
      if (fcpBefore) {
        fcpBefore.textContent = b.lcpLabel;
        fcpBefore.classList.add('lov-fcp-hit');
      }
      if (badgeBefore) badgeBefore.textContent = `LCP ${b.lcpLabel}`;
    }

    if (t >= a.lcp) {
      markerAfter?.classList.add('lov-fcp-marker--hit');
      screenAfter?.classList.add('lov-screen-lcp');
      if (fcpAfter) {
        fcpAfter.textContent = a.lcpLabel;
        fcpAfter.classList.add('lov-fcp-hit');
      }
      if (badgeAfter) badgeAfter.textContent = `LCP ${a.lcpLabel}`;
      if (t >= b.lcp && fcpBefore) fcpBefore.textContent = b.lcpLabel;
    }
  }

  function run() {
    stopAnimation();
    reset();
    running = true;
    root.classList.add('running');
    const t0 = performance.now();

    function tick(now) {
      const elapsed = (now - t0) * tl.speed;
      update(elapsed);
      if (elapsed < tl.totalMs) {
        rafId = requestAnimationFrame(tick);
      } else {
        update(tl.totalMs);
        running = false;
        root.classList.remove('running');
        root.classList.add('ran');
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

  replayBtn?.addEventListener('click', () => scheduleRun(80));
  root.addEventListener('click', (e) => {
    if (e.target.closest('.lov-replay-btn')) return;
    if (e.target.closest('.lov-waterfall, .lov-screens')) scheduleRun(80);
  });

  reset();
  root._lovReset = reset;
  root._lovScheduleRun = scheduleRun;
}

const ITEM_COUNT = 10000;
const ITEM_HEIGHT = 28;
const FPS_UI_MS = 120;
const FPS_IDLE_MS = 520;
const SPARK_LEN = 24;
const MEMORY_BEFORE_MB = 10;
const MEMORY_AFTER_KB = 20;

export function initVirtualDemo(container) {
  if (!container || container._virtualInit) return;
  container._virtualInit = true;

  const beforeList = container.querySelector('.virtual-before-list');
  const afterList = container.querySelector('.virtual-after-list');
  const beforeStage = container.querySelector('.virt-stage-before');
  const afterStage = container.querySelector('.virt-stage-after');
  const beforeFrame = beforeList.closest('.virt-screen');
  const afterFrame = afterList.closest('.virt-screen');
  const runBtn = container.querySelector('.virtual-run-btn');

  const metrics = {
    before: createSideMetrics(beforeFrame, 'before'),
    after: createSideMetrics(afterFrame, 'after'),
  };

  let pool = [];
  let beforeScrollHandler = null;
  let afterScrollHandler = null;
  let loaded = false;
  let metricsRaf = null;
  let beforeStressActive = false;
  let beforeStressOffset = 0;

  function createSideMetrics(frame, side) {
    return {
      side,
      frame,
      domEl: frame.querySelector('.dom-count'),
      memEl: frame.querySelector('.mem-count'),
      fpsEl: frame.querySelector('.fps-count'),
      memFill: frame.querySelector('.mem-fill'),
      fpsFill: frame.querySelector('.fps-fill'),
      memSpark: frame.querySelector('.mem-spark-line'),
      fpsSpark: frame.querySelector('.fps-spark-line'),
      fps: { display: 60, target: 60, scrolling: false, idleTimer: null, lastUi: 0 },
      mem: { display: side === 'before' ? MEMORY_BEFORE_MB : MEMORY_AFTER_KB / 1024, target: side === 'before' ? MEMORY_BEFORE_MB : MEMORY_AFTER_KB / 1024 },
      memUnit: side === 'before' ? 'MB' : 'KB',
      memNorm: side === 'before' ? 100 : 2,
      fpsHistory: Array(SPARK_LEN).fill(60),
      memHistory: Array(SPARK_LEN).fill(side === 'before' ? 100 : 2),
    };
  }

  function loadLists() {
    if (loaded) return;
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.textContent = '로딩 중...';
    }
    container.classList.add('running');

    requestAnimationFrame(() => {
      renderBefore();
      renderAfter();
      bindBeforeScroll();
      syncStage(beforeList, beforeStage, true);
      syncStage(afterList, afterStage, false);
      updateDomCounts();
      initMetricsUi();
      loaded = true;
      container.classList.add('loaded');
      container.classList.remove('running');
      if (runBtn) runBtn.textContent = '로드 완료';
      ensureMetricsLoop();
    });
  }

  container._virtualLoad = loadLists;

  function rowHtml(i) {
    const price = ((i * 1379 + 9900) % 990000) + 10000;
    return `<span class="product-thumb"></span><span class="product-name">상품 ${String(i + 1).padStart(4, '0')}</span><span class="product-price">₩${price.toLocaleString()}</span>`;
  }

  function syncStage(listEl, stage, isBefore) {
    const scrollTop = listEl.scrollTop;
    const viewH = listEl.clientHeight;
    const totalH = listEl.scrollHeight || ITEM_COUNT * ITEM_HEIGHT;
    const maxScroll = Math.max(1, totalH - viewH);
    const ratio = scrollTop / maxScroll;

    const thumb = stage.querySelector('.virt-minimap-thumb');
    const railH = stage.querySelector('.virt-minimap-rail')?.clientHeight || 1;
    const thumbH = Math.max(8, (viewH / totalH) * railH);
    const thumbTop = ratio * (railH - thumbH);
    if (thumb) {
      thumb.style.height = `${thumbH}px`;
      thumb.style.transform = `translateY(${thumbTop}px)`;
    }

    stage.style.setProperty('--scroll-ratio', ratio.toFixed(4));
    stage.classList.toggle('scrolling', metrics[isBefore ? 'before' : 'after'].fps.scrolling);
    metrics[isBefore ? 'before' : 'after'].frame.classList.toggle(
      'scrolling',
      metrics[isBefore ? 'before' : 'after'].fps.scrolling
    );
  }

  function expensiveBeforeLayout(full = true) {
    const rows = beforeList.querySelectorAll('.virtual-row');
    let sum = 0;
    const step = full ? 1 : 3;
    for (let i = beforeStressOffset; i < rows.length; i += step) {
      const row = rows[i];
      sum += row.offsetTop + row.offsetHeight;
      if (i % 48 === 0) {
        row.getBoundingClientRect();
        window.getComputedStyle(row).height;
        row.style.transform = row.style.transform ? '' : 'translateZ(0)';
      }
    }
    beforeStressOffset = (beforeStressOffset + 137) % rows.length;
    return sum;
  }

  function mapCostToFps(costMs) {
    return Math.max(5, Math.min(18, Math.round(1000 / (costMs + 28))));
  }

  function markScroll(side, costMs = 0) {
    const m = metrics[side];
    const s = m.fps;
    s.scrolling = true;
    clearTimeout(s.idleTimer);

    if (side === 'before') {
      s.target = mapCostToFps(costMs);
      m.mem.target = MEMORY_BEFORE_MB + Math.random() * 0.4;
      m.memNorm = 96 + Math.random() * 4;
    } else {
      s.target = 56 + Math.round(Math.random() * 3);
      m.mem.target = MEMORY_AFTER_KB / 1024 + Math.random() * 0.002;
      m.memNorm = 1.8 + Math.random() * 0.8;
    }

    s.idleTimer = setTimeout(() => {
      s.scrolling = false;
      s.target = 60;
      if (side === 'before') {
        beforeStressActive = false;
        m.mem.target = MEMORY_BEFORE_MB;
        m.memNorm = 100;
      } else {
        m.mem.target = MEMORY_AFTER_KB / 1024;
        m.memNorm = 2;
      }
      if (!metrics.before.fps.scrolling && !metrics.after.fps.scrolling && !beforeStressActive) {
        cancelAnimationFrame(metricsRaf);
        metricsRaf = null;
      }
    }, FPS_IDLE_MS);
  }

  function smoothValue(current, target, scrolling) {
    const alpha = scrolling ? 0.16 : 0.28;
    return current + (target - current) * alpha;
  }

  function pushHistory(arr, value) {
    arr.push(value);
    if (arr.length > SPARK_LEN) arr.shift();
  }

  function sparkPath(values, max, min, w, h) {
    if (!values.length) return '';
    const range = max - min || 1;
    const step = values.length > 1 ? w / (values.length - 1) : 0;
    return values
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  function formatMem(m, unit) {
    if (unit === 'MB') return `${m.toFixed(1)} MB`;
    return `${Math.round(m * 1024)} KB`;
  }

  function fpsClass(fps, scrolling) {
    if (!scrolling) return 'good';
    if (fps < 24) return 'bad';
    if (fps < 45) return 'warn';
    return 'good';
  }

  function paintSide(m) {
    const s = m.fps;
    s.display = smoothValue(s.display, s.target, s.scrolling);
    if (!s.scrolling && Math.abs(s.display - 60) < 0.35) s.display = 60;

    m.mem.display = smoothValue(m.mem.display, m.mem.target, s.scrolling);

    const fpsVal = Math.round(s.display);
    const memNormSmooth = smoothValue(
      m.memHistory[m.memHistory.length - 1] ?? m.memNorm,
      m.memNorm,
      s.scrolling
    );

    pushHistory(m.fpsHistory, fpsVal);
    pushHistory(m.memHistory, memNormSmooth);

    m.domEl.textContent = m.side === 'before'
      ? beforeList.querySelectorAll('.virtual-row').length.toLocaleString()
      : String(afterList.querySelectorAll('.virtual-row').length);

    m.fpsEl.textContent = s.scrolling ? String(fpsVal) : '60';
    m.fpsEl.className = `virt-metric-v num fps-count ${fpsClass(fpsVal, s.scrolling)}`;

    m.memEl.textContent = formatMem(m.mem.display, m.memUnit);
    m.memEl.className = `virt-metric-v num mem-count ${m.side === 'before' ? 'bad' : 'good'}`;

    m.fpsFill.style.width = `${Math.max(4, (fpsVal / 60) * 100)}%`;
    m.fpsFill.className = `virt-metric-fill fps-fill ${fpsClass(fpsVal, s.scrolling)}`;

    m.memFill.style.width = `${Math.max(m.side === 'after' ? 2 : 8, memNormSmooth)}%`;
    m.memFill.className = `virt-metric-fill mem-fill ${m.side === 'before' ? 'bad' : 'good'}`;

    if (m.fpsSpark) {
      m.fpsSpark.setAttribute('d', sparkPath(m.fpsHistory, 60, 0, 40, 12));
    }
    if (m.memSpark) {
      m.memSpark.setAttribute('d', sparkPath(m.memHistory, 100, 0, 40, 12));
    }
  }

  function paintMetricsUi(now) {
    const active =
      metrics.before.fps.scrolling ||
      metrics.after.fps.scrolling ||
      beforeStressActive ||
      now - metrics.before.fps.lastUi >= FPS_UI_MS ||
      now - metrics.after.fps.lastUi >= FPS_UI_MS;

    if (!active) return;

    paintSide(metrics.before);
    paintSide(metrics.after);
    metrics.before.fps.lastUi = now;
    metrics.after.fps.lastUi = now;
  }

  function metricsLoop(now) {
    paintMetricsUi(now);
    if (beforeStressActive || metrics.before.fps.scrolling || metrics.after.fps.scrolling) {
      metricsRaf = requestAnimationFrame(metricsLoop);
    } else {
      metricsRaf = null;
    }
  }

  function ensureMetricsLoop() {
    if (!metricsRaf) metricsRaf = requestAnimationFrame(metricsLoop);
  }

  function beforeStressLoop() {
    if (!beforeStressActive) return;
    expensiveBeforeLayout(false);
    const extraCost = performance.now();
    expensiveBeforeLayout(false);
    metrics.before.fps.target = mapCostToFps(performance.now() - extraCost + 12);
    requestAnimationFrame(beforeStressLoop);
  }

  function updateDomCounts() {
    metrics.before.domEl.textContent = beforeList.querySelectorAll('.virtual-row').length.toLocaleString();
    metrics.after.domEl.textContent = String(afterList.querySelectorAll('.virtual-row').length);
  }

  function initMetricsUi() {
    metrics.before.mem.display = MEMORY_BEFORE_MB;
    metrics.before.mem.target = MEMORY_BEFORE_MB;
    metrics.before.memHistory.fill(100);
    metrics.after.mem.display = MEMORY_AFTER_KB / 1024;
    metrics.after.mem.target = MEMORY_AFTER_KB / 1024;
    metrics.after.memHistory.fill(2);
    paintSide(metrics.before);
    paintSide(metrics.after);
  }

  function renderBefore() {
    const frame = beforeStage.querySelector('.virt-viewport-frame');
    const topOffset = frame ? frame.offsetTop : Math.round(beforeStage.clientHeight * 0.25);
    const html = [];
    for (let i = 0; i < ITEM_COUNT; i++) {
      html.push(`<div class="virtual-row">${rowHtml(i)}</div>`);
    }
    beforeList.innerHTML = html.join('');
    beforeList.style.paddingTop = topOffset + 'px';
    beforeList.style.paddingBottom = topOffset + 'px';
  }

  function renderAfter() {
    afterList.innerHTML = '';
    pool = [];
    const frame = afterStage.querySelector('.virt-viewport-frame');
    const topOffset = frame ? frame.offsetTop : Math.round(afterStage.clientHeight * 0.25);
    const inner = document.createElement('div');
    inner.style.cssText = 'position:relative;width:100%';
    const spacer = document.createElement('div');
    spacer.className = 'virtual-spacer';
    spacer.style.height = topOffset + ITEM_COUNT * ITEM_HEIGHT + topOffset + 'px';
    inner.appendChild(spacer);
    const viewport = document.createElement('div');
    viewport.style.cssText = `position:absolute;top:${topOffset}px;left:0;right:0`;
    inner.appendChild(viewport);
    afterList.appendChild(inner);

    const visibleCount = Math.ceil(afterList.clientHeight / ITEM_HEIGHT) + 4;

    function renderRows(start) {
      while (pool.length < visibleCount) {
        const row = document.createElement('div');
        row.className = 'virtual-row';
        row.style.cssText =
          'position:absolute;left:0;right:0;height:28px;display:flex;align-items:center';
        viewport.appendChild(row);
        pool.push(row);
      }
      for (let i = 0; i < visibleCount; i++) {
        const idx = start + i;
        const row = pool[i];
        if (idx < ITEM_COUNT) {
          row.style.display = 'flex';
          row.style.top = idx * ITEM_HEIGHT + 'px';
          row.innerHTML = rowHtml(idx);
        } else {
          row.style.display = 'none';
        }
      }
    }

    renderRows(0);
    afterScrollHandler = () => {
      const start = Math.floor(Math.max(0, afterList.scrollTop) / ITEM_HEIGHT);
      renderRows(start);
      markScroll('after');
      syncStage(afterList, afterStage, false);
      ensureMetricsLoop();
    };
    afterList.addEventListener('scroll', afterScrollHandler, { passive: true });
  }

  function bindBeforeScroll() {
    beforeScrollHandler = () => {
      const t0 = performance.now();
      expensiveBeforeLayout(true);
      const cost = performance.now() - t0;

      if (!beforeStressActive) {
        beforeStressActive = true;
        requestAnimationFrame(beforeStressLoop);
      }

      markScroll('before', cost);
      syncStage(beforeList, beforeStage, true);
      ensureMetricsLoop();
    };
    beforeList.addEventListener('scroll', beforeScrollHandler, { passive: true });
  }

  if (runBtn) {
    runBtn.addEventListener('click', loadLists);
  }

  container._virtualReset = () => {
    beforeStressActive = false;
    if (metricsRaf) cancelAnimationFrame(metricsRaf);
    metricsRaf = null;
    clearTimeout(metrics.before.fps.idleTimer);
    clearTimeout(metrics.after.fps.idleTimer);
    if (beforeScrollHandler) beforeList.removeEventListener('scroll', beforeScrollHandler);
    if (afterScrollHandler) afterList.removeEventListener('scroll', afterScrollHandler);
    beforeList.innerHTML = '';
    beforeList.style.paddingTop = '';
    beforeList.style.paddingBottom = '';
    afterList.innerHTML = '';
    [metrics.before, metrics.after].forEach((m) => {
      m.domEl.textContent = '-';
      m.memEl.textContent = '-';
      m.fpsEl.textContent = '-';
      m.fpsEl.className = 'virt-metric-v num fps-count';
      m.memEl.className = 'virt-metric-v num mem-count';
      m.fpsFill.style.width = '0%';
      m.memFill.style.width = '0%';
      m.fpsHistory.fill(60);
      m.memHistory.fill(m.side === 'before' ? 100 : 2);
      if (m.fpsSpark) m.fpsSpark.setAttribute('d', '');
      if (m.memSpark) m.memSpark.setAttribute('d', '');
      m.fps.display = m.fps.target = 60;
      m.fps.scrolling = false;
      m.frame.classList.remove('scrolling');
    });
    [beforeStage, afterStage].forEach((s) => s.classList.remove('scrolling'));
    loaded = false;
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = '목록 로드';
    }
    container.classList.remove('loaded', 'running');
  };
}

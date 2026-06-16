const ORDER_COUNT = 800_000;
const ORDER_FEED_MAX = 40;
const PRODUCTS = ['러닝화', '백팩', '무선 이어폰', '키보드', '커피머신', '모니터', '후드티', '텀블러'];
const REGIONS = ['서울', '부산', '대구', '광주', '대전', '인천', '제주', '경기'];
const SPARK_LEN = 24;
const PROFILER_MS = 120;

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

function pushHistory(arr, value) {
  arr.push(value);
  if (arr.length > SPARK_LEN) arr.shift();
}

function generateOrders(count) {
  const orders = new Array(count);
  for (let i = 0; i < count; i++) {
    const lineCount = 3 + (i % 4);
    const lines = new Array(lineCount);
    for (let j = 0; j < lineCount; j++) {
      lines[j] = {
        product: PRODUCTS[(i + j) % PRODUCTS.length],
        region: REGIONS[(i * 3 + j) % REGIONS.length],
        qty: (i % 6) + 1,
        unitPrice: 15000 + ((i * 7 + j * 13) % 50000),
        discountRate: ((i + j) % 15) * 0.01,
        vatRate: 0.1,
      };
    }
    orders[i] = { id: `ORD-${i}`, lines };
  }
  return orders;
}

function buildSalesReport(orders) {
  let totalRevenue = 0;
  let lineCount = 0;
  const buckets = new Map();

  for (const order of orders) {
    for (const line of order.lines) {
      const subtotal = line.qty * line.unitPrice;
      const discount = subtotal * line.discountRate;
      const revenue = (subtotal - discount) * (1 + line.vatRate);
      totalRevenue += revenue;
      lineCount += 1;

      const key = `${line.region} / ${line.product}`;
      const prev = buckets.get(key) || { label: key, count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += revenue;
      buckets.set(key, prev);

      for (let k = 0; k < 500; k++) {
        totalRevenue += Math.sqrt(k * 1.3 + line.qty);
      }
    }
  }

  const rows = [...buckets.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 16);

  return { totalRevenue, orderCount: orders.length, lineCount, rows };
}

const WORKER_CODE = `
const PRODUCTS = ${JSON.stringify(PRODUCTS)};
const REGIONS = ${JSON.stringify(REGIONS)};
${generateOrders.toString()}
${buildSalesReport.toString()}
self.onmessage = ({ data }) => {
  const t0 = Date.now();
  const orders = generateOrders(data.orderCount);
  const report = buildSalesReport(orders);
  self.postMessage({ report, duration: Date.now() - t0 });
};
`;

let LIVE_WORKER_CODE;

function formatRevenue(n) {
  if (n >= 1e12) return `₩${(n / 1e12).toFixed(1)}조`;
  if (n >= 1e8) return `₩${(n / 1e8).toFixed(0)}억`;
  return `₩${Math.round(n).toLocaleString()}`;
}

function formatClock(date = new Date()) {
  return date.toTimeString().slice(0, 8);
}

function statusClass(status) {
  if (status === '환불검토') return 'wo-status wo-status--refund';
  if (status === '출고대기') return 'wo-status wo-status--ship';
  return 'wo-status wo-status--paid';
}

function orderRow(seed) {
  const product = PRODUCTS[seed % PRODUCTS.length];
  const region = REGIONS[(seed * 3) % REGIONS.length];
  const amount = 48000 + ((seed * 7919) % 620000);
  const status = seed % 5 === 0 ? '환불검토' : seed % 3 === 0 ? '출고대기' : '결제완료';
  return {
    id: `ORD-${String(934200 + seed).padStart(6, '0')}`,
    product,
    region,
    amount,
    status,
  };
}

function renderOrders(feedEl, rows, filter) {
  const q = filter.trim();
  const filtered = rows.filter(row => !q || row.product.includes(q) || row.region.includes(q));
  feedEl.innerHTML = `
    <div class="worker-order-head">
      <span>주문번호</span><span>상품</span><span>지역</span><span>금액</span><span>상태</span>
    </div>
    <div class="worker-order-body">
    ${filtered.map(row => `
      <div class="worker-order-row">
        <span class="wo-num">${row.id}</span>
        <span class="wo-name">${row.product}</span>
        <span class="wo-region">${row.region}</span>
        <span class="wo-price">${formatRevenue(row.amount)}</span>
        <span class="${statusClass(row.status)}">${row.status}</span>
      </div>
    `).join('')}
    </div>
  `;
}

function renderEmptyResult(resultEl) {
  resultEl.innerHTML = `
    <div class="worker-result-head">
      <span>집계 결과</span>
      <strong>대기 중</strong>
    </div>
    ${['지역 / 상품', '매출', '주문 라인'].map(text => `
      <div class="worker-result-row muted">
        <span>${text}</span><strong>-</strong><em>-</em>
      </div>
    `).join('')}
  `;
}

function renderPendingResult(resultEl) {
  resultEl.innerHTML = `
    <div class="worker-result-head">
      <span>집계 결과</span>
      <strong>생성 중...</strong>
    </div>
    ${['지역 / 상품', '매출', '주문 라인'].map(text => `
      <div class="worker-result-row muted">
        <span>${text}</span><strong>-</strong><em>-</em>
      </div>
    `).join('')}
  `;
}

function renderReport(resultEl, report, durationMs) {
  resultEl.innerHTML = `
    <div class="worker-result-head">
      <span>${report.orderCount.toLocaleString()}건, ${report.lineCount.toLocaleString()}라인</span>
      <strong>${(durationMs / 1000).toFixed(1)}초</strong>
    </div>
    ${report.rows.map(row => `
      <div class="worker-result-row">
        <span>${row.label}</span>
        <strong>${formatRevenue(row.revenue)}</strong>
        <em>${row.count.toLocaleString()} 라인</em>
      </div>
    `).join('')}
  `;
}

function createAggWorker() {
  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

function createLivePanel({ stageEl, feedEl, searchEl, syncEl }) {
  const rows = [];
  let seed = 0;
  let intervalId = null;
  let paused = false;

  function addOrder() {
    if (paused) return;
    rows.unshift(orderRow(seed++));
    rows.splice(ORDER_FEED_MAX);
    renderOrders(feedEl, rows, searchEl.value);
    if (syncEl) syncEl.textContent = `live ${formatClock()}`;
  }

  function onSearch() {
    if (paused) return;
    renderOrders(feedEl, rows, searchEl.value);
  }

  searchEl.addEventListener('input', onSearch);

  for (let i = 0; i < 12; i++) addOrder();
  intervalId = setInterval(addOrder, 650);

  return {
    pause() {
      paused = true;
      stageEl.classList.add('blocked');
      searchEl.disabled = true;
    },
    resume() {
      paused = false;
      stageEl.classList.remove('blocked');
      searchEl.disabled = false;
    },
    stop() {
      clearInterval(intervalId);
      searchEl.removeEventListener('input', onSearch);
    },
  };
}

function createLivePanelWorker({ feedEl, searchEl, syncEl }) {
  const rows = [];
  for (let i = 0; i < 12; i++) {
    rows.unshift(orderRow(i));
  }
  renderOrders(feedEl, rows, searchEl.value);
  if (syncEl) syncEl.textContent = `live ${formatClock()}`;

  if (!LIVE_WORKER_CODE) {
    LIVE_WORKER_CODE = `
const PRODUCTS = ${JSON.stringify(PRODUCTS)};
const REGIONS = ${JSON.stringify(REGIONS)};
${orderRow.toString()}
let seed = 0;
setInterval(() => {
  seed++;
  self.postMessage({ type: 'order', row: orderRow(seed) });
}, 650);
`;
  }

  const blob = new Blob([LIVE_WORKER_CODE], { type: 'application/javascript' });
  const liveWorker = new Worker(URL.createObjectURL(blob));

  liveWorker.onmessage = ({ data }) => {
    if (data.type !== 'order') return;
    rows.unshift(data.row);
    rows.splice(ORDER_FEED_MAX);
    renderOrders(feedEl, rows, searchEl.value);
    if (syncEl) syncEl.textContent = `live ${formatClock()}`;
  };

  const onSearch = () => renderOrders(feedEl, rows, searchEl.value);
  searchEl.addEventListener('input', onSearch);

  return {
    stop() {
      liveWorker.terminate();
      searchEl.removeEventListener('input', onSearch);
    },
  };
}

function createThreadProfiler(screenEl, side) {
  const profiler = screenEl.querySelector('.worker-profiler');
  if (!profiler) return null;

  return {
    side,
    screenEl,
    cpuFill: profiler.querySelector('.worker-cpu-fill--main'),
    cpuPct: profiler.querySelector('.worker-cpu-pct'),
    cpuSpark: profiler.querySelector('.worker-cpu-spark-line--main'),
    workerFill: profiler.querySelector('.worker-cpu-fill--worker'),
    workerPct: profiler.querySelector('.worker-cpu-worker-pct'),
    workerSpark: profiler.querySelector('.worker-cpu-spark-line--worker'),
    mainBlocked: false,
    workerActive: false,
    cpuHistory: Array(SPARK_LEN).fill(side === 'after' ? 8 : 12),
    workerHistory: Array(SPARK_LEN).fill(0),
    lastPaint: 0,
  };
}

function paintProfiler(p, now) {
  if (!p || now - p.lastPaint < PROFILER_MS) return;
  p.lastPaint = now;

  const cpuPct = p.mainBlocked ? 100 : (p.side === 'after' ? 8 : 12);
  const cpuSparkVal = p.mainBlocked ? 100 : cpuPct + (p.side === 'after' ? 0 : 2);
  pushHistory(p.cpuHistory, cpuSparkVal);

  const cpuCls = p.mainBlocked ? 'bad' : 'good';
  if (p.cpuFill) {
    p.cpuFill.style.width = `${cpuPct}%`;
    p.cpuFill.className = `worker-cpu-fill worker-cpu-fill--main ${cpuCls}`;
  }
  if (p.cpuPct) {
    p.cpuPct.textContent = `${cpuPct}%`;
    p.cpuPct.className = `worker-cpu-pct num ${cpuCls}`;
  }
  if (p.cpuSpark) {
    p.cpuSpark.setAttribute('d', sparkPath(p.cpuHistory, 100, 0, 40, 12));
  }

  if (p.side === 'after' && p.workerFill) {
    const workerPct = p.workerActive ? 88 : 0;
    const workerCls = p.workerActive ? 'warn' : 'muted';
    pushHistory(p.workerHistory, p.workerActive ? workerPct : 2);
    p.workerFill.style.width = p.workerActive ? `${workerPct}%` : '0%';
    p.workerFill.className = `worker-cpu-fill worker-cpu-fill--worker${p.workerActive ? ' warn' : ''}`;
    if (p.workerPct) {
      p.workerPct.textContent = p.workerActive ? `${workerPct}%` : '-';
      p.workerPct.className = `worker-cpu-worker-pct num ${workerCls}`;
    }
    if (p.workerSpark) {
      p.workerSpark.setAttribute('d', sparkPath(p.workerHistory, 100, 0, 40, 12));
      p.workerSpark.classList.toggle('active', p.workerActive);
    }
  }

  p.screenEl.classList.toggle('profiler-stressed', p.mainBlocked);
}

export function initWorkerDemo(container) {
  if (!container || container._workerInit) return;
  container._workerInit = true;

  const beforeStage = container.querySelector('.worker-before-stage');
  const beforeFoot = container.querySelector('.worker-before-foot');
  const afterFoot = container.querySelector('.worker-after-foot');
  const beforeResult = container.querySelector('.worker-before-result');
  const afterResult = container.querySelector('.worker-after-result');
  const beforeRunBtn = container.querySelector('.worker-before-run');
  const afterRunBtn = container.querySelector('.worker-after-run');
  const beforeScreen = container.querySelector('.worker-screen-before');
  const afterScreen = container.querySelector('.worker-screen-after');

  const profilers = {
    before: createThreadProfiler(beforeScreen, 'before'),
    after: createThreadProfiler(afterScreen, 'after'),
  };

  let aggWorker = null;
  let beforeAggWorker = null;
  let beforeLive = null;
  let afterLive = null;
  let beforeRunning = false;
  let afterRunning = false;
  let profilerRaf = null;

  function setProfilerState(side, patch) {
    const p = profilers[side];
    if (!p) return;
    Object.assign(p, patch);
  }

  function ensureProfilerLoop() {
    if (profilerRaf) return;
    const loop = (now) => {
      paintProfiler(profilers.before, now);
      paintProfiler(profilers.after, now);
      profilerRaf = requestAnimationFrame(loop);
    };
    profilerRaf = requestAnimationFrame(loop);
  }

  function stopProfilerLoop() {
    if (profilerRaf) {
      cancelAnimationFrame(profilerRaf);
      profilerRaf = null;
    }
  }

  function setBeforeFoot(text, state = '') {
    if (!beforeFoot) return;
    beforeFoot.textContent = text;
    beforeFoot.className = `worker-screen-foot worker-before-foot${state ? ` ${state}` : ''}`;
  }

  function setAfterFoot(text, state = '') {
    if (!afterFoot) return;
    afterFoot.textContent = text;
    afterFoot.className = `worker-screen-foot worker-after-foot${state ? ` ${state}` : ''}`;
  }

  function resetBeforeUi() {
    beforeRunning = false;
    beforeScreen?.classList.remove('aggregating');
    beforeRunBtn.disabled = false;
    beforeRunBtn.textContent = '매출 집계 실행';
    beforeLive?.resume();
    setProfilerState('before', { mainBlocked: false, workerActive: false });
    setBeforeFoot('UI 멈춤');
    renderEmptyResult(beforeResult);
    paintProfiler(profilers.before, performance.now());
  }

  function resetAfterUi() {
    afterRunning = false;
    afterScreen?.classList.remove('aggregating');
    afterRunBtn.disabled = false;
    afterRunBtn.textContent = '매출 집계 실행';
    setProfilerState('after', { mainBlocked: false, workerActive: false });
    setAfterFoot('연산 완료, UI 블로킹 0ms');
    renderEmptyResult(afterResult);
    paintProfiler(profilers.after, performance.now());
  }

  function startLivePanels() {
    beforeLive?.stop();
    afterLive?.stop();
    beforeLive = createLivePanel({
      stageEl: beforeStage,
      feedEl: container.querySelector('.worker-before-feed'),
      searchEl: container.querySelector('.worker-before-search'),
      syncEl: container.querySelector('.worker-before-sync'),
    });
    afterLive = createLivePanelWorker({
      feedEl: container.querySelector('.worker-after-feed'),
      searchEl: container.querySelector('.worker-after-search'),
      syncEl: container.querySelector('.worker-after-sync'),
    });
    ensureProfilerLoop();
  }

  startLivePanels();
  resetBeforeUi();
  resetAfterUi();
  paintProfiler(profilers.before, performance.now());
  paintProfiler(profilers.after, performance.now());

  beforeRunBtn.addEventListener('click', () => {
    if (beforeRunning) return;
    beforeRunning = true;
    beforeScreen?.classList.add('aggregating');
    beforeRunBtn.disabled = true;
    beforeRunBtn.textContent = '집계 중...';
    setBeforeFoot('집계 중...', 'bad');
    renderPendingResult(beforeResult);
    beforeLive.pause();
    setProfilerState('before', { mainBlocked: true });
    ensureProfilerLoop();

    if (beforeAggWorker) beforeAggWorker.terminate();
    beforeAggWorker = createAggWorker();
    beforeAggWorker.onmessage = ({ data }) => {
      const duration = data.duration;
      renderReport(beforeResult, data.report, duration);
      setBeforeFoot(`UI 멈춤 ${Math.round(duration)}ms`, 'bad');
      beforeLive.resume();
      beforeRunning = false;
      beforeScreen?.classList.remove('aggregating');
      setProfilerState('before', { mainBlocked: false });
      beforeRunBtn.disabled = false;
      beforeRunBtn.textContent = '다시 실행';
      ensureProfilerLoop();
    };
    beforeAggWorker.postMessage({ orderCount: ORDER_COUNT });
  });

  afterRunBtn.addEventListener('click', () => {
    if (afterRunning) return;
    afterRunning = true;
    afterScreen?.classList.add('aggregating');
    afterRunBtn.disabled = true;
    afterRunBtn.textContent = '집계 중...';
    setAfterFoot('연산 중...', 'good');
    renderPendingResult(afterResult);
    setProfilerState('after', { workerActive: true });
    ensureProfilerLoop();

    if (aggWorker) aggWorker.terminate();
    aggWorker = createAggWorker();

    const t0 = performance.now();
    aggWorker.onmessage = ({ data }) => {
      const duration = data.duration ?? performance.now() - t0;
      renderReport(afterResult, data.report, duration);
      setAfterFoot(`연산 ${Math.round(duration)}ms, UI 블로킹 0ms`, 'good');
      afterRunning = false;
      afterScreen?.classList.remove('aggregating');
      setProfilerState('after', { workerActive: false });
      afterRunBtn.disabled = false;
      afterRunBtn.textContent = '다시 실행';
      ensureProfilerLoop();
    };

    aggWorker.postMessage({ orderCount: ORDER_COUNT });
  });

  container._workerReset = () => {
    if (aggWorker) aggWorker.terminate();
    if (beforeAggWorker) beforeAggWorker.terminate();
    aggWorker = null;
    beforeAggWorker = null;
    stopProfilerLoop();
    startLivePanels();
    resetBeforeUi();
    resetAfterUi();
  };
}

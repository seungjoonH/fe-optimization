export function syncS1MeasureTab(section, tabId) {
  if (!section || !tabId) return;

  section.querySelectorAll('.s1-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  section.querySelectorAll('.s1-tab-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.tabPanel === tabId);
  });
  section.querySelectorAll('.measure-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  section.querySelectorAll('.measure-tab-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.tabPanel === tabId);
  });

  if (tabId === 'performance') {
    section.querySelector('.dt-perf-panel')?._showDemoTrace?.();
  }
}

export function initMeasureTabs(shell) {
  if (!shell || shell._measureTabsBound) return;
  shell._measureTabsBound = true;

  const section = shell.closest('section[data-index="1"]');
  const tabs = shell.querySelectorAll('.measure-tab');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (section) syncS1MeasureTab(section, tab.dataset.tab);
    });
  });
}

export function initPerfApiDemo(root) {
  if (!root || root._perfApiBound) return;
  root._perfApiBound = true;

  const startBtn = root.querySelector('.perf-api-observe-btn');
  const runBtn = root.querySelector('.perf-api-run-btn');
  const clearBtn = root.querySelector('.perf-api-clear-btn');
  const log = root.querySelector('.perf-api-log');
  const status = root.querySelector('.perf-api-status');

  let observer = null;
  let observing = false;

  function appendLog(msg, type = '') {
    if (!log) return;
    const li = document.createElement('li');
    if (type) li.className = type;
    li.textContent = msg;
    log.prepend(li);
    while (log.children.length > 10) log.lastChild.remove();
  }

  startBtn?.addEventListener('click', () => {
    if (observing) return;
    try {
      observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          appendLog(
            `Long Task ${entry.duration.toFixed(0)}ms @ ${(entry.startTime / 1000).toFixed(2)}s`,
            'bad'
          );
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
      observing = true;
      if (status) {
        status.textContent = '관찰 중 (entryTypes: longtask)';
        status.className = 'perf-api-status active';
      }
      startBtn.disabled = true;
      appendLog('PerformanceObserver 시작', 'good');
    } catch {
      appendLog('PerformanceObserver 미지원 브라우저', 'bad');
    }
  });

  runBtn?.addEventListener('click', () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 220) Math.sqrt(Math.random() * 1e6);
    const ms = performance.now() - t0;
    appendLog(`동기 연산 실행: ${ms.toFixed(0)}ms (메인 스레드 블로킹)`, 'warn');
  });

  clearBtn?.addEventListener('click', () => {
    if (log) log.innerHTML = '';
  });

  root._perfApiReset = () => {
    observer?.disconnect();
    observer = null;
    observing = false;
    if (startBtn) startBtn.disabled = false;
    if (status) {
      status.textContent = 'Long Task 감지 대기';
      status.className = 'perf-api-status';
    }
    if (log) log.innerHTML = '';
  };
}

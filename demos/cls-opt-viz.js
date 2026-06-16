const SCENARIOS = {
  img: {
    poorNote: '높이 미지정',
    goodNote: 'aspect-ratio 예약',
    poorScore: '0.24',
    goodScore: '0',
  },
  ad: {
    poorNote: 'ad 로드 시 삽입',
    goodNote: '슬롯 미리 예약',
    poorScore: '0.20',
    goodScore: '0',
  },
};

export function initClsOptViz(root) {
  if (!root || root._clsovInit) return;
  root._clsovInit = true;

  const tabs = root.querySelectorAll('.clsov-tab');
  const poorCol = root.querySelector('.clsov-col--poor');
  const goodCol = root.querySelector('.clsov-col--good');
  const poorNote = root.querySelector('.clsov-note--poor');
  const goodNote = root.querySelector('.clsov-note--good');
  const poorScore = root.querySelector('.clsov-score--poor strong');
  const goodScore = root.querySelector('.clsov-score--good strong');
  const replayBtn = root.querySelector('.clsov-replay-btn');

  let scenario = 'ad';
  let timers = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function resetCols() {
    poorCol?.classList.remove('clsov-col--shifted');
    goodCol?.classList.remove('clsov-col--stable');
    if (poorScore) poorScore.textContent = '0.00';
    if (goodScore) goodScore.textContent = '0.00';
    root.classList.remove('running', 'ran');
  }

  function applyScenario(key) {
    scenario = key;
    tabs.forEach((tab) => {
      const on = tab.dataset.scenario === key;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const s = SCENARIOS[key];
    if (poorNote) poorNote.textContent = s.poorNote;
    if (goodNote) goodNote.textContent = s.goodNote;
    root.querySelectorAll('[data-clsov-ad]').forEach((el) => {
      el.hidden = key !== 'ad';
    });
    root.querySelectorAll('[data-clsov-img]').forEach((el) => {
      el.hidden = key !== 'img';
    });
    root.dataset.clsovScenario = key;
  }

  function run() {
    clearTimers();
    resetCols();
    root.classList.add('running');

    const s = SCENARIOS[scenario];

    timers.push(setTimeout(() => {
      poorCol?.classList.add('clsov-col--shifted');
      if (poorScore) poorScore.textContent = s.poorScore;
    }, 700));

    timers.push(setTimeout(() => {
      goodCol?.classList.add('clsov-col--stable');
      if (goodScore) goodScore.textContent = s.goodScore;
      root.classList.remove('running');
      root.classList.add('ran');
    }, 900));
  }

  function scheduleRun(delay = 380) {
    clearTimers();
    timers.push(setTimeout(() => {
      run();
    }, delay));
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.dataset.scenario === scenario) {
        scheduleRun(80);
        return;
      }
      applyScenario(tab.dataset.scenario);
      scheduleRun(120);
    });
  });

  replayBtn?.addEventListener('click', () => scheduleRun(80));

  applyScenario('ad');
  resetCols();
  root._clsovReset = () => {
    clearTimers();
    resetCols();
  };
  root._clsovScheduleRun = scheduleRun;
}

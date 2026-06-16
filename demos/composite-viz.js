const STAGE_KEYS = ['js', 'style', 'layout', 'paint', 'composite'];

export function initCompositeViz(root) {
  if (!root || root._cvInit) return;
  root._cvInit = true;

  const badBox = root.querySelector('.cv-anim-box--bad');
  const goodBox = root.querySelector('.cv-anim-box--good');
  const badStages = root.querySelectorAll('.cv-mini-stage[data-side="bad"]');
  const goodStages = root.querySelectorAll('.cv-mini-stage[data-side="good"]');
  const badFps = root.querySelector('.cv-fps-value--bad');
  const goodFps = root.querySelector('.cv-fps-value--good');
  const badFill = root.querySelector('.cv-fps-fill--bad');
  const goodFill = root.querySelector('.cv-fps-fill--good');
  const replayBtn = root.querySelector('.cv-replay-btn');

  let rafId = null;
  let autoTimer = null;
  let startTs = 0;

  function setStages(side, activeKeys) {
    const nodes = side === 'bad' ? badStages : goodStages;
    nodes.forEach((node) => {
      const on = activeKeys.includes(node.dataset.stage);
      node.classList.toggle('cv-mini-stage--on', on);
      node.classList.toggle('cv-mini-stage--skip', !on && node.dataset.stage !== 'js' && node.dataset.stage !== 'style');
    });
  }

  function reset() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    startTs = 0;
    badBox?.style.setProperty('--cv-t', '0');
    goodBox?.style.setProperty('--cv-t', '0');
    setStages('bad', ['js']);
    setStages('good', ['js']);
    if (badFps) badFps.textContent = '- fps';
    if (goodFps) goodFps.textContent = '- fps';
    if (badFill) badFill.style.width = '0%';
    if (goodFill) goodFill.style.width = '0%';
    root.classList.remove('running', 'ran');
  }

  const badArena = badBox?.closest('.cv-arena');
  const goodArena = goodBox?.closest('.cv-arena');

  function arenaPoint(arena, boxEl, t) {
    const w = arena?.clientWidth ?? 140;
    const h = arena?.clientHeight ?? 60;
    const box = boxEl?.offsetWidth ?? 15;
    const cx = (w - box) / 2;
    const cy = (h - box) / 2;
    const rx = cx * 0.78;
    const ry = cy * 0.78;
    const angle = t * Math.PI * 2;
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  }

  function tick(now) {
    if (!startTs) startTs = now;
    const sec = ((now - startTs) / 1000) % 2.4;
    const t = sec / 2.4;

    const badPt = arenaPoint(badArena, badBox, t);
    const goodPt = arenaPoint(goodArena, goodBox, t);

    if (badBox) {
      badBox.style.left = `${badPt.x}px`;
      badBox.style.top = `${badPt.y}px`;
    }
    if (goodBox) {
      goodBox.style.transform = `translate(${goodPt.x}px, ${goodPt.y}px)`;
    }

    const frame = Math.floor((now - startTs) / (1000 / 60));
    const badFpsVal = 18 + Math.round(Math.abs(Math.sin(now / 120)) * 12);
    const goodFpsVal = 58 + Math.round(Math.abs(Math.sin(now / 400)) * 2);

    if (badFps) badFps.textContent = `${badFpsVal} fps`;
    if (goodFps) goodFps.textContent = `${goodFpsVal} fps`;
    if (badFill) badFill.style.width = `${(badFpsVal / 60) * 100}%`;
    if (goodFill) goodFill.style.width = `${(goodFpsVal / 60) * 100}%`;

    setStages('bad', STAGE_KEYS);
    setStages('good', ['js', 'style', 'composite']);

    rafId = requestAnimationFrame(tick);
  }

  function run() {
    reset();
    root.classList.add('running');
    startTs = 0;
    rafId = requestAnimationFrame(tick);
  }

  function scheduleRun(delay = 350) {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      autoTimer = null;
      run();
      root.classList.add('ran');
    }, delay);
  }

  replayBtn?.addEventListener('click', () => scheduleRun(60));

  reset();
  root._cvReset = reset;
  root._cvScheduleRun = scheduleRun;
}

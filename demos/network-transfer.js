const FILE_CODE = {
  'bundle.js': {
    color: 'red',
    code: `import * as d3 from 'd3';
import { ChartCore, Renderer } from './chartCore';

export class HeavyChart {
  constructor(el, opts) {
    this.renderer = new Renderer(el, opts);
    this.core = new ChartCore(opts.data);
  }
  render() {
    this.renderer.draw(this.core.compute());
  }
}

export default function Dashboard() {
  return <HeavyChart data={data} />;
}`,
  },
  'main.js': {
    color: 'green',
    code: `import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./chunk.HeavyChart.js'));

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <HeavyChart data={data} />
    </Suspense>
  );
}`,
  },
  'chunk.HeavyChart.js': {
    color: 'blue',
    code: `import * as d3 from 'd3';
import { ChartCore, Renderer } from './chartCore';

export class HeavyChart {
  constructor(el, opts) {
    this.renderer = new Renderer(el, opts);
    this.core = new ChartCore(opts.data);
  }
  render() {
    this.renderer.draw(this.core.compute());
  }
}`,
  },
};

const BEFORE_FILES = [
  { name: 'bundle.js', size: '2.1MB', start: 0, duration: 4200, color: 'red', fcp: true },
];

const AFTER_FILES = [
  { name: 'main.js', size: '300kb', start: 0, duration: 600, color: 'green', fcp: true },
  { name: 'chunk.HeavyChart.js', size: '218kb', start: 1200, duration: 400, color: 'blue', fcp: false },
];

const TOTAL_MS = 4500;
const SPEED = 2; // wall-clock 2× → 전체 ~2.3초, 표시 ms는 실제 값

function fileProgress(elapsed, file) {
  if (elapsed < file.start) return 0;
  if (elapsed >= file.start + file.duration) return 1;
  return (elapsed - file.start) / file.duration;
}

function buildLanesHTML(files) {
  return files.map((f, i) => `
    <div class="net-lane" data-lane="${i}">
      <div class="net-lane-head">
        <span class="net-file-name" title="${f.name}">${f.name}</span>
        <span class="net-file-size">${f.size}</span>
      </div>
      <div class="net-lane-track">
        <div class="net-lane-progress net-progress-${f.color}"></div>
        <div class="net-packet net-packet-${f.color}">
          <span class="net-packet-label">${f.name}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function buildServerFilesHTML(files) {
  return files.map((f, i) =>
    `<div class="net-server-file net-file-${f.color}" data-idx="${i}" title="${f.name}">${f.name}</div>`
  ).join('');
}

function highlightNetCode(codeEl, source) {
  if (!codeEl) return;
  codeEl.classList.add('language-javascript');
  codeEl.textContent = source;
  if (!window.hljs) return;
  codeEl.removeAttribute('data-highlighted');
  codeEl.classList.remove('hljs');
  window.hljs.highlightElement(codeEl);
}

function buildInspectorHTML() {
  const tabs = Object.keys(FILE_CODE).map((name, i) => `
    <button type="button" class="net-source-tab${i === 0 ? ' active' : ''}" data-file="${name}">
      ${name}
    </button>
  `).join('');

  return `
    <div class="net-source-viewer" data-color="${FILE_CODE['bundle.js'].color}">
      <div class="net-source-tabs">${tabs}</div>
      <pre class="net-source-code"><code class="language-javascript"></code></pre>
    </div>
  `;
}

export function initNetworkDemo(panel) {
  if (!panel || panel._netInit) return;

  const btn = panel.querySelector('.network-run-btn');
  const beforeCol = panel.querySelector('.net-before');
  const afterCol = panel.querySelector('.net-after');
  if (!btn || !beforeCol || !afterCol) return;

  panel._netInit = true;

  beforeCol.querySelector('.net-lanes').innerHTML = buildLanesHTML(BEFORE_FILES);
  beforeCol.querySelector('.net-server-files').innerHTML = buildServerFilesHTML(BEFORE_FILES);
  afterCol.querySelector('.net-lanes').innerHTML = buildLanesHTML(AFTER_FILES);
  afterCol.querySelector('.net-server-files').innerHTML = buildServerFilesHTML(AFTER_FILES);
  panel.querySelector('.net-source-viewer')?.remove();
  panel.insertAdjacentHTML('beforeend', buildInspectorHTML());

  const sourceViewer = panel.querySelector('.net-source-viewer');
  const sourceCode = sourceViewer.querySelector('.net-source-code code');

  function showSource(name) {
    const info = FILE_CODE[name];
    if (!info) return;
    sourceViewer.dataset.color = info.color;
    highlightNetCode(sourceCode, info.code);
    sourceViewer.querySelectorAll('.net-source-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.file === name);
    });
  }

  sourceViewer.querySelectorAll('.net-source-tab').forEach(tab => {
    tab.addEventListener('click', () => showSource(tab.dataset.file));
  });
  showSource('bundle.js');

  let rafId = null;
  let running = false;

  btn.addEventListener('click', run);

  function resetCol(col, files) {
    col.querySelectorAll('.net-lane-progress').forEach(el => { el.style.width = '0%'; });
    col.querySelectorAll('.net-packet').forEach(el => {
      el.style.left = '0%';
      el.classList.remove('arrived', 'moving');
    });
    col.querySelectorAll('.net-server-file').forEach(el => el.classList.remove('sent'));
    col.querySelector('.net-client-view')?.classList.remove('loaded', 'fcp');
    col.querySelector('.net-client-blank')?.classList.remove('hidden');
    col.querySelector('.net-elapsed').textContent = '0 ms';
    col.querySelector('.net-status').textContent = '대기 중';
    col.querySelector('.net-fcp').textContent = 'FCP -';
    col.querySelector('.net-fcp').className = 'net-fcp';
    col.querySelector('.net-timeline-cursor')?.style.setProperty('--cursor', '0%');
    files.forEach((_, i) => {
      col.querySelector(`.net-client-file[data-idx="${i}"]`)?.classList.remove('received');
    });
  }

  function reset() {
    if (rafId) cancelAnimationFrame(rafId);
    running = false;
    btn.disabled = false;
    panel.classList.remove('running', 'ran');
    resetCol(beforeCol, BEFORE_FILES);
    resetCol(afterCol, AFTER_FILES);
  }

  function updateCol(col, files, elapsed) {
    const elapsedEl = col.querySelector('.net-elapsed');
    const statusEl = col.querySelector('.net-status');
    const fcpEl = col.querySelector('.net-fcp');
    const clientView = col.querySelector('.net-client-view');
    const clientBlank = col.querySelector('.net-client-blank');
    const cursor = col.querySelector('.net-timeline-cursor');

    elapsedEl.textContent = `${Math.min(Math.round(elapsed), TOTAL_MS)} ms`;
    if (cursor) cursor.style.setProperty('--cursor', `${Math.min(elapsed / TOTAL_MS * 100, 100)}%`);

    let fcpAt = null;
    let allDone = true;
    let statusParts = [];

    files.forEach((file, i) => {
      const p = fileProgress(elapsed, file);
      const lane = col.querySelector(`.net-lane[data-lane="${i}"]`);
      const progress = lane?.querySelector('.net-lane-progress');
      const packet = lane?.querySelector('.net-packet');
      const serverFile = col.querySelector(`.net-server-file[data-idx="${i}"]`);
      const clientFile = col.querySelector(`.net-client-file[data-idx="${i}"]`);

      if (p > 0 && p < 1) {
        allDone = false;
        packet?.classList.add('moving');
        packet?.classList.remove('arrived');
        statusParts.push(`${file.name} 전송 중…`);
      } else if (p >= 1) {
        packet?.classList.remove('moving');
        packet?.classList.add('arrived');
        serverFile?.classList.add('sent');
        clientFile?.classList.add('received');
      } else {
        allDone = false;
        packet?.classList.remove('moving', 'arrived');
      }

      if (progress) progress.style.width = `${p * 100}%`;
      if (packet) {
        const px = Math.max(0, Math.min(p, 1));
        packet.style.left = px >= 1 ? 'calc(100% - 26px)' : `calc(${px * 100}% - 13px)`;
      }

      if (file.fcp && p >= 1 && fcpAt === null) {
        fcpAt = file.start + file.duration;
      }
    });

    const fcpFile = files.find(f => f.fcp);
    if (fcpFile) {
      const fcpProgress = fileProgress(elapsed, fcpFile);
      if (fcpProgress >= 1) {
        const fcpMs = fcpFile.start + fcpFile.duration;
        clientView?.classList.add('loaded', 'fcp');
        clientBlank?.classList.add('hidden');
        fcpEl.textContent = `FCP ${fcpMs} ms`;
        fcpEl.className = 'net-fcp done';
      } else if (fcpProgress > 0) {
        statusEl.textContent = `${fcpFile.name} 다운로드 중, 화면 대기`;
        return;
      }
    }

    if (allDone && elapsed >= Math.max(...files.map(f => f.start + f.duration))) {
      statusEl.textContent = '전송 완료';
    } else if (statusParts.length) {
      statusEl.textContent = statusParts[0];
    } else {
      statusEl.textContent = '연결 중…';
    }
  }

  function run() {
    if (running) return;
    reset();
    running = true;
    btn.disabled = true;
    panel.classList.add('running');

    const t0 = performance.now();

    function tick(now) {
      const elapsed = (now - t0) * SPEED;
      updateCol(beforeCol, BEFORE_FILES, elapsed);
      updateCol(afterCol, AFTER_FILES, elapsed);

      if (elapsed < TOTAL_MS) {
        rafId = requestAnimationFrame(tick);
      } else {
        updateCol(beforeCol, BEFORE_FILES, TOTAL_MS);
        updateCol(afterCol, AFTER_FILES, TOTAL_MS);
        running = false;
        panel.classList.remove('running');
        panel.classList.add('ran');
        btn.disabled = false;
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  // File code popover
  const popover = document.createElement('div');
  popover.className = 'net-code-popover';
  popover.innerHTML = `
    <div class="net-code-popover-header">
      <span class="net-code-popover-title"></span>
      <button class="net-code-popover-close">✕</button>
    </div>
    <pre class="net-code-popover-body"><code class="language-javascript"></code></pre>
  `;
  document.body.appendChild(popover);

  popover.querySelector('.net-code-popover-close').addEventListener('click', () => {
    popover.classList.remove('visible');
  });
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !e.target.closest('.net-file-badge')) {
      popover.classList.remove('visible');
    }
  }, true);

  function showPopover(name, anchorEl) {
    const info = FILE_CODE[name];
    if (!info) return;
    showSource(name);
    popover.querySelector('.net-code-popover-title').textContent = name;
    highlightNetCode(popover.querySelector('code'), info.code);
    popover.dataset.color = info.color;
    popover.classList.add('visible');

    const rect = anchorEl.getBoundingClientRect();
    const pw = 420;
    let left = rect.left + rect.width / 2 - pw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    const top = rect.bottom + 8;
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.width = `${pw}px`;
  }

  function bindFileBadges() {
    panel.querySelectorAll('.net-client-file, .net-server-file, .net-file-name').forEach(el => {
      if (el._popBound) return;
      el._popBound = true;
      el.classList.add('net-file-badge');
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = el.title || el.textContent.trim();
        showPopover(name, el);
      });
    });
  }

  bindFileBadges();

  panel._netReset = reset;
  panel._netRun = run;
}

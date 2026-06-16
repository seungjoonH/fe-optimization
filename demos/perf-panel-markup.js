import { renderDevtoolsTabBar } from './devtools-panel-chrome.js';
import {
  DT_ICON_SETTINGS,
  renderClearIcon,
  renderExportIcon,
  renderImportIcon,
  renderRecordIcon,
  renderReloadIcon,
} from './devtools-icons.js';
import { renderShopExamplePage } from './shop-example-page.js';

function renderPerfContextMenu() {
  return `
    <div class="lh-context-menu" role="menu" hidden>
      <button type="button" class="lh-ctx-item" disabled>뒤로</button>
      <button type="button" class="lh-ctx-item" disabled>앞으로</button>
      <button type="button" class="lh-ctx-item">새로고침</button>
      <span class="lh-ctx-sep" aria-hidden="true"></span>
      <button type="button" class="lh-ctx-item">페이지 소스 보기</button>
      <button type="button" class="lh-ctx-item lh-ctx-inspect">검사</button>
    </div>`;
}

function renderLiveMetricsHtml() {
  return `
              <div class="dtp-live-left">
                <h3 class="dtp-live-section-title">Local metrics</h3>
                <article class="dtp-metric-card">
                  <div class="dtp-metric-header">
                    <span class="dtp-metric-name">Largest Contentful Paint (LCP)</span>
                    <span class="dtp-help-icon">?</span>
                  </div>
                  <div class="dtp-metric-value bad">3.40 s</div>
                  <p class="dtp-metric-desc">Your local LCP value of <span class="warn">3.40 s</span> needs improvement.</p>
                  <p class="dtp-metric-el"><strong>LCP element</strong> <code>span</code></p>
                </article>
                <article class="dtp-metric-card">
                  <div class="dtp-metric-header">
                    <span class="dtp-metric-name">Cumulative Layout Shift (CLS)</span>
                    <span class="dtp-help-icon">?</span>
                  </div>
                  <div class="dtp-metric-value bad">0.15</div>
                  <p class="dtp-metric-desc">Your local CLS value of <span class="warn">0.15</span> needs improvement.</p>
                  <p class="dtp-metric-el"><strong>Worst cluster</strong> <a class="dtp-link">2 shifts</a></p>
                </article>
                <article class="dtp-metric-card">
                  <div class="dtp-metric-header">
                    <span class="dtp-metric-name">Interaction to Next Paint (INP)</span>
                    <span class="dtp-help-icon">?</span>
                  </div>
                  <div class="dtp-metric-value muted">-</div>
                  <p class="dtp-metric-desc">Interact with the page to measure INP.</p>
                </article>
                <a class="dtp-learn-link">Learn more about local and field metrics</a>
              </div>
              <div class="dtp-live-resizer" aria-hidden="true"></div>
              <div class="dtp-live-right">
                <h3 class="dtp-live-section-title">Next steps</h3>
                <article class="dtp-next-card">
                  <strong>Field metrics</strong>
                  <p>See how your local metrics compare to real user data in the <a class="dtp-link">Chrome UX Report</a>.</p>
                  <button class="dtp-setup-btn" type="button">Set up</button>
                </article>
                <article class="dtp-next-card">
                  <strong>Environment settings</strong>
                  <p>Use the <a class="dtp-link">device toolbar</a> and configure throttling to simulate real user environments and identify more performance issues.</p>
                  <div class="dtp-select-line">CPU: No throttling <span>▼</span></div>
                  <div class="dtp-select-line">Network: No throttling <span>▼</span></div>
                  <label class="dtp-live-check"><input type="checkbox" disabled> Disable network cache <span class="dtp-info-icon">i</span></label>
                </article>
                <button class="dtp-live-action dtp-live-record" type="button">
                  <span>${renderRecordIcon()} Record</span>
                  <kbd>⌘ E</kbd>
                </button>
                <button class="dtp-live-action dtp-live-record-reload" type="button">
                  <span>${renderReloadIcon()} Record and reload</span>
                  <kbd>⌘ ⇧ E</kbd>
                </button>
              </div>`;
}

function frameBarsHtml() {
  const count = 48;
  const dropStart = Math.floor(count * 0.38);
  const dropEnd = Math.floor(count * 0.52);
  return Array.from({ length: count }, (_, i) => {
    let cls = 'good';
    if (i >= dropStart && i < dropEnd) cls = 'drop';
    else if (i % 7 === 4) cls = 'warn';
    const left = (i / count * 100).toFixed(1);
    const width = (100 / count).toFixed(1);
    const tipMs = cls === 'drop' ? '16.7 ms' : cls === 'warn' ? '16.3 ms' : '16.7 ms';
    const tipLabel = cls === 'drop' ? 'Dropped frame' : cls === 'warn' ? 'Partially-presented frame' : 'Frame';
    return `<span class="dtp-fbar ${cls}" style="left:${left}%;width:${width}%" data-tip-ms="${tipMs}" data-tip-label="${tipLabel}" data-tip-kind="${cls}"></span>`;
  }).join('');
}

function networkBarsHtml() {
  const reqs = [
    { top: 3, left: 1, width: 22, cls: 'doc' },
    { top: 9, left: 3, width: 14, cls: 'js' },
    { top: 9, left: 18, width: 10, cls: 'js' },
    { top: 15, left: 5, width: 11, cls: 'css' },
    { top: 15, left: 17, width: 8, cls: 'css' },
    { top: 21, left: 22, width: 16, cls: 'fetch' },
    { top: 21, left: 40, width: 12, cls: 'fetch' },
    { top: 27, left: 28, width: 9, cls: 'img' },
    { top: 27, left: 38, width: 7, cls: 'img' },
  ];
  return reqs.map((r) =>
    `<span class="dtp-net-bar ${r.cls}" style="left:${r.left}%;width:${r.width}%;top:${r.top}px"></span>`
  ).join('');
}

function mainFlameRowsHtml() {
  const blocks = [
    [0, 0.8, 6.5, 'loading', 'Parse HTML'],
    [0, 8, 3.5, 'scripting', ''],
    [0, 12, 5, 'scripting', 'Evaluate Script'],
    [0, 18, 2.5, 'scripting', ''],
    [0, 21, 4, 'rendering', 'Recalculate Style'],
    [0, 26, 3, 'painting', 'Paint'],
    [1, 1, 2, 'scripting', ''],
    [1, 4, 3.5, 'scripting', 'Evaluate Script'],
    [1, 8.5, 2, 'scripting', ''],
    [1, 11.5, 4, 'scripting', 'Evaluate Script'],
    [1, 16.5, 2.5, 'rendering', 'Layout'],
    [1, 20, 3, 'painting', 'Paint'],
    [1, 24, 2, 'scripting', ''],
    [1, 27, 3.5, 'scripting', ''],
    [1, 31, 2, 'scripting', ''],
    [1, 34, 2.5, 'scripting', ''],
    [1, 61, 3, 'scripting', 'Evaluate Script'],
    [1, 65, 2.5, 'scripting', ''],
    [1, 69, 4, 'scripting', ''],
    [1, 74, 3, 'rendering', 'Layout'],
    [1, 78, 2.5, 'painting', 'Paint'],
    [2, 2, 2.5, 'scripting', ''],
    [2, 6, 3, 'scripting', 'Evaluate Script'],
    [2, 10, 2, 'scripting', ''],
    [2, 13, 2.5, 'scripting', ''],
    [2, 17, 2, 'scripting', ''],
    [2, 20, 3, 'scripting', ''],
    [2, 24, 2.5, 'scripting', ''],
    [2, 28, 2, 'scripting', ''],
    [2, 32, 3, 'scripting', ''],
    [2, 62, 2.5, 'scripting', ''],
    [2, 66, 3, 'scripting', ''],
    [2, 71, 2, 'scripting', ''],
    [3, 1.5, 2, 'scripting', ''],
    [3, 4.5, 2.5, 'scripting', ''],
    [3, 8, 2, 'scripting', ''],
    [3, 11, 3, 'scripting', 'Evaluate Script'],
    [3, 15, 2, 'scripting', ''],
    [3, 18, 2.5, 'scripting', ''],
    [3, 22, 2, 'scripting', ''],
    [3, 63, 2.5, 'scripting', ''],
    [3, 67, 3, 'scripting', ''],
    [4, 3, 2, 'scripting', ''],
    [4, 6.5, 2.5, 'scripting', ''],
    [4, 10, 2, 'scripting', ''],
    [4, 14, 2.5, 'scripting', ''],
    [4, 19, 2, 'scripting', ''],
    [4, 64, 2.5, 'scripting', ''],
    [5, 52, 4, 'rendering', 'Layout'],
    [5, 52, 4, 'painting', 'Paint'],
    [5, 57, 3, 'rendering', 'Layout'],
    [5, 57, 3, 'painting', 'Composite Layers'],
  ];

  const rows = Array.from({ length: 6 }, () => []);
  blocks.forEach(([row, left, width, cls, label]) => {
    rows[row].push(
      `<div class="dtp-flame ${cls}" style="left:${left}%;width:${width}%">${label ? `<span class="dtp-flame-label">${label}</span>` : ''}</div>`
    );
  });

  rows[2].push(`
    <div class="dtp-flame task-stripe" style="left:38%;width:22%"></div>
    <div class="dtp-flame scripting dtp-long-flame perf-step-stack" data-perf-step="5" style="left:38%;width:22%">
      <span class="dtp-flame-label">filterOrders()</span>
      <div class="dtp-lt2-triangle" title="Long task"></div>
    </div>`);

  return rows.map((cells, i) => `<div class="dtp-flame-row r${i}">${cells.join('')}</div>`).join('');
}

export function getPerfPanelHTML() {
  return `
    <div class="devtools-shell perf-shell">
      <div class="devtools-chrome browser-chrome">
        <div class="chrome-dots"><span></span><span></span><span></span></div>
        <div class="chrome-url">https://shop.example.com</div>
      </div>
      <div class="devtools-workspace perf-dock lh-devtools-collapsed dock-bottom">
        <div class="lh-page-wrap" data-perf-step="1">
          ${renderShopExamplePage()}
          ${renderPerfContextMenu()}
        </div>
        <div class="devtools-resize-handle" role="separator" tabindex="0"></div>
        <div class="devtools-panel dt-perf-panel">
          ${renderDevtoolsTabBar('Performance', { stepAttr: 'data-perf-step', stepValue: '1', dockMenu: true })}
          <div class="dt-panel-body dt-perf-body">
            <div class="dtp-live-toolbar perf-step-record" data-perf-step="2">
              <button class="dtp-record-btn" type="button" aria-label="Record">
                ${renderRecordIcon()}
              </button>
              <button class="dtp-record-reload-btn" type="button" aria-label="Record and reload">
                ${renderReloadIcon()}
              </button>
              <button class="dtp-toolbar-icon" type="button" aria-label="Clear">
                ${renderClearIcon()}
              </button>
              <span class="dtp-toolbar-sep"></span>
              <button class="dtp-toolbar-icon" type="button" aria-label="Load profile">
                ${renderImportIcon()}
              </button>
              <button class="dtp-toolbar-icon" type="button" aria-label="Save profile" disabled>
                ${renderExportIcon(true)}
              </button>
              <span class="dtp-toolbar-sep"></span>
              <span class="dtp-live-select">Live metrics</span>
              <label class="dtp-toolbar-check"><input type="checkbox" checked disabled> Screenshots</label>
              <label class="dtp-toolbar-check"><input type="checkbox" disabled> Memory</label>
              <span class="dtp-toolbar-sep"></span>
              <label class="dtp-toolbar-check"><input type="checkbox" disabled> Dim 3rd parties</label>
              <span class="dtp-toolbar-spacer"></span>
              <button class="dtp-toolbar-icon dtp-settings-btn" type="button" aria-label="Capture settings">
                ${DT_ICON_SETTINGS}
              </button>
            </div>
            <div class="dtp-rec-state" hidden>
              <div class="dtp-rec-card">
                <table class="dtp-rec-tbl">
                  <tr><td>Status</td><td><strong>Tracing...</strong></td></tr>
                  <tr><td>Time</td><td class="dtp-rc-time">0.0 s</td></tr>
                  <tr><td>Buffer</td><td><div class="dtp-rc-buf"><div class="dtp-rc-fill"></div></div></td></tr>
                </table>
                <button class="dtp-stop-btn" type="button">Stop</button>
              </div>
            </div>
            <div class="dtp-results-state" hidden>
              <div class="dtp-results-toolbar">
                <div class="dtp-toolbar2">
                  <button class="dtp-btn2 dtp-rec-again" type="button" aria-label="Record">
                    ${renderRecordIcon()}
                  </button>
                  <button class="dtp-btn2" type="button" aria-label="Clear">
                    ${renderClearIcon()}
                  </button>
                  <button class="dtp-btn2" type="button" aria-label="Load profile">
                    ${renderImportIcon()}
                  </button>
                  <button class="dtp-btn2" type="button" aria-label="Save profile">
                    ${renderExportIcon()}
                  </button>
                  <span class="dtp-profile-select">shop.example.com #1</span>
                  <span class="dtp-toolbar-spacer"></span>
                  <label class="dtp-ck"><input type="checkbox" checked disabled> Screenshots</label>
                  <label class="dtp-ck dim"><input type="checkbox" disabled> Memory</label>
                  <button class="dtp-btn2 dtp-settings-btn" type="button" aria-label="Capture settings">
                    ${DT_ICON_SETTINGS}
                  </button>
                </div>
              </div>
              <div class="dtp-chart-wrap">
                <div class="dtp-flamechart">
                  <div class="dtp-ruler2">
                    <span>0 ms</span><span>2,000 ms</span><span>4,000 ms</span><span>6,000 ms</span><span>8,000 ms</span>
                  </div>
                  <div class="dtp-overview-light">
                    <div class="dtp-ov-row2"><span class="dtp-ov-label2">CPU</span><div class="dtp-ov-cpu2"></div></div>
                    <div class="dtp-ov-row2"><span class="dtp-ov-label2">NET</span><div class="dtp-ov-net2"></div></div>
                  </div>
                  <div class="dtp-tracks2">
                    <div class="dtp-track2 dtp-net-track">
                      <div class="dtp-tl2"><svg width="10" height="10"><use href="#icon-chevron-down"/></svg> Network</div>
                      <div class="dtp-tc2 dtp-net-lanes">${networkBarsHtml()}</div>
                    </div>
                    <div class="dtp-track2 dtp-frames-track perf-step-frames" data-perf-step="3">
                      <div class="dtp-tl2"><svg width="10" height="10"><use href="#icon-chevron-down"/></svg> Frames</div>
                      <div class="dtp-tc2 dtp-frames-body">
                        <div class="dtp-frame-timing" id="dtp-frame-timing">${frameBarsHtml()}</div>
                        <div class="dtp-filmstrip" id="dtp-filmstrip"></div>
                        <div class="dtp-frame-tooltip" hidden></div>
                      </div>
                    </div>
                    <div class="dtp-track2 dtp-anim-track">
                      <div class="dtp-tl2"><svg width="10" height="10"><use href="#icon-chevron-down"/></svg> Animations</div>
                      <div class="dtp-tc2">
                        <div class="dtp-anim-lane"><div class="dtp-anim-bar" style="left:18%;width:8%">transform</div></div>
                        <div class="dtp-anim-lane"><div class="dtp-anim-bar wide" style="left:52%;width:16%">opacity</div></div>
                      </div>
                    </div>
                    <div class="dtp-track2 dtp-main-track2 perf-step-longtask" data-perf-step="4">
                      <div class="dtp-tl2"><svg width="10" height="10"><use href="#icon-chevron-down"/></svg> Main @ shop.example.com</div>
                      <div class="dtp-tc2 dtp-flame-stack">
                        <div class="dtp-select-range" style="left:38%;width:22%"></div>
                        <div class="dtp-pin-line" style="left:49%"></div>
                        ${mainFlameRowsHtml()}
                      </div>
                    </div>
                    <div class="dtp-track2 dtp-gpu-row2">
                      <div class="dtp-tl2">GPU</div>
                      <div class="dtp-tc2 dtp-gpu-bars2"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="dtp-color-legend2">
                <span><i class="leg scripting"></i>Scripting</span>
                <span><i class="leg rendering"></i>Rendering</span>
                <span><i class="leg painting"></i>Painting</span>
                <span><i class="leg longtask"></i>Long task</span>
                <span><i class="leg frame-good"></i>Frame, 16.7 ms</span>
                <span><i class="leg frame-drop"></i>Dropped frame</span>
              </div>
              <div class="dtp-details-resize-handle" role="separator" tabindex="0" aria-label="Resize details panel"></div>
              <div class="dtp-details-panel">
                <div class="dtp-details-tabs" role="tablist">
                  <button type="button" class="dtp-details-tab active" role="tab" aria-selected="true">Summary</button>
                  <button type="button" class="dtp-details-tab" role="tab">Bottom-up</button>
                  <button type="button" class="dtp-details-tab" role="tab">Call tree</button>
                  <button type="button" class="dtp-details-tab" role="tab">Event log</button>
                </div>
                <div class="dtp-details-content" data-details-view="summary">
                  <aside class="dtp-details-sidebar">
                    <div class="dtp-details-range">Range: 0 ms – 9.08 s</div>
                    <ul class="dtp-breakdown-list">
                      <li><span class="dtp-swatch system"></span><span class="dtp-breakdown-name">System</span><span class="dtp-breakdown-val">128 ms</span></li>
                      <li><span class="dtp-swatch scripting"></span><span class="dtp-breakdown-name">Scripting</span><span class="dtp-breakdown-val">312 ms</span></li>
                      <li><span class="dtp-swatch rendering"></span><span class="dtp-breakdown-name">Rendering</span><span class="dtp-breakdown-val">48 ms</span></li>
                      <li><span class="dtp-swatch painting"></span><span class="dtp-breakdown-name">Painting</span><span class="dtp-breakdown-val">16 ms</span></li>
                      <li class="dtp-breakdown-total"><span class="dtp-swatch total"></span><span class="dtp-breakdown-name">Total</span><span class="dtp-breakdown-val">504 ms</span></li>
                    </ul>
                  </aside>
                  <div class="dtp-details-table-wrap">
                    <table class="dtp-details-table">
                      <thead>
                        <tr>
                          <th class="dtp-col-party">1st / 3rd party</th>
                          <th class="dtp-col-transfer">Transfer size</th>
                          <th class="dtp-col-time dtp-col-sorted">Main thread time <span class="dtp-sort-arrow">▼</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><span class="dtp-party-name dtp-party-muted">[unattributed]</span></td>
                          <td>0.0 kB</td>
                          <td>88.0 ms</td>
                        </tr>
                        <tr class="dtp-row-highlight">
                          <td><span class="dtp-party-name">shop.example.com</span> <span class="dtp-party-badge first">1st party</span></td>
                          <td>42.1 kB</td>
                          <td>312.0 ms</td>
                        </tr>
                        <tr>
                          <td><span class="dtp-party-name">fonts.googleapis.com</span></td>
                          <td>12.4 kB</td>
                          <td>8.2 ms</td>
                        </tr>
                        <tr>
                          <td><span class="dtp-party-name">cdn.shop.example.com</span></td>
                          <td>28.6 kB</td>
                          <td>4.1 ms</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="dtp-details-content dtp-details-content--solo" data-details-view="bottomup" hidden>
                  <div class="dtp-details-table-wrap">
                    <table class="dtp-details-table dtp-details-table--activities">
                      <thead>
                        <tr>
                          <th class="dtp-col-self dtp-col-sorted">Self time <span class="dtp-sort-arrow">▼</span></th>
                          <th class="dtp-col-total">Total time</th>
                          <th class="dtp-col-activity">Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr class="dtp-row-highlight">
                          <td>312 ms</td>
                          <td>312 ms</td>
                          <td>filterOrders()</td>
                        </tr>
                        <tr>
                          <td>18 ms</td>
                          <td>42 ms</td>
                          <td>Layout</td>
                        </tr>
                        <tr>
                          <td>12 ms</td>
                          <td>12 ms</td>
                          <td>Paint</td>
                        </tr>
                        <tr>
                          <td>8 ms</td>
                          <td>24 ms</td>
                          <td>Evaluate Script</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div class="dtp-live-state">${renderLiveMetricsHtml()}</div>
          </div>
        </div>
      </div>
    </div>`;
}

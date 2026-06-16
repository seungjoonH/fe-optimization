import { renderDevtoolsTabBar } from './devtools-panel-chrome.js';
import { getPerfPanelHTML } from './perf-panel-markup.js';
import { renderShopExamplePage } from './shop-example-page.js';

function renderLhContextMenu() {
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

const LH_MODES = [
  { label: 'Navigation (Default)', checked: true },
  { label: 'Timespan', dim: true },
  { label: 'Snapshot', dim: true },
];

const LH_DEVICES = [
  { label: 'Mobile', checked: true },
  { label: 'Desktop', dim: true },
];

const LH_CATEGORIES = [
  { label: 'Performance', checked: true },
  { label: 'Accessibility', checked: true },
  { label: 'Best practices', checked: true },
  { label: 'SEO', checked: true },
  { label: 'PWA', checked: true },
];

function renderLhConfigOption(type, item) {
  const tag = type === 'radio' ? 'lh-radio' : 'lh-check';
  const dim = item.dim ? ' dim' : '';
  const input = type === 'radio'
    ? `<input type="radio"${item.checked ? ' checked' : ''} disabled>`
    : `<input type="checkbox"${item.checked ? ' checked' : ''} disabled>`;
  return `<label class="${tag}${dim}">${input} ${item.label}</label>`;
}

function renderLhConfig() {
  return `
              <div class="lh-config lh-step-config" data-lh-step="3">
                <div class="lh-config-title">
                  <span class="lh-config-icon"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></span>
                  <span>Generate a Lighthouse report</span>
                </div>
                <div class="lh-config-cols">
                  <div class="lh-config-col">
                    <span class="lh-config-label">Mode <span class="lh-config-label-link">Learn more</span></span>
                    ${LH_MODES.map((m) => renderLhConfigOption('radio', m)).join('')}
                  </div>
                  <div class="lh-config-col">
                    <span class="lh-config-label">Device</span>
                    ${LH_DEVICES.map((d) => renderLhConfigOption('radio', d)).join('')}
                  </div>
                  <div class="lh-config-col lh-config-col--cats">
                    <span class="lh-config-label">Categories</span>
                    ${LH_CATEGORIES.map((c) => renderLhConfigOption('check', c)).join('')}
                  </div>
                </div>
                <button type="button" class="btn btn-run lighthouse-btn lh-step-analyze" data-lh-step="4">Analyze page load</button>
              </div>`;
}

export function mountLighthouseDock(mountEl) {
  if (!mountEl || mountEl.dataset.mounted) return mountEl;
  mountEl.dataset.mounted = '1';

  mountEl.innerHTML = `
    <div class="devtools-shell lh-browser-shell">
      <div class="devtools-chrome browser-chrome">
        <div class="chrome-dots"><span></span><span></span><span></span></div>
        <div class="chrome-url">https://shop.example.com</div>
      </div>
      <div class="devtools-workspace lighthouse-dock lh-devtools-collapsed dock-bottom">
        <div class="lh-page-wrap" data-lh-step="1">
          ${renderShopExamplePage()}
          ${renderLhContextMenu()}
        </div>
        <div class="devtools-resize-handle" role="separator" tabindex="0"></div>
        <div class="devtools-panel lighthouse-panel">
          ${renderDevtoolsTabBar('Lighthouse', { stepAttr: 'data-lh-step', stepValue: '2', dockMenu: true })}
          <div class="dt-panel-body">
            <div class="lighthouse-ui">
              ${renderLhConfig()}
              <div class="lighthouse-progress"><div class="progress-track"><div class="progress-fill"></div></div><div class="auditing-text">Auditing https://shop.example.com<span class="dots"></span></div></div>
              <div class="lh-report lh-step-results" data-lh-step="5">
                <div class="lh-scores lh-scores-row">
                  <div class="lh-gauge-wrap lh-gauge-sm" data-score="64" data-label="Performance"><div class="lh-gauge"></div><span class="lh-gauge-label">Performance</span></div>
                  <div class="lh-gauge-wrap lh-gauge-sm" data-score="94" data-label="Accessibility"><div class="lh-gauge"></div><span class="lh-gauge-label">Accessibility</span></div>
                  <div class="lh-gauge-wrap lh-gauge-sm" data-score="73" data-label="Best Practices"><div class="lh-gauge"></div><span class="lh-gauge-label">Best Practices</span></div>
                  <div class="lh-gauge-wrap lh-gauge-sm" data-score="58" data-label="SEO"><div class="lh-gauge"></div><span class="lh-gauge-label">SEO</span></div>
                </div>
                <div class="lh-report-summary">
                  <div class="lh-gauge-wrap lh-gauge-lg lh-gauge-interactive" data-category="performance" data-score="64" data-metrics='{"si":42,"fcp":58,"lcp":51,"tbt":74,"cls":96}'>
                    <div class="lh-gauge"></div>
                    <span class="lh-detail-title">Performance</span>
                  </div>
                  <p class="lh-detail-note">Values are estimated and may vary. The performance score is calculated directly from these metrics. <span class="lh-detail-link">See calculator.</span></p>
                  <div class="lh-score-legend" data-lh-step="5">
                    <span class="lh-legend-item"><span class="lh-legend-icon lh-legend-icon--poor" aria-hidden="true"></span>0–49</span>
                    <span class="lh-legend-item"><span class="lh-legend-icon lh-legend-icon--avg" aria-hidden="true"></span>50–89</span>
                    <span class="lh-legend-item"><span class="lh-legend-icon lh-legend-icon--good" aria-hidden="true"></span>90–100</span>
                  </div>
                </div>
                <div class="lh-opportunities lh-step-opportunities" data-lh-step="5" hidden>
                  <div class="lh-opp-title">Opportunities</div>
                  <div class="lh-opp-row"><span class="lh-opp-name">Eliminate render-blocking resources</span><span class="lh-opp-save">Est savings 1.2&nbsp;s</span></div>
                  <div class="lh-opp-row"><span class="lh-opp-name">Properly size images</span><span class="lh-opp-save">Est savings 450&nbsp;KiB</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  return mountEl.querySelector('.lighthouse-dock');
}

export function mountPerfPanel(mountEl) {
  if (!mountEl || mountEl.dataset.mounted) return mountEl.querySelector('.dt-perf-panel');
  mountEl.dataset.mounted = '1';
  mountEl.innerHTML = getPerfPanelHTML();
  return mountEl.querySelector('.dt-perf-panel');
}

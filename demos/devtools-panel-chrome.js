import {
  DT_ICON_CLOSE,
  DT_ICON_DEVICES,
  DT_ICON_INSPECT,
  DT_ICON_MORE,
  DT_ICON_SETTINGS,
  DT_ICON_TAB_MORE,
} from './devtools-icons.js';

const DEVTOOLS_TABS = [
  'Elements',
  'Console',
  'Sources',
  'Network',
  'Performance',
  'Memory',
  'Application',
  'Lighthouse',
];

function hollowRect(x, y, w, h, t = 1) {
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${t}"/>`,
    `<rect x="${x}" y="${y}" width="${t}" height="${h}"/>`,
    `<rect x="${x}" y="${y + h - t}" width="${w}" height="${t}"/>`,
    `<rect x="${x + w - t}" y="${y}" width="${t}" height="${h}"/>`,
  ].join('');
}

function dockSideSvg(side) {
  const frame = hollowRect(2.5, 2.5, 11, 11);
  const panes = {
    undock: `${hollowRect(1.5, 5, 7.5, 7.5)}${hollowRect(5.5, 1.5, 8, 8)}<rect x="6.5" y="2.5" width="6" height="6" fill="#fff"/>`,
    left: `${frame}<rect x="2.5" y="2.5" width="3.5" height="11" opacity="0.45"/>`,
    bottom: `${frame}<rect x="2.5" y="9" width="11" height="4.5" opacity="0.45"/>`,
    right: `${frame}<rect x="9" y="2.5" width="4.5" height="11" opacity="0.45"/>`,
  };
  return `<svg class="dt-dock-side-svg" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">${panes[side]}</svg>`;
}

/** Chrome DevTools 하단 패널 상단 탭 바 (Elements, Console, …, Lighthouse) */
export function renderDevtoolsTabBar(activeTab, { stepAttr, stepValue, dockMenu = false } = {}) {
  const stepData = stepAttr && stepValue != null ? ` ${stepAttr}="${stepValue}"` : '';
  const tabs = DEVTOOLS_TABS.map((name) => {
    const cls = name === activeTab ? ' class="active"' : '';
    return `<span${cls}>${name}</span>`;
  }).join('');

  const dockMenuHtml = dockMenu ? `
      <div class="dt-dock-menu-wrap">
        <button type="button" class="dt-action-btn dt-dock-menu-btn" aria-label="More options" aria-expanded="false">
          ${DT_ICON_MORE}
        </button>
        <div class="dt-dock-menu" hidden>
          <div class="dt-dock-menu-section">
            <span class="dt-dock-menu-label">Dock side</span>
            <div class="dt-dock-side-icons" role="group" aria-label="Dock side">
              <button type="button" class="dt-dock-icon" data-dock="undock" title="Undock into separate window" disabled aria-disabled="true">
                ${dockSideSvg('undock')}
              </button>
              <button type="button" class="dt-dock-icon is-disabled" data-dock="left" title="Dock to left" disabled aria-disabled="true">
                ${dockSideSvg('left')}
              </button>
              <button type="button" class="dt-dock-icon is-active" data-dock="bottom" title="Dock to bottom">
                ${dockSideSvg('bottom')}
              </button>
              <button type="button" class="dt-dock-icon" data-dock="right" title="Dock to right">
                ${dockSideSvg('right')}
              </button>
            </div>
          </div>
        </div>
      </div>` : `<button type="button" class="dt-action-btn" aria-hidden="true" tabindex="-1">${DT_ICON_MORE}</button>`;

  return `
    <div class="dt-panel-topbar"${stepData}>
      <div class="dt-inspect-toolbar" aria-hidden="true">
        ${DT_ICON_INSPECT}
        ${DT_ICON_DEVICES}
      </div>
      <div class="dt-tab-bar">${tabs}<span class="dt-tab-more">${DT_ICON_TAB_MORE}</span></div>
      <div class="dt-panel-actions" aria-hidden="true">
        <button type="button" class="dt-action-btn" aria-label="Settings" tabindex="-1">${DT_ICON_SETTINGS}</button>
        ${dockMenuHtml}
        <button type="button" class="dt-action-btn dt-close-btn" aria-label="Close DevTools">${DT_ICON_CLOSE}</button>
      </div>
    </div>`;
}

function getLhWorkspace(shell) {
  if (!shell) return null;
  if (shell.classList.contains('lighthouse-dock') || shell.classList.contains('perf-dock')) return shell;
  return shell.querySelector('.lighthouse-dock, .perf-dock');
}

function closeContextMenu(shell) {
  const menu = shell.querySelector('.lh-context-menu');
  if (menu) menu.hidden = true;
}

function closeDockMenu(shell) {
  const menu = shell.querySelector('.dt-dock-menu');
  const btn = shell.querySelector('.dt-dock-menu-btn');
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

export function openLhDevtools(shell) {
  const workspace = getLhWorkspace(shell);
  if (!workspace) return;
  workspace.classList.remove('lh-devtools-collapsed');
  closeContextMenu(shell);
}

export function closeLhDevtools(shell) {
  const workspace = getLhWorkspace(shell);
  if (!workspace) return;
  workspace.classList.add('lh-devtools-collapsed');
  closeDockMenu(shell);
}

function setDockSide(shell, side) {
  const workspace = getLhWorkspace(shell);
  if (!workspace || workspace.classList.contains('lh-devtools-collapsed')) return;
  if (side === 'left' || side === 'undock') return;

  workspace.classList.remove('dock-bottom', 'dock-right');
  workspace.classList.add(side === 'right' ? 'dock-right' : 'dock-bottom');
  workspace.style.gridTemplateRows = '';
  workspace.style.gridTemplateColumns = '';

  shell.querySelectorAll('.dt-dock-icon[data-dock]').forEach((btn) => {
    const active = btn.dataset.dock === side;
    btn.classList.toggle('is-active', active);
  });

  workspace.dispatchEvent(new CustomEvent('lh-dock-change', { bubbles: true }));
}

export function initLighthouseBrowser(shell) {
  if (!shell || shell._lhBrowserBound) return;
  shell._lhBrowserBound = true;

  const pageWrap = shell.querySelector('.lh-page-wrap');
  const ctxMenu = shell.querySelector('.lh-context-menu');
  const inspectBtn = shell.querySelector('.lh-ctx-inspect');
  const dockMenuBtn = shell.querySelector('.dt-dock-menu-btn');
  const dockMenu = shell.querySelector('.dt-dock-menu');

  pageWrap?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!ctxMenu || !pageWrap) return;
    const rect = pageWrap.getBoundingClientRect();
    ctxMenu.hidden = false;
    ctxMenu.style.left = `${e.clientX - rect.left}px`;
    ctxMenu.style.top = `${e.clientY - rect.top}px`;
    closeDockMenu(shell);
  });

  inspectBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openLhDevtools(shell);
  });

  ctxMenu?.addEventListener('click', (e) => e.stopPropagation());

  dockMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!dockMenu || getLhWorkspace(shell)?.classList.contains('lh-devtools-collapsed')) return;
    const open = dockMenu.hidden;
    closeContextMenu(shell);
    dockMenu.hidden = !open;
    dockMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  dockMenu?.addEventListener('click', (e) => e.stopPropagation());

  shell.querySelector('.dt-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLhDevtools(shell);
  });

  shell.querySelectorAll('.dt-dock-icon[data-dock]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.disabled || btn.classList.contains('is-disabled')) return;
      setDockSide(shell, btn.dataset.dock);
      closeDockMenu(shell);
    });
  });

  shell.addEventListener('click', () => {
    closeContextMenu(shell);
    closeDockMenu(shell);
  });

  document.addEventListener('click', () => {
    if (!shell.isConnected) return;
    closeContextMenu(shell);
    closeDockMenu(shell);
  });
}

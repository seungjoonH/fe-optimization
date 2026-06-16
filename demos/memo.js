function shallowEqual(a, b) {
  const keysA = Object.keys(a);
  return (
    keysA.length === Object.keys(b).length &&
    keysA.every((k) => a[k] === b[k])
  );
}

const PRODUCTS = [
  { id: 'mbp-14', name: 'MacBook Pro 14"', price: '₩2,490,000' },
  { id: 'airpods-pro', name: 'AirPods Pro', price: '₩359,000' },
  { id: 'ipad-air', name: 'iPad Air', price: '₩899,000' },
];

const INITIAL_VISITORS = 100;
const MIN_VISITORS = 20;

const TICK_MIN_MS = 1400;
const TICK_MAX_MS = 4200;
const HIGHLIGHT_MS = 800;

function randomVisitorDelta() {
  const magnitude = 3 + Math.floor(Math.random() * 16);
  return Math.random() < 0.5 ? -magnitude : magnitude;
}

function nextVisitorCount(prev) {
  let next = prev;
  for (let i = 0; i < 8 && next === prev; i++) {
    next = Math.max(MIN_VISITORS, prev + randomVisitorDelta());
  }
  return next;
}

export function initMemoDemo(container) {
  if (!container || container._memoInit) return;
  container._memoInit = true;

  let visitors = INITIAL_VISITORS;
  let beforeDashRenders = 0;
  let beforeChildRenders = 0;
  let afterDashRenders = 0;
  let afterChildRenders = 0;
  let lastAfterProps = null;
  let tickTimer = null;

  const beforeVisitors = container.querySelector('.memo-before-visitors');
  const afterVisitors = container.querySelector('.memo-after-visitors');
  const beforeList = container.querySelector('.memo-before-products');
  const afterList = container.querySelector('.memo-after-products');
  const beforeDash = container.querySelector('.memo-before-dashboard');
  const afterDash = container.querySelector('.memo-after-dashboard');
  const beforeChild = container.querySelector('.memo-before-child');
  const afterChild = container.querySelector('.memo-after-child');
  const updateBtn = container.querySelector('.memo-update-btn');

  const stableOnSelect = () => {};
  const beforeChildProps = { products: PRODUCTS };
  const afterChildProps = { products: PRODUCTS, onSelect: stableOnSelect };

  function renderProductList(el, props) {
    el.innerHTML = props.products
      .map(
        (p, i) =>
          `<div class="product-row"><span class="product-rank">${i + 1}</span><span class="product-name">${p.name}</span><span class="product-price">${p.price}</span></div>`
      )
      .join('');
  }

  function flashComp(compEl, count) {
    if (!compEl) return;
    const name = compEl.dataset.comp || 'Component';
    const tag = compEl.querySelector('.memo-comp-tag');
    if (tag) tag.textContent = `${name} ×${count}`;
    compEl.classList.remove('rdt-highlight');
    void compEl.offsetWidth;
    compEl.classList.add('rdt-highlight');
    clearTimeout(compEl._rdtTimer);
    compEl._rdtTimer = setTimeout(() => compEl.classList.remove('rdt-highlight'), HIGHLIGHT_MS);
  }

  function renderDashboard(side) {
    if (side === 'before') {
      beforeDashRenders++;
      flashComp(beforeDash, beforeDashRenders);
      return;
    }
    afterDashRenders++;
    flashComp(afterDash, afterDashRenders);
  }

  function renderBeforeChild() {
    beforeChildRenders++;
    flashComp(beforeChild, beforeChildRenders);
    renderProductList(beforeList, beforeChildProps);
  }

  function renderAfterChild(props, isMount = false) {
    if (!isMount && lastAfterProps && shallowEqual(lastAfterProps, props)) return;
    lastAfterProps = props;
    afterChildRenders++;
    flashComp(afterChild, afterChildRenders);
    renderProductList(afterList, props);
  }

  function mountPanels() {
    renderProductList(beforeList, beforeChildProps);
    beforeDashRenders = 1;
    beforeChildRenders = 1;
    afterDashRenders = 1;
    lastAfterProps = null;
    flashComp(beforeDash, beforeDashRenders);
    flashComp(beforeChild, beforeChildRenders);
    flashComp(afterDash, afterDashRenders);
    renderAfterChild(afterChildProps, true);
  }

  function bumpVisitors() {
    visitors = nextVisitorCount(visitors);

    beforeVisitors.textContent = visitors;
    afterVisitors.textContent = visitors;

    renderDashboard('before');
    renderBeforeChild();
    renderDashboard('after');
    renderAfterChild(afterChildProps);
  }

  function scheduleNextTick() {
    stopAutoTick();
    const delay = TICK_MIN_MS + Math.random() * (TICK_MAX_MS - TICK_MIN_MS);
    tickTimer = setTimeout(() => {
      tickTimer = null;
      bumpVisitors();
      scheduleNextTick();
    }, delay);
  }

  function stopAutoTick() {
    if (tickTimer) {
      clearTimeout(tickTimer);
      tickTimer = null;
    }
  }

  function clearHighlights() {
    [beforeDash, afterDash, beforeChild, afterChild].forEach((el) => {
      el?.classList.remove('rdt-highlight');
    });
  }

  function start() {
    visitors = INITIAL_VISITORS;
    beforeVisitors.textContent = visitors;
    afterVisitors.textContent = visitors;
    mountPanels();
    scheduleNextTick();
    setTimeout(bumpVisitors, 450);
  }

  mountPanels();
  updateBtn.addEventListener('click', bumpVisitors);

  container._memoStart = start;
  container._memoReset = () => {
    stopAutoTick();
    clearHighlights();
  };
}

const PRODUCTS = [
  { name: "에어포스 1 '07", price: 139000 },
  { name: 'Ultraboost Light', price: 189000 },
  { name: 'Classic Backpack', price: 89000 },
  { name: 'Sport Cap', price: 35000 },
  { name: 'Dri-FIT 티셔츠', price: 45000 },
  { name: '러닝 쇼츠', price: 52000 },
  { name: '트레이닝 짐백', price: 78000 },
  { name: '윈드브레이커', price: 129000 },
  { name: '스포츠 양말 3팩', price: 18000 },
  { name: '하이탑 스니커즈', price: 159000 },
];

const AUTO_DELAY_MS = 400;
const ITEM_CYCLE_MS = 340;
const PHASE_READ_MS = 0;
const PHASE_REFLOW_MS = 110;
const PHASE_WRITE_MS = 220;
const BATCH_READ_MS = 0;
const BATCH_REFLOW_MS = 380;
const BATCH_WRITE_MS = 700;
const BATCH_END_MS = 1100;

export function initReflowDemo(container) {
  if (!container) return;
  if (container._reflowInit) return;
  container._reflowInit = true;

  const CARD_COUNT = PRODUCTS.length;
  const beforeCardsEl = container.querySelector('.reflow-cards-before');
  const afterCardsEl = container.querySelector('.reflow-cards-after');
  const timelineBefore = container.querySelector('.reflow-timeline-before');
  const timelineAfter = container.querySelector('.reflow-timeline-after');
  const beforeCountEl = container.querySelector('.reflow-count-before');
  const afterCountEl = container.querySelector('.reflow-count-after');
  const thrashCountBeforeEl = container.querySelector('.reflow-thrash-count-before');
  const thrashCountAfterEl = container.querySelector('.reflow-thrash-count-after');
  const liveItemBeforeEl = container.querySelector('[data-live-item-before]');
  const liveItemAfterEl = container.querySelector('[data-live-item-after]');
  const loopPhases = container.querySelectorAll('[data-live-phases-before] .rf-phase');
  const batchPhases = container.querySelectorAll('[data-live-phases-after] .rf-phase');
  const replayBeforeBtn = container.querySelector('.reflow-replay-btn--before');
  const replayAfterBtn = container.querySelector('.reflow-replay-btn--after');

  function createCards(parent) {
    parent.innerHTML = '';
    const cards = [];
    for (let i = 0; i < CARD_COUNT; i++) {
      const product = PRODUCTS[i];
      const card = document.createElement('div');
      card.className = 'reflow-card product-card';
      card.dataset.index = String(i);
      card.innerHTML = `
        <span class="product-thumb"></span>
        <span class="reflow-card-name">${product.name}</span>
        <span class="reflow-card-price">₩${product.price.toLocaleString()}</span>
      `;
      parent.appendChild(card);
      cards.push(card);
    }
    return cards;
  }

  const beforeCards = createCards(beforeCardsEl);
  const afterCards = createCards(afterCardsEl);

  function initTimeline(el, count) {
    el.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const block = document.createElement('div');
      block.className = 'rt-block';
      el.appendChild(block);
    }
  }

  function activateTimelineBlock(el, index) {
    const block = el.children[index];
    if (!block) return;
    block.classList.remove('rt-block--on');
    void block.offsetWidth;
    block.classList.add('rt-block--on');
  }

  function setPhases(phases, active) {
    phases.forEach((phase) => {
      phase.classList.toggle('active', phase.dataset.phase === active);
    });
  }

  function resetCards(cards) {
    cards.forEach((c) => {
      c.style.height = '';
      c.classList.remove('flash-bad', 'flash-good', 'resized', 'reflow-card-active');
    });
  }

  function resetBeforeTrace() {
    setPhases(loopPhases, null);
    if (liveItemBeforeEl) liveItemBeforeEl.textContent = '상품 #1';
    if (thrashCountBeforeEl) thrashCountBeforeEl.textContent = '0';
  }

  function resetAfterTrace() {
    setPhases(batchPhases, null);
    if (liveItemAfterEl) liveItemAfterEl.textContent = '일괄 처리';
    if (thrashCountAfterEl) thrashCountAfterEl.textContent = '0';
  }

  function resetBeforeSide() {
    beforeTimers.forEach(clearTimeout);
    beforeTimers = [];
    resetCards(beforeCards);
    resetBeforeTrace();
    timelineBefore.innerHTML = '';
    beforeCountEl.textContent = '-';
    replayBeforeBtn?.removeAttribute('disabled');
    if (beforeCardsEl) beforeCardsEl.scrollTop = 0;
  }

  function resetAfterSide() {
    afterTimers.forEach(clearTimeout);
    afterTimers = [];
    resetCards(afterCards);
    resetAfterTrace();
    timelineAfter.innerHTML = '';
    afterCountEl.textContent = '-';
    replayAfterBtn?.removeAttribute('disabled');
    if (afterCardsEl) afterCardsEl.scrollTop = 0;
  }

  function reset() {
    runGeneration += 1;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    if (bothDoneTimer) clearTimeout(bothDoneTimer);
    bothDoneTimer = null;
    resetBeforeSide();
    resetAfterSide();
    container.classList.remove('running', 'ran');
  }

  let beforeTimers = [];
  let afterTimers = [];
  let autoTimer = null;
  let bothDoneTimer = null;
  let runGeneration = 0;

  function scrollCardIntoView(card) {
    const list = card.closest('.reflow-cards');
    if (!list) return;
    const listRect = list.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (cardRect.top < listRect.top) {
      list.scrollTop -= listRect.top - cardRect.top;
    } else if (cardRect.bottom > listRect.bottom) {
      list.scrollTop += cardRect.bottom - listRect.bottom;
    }
  }

  function highlightCard(card, on) {
    card.classList.toggle('reflow-card-active', on);
    if (on) scrollCardIntoView(card);
  }

  function runBeforeSide() {
    const gen = runGeneration;
    beforeTimers.forEach(clearTimeout);
    beforeTimers = [];
    resetCards(beforeCards);
    resetBeforeTrace();
    initTimeline(timelineBefore, CARD_COUNT);
    beforeCountEl.textContent = '0';
    replayBeforeBtn?.setAttribute('disabled', '');
    if (beforeCardsEl) beforeCardsEl.scrollTop = 0;

    beforeCards.forEach((el, i) => {
      const start = i * ITEM_CYCLE_MS;
      const label = `#${i + 1} ${PRODUCTS[i].name}`;

      beforeTimers.push(setTimeout(() => {
        if (gen !== runGeneration) return;
        if (liveItemBeforeEl) liveItemBeforeEl.textContent = label;
        highlightCard(el, true);
        setPhases(loopPhases, 'read');
      }, start + PHASE_READ_MS));

      beforeTimers.push(setTimeout(() => {
        if (gen !== runGeneration) return;
        void el.offsetHeight;
        setPhases(loopPhases, 'reflow');
        activateTimelineBlock(timelineBefore, i);
        const count = i + 1;
        if (thrashCountBeforeEl) thrashCountBeforeEl.textContent = String(count);
        beforeCountEl.textContent = String(count);
      }, start + PHASE_REFLOW_MS));

      beforeTimers.push(setTimeout(() => {
        if (gen !== runGeneration) return;
        const h = el.offsetHeight;
        el.style.height = `${h + 10}px`;
        el.classList.add('resized', 'flash-bad');
        setPhases(loopPhases, 'write');
        beforeTimers.push(setTimeout(() => {
          if (gen !== runGeneration) return;
          el.classList.remove('flash-bad');
        }, 200));
      }, start + PHASE_WRITE_MS));

      beforeTimers.push(setTimeout(() => {
        if (gen !== runGeneration) return;
        highlightCard(el, false);
        setPhases(loopPhases, null);
      }, start + ITEM_CYCLE_MS - 30));
    });

    const totalMs = CARD_COUNT * ITEM_CYCLE_MS;
    beforeTimers.push(setTimeout(() => {
      if (gen !== runGeneration) return;
      replayBeforeBtn?.removeAttribute('disabled');
    }, totalMs));
    return totalMs;
  }

  function runAfterSide() {
    const gen = runGeneration;
    afterTimers.forEach(clearTimeout);
    afterTimers = [];
    resetCards(afterCards);
    resetAfterTrace();
    initTimeline(timelineAfter, 1);
    afterCountEl.textContent = '0';
    replayAfterBtn?.setAttribute('disabled', '');
    if (afterCardsEl) afterCardsEl.scrollTop = 0;

    const heights = [];

    afterTimers.push(setTimeout(() => {
      if (gen !== runGeneration) return;
      setPhases(batchPhases, 'read');
      afterCards.forEach((el) => {
        el.classList.add('reflow-card-active');
        heights.push(el.offsetHeight);
      });
    }, BATCH_READ_MS));

    afterTimers.push(setTimeout(() => {
      if (gen !== runGeneration) return;
      setPhases(batchPhases, 'reflow');
      activateTimelineBlock(timelineAfter, 0);
      afterCountEl.textContent = '1';
      if (thrashCountAfterEl) thrashCountAfterEl.textContent = '1';
    }, BATCH_REFLOW_MS));

    afterTimers.push(setTimeout(() => {
      if (gen !== runGeneration) return;
      setPhases(batchPhases, 'write');
      afterCards.forEach((el, i) => {
        el.style.height = `${heights[i] + 10}px`;
        el.classList.add('resized', 'flash-good');
      });
      afterTimers.push(setTimeout(() => {
        if (gen !== runGeneration) return;
        afterCards.forEach((el) => el.classList.remove('flash-good', 'reflow-card-active'));
      }, 280));
    }, BATCH_WRITE_MS));

    afterTimers.push(setTimeout(() => {
      if (gen !== runGeneration) return;
      setPhases(batchPhases, null);
      replayAfterBtn?.removeAttribute('disabled');
    }, BATCH_END_MS));

    return BATCH_END_MS;
  }

  function runBoth() {
    const gen = runGeneration;
    container.classList.add('running');
    beforeCountEl.textContent = '…';
    afterCountEl.textContent = '…';

    const beforeMs = runBeforeSide();
    const afterMs = runAfterSide();

    if (bothDoneTimer) clearTimeout(bothDoneTimer);
    bothDoneTimer = setTimeout(() => {
      if (gen !== runGeneration) return;
      bothDoneTimer = null;
      container.classList.remove('running');
      container.classList.add('ran');
    }, Math.max(beforeMs, afterMs));
  }

  function scheduleRun(delay = AUTO_DELAY_MS) {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      autoTimer = null;
      reset();
      runBoth();
    }, delay);
  }

  replayBeforeBtn?.addEventListener('click', () => {
    resetBeforeSide();
    container.classList.add('running');
    runBeforeSide();
    setTimeout(() => container.classList.remove('running'), CARD_COUNT * ITEM_CYCLE_MS);
  });

  replayAfterBtn?.addEventListener('click', () => {
    resetAfterSide();
    container.classList.add('running');
    runAfterSide();
    setTimeout(() => container.classList.remove('running'), BATCH_END_MS);
  });

  container._reflowReset = reset;
  container._reflowScheduleRun = scheduleRun;
}

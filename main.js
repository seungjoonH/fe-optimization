import { mountLighthouseDock, mountPerfPanel } from './demos/lighthouse-dock.js';
import { initLighthouseBrowser } from './demos/lh-browser.js';
import {
  bindLhDockExtras, initClsViz, initCwvCards, initInpViz, initLcpViz,
  initLhStepGuide, initPerfStepGuide, resetClsViz, resetInpViz, resetLcpViz,
  resetMainthreadViz, startClsViz, startInpViz, startLcpViz, startMainthreadViz,
  resetWorkerFlowViz, startWorkerFlowViz,
} from './demos/measurement.js';
import { initReflowDemo } from './demos/reflow.js';
import { initVirtualDemo } from './demos/virtual.js';
import { initMemoDemo } from './demos/memo.js';
import { initWorkerDemo } from './demos/worker-blob.js';
import { renderBundleTreemaps, renderBundleTreemapOutput, BUNDLE_ANALYZER_SETUPS, fillSourcePipeline, fillBundleDiffViews, fillCompareGrid, observeTreemapResize } from './demos/bundle-analyzer.js';
import { fillCodeSnippets } from './demos/code-snippets.js';
import { initCodeSplitViz } from './demos/code-split-viz.js';
import { initLcpOptViz } from './demos/lcp-opt-viz.js';
import { initCompositeViz } from './demos/composite-viz.js';
import { initClsOptViz } from './demos/cls-opt-viz.js';
import {
  animateLhBreakdown, animateLhGauge, buildLhPerfGaugeHtml, createLhGauge,
  hideLhOpportunity, parsePerfMetrics, randomAuditScores, resetLhBreakdownArcs,
  showLhOpportunity, countUp, easeOutCubic
} from './demos/visualizations.js';

const TOC_JUMP = {
  measure: 1,
  treeShaking: 10,
  codeSplitting: 14,
  reflow: 15,
  virtualization: 20,
  memoization: 21,
  webWorker: 24,
};

const PRESENTATION_TOC = [
  {
    id: 'intro',
    icon: null,
    label: '소개',
    slides: [{ index: 0, label: '타이틀' }],
  },
  {
    id: 'measure',
    icon: 'icon-gauge',
    label: '성능 측정',
    slides: [
      { index: 1, label: '왜 측정이 먼저인가' },
      { index: 2, label: '어떻게 측정하는가' },
      { index: 3, label: 'Core Web Vitals란' },
      { index: 4, label: 'LCP 상세' },
      { index: 5, label: 'INP 상세' },
      { index: 6, label: 'CLS 상세' },
      { index: 7, label: 'Lighthouse란' },
      { index: 8, label: 'Lighthouse 사용법' },
      { index: 9, label: 'DevTools Performance' },
    ],
  },
  {
    id: 'treeShaking',
    icon: 'icon-tree',
    label: 'Tree Shaking',
    slides: [
      { index: 10, label: '번들 / Dead Code' },
      { index: 11, label: 'ESM이 필요한 이유' },
      { index: 12, label: 'Before/After, Minifier' },
      { index: 13, label: 'Bundle Analyzer' },
    ],
  },
  {
    id: 'codeSplitting',
    icon: 'icon-layers',
    label: 'Code Splitting',
    slides: [
      { index: 14, label: 'Code Splitting' },
    ],
  },
  {
    id: 'reflow',
    icon: 'icon-resize',
    label: 'Reflow / Repaint',
    slides: [
      { index: 15, label: 'LCP 리소스 최적화' },
      { index: 16, label: '렌더링 파이프라인' },
      { index: 17, label: 'Layout Thrashing 줄이기' },
      { index: 18, label: 'Composite-only' },
      { index: 19, label: 'CLS 레이아웃 안정화' },
    ],
  },
  {
    id: 'virtualization',
    icon: 'icon-virtual',
    label: 'Virtualization',
    slides: [
      { index: 20, label: 'Virtualization' },
    ],
  },
  {
    id: 'memoization',
    icon: 'icon-cache',
    label: 'Memoization',
    slides: [
      { index: 21, label: 'React 렌더링 사이클' },
      { index: 22, label: 'memo, useCallback' },
      { index: 23, label: 'useMemo 기준' },
    ],
  },
  {
    id: 'webWorker',
    icon: 'icon-worker',
    label: 'Web Worker',
    slides: [
      { index: 24, label: '메인 스레드 구조' },
      { index: 25, label: 'API 흐름' },
      { index: 26, label: '블로킹 데모' },
    ],
  },
  {
    id: 'closing',
    icon: null,
    label: '마무리',
    slides: [{ index: 27, label: '마무리' }],
  },
];

function highlightCode(el) {
  if (!el || !window.hljs) return;
  el.classList.add('language-javascript');
  el.removeAttribute('data-highlighted');
  el.classList.remove('hljs');
  window.hljs.highlightElement(el);
}

function highlightStaticCode(root = document) {
  if (!window.hljs) return;
  root.querySelectorAll('pre code').forEach(el => {
    if (el.closest('.terminal-win')) return;
    if (el.classList.contains('bundle-code-before') || el.classList.contains('bundle-code-shaken') || el.classList.contains('bundle-code-minified')) return;
    if (!el.classList.contains('language-javascript')) el.classList.add('language-javascript');
    if (!el.classList.contains('hljs')) window.hljs.highlightElement(el);
  });
}

let currentIndex = 0;
let navLocked = false;
let wheelGestureLocked = false;
let wheelLockTimer = null;
let wheelTailTimer = null;
let wheelTailGuard = false;
let navFinishTimer = null;
const container = document.getElementById('container');
const sections = document.querySelectorAll('section[data-index]');
const TOTAL_SECTIONS = sections.length;
const indicator = document.getElementById('nav-indicator');
const prevBtn = document.getElementById('nav-prev');
const nextBtn = document.getElementById('nav-next');

const WHEEL_LOCK_MS = 1250;
const WHEEL_TAIL_IDLE_MS = 180;
const WHEEL_TAIL_DELTA_MAX = 18;
const SLIDE_TRANSITION_MS = 700;
const KICKER_TRANSITION_MS = 380;

const sectionMeta = new Map();
let kickerMetaIndex = null;
let kickerAnimating = false;

function buildSectionMeta() {
  sectionMeta.clear();
  PRESENTATION_TOC.forEach((group, groupIdx) => {
    group.slides.forEach((slide, slideIdx) => {
      sectionMeta.set(slide.index, {
        section: `${String(groupIdx + 1).padStart(2, '0')} ${group.label}`,
        slide: `${String(groupIdx + 1).padStart(2, '0')}-${slideIdx + 1} ${slide.label}`,
      });
    });
  });
}

function getSectionMeta(index) {
  return sectionMeta.get(index) || {
    section: index === 0 ? '00 Intro' : 'Presentation',
    slide: index === 0 ? '00 Overview' : `Slide ${index}`,
  };
}

function createKickerPanel(meta) {
  const panel = document.createElement('div');
  panel.className = 'slide-kicker-panel';
  panel.innerHTML = `<span>${meta.section}</span><strong>${meta.slide}</strong>`;
  return panel;
}

function resetKickerSize() {
  const kicker = document.getElementById('slide-kicker');
  if (!kicker) return;
  kicker.classList.remove('is-animating');
  kicker.style.removeProperty('width');
  kicker.style.removeProperty('transition');
}

function finishKickerTransition(track, next, index) {
  track.querySelectorAll('.slide-kicker-panel').forEach((panel) => {
    if (panel !== next) panel.remove();
  });
  next.classList.remove('is-entering', 'is-exiting');
  next.classList.add('is-active');
  resetKickerSize();
  kickerAnimating = false;
  kickerMetaIndex = index;
}

function measureKickerWidth(meta) {
  const kicker = document.getElementById('slide-kicker');
  if (!kicker) return 0;

  const probe = kicker.cloneNode(true);
  probe.removeAttribute('id');
  probe.classList.remove('is-animating');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:auto;top:0;left:0;';
  const track = probe.querySelector('.slide-kicker-track');
  track.replaceChildren(createKickerPanel(meta));
  document.body.appendChild(probe);
  const width = probe.offsetWidth;
  probe.remove();
  return width;
}

function setKickerPanel(index) {
  const track = document.querySelector('#slide-kicker .slide-kicker-track');
  if (!track) return;

  const panel = createKickerPanel(getSectionMeta(index));
  panel.classList.add('is-active');
  track.replaceChildren(panel);
  resetKickerSize();
  kickerMetaIndex = index;
  kickerAnimating = false;
}

function updateSlideKicker(index, { animate = false } = {}) {
  const kicker = document.getElementById('slide-kicker');
  const track = kicker?.querySelector('.slide-kicker-track');
  if (!track) return;
  if (kickerMetaIndex === index && !kickerAnimating) return;

  const current = track.querySelector('.slide-kicker-panel.is-active');
  if (!animate || !current) {
    setKickerPanel(index);
    return;
  }

  const meta = getSectionMeta(index);
  const fromWidth = kicker.offsetWidth;
  const toWidth = measureKickerWidth(meta);
  const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const widthChanges = fromWidth !== toWidth;

  kickerAnimating = true;
  kicker.classList.add('is-animating');
  kicker.style.width = `${fromWidth}px`;

  const next = createKickerPanel(meta);
  next.classList.add('is-entering');
  track.appendChild(next);
  next.offsetHeight;

  current.classList.remove('is-active');
  current.classList.add('is-exiting');
  next.classList.remove('is-entering');
  next.classList.add('is-active');

  if (widthChanges) {
    kicker.style.transition = `width ${KICKER_TRANSITION_MS}ms ${easing}`;
    requestAnimationFrame(() => {
      kicker.style.width = `${toWidth}px`;
    });
  } else {
    kicker.style.transition = 'none';
  }

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    finishKickerTransition(track, next, index);
  };

  if (widthChanges) {
    kicker.addEventListener('transitionend', (e) => {
      if (e.target !== kicker || e.propertyName !== 'width') return;
      cleanup();
    }, { once: true });
  } else {
    next.addEventListener('transitionend', (e) => {
      if (e.target !== next || e.propertyName !== 'transform') return;
      cleanup();
    }, { once: true });
  }

  setTimeout(cleanup, KICKER_TRANSITION_MS + 100);
}

/* ─── Slides (1–26) staggered enter animation ────────────── */

const SLIDE_ENTER_MIN = 1;
const SLIDE_ENTER_MAX = 26;
const CLOSING_SLIDE_INDEX = 27;
const SLIDE_ENTER_REPREPARE = new Set([8, 9]);
const SLIDE_ENTER_STAGGER_MS = 110;
const SLIDE_ENTER_LEAD_MS = 120;
const SLIDE_ENTER_DURATION_MS = 560;
const SLIDE_ENTER_PAUSE_MS = 480;

function isEnterAnimatedSlide(idx) {
  return (idx >= SLIDE_ENTER_MIN && idx <= SLIDE_ENTER_MAX) || idx === CLOSING_SLIDE_INDEX;
}

function isDeferredEnterSlide(idx) {
  return SLIDE_ENTER_REPREPARE.has(idx);
}

function getSlideEnterTargets(section) {
  const targets = [];
  const seen = new Set();
  const add = (el) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    targets.push(el);
  };

  add(section.querySelector('.slide-title'));
  add(section.querySelector('.slide-tagline, .slide-center-tagline'));

  const closingLayout = section.querySelector('.closing-layout--finale');
  if (closingLayout) {
    add(closingLayout.querySelector('.closing-hero'));
    add(closingLayout.querySelector('.closing-flow'));
    closingLayout.querySelectorAll('.closing-card').forEach(add);
    add(closingLayout.querySelector('.closing-footer'));
    return targets;
  }

  const centerInner = section.querySelector('.slide-center-inner');
  if (centerInner) {
    centerInner.querySelectorAll(':scope > *').forEach((el) => {
      if (el.matches('.slide-title, .slide-tagline, .slide-center-tagline')) return;
      if (el.matches('.slide-center-cards')) {
        el.querySelectorAll(':scope > *').forEach(add);
        return;
      }
      if (el.matches('.cwv-main-cols')) {
        el.querySelectorAll(':scope > *').forEach(add);
        return;
      }
      if (el.matches('.measure-ecosystem')) {
        el.querySelectorAll('.measure-eco-row, .measure-eco-connector').forEach(add);
        return;
      }
      if (el.matches('.lh-intro-flow')) {
        el.querySelectorAll(':scope > *').forEach(add);
        return;
      }
      if (el.matches('.lh-cats')) {
        el.querySelectorAll(':scope > *').forEach(add);
        return;
      }
      add(el);
    });
  }

  const esmLayout = section.querySelector('.esm11-layout');
  if (esmLayout) {
    add(esmLayout.querySelector('.esm11-timeline'));
    esmLayout.querySelectorAll('.esm11-compare > .esm11-col').forEach(add);
    add(esmLayout.querySelector('.esm11-formula-card, .esm11-callout'));
    return targets;
  }

  const bundlePipeline = section.querySelector('.bundle-pipeline-slide');
  if (bundlePipeline) {
    const brief = bundlePipeline.querySelector('.bundle-pipeline-brief');
    if (brief) {
      brief.querySelectorAll(':scope > *').forEach((el) => {
        if (el.matches('.slide-title, .slide-tagline')) return;
        add(el);
      });
    }
    add(bundlePipeline.querySelector('.bp-grid'));
    return targets;
  }

  const baWorkflow = section.querySelector('.ba-workflow-slide');
  if (baWorkflow) {
    add(baWorkflow.querySelector('.ba-tab-header'));
    baWorkflow.querySelectorAll('.ba-workflow-grid > .ba-workflow-col').forEach(add);
    return targets;
  }

  const split = section.querySelector('.split');
  if (split) {
    const left = split.querySelector('.split-left');
    if (left) {
      left.querySelectorAll(':scope > *').forEach((el) => {
        if (el.matches('.lh-guide-panels, .perf-guide-panels')) {
          el.querySelectorAll(':scope > *').forEach(add);
          return;
        }
        add(el);
      });
    }
    split.querySelectorAll('.split-right > *').forEach(add);
  }

  return targets;
}

function finishSlideEnter(section) {
  if (!section) return;
  section.classList.remove('slide-enter-active');
  section.querySelectorAll('.slide-enter-item').forEach((item) => {
    item.classList.remove('slide-enter-item', 'slide-enter-item--right');
    item.style.removeProperty('--enter-delay');
    item.style.removeProperty('--enter-duration');
    item.style.removeProperty('animation');
    item.style.removeProperty('transform');
  });
  delete section._slideEnterStartedAt;
}

function resetSlideEnter(section) {
  finishSlideEnter(section);
}

function prepareSlideEnter(section) {
  if (!section) return;

  const targets = getSlideEnterTargets(section);
  const targetSet = new Set(targets);

  section.classList.remove('slide-enter-active');

  section.querySelectorAll('.slide-enter-item').forEach((item) => {
    if (!targetSet.has(item)) {
      item.classList.remove('slide-enter-item', 'slide-enter-item--right');
      item.style.removeProperty('--enter-delay');
      item.style.removeProperty('--enter-duration');
    }
  });

  if (!targets.length) return;

  targets.forEach((target, i) => {
    const isRight = !!target.closest('.split-right');
    target.classList.add('slide-enter-item');
    target.classList.toggle('slide-enter-item--right', isRight);
    target.style.setProperty('--enter-delay', `${SLIDE_ENTER_LEAD_MS + i * SLIDE_ENTER_STAGGER_MS}ms`);
    target.style.setProperty('--enter-duration', `${SLIDE_ENTER_DURATION_MS}ms`);
  });
}

function playSlideEnter(section, { restart = false } = {}) {
  if (!section) return;
  if (!section.querySelector('.slide-enter-item')) {
    prepareSlideEnter(section);
  }
  if (restart) {
    section.classList.remove('slide-enter-active');
    void section.offsetWidth;
  } else if (section.classList.contains('slide-enter-active')) {
    return;
  }
  section.classList.add('slide-enter-active');
  section._slideEnterStartedAt = performance.now();
}

function queueSlideEnterPlay(section, { restart = false } = {}) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      playSlideEnter(section, { restart });
    });
  });
}

function getSlideEnterRemainingMs(section) {
  const total = getSlideEnterTotalMs(section);
  if (!section?._slideEnterStartedAt) return total;
  return Math.max(0, total - (performance.now() - section._slideEnterStartedAt));
}

function getSlideEnterTotalMs(section) {
  const count = Math.max(getSlideEnterTargets(section).length, 1);
  const lastDelay = SLIDE_ENTER_LEAD_MS + (count - 1) * SLIDE_ENTER_STAGGER_MS;
  return lastDelay + SLIDE_ENTER_DURATION_MS + SLIDE_ENTER_PAUSE_MS;
}

function clearSlideEnterFollowTimer(section) {
  if (!section?._slideEnterFollowTimer) return;
  clearTimeout(section._slideEnterFollowTimer);
  section._slideEnterFollowTimer = 0;
}

function afterSlideEnter(section, callback) {
  if (!section || typeof callback !== 'function') return;
  clearSlideEnterFollowTimer(section);
  const idx = Number(section.dataset.index);
  const delay = isEnterAnimatedSlide(idx) ? getSlideEnterRemainingMs(section) : 0;
  section._slideEnterFollowTimer = setTimeout(() => {
    section._slideEnterFollowTimer = 0;
    callback();
  }, delay);
}

function normalizeWheelDelta(e) {
  if (e.deltaMode === 1) return e.deltaY * 20;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

const WHEEL_SCROLL_EDGE_EPSILON = 1;

function isVerticallyScrollableElement(el) {
  if (!(el instanceof Element)) return false;
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') return false;

  const { scrollHeight, clientHeight } = el;
  return scrollHeight > clientHeight + WHEEL_SCROLL_EDGE_EPSILON;
}

function canElementConsumeWheelScroll(el, delta) {
  if (!isVerticallyScrollableElement(el)) return false;

  const { scrollHeight, clientHeight, scrollTop } = el;
  if (delta > 0) return scrollTop + clientHeight < scrollHeight - WHEEL_SCROLL_EDGE_EPSILON;
  if (delta < 0) return scrollTop > WHEEL_SCROLL_EDGE_EPSILON;
  return false;
}

function getWheelScrollablePath(e) {
  const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
  const scrollables = [];
  for (const node of path) {
    if (node === container || !(node instanceof Element)) continue;
    if (isVerticallyScrollableElement(node)) scrollables.push(node);
  }
  return scrollables;
}

function updateNav(index, { animateKicker = true } = {}) {
  const shouldAnimateKicker = animateKicker && kickerMetaIndex !== null && kickerMetaIndex !== index;
  currentIndex = index;
  indicator.textContent = `${index} / ${TOTAL_SECTIONS - 1}`;
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === TOTAL_SECTIONS - 1;
  updateHash(index);
  updateSidebarActive(index);
  updateSlideKicker(index, { animate: shouldAnimateKicker });
}

function updateHash(index) {
  const newHash = `#section-${index}`;
  if (location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

function applySlidePositions(activeIndex, animate = true) {
  if (container) {
    container.style.setProperty('--slide-transition', animate ? `${SLIDE_TRANSITION_MS}ms` : '0ms');
  }
  sections.forEach((section, idx) => {
    section.style.transform = `translate3d(0, ${(idx - activeIndex) * 100}%, 0)`;
    section.toggleAttribute('aria-hidden', idx !== activeIndex);
    section.inert = idx !== activeIndex;
  });
}

function finishNavTransition(prevIndex, index) {
  try { onSectionLeave(prevIndex, sections[prevIndex]); } catch(e) { console.error('[nav] onSectionLeave', prevIndex, e); }
  try { onSectionEnter(index, sections[index]); } catch(e) { console.error('[nav] onSectionEnter', index, e); }
  navLocked = false;
}

function goTo(index) {
  if (navLocked || index < 0 || index >= TOTAL_SECTIONS || index === currentIndex) return;
  navLocked = true;
  clearTimeout(navFinishTimer);

  const prevIndex = currentIndex;
  if (isEnterAnimatedSlide(index)) {
    prepareSlideEnter(sections[index]);
    if (!isDeferredEnterSlide(index)) {
      queueSlideEnterPlay(sections[index]);
    }
  }
  updateNav(index);
  applySlidePositions(index);
  navFinishTimer = setTimeout(() => finishNavTransition(prevIndex, index), SLIDE_TRANSITION_MS);
}

prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goTo(currentIndex + 1); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentIndex - 1); }
});

function onContainerWheel(e) {
  const delta = normalizeWheelDelta(e);
  if (delta === 0) return;

  const scrollables = getWheelScrollablePath(e);
  if (scrollables.length) {
    if (scrollables.some((el) => canElementConsumeWheelScroll(el, delta))) return;
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  if (navLocked || wheelGestureLocked) return;
  if (wheelTailGuard && Math.abs(delta) <= WHEEL_TAIL_DELTA_MAX) {
    clearTimeout(wheelTailTimer);
    wheelTailTimer = setTimeout(() => {
      wheelTailGuard = false;
    }, WHEEL_TAIL_IDLE_MS);
    return;
  }

  const dir = delta > 0 ? 1 : -1;
  wheelGestureLocked = true;
  wheelTailGuard = true;
  clearTimeout(wheelLockTimer);
  clearTimeout(wheelTailTimer);
  wheelLockTimer = setTimeout(() => {
    wheelGestureLocked = false;
  }, WHEEL_LOCK_MS);
  wheelTailTimer = setTimeout(() => {
    wheelTailGuard = false;
  }, WHEEL_LOCK_MS + WHEEL_TAIL_IDLE_MS);
  goTo(currentIndex + dir);
}

if (container) container.addEventListener('wheel', onContainerWheel, { passive: false, capture: true });

document.querySelectorAll('.toc-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const key = link.dataset.toc;
    const idx = TOC_JUMP[key];
    if (idx != null) goTo(idx);
  });
});

/* ─── Sidebar TOC ─────────────────────────────────────────── */

let sidebarOpen = false;
let sidebarBuilt = false;

function findChapterForIndex(index) {
  return PRESENTATION_TOC.find(ch => ch.slides.some(s => s.index === index));
}

function buildSidebarNav() {
  const nav = document.getElementById('slide-sidebar-nav');
  if (!nav || sidebarBuilt) return;
  sidebarBuilt = true;

  const list = document.createElement('ul');
  list.className = 'sidebar-toc';

  PRESENTATION_TOC.forEach((chapter) => {
    const chapterLi = document.createElement('li');
    chapterLi.className = 'sidebar-chapter';
    chapterLi.dataset.chapter = chapter.id;

    const chapterBtn = document.createElement('button');
    chapterBtn.type = 'button';
    chapterBtn.className = 'sidebar-chapter-btn';
    chapterBtn.setAttribute('aria-expanded', 'false');

    if (chapter.icon) {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.classList.add('sidebar-chapter-icon');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${chapter.icon}`);
      icon.appendChild(use);
      chapterBtn.appendChild(icon);
    }

    const label = document.createElement('span');
    label.className = 'sidebar-chapter-label';
    label.textContent = chapter.label;
    chapterBtn.appendChild(label);

    if (chapter.slides.length > 1) {
      const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevron.classList.add('sidebar-chapter-chevron');
      chevron.setAttribute('viewBox', '0 0 24 24');
      chevron.innerHTML = '<path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>';
      chapterBtn.appendChild(chevron);
    }

    chapterBtn.addEventListener('click', () => {
      if (chapter.slides.length === 1) {
        goTo(chapter.slides[0].index);
        closeSidebar();
        return;
      }
      const expanded = chapterLi.classList.toggle('is-expanded');
      chapterBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    chapterLi.appendChild(chapterBtn);

    if (chapter.slides.length > 1) {
      const slidesUl = document.createElement('ul');
      slidesUl.className = 'sidebar-slides';

      chapter.slides.forEach((slide) => {
        const slideLi = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#section-${slide.index}`;
        link.className = 'sidebar-slide-link';
        link.dataset.index = String(slide.index);
        link.innerHTML = `<span class="sidebar-slide-num">${String(slide.index).padStart(2, '0')}</span><span class="sidebar-slide-label">${slide.label}</span>`;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          goTo(slide.index);
          closeSidebar();
        });
        slideLi.appendChild(link);
        slidesUl.appendChild(slideLi);
      });

      chapterLi.appendChild(slidesUl);
    }

    list.appendChild(chapterLi);
  });

  nav.appendChild(list);
}

function setSidebarOpen(open) {
  sidebarOpen = open;
  const sidebar = document.getElementById('slide-sidebar');
  const backdrop = document.getElementById('slide-sidebar-backdrop');
  const toggle = document.getElementById('slide-sidebar-toggle');
  if (!sidebar || !backdrop || !toggle) return;

  sidebar.classList.toggle('is-open', open);
  backdrop.hidden = !open;
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  sidebar.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.classList.toggle('sidebar-open', open);

  if (open) {
    updateSidebarActive(currentIndex);
    requestAnimationFrame(() => {
      const active = sidebar.querySelector('.sidebar-slide-link.is-active, .sidebar-chapter.is-active > .sidebar-chapter-btn');
      active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}

function openSidebar() {
  setSidebarOpen(true);
}

function closeSidebar() {
  setSidebarOpen(false);
}

function toggleSidebar() {
  setSidebarOpen(!sidebarOpen);
}

function updateSidebarActive(index) {
  const nav = document.getElementById('slide-sidebar-nav');
  if (!nav) return;

  const chapter = findChapterForIndex(index);

  nav.querySelectorAll('.sidebar-chapter').forEach((el) => {
    const isActiveChapter = el.dataset.chapter === chapter?.id;
    el.classList.toggle('is-active', isActiveChapter);
    if (isActiveChapter && el.querySelector('.sidebar-slides')) {
      el.classList.add('is-expanded');
      el.querySelector('.sidebar-chapter-btn')?.setAttribute('aria-expanded', 'true');
    }
  });

  nav.querySelectorAll('.sidebar-slide-link').forEach((link) => {
    link.classList.toggle('is-active', Number(link.dataset.index) === index);
  });

  if (sidebarOpen) {
    const activeLink = nav.querySelector('.sidebar-slide-link.is-active');
    activeLink?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function initSidebar() {
  buildSidebarNav();

  const toggle = document.getElementById('slide-sidebar-toggle');
  const closeBtn = document.getElementById('slide-sidebar-close');
  const backdrop = document.getElementById('slide-sidebar-backdrop');
  const sidebar = document.getElementById('slide-sidebar');

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSidebar();
  });

  backdrop?.addEventListener('click', closeSidebar);

  sidebar?.addEventListener('click', (e) => e.stopPropagation());

  container?.addEventListener('click', () => {
    if (sidebarOpen) closeSidebar();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarOpen) {
      e.preventDefault();
      closeSidebar();
    }
  });

  window.addEventListener('hashchange', () => {
    const hashMatch = location.hash.match(/section-(\d+)/);
    if (!hashMatch) return;
    const idx = parseInt(hashMatch[1], 10);
    if (idx >= 0 && idx < TOTAL_SECTIONS && idx !== currentIndex && !navLocked) {
      goTo(idx);
    }
  });
}

/* ─── Section enter/leave ─────────────────────────────────── */

function resetSectionScroll(el) {
  if (!el) return;
  el.querySelectorAll('.split-left, .reflow-cards').forEach((node) => {
    node.scrollTop = 0;
  });
}

function onSectionEnter(idx, el) {
  resetSectionScroll(el);
  // 측정 섹션 (0-9)
  if (idx === 8) {
    const mount = el.querySelector('.lh-dock-mount');
    mountLighthouseDock(mount);
    const shell = mount?.querySelector('.lh-browser-shell');
    initLighthouseBrowser(shell);
    initDevtoolsDockResize(mount?.querySelector('.lighthouse-dock'));
    const lh = mount?.querySelector('.lighthouse-ui');
    initLighthouse(lh);
    bindLhDockExtras(lh);
  }
  if (idx === 8) initLhStepGuide(el);
  if (idx === 4) {
    const lcp = el.querySelector('.lcp-viz');
    initLcpViz(lcp, { autoStart: false });
    afterSlideEnter(el, () => startLcpViz(lcp));
  }
  if (idx === 5) {
    const inp = el.querySelector('.inp-viz');
    initInpViz(inp, { autoStart: false });
    afterSlideEnter(el, () => startInpViz(inp));
  }
  if (idx === 6) {
    const cls = el.querySelector('.cls-viz');
    initClsViz(cls, { autoStart: false });
    afterSlideEnter(el, () => startClsViz(cls));
  }
  if (idx === 9) {
    const mount = el.querySelector('.perf-panel-mount');
    mountPerfPanel(mount);
    const shell = mount?.querySelector('.perf-shell');
    initLighthouseBrowser(shell);
    initDevtoolsDockResize(mount?.querySelector('.perf-dock'));
    const panel = mount?.querySelector('.dt-perf-panel');
    initPerfRecording(panel);
    initPerfStepGuide(el);
  }
  // Tree Shaking 섹션 (10-13)
  if (idx === 12) {
    const panel = el.querySelector('.bp-grid');
    initBundlePanel(panel);
  }
  if (idx === 13) {
    initBundleAnalyzerTabs(el);
    const panel = el.querySelector('.bundle-treemap-panel');
    initTreemapPanel(panel);
    afterSlideEnter(el, () => panel?._treemapRun?.());
  }
  // Code Splitting (14)
  if (idx === 14) {
    const csv = el.querySelector('#code-split-viz');
    initCodeSplitViz(csv);
    afterSlideEnter(el, () => csv?._csvScheduleRun?.());
  }
  // Reflow 섹션 (15-19)
  if (idx === 15) {
    const lov = el.querySelector('#lcp-opt-viz');
    initLcpOptViz(lov);
    afterSlideEnter(el, () => lov?._lovScheduleRun?.());
  }
  if (idx === 17) {
    const reflow = el.querySelector('.reflow-demo');
    initReflowDemo(reflow);
    afterSlideEnter(el, () => reflow?._reflowScheduleRun?.());
  }
  if (idx === 18) {
    const cv = el.querySelector('#composite-viz');
    initCompositeViz(cv);
    afterSlideEnter(el, () => cv?._cvScheduleRun?.());
  }
  if (idx === 19) {
    const clsov = el.querySelector('#cls-opt-viz');
    initClsOptViz(clsov);
    afterSlideEnter(el, () => clsov?._clsovScheduleRun?.());
  }
  // 가상화 (20)
  if (idx === 20) {
    const demo = el.querySelector('.virtual-demo');
    initVirtualDemo(demo);
    afterSlideEnter(el, () => demo?._virtualLoad?.());
  }
  // 메모이제이션 섹션 (21-23)
  if (idx === 21) {
    initReactTreeViz(el);
    const viz = el.querySelector('#react-tree-viz');
    afterSlideEnter(el, () => {
      viz?._rtScheduleRun?.(200);
      viz?._rtStartAuto?.();
    });
  }
  if (idx === 22) {
    const demo = el.querySelector('.memo-demo');
    initMemoDemo(demo);
    afterSlideEnter(el, () => demo?._memoStart?.());
  }
  // Web Worker 섹션 (24-26)
  if (idx === 24) {
    const viz = el.querySelector('.mainthread-viz');
    afterSlideEnter(el, () => startMainthreadViz(viz));
  }
  if (idx === 25) {
    const viz = el.querySelector('.worker-flow-viz');
    afterSlideEnter(el, () => startWorkerFlowViz(viz));
  }
  if (idx === 26) initWorkerDemo(el.querySelector('.worker-demo'));

  if (isEnterAnimatedSlide(idx)) {
    if (isDeferredEnterSlide(idx)) {
      prepareSlideEnter(el);
      queueSlideEnterPlay(el);
    } else if (!el.classList.contains('slide-enter-active')) {
      playSlideEnter(el);
    }
  }
}

function onSectionLeave(idx, el) {
  resetSectionScroll(el);

  if (isEnterAnimatedSlide(idx)) {
    clearSlideEnterFollowTimer(el);
    resetSlideEnter(el);
  }

  if (idx === 8) {
    const mount = el.querySelector('.lh-dock-mount');
    resetLighthouse(mount?.querySelector('.lighthouse-ui'));
    if (mount) { mount.dataset.mounted = ''; mount.innerHTML = ''; }
  }
  if (idx === 8) el._lhGuideBound = false;
  if (idx === 4) resetLcpViz(el.querySelector('.lcp-viz'));
  if (idx === 5) resetInpViz(el.querySelector('.inp-viz'));
  if (idx === 6) resetClsViz(el.querySelector('.cls-viz'));
  if (idx === 9) {
    el._perfGuideBound = false;
    const mount = el.querySelector('.perf-panel-mount');
    mount?.querySelector('.dt-perf-panel')?._perfReset?.();
    if (mount) { mount.dataset.mounted = ''; mount.innerHTML = ''; }
  }
  if (idx === 12) resetBundle(el.querySelector('.bp-grid'));
  if (idx === 13) resetTreemap(el.querySelector('.bundle-treemap-panel'));
  if (idx === 14) el.querySelector('#code-split-viz')?._csvReset?.();
  if (idx === 15) el.querySelector('#lcp-opt-viz')?._lovReset?.();
  if (idx === 17) el.querySelector('.reflow-demo')?._reflowReset?.();
  if (idx === 18) el.querySelector('#composite-viz')?._cvReset?.();
  if (idx === 19) el.querySelector('#cls-opt-viz')?._clsovReset?.();
  if (idx === 20) el.querySelector('.virtual-demo')?._virtualReset?.();
  if (idx === 21) el.querySelector('#react-tree-viz')?._rtReset?.();
  if (idx === 22) el.querySelector('.memo-demo')?._memoReset?.();
  if (idx === 24) resetMainthreadViz(el.querySelector('.mainthread-viz'));
  if (idx === 25) resetWorkerFlowViz(el.querySelector('.worker-flow-viz'));
  if (idx === 26) el.querySelector('.worker-demo')?._workerReset?.();
}

/* ─── React 컴포넌트 트리 시각화 (Slide 21) ──────────────── */
const RT_TICK_MIN_MS = 1800;
const RT_TICK_MAX_MS = 4500;
const RT_MIN_VISITORS = 20;
const RT_TIMELINE_MS = 2400;
const RT_SPEED = 1;

function randomVisitorDelta() {
  const magnitude = 3 + Math.floor(Math.random() * 16);
  return Math.random() < 0.5 ? -magnitude : magnitude;
}

function nextVisitorCount(prev) {
  let next = prev;
  for (let i = 0; i < 8 && next === prev; i++) {
    next = Math.max(RT_MIN_VISITORS, prev + randomVisitorDelta());
  }
  return next;
}

function rtSegmentProgress(elapsed, start, end) {
  if (elapsed <= start) return 0;
  if (elapsed >= end) return 1;
  return (elapsed - start) / (end - start);
}

function rtEaseOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function initReactTreeViz(sectionEl) {
  const root = sectionEl.querySelector('#react-tree-viz');
  const replayBtn = root?.querySelector('.rt-replay-btn');
  const parent = root?.querySelector('#rt-parent');
  const childA = root?.querySelector('#rt-child-a');
  const childB = root?.querySelector('#rt-child-b');
  const childC = root?.querySelector('#rt-child-c');
  const stateVal = root?.querySelector('#rt-state-val');
  const propValA = root?.querySelector('#rt-prop-val-a');
  const trunkConn = root?.querySelector('.rt-conn-trunk');
  const busConn = root?.querySelector('.rt-conn-bus');
  const connA = root?.querySelector('.rt-conn-a');
  const connB = root?.querySelector('.rt-conn-b');
  const connC = root?.querySelector('.rt-conn-c');
  const allConns = [trunkConn, busConn, connA, connB, connC];
  const allNodes = [parent, childA, childB, childC];
  if (!root || root._rtInit) return;
  root._rtInit = true;

  const INITIAL_VISITORS = 100;
  const pathLens = new Map();
  allConns.forEach((path) => {
    if (!path) return;
    const len = path.getTotalLength();
    pathLens.set(path, len);
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
  });

  let currentVisitors = INITIAL_VISITORS;
  let rafId = null;
  let autoTimer = null;
  let tickTimer = null;
  let running = false;
  let chainAuto = false;
  let pendingChange = null;

  function applyVisitorChange(prev, next) {
    if (stateVal) {
      stateVal.textContent = `${prev} → ${next}`;
      stateVal.classList.remove('rt-bump');
      void stateVal.offsetWidth;
      stateVal.classList.add('rt-bump');
    }
    if (propValA) propValA.textContent = `${prev} → ${next}`;
    currentVisitors = next;
  }

  function clearNodeStates() {
    allNodes.forEach((el) => {
      el?.classList.remove('rt-active--trigger', 'rt-active--ok', 'rt-active--waste');
    });
    stateVal?.classList.remove('rt-bump');
  }

  function resetPaths() {
    allConns.forEach((path) => {
      if (!path) return;
      const len = pathLens.get(path) ?? path.getTotalLength();
      path.style.strokeDashoffset = `${len}`;
      path.classList.remove('rt-conn--lit', 'rt-conn--done');
    });
  }

  function setConn(path, start, end, elapsed) {
    if (!path) return;
    const len = pathLens.get(path) ?? path.getTotalLength();
    const p = rtEaseOutCubic(rtSegmentProgress(elapsed, start, end));
    path.style.strokeDashoffset = `${len * (1 - p)}`;
    path.classList.toggle('rt-conn--lit', p > 0.02);
    path.classList.toggle('rt-conn--done', p >= 0.98);
  }

  function updateFrame(elapsed) {
    if (pendingChange && elapsed >= 0) {
      applyVisitorChange(pendingChange.prev, pendingChange.next);
      pendingChange = null;
    }

    setConn(trunkConn, 100, 360, elapsed);
    setConn(busConn, 260, 500, elapsed);
    setConn(connA, 460, 740, elapsed);
    setConn(connB, 660, 940, elapsed);
    setConn(connC, 860, 1140, elapsed);

    parent?.classList.toggle('rt-active--trigger', elapsed >= 0 && elapsed < 920);
    childA?.classList.toggle('rt-active--ok', elapsed >= 600 && elapsed < 2100);
    childB?.classList.toggle('rt-active--waste', elapsed >= 800 && elapsed < 2200);
    childC?.classList.toggle('rt-active--waste', elapsed >= 1000 && elapsed < 2300);

    if (elapsed > 420) stateVal?.classList.remove('rt-bump');
  }

  function stopAnimation() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
    running = false;
  }

  function stopAutoTick() {
    if (tickTimer) {
      clearTimeout(tickTimer);
      tickTimer = null;
    }
  }

  function resetVisuals() {
    clearNodeStates();
    resetPaths();
    root.classList.remove('rt-running');
  }

  function finishRun() {
    resetVisuals();
    root.classList.add('rt-ran');
    running = false;
    if (chainAuto) scheduleAutoTick();
  }

  function run(shouldChainAuto = false) {
    stopAnimation();
    resetVisuals();
    chainAuto = shouldChainAuto;
    pendingChange = {
      prev: currentVisitors,
      next: nextVisitorCount(currentVisitors),
    };

    running = true;
    root.classList.remove('rt-ran');
    root.classList.add('rt-running');
    const t0 = performance.now();

    function tick(now) {
      const elapsed = (now - t0) * RT_SPEED;
      updateFrame(elapsed);
      if (elapsed < RT_TIMELINE_MS) {
        rafId = requestAnimationFrame(tick);
      } else {
        updateFrame(RT_TIMELINE_MS);
        rafId = null;
        finishRun();
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  function scheduleAutoTick() {
    stopAutoTick();
    const delay = RT_TICK_MIN_MS + Math.random() * (RT_TICK_MAX_MS - RT_TICK_MIN_MS);
    tickTimer = setTimeout(() => {
      tickTimer = null;
      run(true);
    }, delay);
  }

  function scheduleRun(delay = 200) {
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      autoTimer = null;
      run(false);
    }, delay);
  }

  function reset() {
    stopAnimation();
    stopAutoTick();
    resetVisuals();
    pendingChange = null;
    chainAuto = false;
    currentVisitors = INITIAL_VISITORS;
    if (stateVal) stateVal.textContent = String(INITIAL_VISITORS);
    if (propValA) propValA.textContent = `${INITIAL_VISITORS} → —`;
  }

  replayBtn?.addEventListener('click', () => run(false));

  root._rtReset = reset;
  root._rtScheduleRun = scheduleRun;
  root._rtStartAuto = scheduleAutoTick;
}

/* ─── Bundle Analyzer 워크플로 (Slide 13) ───────────────── */
const BA_BUILD_OUTPUT = {
  webpack: '✓ built (analyzer opened in browser)',
  vite: '✓ built (dist/stats.html generated)',
  nextjs: '✓ built (ANALYZE=true, analyzer opened)',
};

function applyBundleAnalyzerTab(sectionEl, key) {
  const setup = BUNDLE_ANALYZER_SETUPS[key];
  if (!setup) return;

  const installCmd = sectionEl.querySelector('[data-ba-install-cmd]');
  const buildCmd = sectionEl.querySelector('[data-ba-build-cmd]');
  const buildOut = sectionEl.querySelector('[data-ba-build-out]');
  const configName = sectionEl.querySelector('[data-ba-config-name]');
  const configCode = sectionEl.querySelector('[data-ba-config-code]');
  const browserUrl = sectionEl.querySelector('[data-ba-browser-url]');

  if (installCmd) installCmd.textContent = setup.install;
  if (buildCmd) buildCmd.textContent = setup.build;
  if (buildOut) buildOut.textContent = BA_BUILD_OUTPUT[key] || '✓ built';
  if (configName) configName.textContent = setup.configFile;
  if (browserUrl) browserUrl.textContent = setup.browserUrl;
  if (configCode) {
    configCode.textContent = setup.config;
    configCode.className = `ba-config-code language-${setup.configFile.endsWith('.ts') ? 'typescript' : 'javascript'}`;
    highlightCode(configCode);
  }
}

function initBundleAnalyzerTabs(sectionEl) {
  const tabBtns = sectionEl.querySelectorAll('.ba-tab-btn');
  if (!tabBtns.length || sectionEl._baTabs) return;
  sectionEl._baTabs = true;

  const defaultKey = 'webpack';
  applyBundleAnalyzerTab(sectionEl, defaultKey);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.baTab;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.baTab === key));
      applyBundleAnalyzerTab(sectionEl, key);
    });
  });
}

/* ─── Lighthouse ─────────────────────────────────────────── */
function buildLhGaugeHtml(r = 54, fontSize = 28) {
  const { circ } = createLhGauge(r);
  return `<svg viewBox="0 0 120 120" class="lh-gauge-svg">
    <circle class="lh-gauge-bg" cx="60" cy="60" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="8"/>
    <circle class="lh-gauge-fg" cx="60" cy="60" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="8"
      stroke-linecap="round" data-r="${r}"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
      transform="rotate(-90 60 60)"/>
    <text class="lh-gauge-value" x="60" y="64" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#333">0</text>
  </svg>`;
}

function buildPerfGauge(wrap, score, metrics) {
  const gauge = wrap.querySelector('.lh-gauge');
  if (!gauge) return;
  gauge.innerHTML = buildLhPerfGaugeHtml(score, metrics, 52, 26);
  gauge.classList.add('lh-gauge-perf');
  delete gauge.dataset.breakdownReady;
}

function applyAuditScores(container, scores) {
  const labels = {
    Performance: scores.performance,
    Accessibility: scores.accessibility,
    'Best Practices': scores.bestPractices,
    SEO: scores.seo,
  };
  container.querySelectorAll('.lh-gauge-wrap').forEach((wrap) => {
    const label = wrap.dataset.label;
    if (label && labels[label] != null) wrap.dataset.score = labels[label];
    if (wrap.dataset.category === 'performance') {
      wrap.dataset.score = scores.performance;
      wrap.dataset.metrics = JSON.stringify(scores.metrics);
      buildPerfGauge(wrap, scores.performance, scores.metrics);
    }
  });
}

function initLhGauges(root) {
  root.querySelectorAll('.lh-gauge-wrap').forEach(wrap => {
    const gauge = wrap.querySelector('.lh-gauge');
    if (!gauge || gauge.innerHTML) return;
    const r = wrap.classList.contains('lh-gauge-sm') ? 40 : 52;
    const fs = wrap.classList.contains('lh-gauge-sm') ? 22 : 26;
    const score = parseInt(wrap.dataset.score, 10) || 0;
    const isPerfLg = wrap.dataset.category === 'performance' && wrap.classList.contains('lh-gauge-lg');
    if (isPerfLg) buildPerfGauge(wrap, score, parsePerfMetrics(wrap.dataset.metrics));
    else gauge.innerHTML = buildLhGaugeHtml(r, fs);
  });
}

function bindLhPerfHover(container) {
  const perfLg = container.querySelector('.lh-gauge-lg[data-category="performance"] .lh-gauge')
    || container.querySelector('.lh-gauge-lg .lh-gauge.lh-gauge-perf');
  const perfSm = container.querySelector('.lh-gauge-sm[data-label="Performance"]');
  if (!perfLg) return;

  let hideTimer;
  const show = () => {
    clearTimeout(hideTimer);
    perfLg.classList.add('show-breakdown');
    if (perfLg.dataset.breakdownReady) animateLhBreakdown(perfLg);
  };
  const hide = () => {
    hideTimer = setTimeout(() => {
      perfLg.classList.remove('show-breakdown');
      resetLhBreakdownArcs(perfLg);
    }, 120);
  };

  perfLg.closest('.lh-gauge-wrap')?.classList.add('lh-gauge-interactive');
  perfSm?.classList.add('lh-gauge-interactive');
  perfLg.closest('.lh-gauge-wrap')?.addEventListener('mouseenter', show);
  perfLg.closest('.lh-gauge-wrap')?.addEventListener('mouseleave', hide);
  perfSm?.addEventListener('mouseenter', show);
  perfSm?.addEventListener('mouseleave', hide);
}

function initLighthouse(container) {
  if (!container || container._lhBound) return;
  container._lhBound = true;
  initLhGauges(container);
  container.querySelectorAll('.lh-gauge-wrap').forEach((wrap) => {
    wrap.dataset.initialScore = wrap.dataset.score || '0';
    if (wrap.dataset.metrics) wrap.dataset.initialMetrics = wrap.dataset.metrics;
  });
  bindLhPerfHover(container);

  const btn = container.querySelector('.lighthouse-btn');
  if (!btn) return;
  const config = container.querySelector('.lh-config');
  const report = container.querySelector('.lh-report');
  const progress = container.querySelector('.lighthouse-progress');
  const fill = container.querySelector('.progress-fill');
  const samplePage = container.closest('.devtools-workspace')?.querySelector('.sample-page');

  btn.addEventListener('click', runAudit);

  function runAudit() {
    btn.disabled = true;
    config?.classList.add('hidden');
    report?.classList.remove('visible');
    progress?.classList.add('active');
    if (fill) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
      void fill.offsetWidth;
      fill.style.transition = 'width 2.5s cubic-bezier(0.22, 1, 0.36, 1)';
      fill.style.width = '100%';
    }
    samplePage?.classList.add('loading');

    const scores = randomAuditScores();
    applyAuditScores(container, scores);
    container.querySelectorAll('.lh-gauge-value').forEach(el => { el.textContent = '0'; });
    container.querySelectorAll('.lh-gauge-fg').forEach(fg => {
      fg.setAttribute('stroke-dashoffset', fg.getAttribute('stroke-dasharray'));
      fg.style.stroke = '#e0e0e0';
    });
    container.querySelectorAll('.lh-gauge.lh-gauge-perf').forEach(g => g.classList.remove('show-breakdown'));

    setTimeout(() => {
      progress?.classList.remove('active');
      report?.classList.add('visible');
      report?.querySelector('.lh-scores-row')?.classList.add('visible');
      config?.classList.remove('is-highlighted');
      container.querySelector('.lh-score-legend')?.classList.add('is-highlighted');
      samplePage?.classList.remove('loading');
      samplePage?.classList.add('loaded');
      container.querySelectorAll('.lh-gauge-wrap').forEach((wrap, i) => {
        setTimeout(() => {
          animateLhGauge(wrap.querySelector('.lh-gauge'), parseInt(wrap.dataset.score, 10));
        }, i * 120);
      });
      btn.disabled = false;
    }, 2600);
  }

  container._lhReset = () => {
    btn.disabled = false;
    config?.classList.remove('hidden');
    config?.classList.add('is-highlighted');
    report?.classList.remove('visible');
    report?.querySelector('.lh-scores-row')?.classList.remove('visible');
    progress?.classList.remove('active');
    if (fill) fill.style.width = '0%';
    samplePage?.classList.remove('loading', 'loaded');
    container.querySelectorAll('.lh-gauge-wrap').forEach((wrap) => {
      wrap.dataset.score = wrap.dataset.initialScore || '0';
      if (wrap.dataset.category === 'performance') {
        const metrics = parsePerfMetrics(wrap.dataset.initialMetrics);
        wrap.dataset.metrics = wrap.dataset.initialMetrics || JSON.stringify(metrics);
        buildPerfGauge(wrap, parseInt(wrap.dataset.score, 10), metrics);
      }
    });
    container.querySelectorAll('.lh-gauge-value').forEach(el => { el.textContent = '0'; });
    container.querySelectorAll('.lh-gauge-fg').forEach(fg => {
      fg.setAttribute('stroke-dashoffset', fg.getAttribute('stroke-dasharray'));
      fg.style.stroke = '#e0e0e0';
    });
    container.querySelectorAll('.lh-gauge.lh-gauge-perf').forEach(g => {
      g.classList.remove('show-breakdown');
      delete g.dataset.breakdownReady;
      resetLhBreakdownArcs(g);
    });
    container.querySelector('.lh-score-legend')?.classList.remove('is-highlighted');
    hideLhOpportunity(container);
  };
}

function resetLighthouse(container) { container?._lhReset?.(); }

/* ─── Bundle chart ────────────────────────────────────────── */

function initBundlePanel(panel) {
  if (!panel || panel._bundleInit) return;
  panel._bundleInit = true;

  const els = [
    '.bp-src-before', '.bp-src-after',
    '.bp-shake-before', '.bp-shake-after',
    '.bp-min-before', '.bp-min-after',
  ].map(sel => panel.querySelector(sel));

  fillCompareGrid(...els);
  els.forEach(highlightCode);
}

function resetBundle(_panel) {}

function initTreemapPanel(panel) {
  if (!panel || panel._treemapInit) return;
  panel._treemapInit = true;

  const treemapBefore = panel.querySelector('.treemap-before-lg');
  const treemapAfter = panel.querySelector('.treemap-after-lg');
  const treemapOutput = panel.querySelector('.treemap-output-lg');
  const btn = panel.querySelector('.bundle-treemap-btn');
  let resizeDisconnect = null;

  const isSingle = Boolean(treemapOutput && !treemapBefore && !treemapAfter);

  function paintTreemap(animate = true) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (isSingle) {
          renderBundleTreemapOutput(treemapOutput, animate, { large: true });
        } else {
          renderBundleTreemaps(treemapBefore, treemapAfter, animate, { large: true });
        }
      });
    });
  }

  function run() {
    if (btn) btn.disabled = true;
    panel.classList.remove('ran');
    if (treemapBefore) treemapBefore.innerHTML = '';
    if (treemapAfter) treemapAfter.innerHTML = '';
    if (treemapOutput) treemapOutput.innerHTML = '';
    void panel.offsetWidth;
    panel.classList.add('running');
    setTimeout(() => {
      paintTreemap(true);
      panel.classList.remove('running');
      panel.classList.add('ran');
      if (btn) btn.disabled = false;
      resizeDisconnect?.();
      const resizeBefore = isSingle ? treemapOutput : treemapBefore;
      const resizeAfter = isSingle ? null : treemapAfter;
      resizeDisconnect = observeTreemapResize(resizeBefore, resizeAfter, () => {
        if (panel.classList.contains('ran')) {
          if (isSingle) {
            renderBundleTreemapOutput(treemapOutput, false, { large: true });
          } else {
            renderBundleTreemaps(treemapBefore, treemapAfter, false, { large: true });
          }
        }
      });
    }, 200);
  }

  if (btn) btn.addEventListener('click', run);
  panel._treemapRun = run;
  panel._treemapReset = () => {
    if (btn) btn.disabled = false;
    panel.classList.remove('running', 'ran');
    resizeDisconnect?.();
    resizeDisconnect = null;
    if (treemapBefore) treemapBefore.innerHTML = '';
    if (treemapAfter) treemapAfter.innerHTML = '';
    if (treemapOutput) treemapOutput.innerHTML = '';
  };
}

function resetTreemap(panel) { panel?._treemapReset?.(); }

function initDevtoolsDockResize(workspace) {
  if (!workspace || workspace._dockResizeBound) return;
  workspace._dockResizeBound = true;

  const handle = workspace.querySelector('.devtools-resize-handle');
  if (!handle) return;

  const handleSize = 8;
  const minPrimary = 115;
  const minPanel = 260;

  const isRightDock = () => workspace.classList.contains('dock-right');

  const clearInlineGrid = () => {
    workspace.style.gridTemplateRows = '';
    workspace.style.gridTemplateColumns = '';
  };

  const applyBottomSplit = (topPx) => {
    const rect = workspace.getBoundingClientRect();
    const maxTop = Math.max(minPrimary, rect.height - handleSize - minPanel);
    const top = Math.min(Math.max(topPx, minPrimary), maxTop);
    const bottom = Math.max(minPanel, rect.height - handleSize - top);
    workspace.style.gridTemplateRows = `${top}px ${handleSize}px ${bottom}px`;
    workspace.style.gridTemplateColumns = '';
  };

  const applyRightSplit = (leftPx) => {
    const rect = workspace.getBoundingClientRect();
    const maxLeft = Math.max(minPrimary, rect.width - handleSize - minPanel);
    const left = Math.min(Math.max(leftPx, minPrimary), maxLeft);
    const right = Math.max(minPanel, rect.width - handleSize - left);
    workspace.style.gridTemplateColumns = `${left}px ${handleSize}px ${right}px`;
    workspace.style.gridTemplateRows = '';
  };

  handle.addEventListener('pointerdown', (e) => {
    if (workspace.classList.contains('lh-devtools-collapsed')) return;
    e.preventDefault();
    handle.setPointerCapture?.(e.pointerId);
    workspace.classList.add('is-resizing');
    const onMove = (moveEvent) => {
      const rect = workspace.getBoundingClientRect();
      if (isRightDock()) applyRightSplit(moveEvent.clientX - rect.left);
      else applyBottomSplit(moveEvent.clientY - rect.top);
    };
    const onUp = () => {
      workspace.classList.remove('is-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });

  handle.addEventListener('dblclick', () => {
    clearInlineGrid();
  });

  workspace.addEventListener('lh-dock-change', clearInlineGrid);
}

/* ─── Performance Tab ─────────────────────────────────────── */
function initPerfRecording(panel) {
  if (!panel) return;

  const liveState = panel.querySelector('.dtp-live-state');
  const liveToolbar = panel.querySelector('.dtp-live-toolbar');
  const recState  = panel.querySelector('.dtp-rec-state');
  const resState  = panel.querySelector('.dtp-results-state');
  const timer     = panel.querySelector('.dtp-rc-time');
  const fill      = panel.querySelector('.dtp-rc-fill');
  const stopBtn   = panel.querySelector('.dtp-stop-btn');
  const recAgainBtn     = panel.querySelector('.dtp-rec-again');
  const recordBtn       = panel.querySelector('.dtp-record-btn');
  const recordReloadBtn = panel.querySelector('.dtp-record-reload-btn');
  const liveRecordBtn       = panel.querySelector('.dtp-live-record');
  const liveRecordReloadBtn = panel.querySelector('.dtp-live-record-reload');
  const detailsPanel    = panel.querySelector('.dtp-details-panel');

  const filmstrip = panel.querySelector('#dtp-filmstrip');
  if (filmstrip && !filmstrip.innerHTML) {
    const count = 52;
    const dropStart = Math.floor(count * 0.38);
    const dropEnd = Math.floor(count * 0.58);
    filmstrip.innerHTML = Array.from({ length: count }, (_, i) => {
      let cls = 'dtp-film-cell';
      if (i >= dropStart && i < dropEnd) cls += ' frozen';
      else if (i % 9 === 5) cls += ' dim';
      return `<div class="${cls}"></div>`;
    }).join('');
  }

  initFrameTooltips(panel);
  initPerfDetailsTabs(panel);
  initPerfDetailsResize(panel);

  const gpuBars = panel.querySelector('.dtp-gpu-bars2');
  if (gpuBars && !gpuBars.innerHTML) {
    const barHtml = Array.from({ length: 80 }, (_, i) => {
      const inBottleneck = i >= 30 && i <= 52;
      const h = inBottleneck ? 6 + Math.random() * 6 : 2 + Math.random() * 4;
      const op = inBottleneck ? 0.85 : 0.45;
      return `<div style="left:${(i / 80 * 100).toFixed(1)}%;width:0.8%;height:${h}px;opacity:${op}"></div>`;
    }).join('');
    gpuBars.innerHTML = barHtml;
  }

  let interval = null;
  let elapsed = 0;

  function showLive() {
    liveToolbar?.removeAttribute('hidden');
    liveState?.removeAttribute('hidden');
    recState?.setAttribute('hidden', '');
    resState?.setAttribute('hidden', '');
  }

  function startRecording() {
    liveToolbar?.setAttribute('hidden', '');
    liveState?.setAttribute('hidden', '');
    recState?.removeAttribute('hidden');
    resState?.setAttribute('hidden', '');
    elapsed = 0;
    if (timer) timer.textContent = '0.0 s';
    if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
    clearInterval(interval);
    interval = setInterval(() => {
      elapsed += 0.1;
      if (timer) timer.textContent = elapsed.toFixed(1) + ' s';
      if (fill) {
        fill.style.transition = 'width 0.1s linear';
        fill.style.width = Math.min((elapsed / 9) * 100, 100) + '%';
      }
    }, 100);
  }

  function showResults() {
    clearInterval(interval);
    liveToolbar?.setAttribute('hidden', '');
    liveState?.setAttribute('hidden', '');
    recState?.setAttribute('hidden', '');
    resState?.removeAttribute('hidden');
    applyResultHighlights();
    pulseLongTask();
  }

  function applyResultHighlights() {
    panel.querySelector('.perf-step-frames')?.classList.add('is-highlighted');
    panel.querySelector('.perf-step-longtask')?.classList.add('is-highlighted');
    panel.querySelector('.perf-step-stack')?.classList.add('is-highlighted');
  }

  function pulseLongTask() {
    const lt = panel.querySelector('.dtp-long-flame');
    if (lt) {
      lt.style.animation = 'none';
      void lt.offsetWidth;
      lt.style.animation = 'lt-pulse 0.6s ease 0.3s 2';
    }
  }

  function showDemoTrace() {
    clearInterval(interval);
    elapsed = 9.08;
    liveToolbar?.setAttribute('hidden', '');
    liveState?.setAttribute('hidden', '');
    recState?.setAttribute('hidden', '');
    resState?.removeAttribute('hidden');
    pulseLongTask();
  }

  if (!panel._perfInit) {
    panel._perfInit = true;
    recordBtn?.addEventListener('click', startRecording);
    recordReloadBtn?.addEventListener('click', startRecording);
    liveRecordBtn?.addEventListener('click', startRecording);
    liveRecordReloadBtn?.addEventListener('click', startRecording);
    stopBtn?.addEventListener('click', showResults);
    recAgainBtn?.addEventListener('click', startRecording);
  }

  panel._perfReset = () => {
    clearInterval(interval);
    showLive();
    if (timer) timer.textContent = '0.0 s';
    if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }
    detailsPanel?.style.removeProperty('--dtp-details-height');
  };

  panel._showDemoTrace = showDemoTrace;
  showLive();
}

function initPerfDetailsTabs(panel) {
  const tabs = panel?.querySelectorAll('.dtp-details-tab');
  const views = panel?.querySelectorAll('.dtp-details-content[data-details-view]');
  if (!tabs?.length || !views?.length || panel._detailsTabsBound) return;
  panel._detailsTabsBound = true;

  const showView = (viewName) => {
    views.forEach((view) => {
      view.hidden = view.dataset.detailsView !== viewName;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      const label = tab.textContent.trim();
      if (label === 'Summary') showView('summary');
      else if (label === 'Bottom-up') showView('bottomup');
    });
  });

  showView('summary');
}

function initPerfDetailsResize(panel) {
  const handle = panel?.querySelector('.dtp-details-resize-handle');
  const detailsPanel = panel?.querySelector('.dtp-details-panel');
  if (!handle || !detailsPanel || panel._detailsResizeBound) return;
  panel._detailsResizeBound = true;

  const minH = 96;
  const maxH = 300;

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture?.(e.pointerId);
    panel.classList.add('is-details-resizing');
    const startY = e.clientY;
    const startH = detailsPanel.getBoundingClientRect().height;
    const onMove = (moveEvent) => {
      const next = Math.min(maxH, Math.max(minH, startH + (startY - moveEvent.clientY)));
      detailsPanel.style.setProperty('--dtp-details-height', `${next}px`);
    };
    const onUp = () => {
      panel.classList.remove('is-details-resizing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

function initFrameTooltips(panel) {
  const body = panel?.querySelector('.dtp-frames-body');
  const timing = panel?.querySelector('#dtp-frame-timing');
  let tooltip = panel?.querySelector('.dtp-frame-tooltip');
  if (!body || !timing || !tooltip || body._tipBound) return;
  body._tipBound = true;

  if (!tooltip.dataset.portal) {
    document.body.appendChild(tooltip);
    tooltip.dataset.portal = '1';
    tooltip.classList.add('dtp-frame-tooltip-portal');
  }

  const bars = [...timing.querySelectorAll('.dtp-fbar')];

  const findBarAtX = (clientX) => {
    const rect = timing.getBoundingClientRect();
    if (!rect.width) return null;
    const ratio = (clientX - rect.left) / rect.width;
    const hit = bars.find((bar) => {
      const left = parseFloat(bar.style.left) / 100;
      const width = parseFloat(bar.style.width) / 100;
      return ratio >= left && ratio <= left + width;
    });
    if (hit) return hit;
    let nearest = null;
    let nearestDist = Infinity;
    bars.forEach((bar) => {
      const left = parseFloat(bar.style.left) / 100;
      const width = parseFloat(bar.style.width) / 100;
      const center = left + width / 2;
      const dist = Math.abs(ratio - center);
      if (dist < nearestDist) { nearestDist = dist; nearest = bar; }
    });
    return nearest;
  };

  const hide = () => { tooltip.hidden = true; };
  const show = (bar, clientX) => {
    const ms = bar?.dataset.tipMs;
    const label = bar?.dataset.tipLabel;
    const kind = bar?.dataset.tipKind || 'good';
    if (!ms || !label) { hide(); return; }
    const anchor = timing.getBoundingClientRect();
    tooltip.innerHTML = `<span class="dtp-frame-tip-ms ${kind}">${ms}</span><span class="dtp-frame-tip-label">${label}</span>`;
    tooltip.hidden = false;
    tooltip.style.left = `${clientX}px`;
    tooltip.style.top = `${anchor.top}px`;
  };

  body.addEventListener('mousemove', (e) => {
    const bar = findBarAtX(e.clientX);
    if (bar) show(bar, e.clientX);
    else hide();
  });
  body.addEventListener('mouseleave', hide);
}

/* ─── DOMContentLoaded ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildSectionMeta();
  highlightStaticCode();
  fillCodeSnippets(highlightCode);
  initBundlePanel(document.querySelector('.bp-grid'));
  initTreemapPanel(document.querySelector('.bundle-treemap-panel'));
  initCodeSplitViz(document.querySelector('#code-split-viz'));
  initReflowDemo(document.querySelector('.reflow-demo'));

  const hashMatch = location.hash.match(/section-(\d+)/);
  let initialIndex = 0;
  if (hashMatch) {
    const idx = parseInt(hashMatch[1], 10);
    if (idx >= 0 && idx < TOTAL_SECTIONS) initialIndex = idx;
  }
  updateNav(initialIndex, { animateKicker: false });
  if (isEnterAnimatedSlide(initialIndex)) {
    prepareSlideEnter(sections[initialIndex]);
    if (!isDeferredEnterSlide(initialIndex)) {
      playSlideEnter(sections[initialIndex]);
    }
  }
  applySlidePositions(initialIndex, false);
  onSectionEnter(initialIndex, sections[initialIndex]);
  initSidebar();
  updateSidebarActive(initialIndex);
});

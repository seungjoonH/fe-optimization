export function scoreColor(score) {
  if (score >= 90) return '#0cce6b';
  if (score >= 50) return '#ffa400';
  return '#ff4e42';
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function scoreFillTint(score) {
  if (score >= 90) return '#e6f4ea';
  if (score >= 50) return '#fef7e0';
  return '#fce8e6';
}

export const LH_PERF_METRIC_DEFS = [
  { key: 'si', label: 'SI', weight: 10 },
  { key: 'fcp', label: 'FCP', weight: 10 },
  { key: 'lcp', label: 'LCP', weight: 25 },
  { key: 'tbt', label: 'TBT', weight: 30 },
  { key: 'cls', label: 'CLS', weight: 15 },
];

const LH_WEIGHT_SUM = LH_PERF_METRIC_DEFS.reduce((s, m) => s + m.weight, 0);
const LH_SEGMENT_GAP = 2.5;

export const DEFAULT_PERF_METRICS = { si: 42, fcp: 58, lcp: 51, tbt: 74, cls: 96 };

export function calcPerfScore(metrics) {
  return Math.round(
    LH_PERF_METRIC_DEFS.reduce((sum, def) => sum + (metrics[def.key] ?? 0) * def.weight, 0) / LH_WEIGHT_SUM
  );
}

export function randomPerfMetrics() {
  const metrics = {};
  LH_PERF_METRIC_DEFS.forEach(({ key }) => {
    metrics[key] = Math.floor(Math.random() * 101);
  });
  return metrics;
}

export function randomAuditScores() {
  const metrics = randomPerfMetrics();
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  return {
    performance: calcPerfScore(metrics),
    accessibility: rand(78, 100),
    bestPractices: rand(82, 100),
    seo: rand(85, 100),
    metrics,
  };
}

/** 12시 기준 시계방향 각도 → SVG 좌표 */
export function polarFrom12(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

export function describeArc(cx, cy, r, startDeg, sweepDeg) {
  if (sweepDeg <= 0) return '';
  const endDeg = startDeg + sweepDeg;
  const [x1, y1] = polarFrom12(cx, cy, r, startDeg);
  const [x2, y2] = polarFrom12(cx, cy, r, endDeg);
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function arcPathLength(r, sweepDeg) {
  return (Math.max(sweepDeg, 0) / 360) * 2 * Math.PI * r;
}

export function labelAnchorForDeg(midDeg) {
  const n = ((midDeg % 360) + 360) % 360;
  if (n > 40 && n < 140) return 'start';
  if (n > 220 && n < 320) return 'end';
  return 'middle';
}

export function parsePerfMetrics(raw) {
  if (!raw) return { ...DEFAULT_PERF_METRICS };
  try {
    return { ...DEFAULT_PERF_METRICS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PERF_METRICS };
  }
}

export function buildLhPerfGaugeHtml(score, metrics = {}, r = 52, fontSize = 26) {
  const vb = 160;
  const cx = vb / 2;
  const cy = vb / 2;
  const { circ } = createLhGauge(r);
  const color = scoreColor(score);
  const tint = scoreFillTint(score);
  const m = { ...DEFAULT_PERF_METRICS, ...metrics };
  const trackR = r;
  const innerDiscR = r - 13;
  const labelR = r + 20;
  const strokeW = 7;

  let metricsSvg = '';
  let startDeg = -90 + LH_SEGMENT_GAP / 2;

  LH_PERF_METRIC_DEFS.forEach((def) => {
    const ms = Math.max(0, Math.min(100, m[def.key] ?? 0));
    const mc = scoreColor(ms);
    const segmentSweep = (def.weight / LH_WEIGHT_SUM) * 360 - LH_SEGMENT_GAP;
    const scoreSweep = segmentSweep * (ms / 100);
    const midDeg = startDeg + segmentSweep / 2;
    const bgPath = describeArc(cx, cy, trackR, startDeg, segmentSweep);
    const fgPath = describeArc(cx, cy, trackR, startDeg, scoreSweep);
    const fgLen = arcPathLength(trackR, scoreSweep);
    const [lx, ly] = polarFrom12(cx, cy, labelR, midDeg);
    const anchor = labelAnchorForDeg(midDeg);

    metricsSvg += `<path class="lh-metric-arc-bg" d="${bgPath}" fill="none" stroke="#e8eaed" stroke-width="${strokeW}" stroke-linecap="butt"/>`;
    if (fgPath) {
      metricsSvg += `<path class="lh-metric-arc-fg" data-metric="${def.key}" data-arc-len="${fgLen.toFixed(2)}"
        d="${fgPath}" fill="none" stroke="${mc}" stroke-width="${strokeW}" stroke-linecap="round"
        stroke-dasharray="${fgLen.toFixed(2)}" stroke-dashoffset="${fgLen.toFixed(2)}"/>`;
    }
    metricsSvg += `<text class="lh-metric-label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}"
      text-anchor="${anchor}" dominant-baseline="middle" font-size="9" font-weight="700" fill="#3c4043">${def.label}</text>`;

    startDeg += segmentSweep + LH_SEGMENT_GAP;
  });

  const simple = `<g class="lh-gauge-simple">
    <circle class="lh-gauge-bg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="8"/>
    <circle class="lh-gauge-fg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e0e0e0" stroke-width="8"
      stroke-linecap="round" data-r="${r}"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
      transform="rotate(-90 ${cx} ${cy})"/>
    <text class="lh-gauge-value" x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#333">0</text>
  </g>`;

  const breakdown = `<g class="lh-gauge-breakdown">
    <circle class="lh-gauge-disc" cx="${cx}" cy="${cy}" r="${innerDiscR}" fill="${tint}"/>
    ${metricsSvg}
    <text class="lh-gauge-value lh-gauge-value-breakdown" x="${cx}" y="${cy + 5}" text-anchor="middle"
      font-size="${fontSize}" font-weight="700" fill="${color}">0</text>
  </g>`;

  return `<svg viewBox="0 0 ${vb} ${vb}" class="lh-gauge-svg lh-gauge-svg-perf" overflow="visible">${simple}${breakdown}</svg>`;
}

export function resetLhBreakdownArcs(gaugeEl) {
  gaugeEl?.querySelectorAll('.lh-metric-arc-fg').forEach((arc) => {
    const len = arc.dataset.arcLen || '0';
    arc.style.transition = 'none';
    arc.setAttribute('stroke-dashoffset', len);
  });
}

export function animateLhBreakdown(gaugeEl, duration = 520) {
  resetLhBreakdownArcs(gaugeEl);
  gaugeEl?.querySelectorAll('.lh-metric-arc-fg').forEach((arc, i) => {
    const len = parseFloat(arc.dataset.arcLen || '0');
    if (!len) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        arc.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        arc.setAttribute('stroke-dashoffset', '0');
      }, i * 70);
    });
  });
}

export function createLhGauge(r = 54) {
  const circ = 2 * Math.PI * r;
  return { r, circ };
}

export function animateLhGauge(gaugeEl, targetScore, duration = 1400) {
  const fg = gaugeEl.querySelector('.lh-gauge-fg');
  const valueEls = gaugeEl.querySelectorAll('.lh-gauge-value');
  if (!valueEls.length) return;
  const r = parseFloat(fg?.dataset.r || gaugeEl.querySelector('[data-r]')?.dataset.r || 52);
  const circ = 2 * Math.PI * r;
  const targetOffset = circ * (1 - targetScore / 100);
  const start = performance.now();
  const disc = gaugeEl.querySelector('.lh-gauge-disc');
  const isPerf = gaugeEl.classList.contains('lh-gauge-perf');

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = easeOutCubic(t);
    const val = Math.round(eased * targetScore);
    const color = scoreColor(val);
    valueEls.forEach((el) => {
      el.textContent = val;
      el.setAttribute('fill', color);
    });
    if (fg) {
      fg.style.stroke = color;
      fg.setAttribute('stroke-dashoffset', circ - (circ - targetOffset) * eased);
    }
    if (disc) disc.setAttribute('fill', scoreFillTint(val));
    if (isPerf && t >= 1) {
      gaugeEl.dataset.breakdownReady = '1';
      resetLhBreakdownArcs(gaugeEl);
    }
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function renderTreemap(container, type) {
  const W = 100, H = 100;
  if (type === 'before') {
    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="treemap-svg">
        <rect x="0" y="0" width="100" height="100" fill="#e64980" opacity="0.9"/>
        <text x="50" y="8" text-anchor="middle" fill="#fff" font-size="5" font-weight="600">lodash 531kb</text>
        <rect x="1" y="10" width="48" height="44" fill="#f06595" opacity="0.85"/><text x="25" y="34" text-anchor="middle" fill="#fff" font-size="3.5">cloneDeep</text>
        <rect x="51" y="10" width="48" height="44" fill="#f06595" opacity="0.85"/><text x="75" y="34" text-anchor="middle" fill="#fff" font-size="3.5">merge</text>
        <rect x="1" y="56" width="32" height="43" fill="#f06595" opacity="0.85"/><text x="17" y="79" text-anchor="middle" fill="#fff" font-size="3">chunk</text>
        <rect x="35" y="56" width="32" height="43" fill="#f06595" opacity="0.85"/><text x="51" y="79" text-anchor="middle" fill="#fff" font-size="3">flatten</text>
        <rect x="69" y="56" width="30" height="43" fill="#f06595" opacity="0.85"/><text x="84" y="79" text-anchor="middle" fill="#fff" font-size="3">+200</text>
      </svg>`;
  } else {
    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="treemap-svg">
        <rect x="0" y="0" width="100" height="100" fill="#1a1f2e"/>
        <rect x="38" y="38" width="24" height="24" fill="#51cf66" opacity="0.95" class="treemap-after-block"/>
        <text x="50" y="52" text-anchor="middle" fill="#fff" font-size="4" font-weight="600">debounce</text>
        <text x="50" y="58" text-anchor="middle" fill="#fff" font-size="3.5">2.8kb</text>
      </svg>`;
  }
}

export function countUp(el, target, suffix = '', duration = 900) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const val = easeOutCubic(t) * target;
    el.textContent = (target < 10 ? val.toFixed(1) : Math.round(val)) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export const LH_SCORE_TOOLTIPS = {
  Performance: '로딩 속도, 반응성, 시각적 안정성을 종합한 성능 점수',
  Accessibility: '스크린 리더, 대비, ARIA 등 접근성 준수 여부',
  'Best Practices': 'HTTPS, 보안 헤더, 콘솔 오류 등 모범 사례 준수',
  SEO: '메타 태그, 크롤링 가능성, 모바일 친화성',
};

export function bindLhScoreTooltips(container) {
  if (!container || container._lhTooltipsBound) return;
  container._lhTooltipsBound = true;

  container.querySelectorAll('.lh-gauge-wrap.lh-gauge-sm[data-label]').forEach((wrap) => {
    const label = wrap.dataset.label;
    const text = LH_SCORE_TOOLTIPS[label];
    if (!text) return;

    let tip = wrap.querySelector('.lh-score-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'lh-score-tooltip';
      tip.textContent = text;
      wrap.appendChild(tip);
    }

    wrap.classList.add('has-score-tooltip');
  });
}

export function showLhOpportunity(container) {
  const opp = container?.querySelector('.lh-opportunities');
  if (!opp) return;
  opp.hidden = false;
  opp.classList.add('visible');
}

export function hideLhOpportunity(container) {
  const opp = container?.querySelector('.lh-opportunities');
  if (!opp) return;
  opp.classList.remove('visible');
  opp.hidden = true;
}

export function buildWaterfallTrack(trackEl, fcpLabelEl, data, fcp, totalMs, delay = 0) {
  trackEl.innerHTML = '';
  const fcpLine = document.createElement('div');
  fcpLine.className = 'wf-fcp-line';
  fcpLine.style.left = (fcp / totalMs * 100) + '%';
  trackEl.appendChild(fcpLine);

  data.forEach((item, i) => {
    const bar = document.createElement('div');
    bar.className = `wf-bar wf-${item.color}`;
    bar.style.setProperty('--wf-left', (item.start / totalMs * 100) + '%');
    bar.style.setProperty('--wf-width', '0%');
    bar.style.top = (12 + i * 36) + 'px';
    bar.innerHTML = `<span>${item.name}</span><strong>${item.size}</strong>`;
    trackEl.appendChild(bar);

    setTimeout(() => {
      bar.style.setProperty('--wf-width', (item.duration / totalMs * 100) + '%');
      bar.classList.add('animated');
    }, delay + i * 350 + 200);
  });

  if (fcpLabelEl) {
    fcpLabelEl.style.opacity = '0';
    fcpLabelEl.querySelector('strong').textContent = fcp + 'ms';
    setTimeout(() => {
      fcpLabelEl.style.opacity = '1';
      fcpLine.classList.add('visible');
    }, delay + data.length * 350 + 500);
  }
}

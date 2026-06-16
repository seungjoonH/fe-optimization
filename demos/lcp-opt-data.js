export const LCP_OPT_CODE = `<!-- head: 파싱 직후 이미지 요청 예약 -->
<link rel="preload" as="image" href="hero.webp">

<!-- img: fetch 우선순위 최상위 -->
<img fetchpriority="high" src="hero.webp" alt="히어로">`;

export const LCP_OPT_TIMELINE = {
  totalMs: 4000,
  speed: 2.4,
  axisLabels: ['0s', '1s', '2s', '3s', '4s'],
  before: {
    html: [0, 420],
    css: [420, 1680],
    hero: [1680, 3500],
    lcp: 3500,
    lcpLabel: '3.5s',
  },
  after: {
    html: [0, 420],
    hero: [120, 1200],
    css: [420, 1680],
    lcp: 1200,
    lcpLabel: '1.2s',
  },
};

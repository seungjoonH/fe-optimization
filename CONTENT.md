# FE 성능 최적화의 이모저모

> 측정, 번들, 렌더링, 런타임
>
> 최적화는 느린 부분을 찾아내는 것에서 시작한다

## 목차

1. 성능 측정
2. Tree Shaking
3. Code Splitting
4. Reflow / Repaint
5. Virtualization
6. Memoization
7. Web Worker

---

## 1. 성능 측정

### 슬라이드 1 — 왜 측정이 먼저인가

**최적화는 병목 식별에서 출발**

측정 없이 최적화할 때의 문제:

- **체감 불일치** — 개발 환경에서 빠르다고 느낀 구간이, 실제 사용자·기기에서는 느릴 수 있음
- **추측 최적화** — "느릴 것 같다"는 곳을 고치다 병목과 다른 구간에 시간을 씀
- **효과 미검증** — 고쳤는지, 얼마나 빨라졌는지 숫자 없이는 확인할 수 없음

올바른 최적화 순서:

**측정 → 병목 식별 → 개선 → 재측정**

추측 최적화보다 **병목 하나 제거**가 더 효과적

---

### 슬라이드 2 — 어떻게 측정하는가

**지표와 도구의 관계 정리**

#### 중요한 이유 (WHY)

**UX 기준** — 사용자 경험

- 실제 체감 성능을 수치로 정량화
- 이탈률 및 전환율에 직접 영향

**SEO 반영** — 검색 순위

- Google Page Experience Signal
- 점수 미달 시 검색 노출 하락

#### 측정 대상 (WHAT)

**Core Web Vitals** — Google이 정의한 핵심 UX 지표

- LCP (로딩 속도)
- INP (반응성)
- CLS (시각 안정성)

#### 측정 방법 (HOW)

**Lighthouse** — 자동 감사

- 종합 점수 0–100
- 문제 항목 목록
- DevTools 탭 또는 CLI

**DevTools Performance** — 수동 분석

- 타임라인 기록
- 병목 함수 추적
- Lighthouse 이후 깊은 분석

> 지표(CWV)를 먼저 이해하고 → 도구(Lighthouse / DevTools)로 측정한다

---

### 슬라이드 3 — Core Web Vitals란

**Google이 정의한 사용자 경험 핵심 지표**

#### LCP — 로딩 속도

**Largest Contentful Paint**

가장 큰 콘텐츠 요소가 그려지기까지 걸린 시간

**2.5s 이하**

#### INP — 반응성

**Interaction to Next Paint**

상호작용 후 다음 화면이 그려지기까지 걸린 시간

**200ms 이하**

#### CLS — 시각적 안정성

**Cumulative Layout Shift**

예기치 않은 레이아웃 이동의 누적 점수

**0.1 이하**

---

### 슬라이드 4 — LCP 상세

**Largest Contentful Paint, 로딩 완료 체감 시점**

#### 정의

화면에서 **가장 큰 콘텐츠**가 렌더되기까지 걸린 시간

뷰포트에서 가장 넓은 면적의 이미지 또는 텍스트 블록이 LCP 요소로 선정

**Good: 2.5s 이하**

> 페이지 로딩이 2.5s를 초과하면 사용자 이탈률 급등

#### 흔한 원인

- **렌더 블로킹** — head의 CSS와 JS 로드가 끝나야 첫 화면이 그려짐
- **느린 TTFB** — 서버 응답이 느리면 브라우저가 HTML을 늦게 받음
- **미최적화 히어로** — 용량이 큰 이미지가 LCP 요소가 되면 점수가 낮아짐

#### 시각화: 렌더링 속도에 따라 LCP 시점이 달라진다

| | |
|---|---|
| 0ms | 2.5s 기준 (Good) | 4000ms |

**느린 렌더링** — LCP 3.5s / Poor

**빠른 렌더링** — LCP 1.2s / Good

---

### 슬라이드 5 — INP 상세

**Interaction to Next Paint, 클릭 후 화면 반응 지연 측정**

#### 정의

클릭, 탭, 키 입력 후 **다음 화면이 그려질 때**까지의 지연

페이지 수명 동안 발생한 모든 상호작용 중 가장 느린 응답이 대표값

**Good: 200ms 이하**

> 200ms 이상 무반응이면 재클릭이 반복되며 UX가 저하됨

#### 느려지는 원인

- **Long Task** — JS가 50ms 이상 실행되면 그동안 입력을 처리할 수 없음
- **입력 큐 적체** — Long Task가 끝날 때까지 클릭과 스크롤이 대기열에 쌓임
- **과도한 렌더링** — 이벤트 처리 후 불필요한 컴포넌트 재렌더가 응답을 지연시킴

#### 시각화: 응답 속도에 따라 INP 시점이 달라진다

클릭 → 200ms 기준 (Good) → 화면 반응

**느린 응답** — Long Task → INP 350ms / Poor

**빠른 응답** — 처리 → INP 80ms / Good

---

### 슬라이드 6 — CLS 상세

**Cumulative Layout Shift, 레이아웃 안정성 지표**

#### 정의

로딩 중 요소가 **예상치 못하게 이동**한 정도의 누적 점수

광고 삽입, 이미지 지연 로드, 웹폰트 교체 등으로 요소 위치가 예기치 않게 변경되는 현상

**Good: 0.1 이하**

> 의도하지 않은 레이아웃 이동은 클릭 실수 및 이탈을 유발

#### 공식

```
shift score = impact fraction × distance fraction
CLS = Σ shift score
```

- **impact fraction** — 흔들린 화면 비율
- **distance fraction** — 밀린 거리 비율

#### 흔한 원인

- **이미지 크기 미지정** — 높이가 지정되지 않으면 이미지 로드 후 아래 요소 전체가 밀림
- **동적 배너, 광고** — 광고와 배너가 갑자기 삽입되면 주변 요소가 밀려남
- **웹폰트 교체** — fallback 폰트에서 웹폰트로 교체될 때 텍스트 높이가 바뀌며 이동

#### 시각화: CLS 누적 점수가 0.1 기준을 넘는지 비교한다

시나리오: **광고** / **웹폰트**

0.1 기준 (Good)

| | |
|---|---|
| **공간 미확보** — CLS 0.32 / Poor | **공간 확보** — CLS 0 / Good |
| **fallback 불일치** — CLS 0.14 / Poor | **크기 예약** — CLS 0 / Good |

---

### 슬라이드 7 — Lighthouse란

**Google 오픈소스 웹 품질 감사 도구**

```
URL (분석할 페이지 주소)
  → Lighthouse (자동 분석)
  → 점수 + 개선 방안 (0–100점, 항목별 진단)
```

#### 카테고리

| 카테고리 | 설명 |
|---|---|
| Performance | 얼마나 빠른가 |
| Accessibility | 모두가 쓸 수 있는가 |
| Best Practices | 보안과 코드 품질을 준수하는가 |
| SEO | 검색에 잘 노출되는가 |
| PWA | 앱으로 설치할 수 있는가 |

#### CLI 예시

```bash
$ npx lighthouse https://example.com --view
```

---

### 슬라이드 8 — Lighthouse 사용법

**권장 설정과 점수 해석 방법**

#### 주요 설정

| 항목 | 권장 | 기타 |
|---|---|---|
| Mode | Navigation | Timespan, Snapshot |
| Device | Mobile | Desktop |

**Categories**

| 카테고리 | 설명 |
|---|---|
| Performance | 얼마나 빠른가 |
| Accessibility | 모두가 쓸 수 있는가 |
| Best practices | 보안과 코드 품질을 준수하는가 |
| SEO | 검색에 잘 노출되는가 |
| PWA | 앱으로 설치할 수 있는가 |

#### 점수 기준

| 점수 | 해석 |
|---|---|
| 0 – 49 | 즉시 개선 필요 |
| 50 – 89 | 개선 여지 있음 |
| 90 – 100 | 양호 |

---

### 슬라이드 9 — DevTools Performance 탭

**Lighthouse 진단과 Performance 프로파일링의 역할 구분**

- **Lighthouse** — 어떤 항목이 문제인지 알려주는 진단 도구
- **Performance** — 언제, 어느 함수에서 막히는지 타임라인 추적

#### 화면에서 봐야 할 것

| 구분 | 의미 |
|---|---|
| 16.7ms 이내 | 정상 프레임 |
| Partial | 부분 갱신 프레임 |
| Dropped | 드랍 프레임 |

#### 병목 찾는 순서

1. Main 트랙 빨간 삼각형 → **Long Task**
2. 호출 스택 최하단 → **실제 병목 함수**

---

## 2. Tree Shaking

### 슬라이드 10 — Bundle 과 Dead Code

**실행되지 않는 코드까지 함께 보내는 것은 낭비**

- **Bundle** — 브라우저가 실제로 다운로드하는 최종 JS 파일
- **Dead Code** — 다운로드 또는 파싱됐지만 실행되지 않는 코드
- **대표 원인** — 일부만 써도 전체 import면 사용하지 않는 export까지 번들에 포함

#### 문제 예시

```javascript
import _ from 'lodash'

_.debounce(onSearch, 300)
```

#### 번들 구성 (Before)

| 파일 | 크기 |
|---|---|
| app.js | 1.2 KB |
| utils.js | 0.4 KB |
| lodash | 531 KB |
| chart.js | 1.2 KB |

→ Webpack / Vite → **bundle.js 531 KB**

| 구분 | 비율 | 크기 |
|---|---|---|
| 실행됨 | 0.5% | 2.8 KB |
| Dead Code | 99.5% | 528 KB |

---

### 슬라이드 11 — ESM 과 정적 분석

**번들러가 빌드 타임에 사용 export를 확정할 수 있어야 Tree Shaking이 가능**

```
소스코드 → 빌드 (번들러) → 배포 → 런타임 (앱 실행)
```

#### lodash (CJS 패키지)

```javascript
import _ from 'lodash'
_.debounce(handleSearch, 300)
```

**런타임에 결정**

lodash 내부는 **CJS** 기반이기 때문에 `_`는 런타임 객체로 취급되어, 빌드 시에는 어떤 메서드를 쓰는지 결정되지 않음

✗ 사용 심볼만 확정 불가하여 전체 포함 → **531 KB** (lodash 전체 포함)

#### lodash-es (ESM 패키지)

```javascript
import { debounce } from 'lodash-es'
debounce(handleSearch, 300)
```

**빌드 타임 분석**

`lodash-es`는 **ESM** 기반이므로 빌드 시점에 `debounce`가 의존 그래프에 연결되고, 사용되지 않는 export는 제거 가능

✓ 미사용 export 제거 → **2.8 KB** (debounce만)

#### 필요 조건

```
Tree Shaking = ESM package + named import + bundler static analysis
```

| 항목 | 설명 |
|---|---|
| ESM package | 빌드 타임에 분석 가능한 모듈 형식 |
| named import | 사용 심볼을 명시하는 import |
| bundler static analysis | 미사용 export 제거 |

---

### 슬라이드 12 — 번들 변환 파이프라인

**한 줄 코드 변경이 번들 결과에 미치는 나비효과**

#### Import diff

```diff
- import _ from 'lodash'
+ import { debounce } from 'lodash-es'

- _.debounce(handleSearch, 300)
+ debounce(handleSearch, 300)
```

ESM 패키지와 named import 를 사용하여 번들러가 `debounce`만 추적하도록 함

#### 파이프라인 비교

**Before (lodash) — Source**

```javascript
import _ from 'lodash'

export function SearchPage() {
  const onSearch = _.debounce(handleSearch, 300)
  return <input onChange={onSearch} />
}

function handleSearch(q) {
  console.log(q)
}
```

**After (lodash-es) — Source**

```javascript
import { debounce } from 'lodash-es'

export function SearchPage() {
  const onSearch = debounce(handleSearch, 300)
  return <input onChange={onSearch} />
}

function handleSearch(q) {
  console.log(q)
}
```

**After (lodash-es) — Tree Shaked**

```javascript
function debounce(func, wait) {
  let timerId
  return function debounced(...args) {
    clearTimeout(timerId)
    timerId = setTimeout(() => func.apply(this, args), wait)
  }
}

function handleSearch(q) {
  console.log(q)
}

function SearchPage(){
  const onSearch = debounce(handleSearch, 300)
  return React.createElement("input", { onChange: onSearch })
}
```

**After (lodash-es) — Minified**

```javascript
function d(n,t){let r;return function(...e){clearTimeout(r),r=setTimeout(()=>n.apply(this,e),t)}}function h(n){console.log(n)}function S(){const n=d(h,300);return React.createElement("input",{onChange:n})}
```

---

### 슬라이드 13 — Bundle Analyzer 사용법

**사각형 크기로 읽는 번들 최적화 우선순위**

지원 도구: **Webpack** / **Vite** / **Next.js**

#### 터미널

**Webpack**

```bash
$ npm install --save-dev webpack-bundle-analyzer
added 12 packages in 2s
$ npm run build
✓ built (analyzer opened in browser)
```

**Vite**

```bash
$ npm install --save-dev rollup-plugin-visualizer
$ npm run build
✓ built (analyzer opened in browser)
```

**Next.js**

```bash
$ npm install --save-dev @next/bundle-analyzer
$ ANALYZE=true npm run build
✓ built (analyzer opened in browser)
```

#### 설정 파일 (Webpack 예시)

`webpack.config.js`:

```javascript
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  // ...
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      openAnalyzer: true,
    }),
  ],
};
```

#### Vite 예시

`vite.config.ts`:

```javascript
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    // ...
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
    }),
  ],
});
```

#### Next.js 예시

`next.config.js`:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // next config...
});
```

#### 브라우저 출력

- Webpack: `webpack-bundle-analyzer @ localhost:8888`
- Vite: `rollup-plugin-visualizer @ dist/stats.html`
- Next.js: `@next/bundle-analyzer @ localhost:8888`

| | search.js |
|---|---|
| Before | 531 KiB |
| After | 2.8 KiB |

---

## 3. Code Splitting

### 슬라이드 14 — Code Splitting

**지금 필요 없는 코드는 나중에 로드**

- **문제** — /dashboard 첫 방문인데 static import면 HeavyChart까지 bundle.js 2.1MB 초기 로드
- **해결** — import()와 lazy로 청크 분리, Suspense로 로딩 UI

#### Before

```javascript
import HeavyChart from './HeavyChart'

export default function Dashboard() {
  return <HeavyChart data={data} />
}
```

#### After

```javascript
import { lazy, Suspense } from 'react'

const HeavyChart = lazy(() => import('./HeavyChart'))

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <HeavyChart data={data} />
    </Suspense>
  )
}
```

#### 결과

| 지표 | Before → After |
|---|---|
| FCP | 4.2s → 0.6s (약 7배) |
| Unused | 70% → 15% |

#### 워터폴 비교

**첫 방문**

| Before | After |
|---|---|
| bundle.js (2.1 MB) | main.js (300 KB) + chunk.HeavyChart.js (218 KB) |

**재방문**

| Before | After |
|---|---|
| bundle.js | main.js + chunk.HeavyChart.js |

#### 청크별 코드

**bundle.js (Before, 2.1 MB)**

```javascript
// bundle.js (Dashboard + HeavyChart + d3 한 파일)
import * as d3 from 'd3';
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
}
```

**main.js (After, 300 KB)**

```javascript
// main.js (shell + lazy 경계만)
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./chunk.HeavyChart.js'));

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

**chunk.HeavyChart.js (After, 218 KB)**

```javascript
// chunk.HeavyChart.js (/dashboard 방문 시에만)
import * as d3 from 'd3';
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
```

---

## 4. Reflow / Repaint

### 슬라이드 15 — LCP 리소스 최적화

**히어로 이미지를 브라우저가 가장 먼저 로드**

#### 기본 동작의 문제

- **늦은 이미지 발견** — HTML 파싱 중 img를 만나야 요청 시작
- **렌더 블로킹** — CSS와 JS 이후에야 LCP 이미지 발견

#### 해결

- **`<link rel="preload">`** — 파싱 직후 이미지 요청 예약
- **`fetchpriority="high"`** — 우선순위 큐에서 최상위로

```html
<!-- head: 파싱 직후 이미지 요청 예약 -->
<link rel="preload" as="image" href="hero.webp">

<!-- img: fetch 우선순위 최상위 -->
<img fetchpriority="high" src="hero.webp" alt="히어로">
```

#### 리소스 발견 순서 (네트워크 워터폴)

**Before:** HTML → CSS / JS → Hero IMG → LCP

**After:** HTML + preload → Hero IMG → CSS / JS → LCP

---

### 슬라이드 16 — 브라우저 렌더링 파이프라인

**렌더링은 JS → Style → Layout → Paint → Composite 순서**

- **Layout (Reflow)** — 크기 및 위치 계산 (높은 비용)
- **Paint (Repaint)** — 픽셀 그리기
- **Composite** — `transform` 및 `opacity` 는 GPU만 사용

> 왼쪽 단계 → 오른쪽 속성 매핑을 한 화면에서 확인

#### 렌더링 파이프라인 (단계별 트리거 속성)

**1. JavaScript** — 트리거

- DOM 조작
- 이벤트 핸들러
- style 변경

**2. Style** — CSSOM / CSS 매칭

- CSSOM
- 규칙 매칭
- computed style
- 상속과 캐스케이드

**3. Layout** — Reflow (비싼 비용)

- width
- height
- top / left
- margin
- padding

**4. Paint** — Repaint

- color
- background
- box-shadow
- border-color

**5. Composite** — GPU (저렴한 비용)

- transform
- opacity
- will-change

---

### 슬라이드 17 — Layout Thrashing 줄이기

**읽기와 쓰기 반복이 Reflow를 연쇄적으로 유발**

#### Before

```javascript
function fitProductCards(products) {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach((card, i) => {
    const h = card.offsetHeight;
    card.style.height = h + 10 + 'px';
  });
}
```

#### After

```javascript
function fitProductCards(products) {
  const cards = [...document.querySelectorAll('.product-card')];

  const heights = cards.map(card => card.offsetHeight);

  cards.forEach((card, i) => {
    card.style.height = heights[i] + 10 + 'px';
  });
}
```

- **Thrashing** — 루프마다 쓰기 및 읽기 → 강제 Reflow N회
- **해결** — 읽기 일괄 → 쓰기 일괄 → Reflow 1회

> Before / After 각각 ↻ 재생, 진입 시 동시 자동 재생

#### 데모: shop.example.com/products (Layout 이벤트)

**Before** — 루프 1회 = 읽기 → Reflow → 쓰기 (Reflow 0/10)

- 상품 #1: 읽기 `offsetHeight` → Reflow → 쓰기 `height`

**After** — 읽기 일괄 → Reflow 1회 → 쓰기 일괄 (Reflow 0/1)

- 일괄 처리: 읽기 ×10 → Reflow ×1 → 쓰기 ×10

---

### 슬라이드 18 — Composite-only 속성 활용

**16ms 파이프라인에서 Composite 레이어만 활성화**

- **left / top** — Layout → Paint → Composite 전부 실행
- **transform / opacity** — GPU 합성만 (60fps 유지)

#### Before

```javascript
el.style.left = x + 'px'
el.style.top  = y + 'px'
```

#### After

```javascript
el.style.transform = `translate(${x}px, ${y}px)`
el.style.opacity = 0.9
```

#### 시각화: 동일 궤적 (파이프라인 차이)

**left / top** — JS → Style → Layout → Paint → Comp

**transform** — JS → Style → Layout(스킵) → Paint(스킵) → Comp

---

### 슬라이드 19 — CLS 레이아웃 안정화

**로드 전후 레이아웃이 같으면 CLS는 0**

#### 핵심

공간을 **미리 예약**하면 이동이 없다

- **이미지** — `width`/`height`와 `aspect-ratio`
- **광고** — `min-height` 슬롯

#### Before (HTML)

```html
<img src="banner.jpg"
     alt="">
```

#### After (HTML + CSS)

```html
<img src="banner.jpg"
     width="800" height="400"
     alt="">
```

```css
.hero {
  aspect-ratio: 16 / 9;
}
.ad-slot {
  min-height: 90px;
}
```

#### 시각화: 로드 전후 레이아웃 비교

시나리오: **이미지** / **광고**

| | |
|---|---|
| **공간 미확보** — ad 로드 시 삽입 — CLS 0.20 / Poor | **공간 확보** — 슬롯 미리 예약 — CLS 0 / Good |

---

## 5. Virtualization

### 슬라이드 20 — Virtualization

**보이는 구간만 DOM에 렌더링**

- **문제** — 10,000개 전체 렌더 시 DOM 10,000 / FPS 12 / 초기 렌더 ~800ms
- **해결** — scrollTop으로 startIndex 계산, 보이는 ~20개만 DOM 렌더

#### Before

```javascript
function ProductList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

#### After

```javascript
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: items.length,
  estimateSize: () => 32,
})

return virtualizer.getVirtualItems().map(v => (
  <div key={v.key} style={{ position: 'absolute', top: v.start }}>
    {items[v.index].name}
  </div>
))
```

> Before / After 각각 스크롤해 차이 확인

#### 데모: shop.example.com/products (10,000 items)

| | Before (전체 렌더) | After (Virtualization) |
|---|---|---|
| DOM | - | - |
| Memory | - | - |
| FPS | - | - |

↕ 스크롤해 보세요

---

## 6. Memoization

### 슬라이드 21 — React 렌더링 사이클

**부모가 리렌더되면 props 가 같아도 자식도 리렌더링**

- **기본 규칙** — 부모 state 변경 → 모든 자식 재실행, props 동일해도 스킵 없음
- **실무 문제** — 접속자 수만 갱신돼도 ProductList, SalesChart까지 매번 리렌더

#### 컴포넌트 트리 (리렌더 전파)

| 컴포넌트 | 역할 | props | 결과 |
|---|---|---|---|
| **Dashboard** (트리거) | state, 접속자수 100 | — | 트리거 |
| **LiveCounter** | props, visitors 100 → - | 변경됨 | 정상 리렌더 |
| **ProductList** | props, products 동일 | 동일 | 불필요 리렌더 |
| **SalesChart** | props, chartData 동일 | 동일 | 불필요 리렌더 |

---

### 슬라이드 22 — React.memo와 useCallback

**memo는 props가 같을 때 스킵, useCallback은 함수 참조를 고정**

#### Before

```javascript
// AdminDashboard.jsx (Before)
import { useLiveVisitors } from './hooks/useLiveVisitors'
import { useTodayHotProducts } from './hooks/useTodayHotProducts'

function ProductRanking({ products }) {
  return (
    <section>
      <h2>오늘의 인기 상품</h2>
      {products.map(p => <div key={p.id}>{p.name}</div>)}
    </section>
  )
}

export default function AdminDashboard() {
  const visitors = useLiveVisitors()
  const hotProducts = useTodayHotProducts()
  return (
    <>
      <StatCard label="현재 접속자 수" value={visitors} />
      <ProductRanking products={hotProducts} />
    </>
  )
}
```

#### After

```javascript
// AdminDashboard.jsx (After)
import { useCallback } from 'react'
import { useLiveVisitors } from './hooks/useLiveVisitors'
import { useTodayHotProducts } from './hooks/useTodayHotProducts'

const ProductRanking = React.memo(function ProductRanking({ products, onSelect }) {
  return (
    <section>
      <h2>오늘의 인기 상품</h2>
      {products.map(p => <div key={p.id} onClick={() => onSelect(p.id)}>{p.name}</div>)}
    </section>
  )
})

export default function AdminDashboard() {
  const visitors = useLiveVisitors()
  const hotProducts = useTodayHotProducts()
  const onSelect = useCallback((id) => track('product_select', { id }), [])
  return (
    <>
      <StatCard label="현재 접속자 수" value={visitors} />
      <ProductRanking products={hotProducts} onSelect={onSelect} />
    </>
  )
}
```

> 접속자 수 갱신 시 차이 확인, 진입 시 자동 시연

#### 데모

| | Before (memo 없음) | After (memo + useCallback) |
|---|---|---|
| URL | admin.shop.com/dashboard | admin.shop.com/dashboard |
| 화면 | Shop Admin / 실시간 / 현재 접속자 수 100 / 오늘의 인기 상품 | 동일 |

---

### 슬라이드 23 — useMemo 사용 기준

**메모이제이션 비용과 연산 비용 비교**

- **비교 비용** — 매 렌더마다 의존성 배열 얕은 비교 발생
- **역효과** — 연산 비용 < 비교 비용이면 오히려 느려짐

#### 불필요한 경우

```javascript
const doubled = useMemo(() => count * 2, [count])
const label   = useMemo(() => `item-${id}`, [id])
```

원시값 계산은 비교 비용이 더 큼

#### 필요한 경우

```javascript
const filtered = useMemo(
  () => orders.filter(o => o.status === 'shipping'),
  [orders]
)
const config = useMemo(() => ({ theme, size }), [theme, size])
```

대용량 필터링, memo 자식에 객체 props 전달 시

#### useMemo 사용 판단 흐름

1. **연산이 눈에 띄게 느린가?** (10만 건+ 또는 프로파일러 확인)
   - **그렇다** → useMemo 사용
   - **아니다** → memo 자식에 props로 전달하는가?
     - **그렇다** → useMemo 사용
     - **아니다** → 사용 안 함

---

## 7. Web Worker

### 슬라이드 24 — 메인 스레드 구조

**단일 스레드에서 Javascript, 렌더링, 입력 처리**

- **단일 실행** — 메인 스레드는 한 번에 하나의 태스크만 실행
- **담당 업무** — JavaScript 실행, DOM, 렌더링, 사용자 입력 처리
- **Long Task** — 50ms+ JS 실행 중 클릭, 스크롤, 키 입력 전부 대기

> Long Task 병목은 메인 스레드 단일 실행 구조에서 발생

#### 시각화

**메인 스레드:** `buildSalesReport()` 500ms 실행 중

**사용자 입력:** 클릭 → 입력 대기 → 화면 반응

---

### 슬라이드 25 — Web Worker API

**메인 스레드 병목을 Worker로 분리**

- **통신 흐름** — 메인 postMessage → Worker 연산 → postMessage 결과 반환
- **메인 스레드** — 연산 중에도 UI 처리 지속
- **데이터 전달** — 구조적 복제, ArrayBuffer는 transfer로 소유권 이전 가능
- **Worker 제약** — DOM, window, document 접근 불가

> buildSalesReport() 를 Worker로 옮기면 메인에서는 입력 처리 지속 가능

#### 시각화

| 레인 | 동작 |
|---|---|
| **메인 스레드** | UI → 입력 처리 → renderReport |
| **Worker** | buildSalesReport() |
| **사용자 입력** | 클릭 → 즉시 처리 → 화면 반응 |

---

### 슬라이드 26 — Web Worker 블로킹 데모

**집계 연산 중 UI 응답성 비교**

#### Before (메인 스레드)

```javascript
import { buildSalesReport } from './lib/buildSalesReport'
import { fetchOrdersForQuarter } from './api/orders'

async function onGenerateClick() {
  setStatus('loading')
  const orders = await fetchOrdersForQuarter('2024-Q4')

  const report = buildSalesReport(orders)
  renderReport(report)
}
```

#### After (Web Worker)

```javascript
import { fetchOrdersForQuarter } from './api/orders'

const worker = new Worker(
  new URL('./buildSalesReport.worker.js', import.meta.url)
)

async function onGenerateClick() {
  setStatus('loading')
  const orders = await fetchOrdersForQuarter('2024-Q4')
  worker.postMessage({ type: 'BUILD_REPORT', orders })
}

worker.onmessage = ({ data }) => {
  if (data.type === 'REPORT') renderReport(data.report)
}

// buildSalesReport.worker.js
self.onmessage = ({ data }) => {
  const report = buildSalesReport(data.orders)
  self.postMessage({ type: 'REPORT', report })
}
```

> 양쪽 매출 집계 실행 클릭 후 타이머, 필터 반응 비교

#### 데모: report.example.com / Sales Report

| | Before (메인 스레드) | After (Web Worker) |
|---|---|---|
| CPU | 12% | 8% (Worker 별도) |
| 상태 | UI 멈춤 | 연산 완료, UI 블로킹 0ms |

---

## 마무리

### 핵심 요약

**측정 → 번들 → 렌더링 → 런타임**

| 단계 | 목표 |
|---|---|
| 측정 | 병목 파악 |
| 번들 | 다운로드 절감 |
| 렌더링 | 브라우저 작업 절감 |
| 런타임 | 실행 비용 절감 |

### 8가지 핵심

**01. Core Web Vitals**
LCP, INP, CLS로 무엇이 느린지 숫자로 본다

**02. Lighthouse / Performance**
Lighthouse로 점수를 보고, Performance 탭에서 병목을 추적한다

**03. Tree Shaking**
ESM named import로 교체하면 Dead Code가 번들에서 사라진다

**04. Code Splitting**
지금 필요 없는 코드는 dynamic import로 나중에 받으면 된다

**05. Reflow / Repaint**
한번에 읽고 transform을 쓰면 Layout 횟수가 줄어든다

**06. Virtualization**
화면에 보이는 것만 DOM에 올리면 노드 수가 10,000에서 20으로 줄어든다

**07. Memoization**
React.memo와 useCallback으로 props가 같은 자식의 리렌더를 막는다

**08. Web Worker**
무거운 연산을 Worker로 옮기면 메인 스레드가 UI를 계속 처리할 수 있다

> 병목을 **숫자로 찾고**, **하나씩 고치고**, **다시 측정**한다

export const BUNDLE_FILE_CODE = {
  'bundle.js': {
    color: 'red',
    size: '2.1 MB',
    code: `// bundle.js (Dashboard + HeavyChart + d3 한 파일)
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
}`,
  },
  'main.js': {
    color: 'green',
    size: '300 KB',
    code: `// main.js (shell + lazy 경계만)
import { lazy, Suspense } from 'react';

const HeavyChart = lazy(() => import('./chunk.HeavyChart.js'));

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <HeavyChart data={data} />
    </Suspense>
  );
}`,
  },
  'chunk.HeavyChart.js': {
    color: 'blue',
    size: '218 KB',
    code: `// chunk.HeavyChart.js (/dashboard 방문 시에만)
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
}`,
  },
};

export const VISIT_TIMELINES = {
  first: {
    label: '첫 방문',
    totalMs: 4500,
    speed: 2.4,
    axisLabels: ['0s', '1s', '2s', '3s', '4s', '5s'],
    beforeBundle: [0, 4200],
    beforeFcp: 4200,
    afterMain: [0, 600],
    afterFcp: 600,
    afterChunk: [1200, 1600],
    fcpBeforeLabel: '4.2s',
    fcpAfterLabel: '0.6s',
  },
  return: {
    label: '재방문',
    totalMs: 1000,
    speed: 3.6,
    axisLabels: ['0s', '0.2s', '0.4s', '0.6s', '0.8s', '1s'],
    beforeBundle: [0, 380],
    beforeFcp: 380,
    afterMain: [0, 100],
    afterFcp: 100,
    afterChunk: [100, 180],
    fcpBeforeLabel: '0.38s',
    fcpAfterLabel: '0.10s',
  },
};

export const CODE_SPLIT_BEFORE = `import HeavyChart from './HeavyChart'

export default function Dashboard() {
  return <HeavyChart data={data} />
}`;

export const CODE_SPLIT_AFTER = `import { lazy, Suspense } from 'react'

const HeavyChart = lazy(() => import('./HeavyChart'))

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <HeavyChart data={data} />
    </Suspense>
  )
}`;

export const REFLOW_BEFORE = `function fitProductCards(products) {
  const cards = document.querySelectorAll('.product-card');

  cards.forEach((card, i) => {
    const h = card.offsetHeight;
    card.style.height = h + 10 + 'px';
  });
}`;

export const REFLOW_AFTER = `function fitProductCards(products) {
  const cards = [...document.querySelectorAll('.product-card')];

  const heights = cards.map(card => card.offsetHeight);

  cards.forEach((card, i) => {
    card.style.height = heights[i] + 10 + 'px';
  });
}`;

export const VIRTUAL_BEFORE = `function ProductList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}`;

export const VIRTUAL_AFTER = `import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: items.length,
  estimateSize: () => 32,
})

return virtualizer.getVirtualItems().map(v => (
  <div key={v.key} style={{ position: 'absolute', top: v.start }}>
    {items[v.index].name}
  </div>
))`;

export const MEMO_BEFORE = `// AdminDashboard.jsx (Before)
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
}`;

export const MEMO_AFTER = `// AdminDashboard.jsx (After)
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
}`;

export const WORKER_SHARED = `export function buildSalesReport(orders) {
  let totalRevenue = 0
  let lineCount = 0

  for (const order of orders) {
    for (const line of order.lines) {
      const subtotal = line.qty * line.unitPrice
      const discount = subtotal * line.discountRate
      totalRevenue += (subtotal - discount) * (1 + line.vatRate)
      lineCount++
    }
  }

  return { totalRevenue, orderCount: orders.length, lineCount }
}

export async function fetchOrdersForQuarter(quarter) {
  const res = await fetch(\`/api/admin/orders?quarter=\${quarter}\`)
  if (!res.ok) throw new Error('failed to load orders')
  return res.json()
}`;

export const WORKER_BEFORE = `import { buildSalesReport } from './lib/buildSalesReport'
import { fetchOrdersForQuarter } from './api/orders'

async function onGenerateClick() {
  setStatus('loading')
  const orders = await fetchOrdersForQuarter('2024-Q4')

  const report = buildSalesReport(orders)
  renderReport(report)
}`;

export const WORKER_AFTER = `import { fetchOrdersForQuarter } from './api/orders'

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
}`;

const SNIPPET_MAP = {
  '.code-split-before': CODE_SPLIT_BEFORE,
  '.code-split-after': CODE_SPLIT_AFTER,
  '.reflow-code-before': REFLOW_BEFORE,
  '.reflow-code-after': REFLOW_AFTER,
  '.virtual-code-before': VIRTUAL_BEFORE,
  '.virtual-code-after': VIRTUAL_AFTER,
  '.memo-code-before': MEMO_BEFORE,
  '.memo-code-after': MEMO_AFTER,
  '.worker-code-shared': WORKER_SHARED,
  '.worker-code-before': WORKER_BEFORE,
  '.worker-code-after': WORKER_AFTER,
};

export function fillCodeSnippets(highlightCode) {
  Object.entries(SNIPPET_MAP).forEach(([selector, source]) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.textContent = source;
    el.classList.add('language-javascript');
    highlightCode?.(el);
  });
}

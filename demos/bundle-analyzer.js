const PALETTE = [
  '#e64980', '#f06595', '#ff8787', '#ffa8a8', '#ffc9c9',
  '#be4bdb', '#da77f2', '#cc5de8', '#ae3ec9', '#9775fa',
  '#748ffc', '#5c7cfa', '#4dabf7', '#339af0', '#22b8cf',
  '#20c997', '#51cf66', '#94d82d', '#fcc419', '#ff922b',
  '#fd7e14', '#fab005', '#f59f00', '#e8590c', '#d9480f',
];

function hashColor(path, depth) {
  let h = depth * 13;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function squarifyPositions(items, x, y, w, h, gap = 1) {
  const out = new Array(items.length);
  if (!items.length) return out;

  function assign(group, startIdx, gx, gy, gw, gh) {
    if (group.length === 1) {
      const i = startIdx;
      out[i] = { x: gx + gap, y: gy + gap, w: Math.max(0, gw - gap * 2), h: Math.max(0, gh - gap * 2) };
      return;
    }
    const mid = Math.ceil(group.length / 2);
    const left = group.slice(0, mid);
    const right = group.slice(mid);
    const leftSum = left.reduce((s, n) => s + n.value, 0);
    const total = leftSum + right.reduce((s, n) => s + n.value, 0);
    const ratio = leftSum / total;

    if (gw >= gh) {
      const lw = gw * ratio;
      assign(left, startIdx, gx, gy, lw, gh);
      assign(right, startIdx + mid, gx + lw, gy, gw - lw, gh);
    } else {
      const lh = gh * ratio;
      assign(left, startIdx, gx, gy, gw, lh);
      assign(right, startIdx + mid, gx, gy + lh, gw, gh - lh);
    }
  }

  assign(items, 0, x, y, w, h);
  return out;
}

function layoutHierarchy(node, path, x, y, w, h, rects, depth = 0) {
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const hasKids = node.children?.length > 0;
  const header = hasKids && h > 24 ? 12 : 0;

  rects.push({
    path: fullPath,
    name: node.name,
    value: node.value,
    x, y, w, h,
    depth,
    isGroup: hasKids,
    fill: hashColor(fullPath, depth),
  });

  if (!hasKids) return;

  const innerX = x + 1;
  const innerY = y + 1 + header;
  const innerW = w - 2;
  const innerH = h - 2 - header;
  if (innerW <= 4 || innerH <= 4) return;

  const sorted = [...node.children].sort((a, b) => b.value - a.value);
  const positions = squarifyPositions(sorted, innerX, innerY, innerW, innerH);

  sorted.forEach((child, i) => {
    const pos = positions[i];
    if (!pos || pos.w < 2 || pos.h < 2) return;
    layoutHierarchy(child, fullPath, pos.x, pos.y, pos.w, pos.h, rects, depth + 1);
  });
}

function shortLabel(path, isGroup) {
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  if (isGroup && parts.length > 1) return parts.slice(-2).join('/');
  return name;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function measureTreemapBox(container, large) {
  const rect = container.getBoundingClientRect();
  const W = Math.max(Math.round(rect.width) || container.clientWidth || (large ? 560 : 480), 200);
  const H = Math.max(Math.round(rect.height) || container.clientHeight || (large ? 320 : 160), large ? 180 : 120);
  return { W, H };
}

function renderFoamTreemap(container, root, { animate = false, large = false } = {}) {
  if (!container) return;
  const { W, H } = measureTreemapBox(container, large);
  const rects = [];
  layoutHierarchy(root, '', 0, 0, W, H, rects);

  const svgParts = [`<svg viewBox="0 0 ${W} ${H}" class="foam-treemap-svg" xmlns="http://www.w3.org/2000/svg">`];
  svgParts.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);

  rects.forEach((r, i) => {
    if (r.w < 2 || r.h < 2) return;
    const label = shortLabel(r.path, r.isGroup);
    const showLabel = r.w > (large ? 28 : 22) && r.h > (large ? 18 : 14);
    const showSize = !r.isGroup && r.w > (large ? 52 : 40) && r.h > (large ? 32 : 26);
    const fs = Math.min(large ? 13 : 10, Math.max(large ? 8 : 6.5, Math.min(r.w, r.h) / (large ? 6 : 7)));
    const delay = animate ? Math.min(i * 12, 400) : 0;
    const opacity = r.isGroup ? 0.55 : 0.92;

    svgParts.push(`<g class="foam-cell${animate ? ' foam-animate' : ''}" style="--foam-delay:${delay}ms">`);
    svgParts.push(`<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" fill="${r.fill}" fill-opacity="${opacity}" stroke="#fff" stroke-width="1.2"/>`);
    if (showLabel) {
      svgParts.push(`<text x="${(r.x + 3).toFixed(1)}" y="${(r.y + fs + 2).toFixed(1)}" fill="#fff" font-size="${fs}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(label)}</text>`);
      if (showSize) {
        svgParts.push(`<text x="${(r.x + 3).toFixed(1)}" y="${(r.y + fs * 2 + 3).toFixed(1)}" fill="rgba(255,255,255,0.88)" font-size="${Math.max(6, fs - 1.5)}" font-family="ui-monospace,monospace">${r.value >= 10 ? r.value.toFixed(0) : r.value.toFixed(1)} KiB</text>`);
      }
    }
    svgParts.push('</g>');
  });

  svgParts.push('</svg>');
  container.innerHTML = svgParts.join('');
}

export const BUNDLE_BEFORE_TREE = {
  name: 'search.js',
  value: 531,
  children: [
    {
      name: 'node_modules/lodash',
      value: 528,
      children: [
        { name: 'cloneDeep.js', value: 82 },
        { name: 'merge.js', value: 68 },
        { name: 'chunk.js', value: 44 },
        { name: 'flatten.js', value: 39 },
        { name: 'map.js', value: 36 },
        { name: 'filter.js', value: 33 },
        { name: 'reduce.js', value: 29 },
        { name: 'isEqual.js', value: 26 },
        { name: 'groupBy.js', value: 23 },
        { name: 'uniq.js', value: 21 },
        { name: 'debounce.js', value: 2.8 },
        { name: '+191 others', value: 124.2 },
      ],
    },
    {
      name: 'src',
      value: 3,
      children: [
        { name: 'SearchPage.jsx', value: 1.8 },
        { name: 'api.js', value: 1.2 },
      ],
    },
  ],
};

export const BUNDLE_AFTER_TREE = {
  name: 'search.js',
  value: 2.8,
  children: [
    {
      name: 'node_modules/lodash-es',
      value: 2.8,
      children: [{ name: 'debounce.js', value: 2.8 }],
    },
  ],
};

export const SOURCE_BEFORE = `import _ from 'lodash'

export function SearchPage() {
  const onSearch = _.debounce(handleSearch, 300)
  return <input onChange={onSearch} />
}

function handleSearch(q) {
  console.log(q)
}`;

export const SOURCE_SHAKEN = `import { debounce } from 'lodash-es'

export function SearchPage() {
  const onSearch = debounce(handleSearch, 300)
  return <input onChange={onSearch} />
}

function handleSearch(q) {
  console.log(q)
}`;

/** 소스 파일 minify — JSX 변환 후 export 이름(SearchPage)은 유지 */
export const SOURCE_MINIFIED = `import{debounce as e}from"lodash-es";function t(n){console.log(n)}export function SearchPage(){const n=e(t,300);return React.createElement("input",{onChange:n})}`;

/** @deprecated use SOURCE_BEFORE */
export const SOURCE_AFTER = SOURCE_SHAKEN;

const BUNDLE_BEFORE_HEADER = `// bundle.js (before, 531 KiB)\n`;
const BUNDLE_SHAKEN_HEADER = `// bundle.js (tree shaked, 2.8 KiB)\n`;
const BUNDLE_MINIFIED_HEADER = `// bundle.js (minified, 1.0 KiB)\n`;

const BUNDLE_APP_USED = `function handleSearch(q) {
  console.log(q)
}

function SearchPage(){
  const onSearch = debounce(handleSearch, 300)
  return React.createElement("input", { onChange: onSearch })
}`;

const BUNDLE_LODASH_DEAD = `// lodash (cloneDeep, merge, map, filter ...)
// +191 modules (528 KiB)`;

const BUNDLE_SHAKEN_BODY = `function debounce(func, wait) {
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
}`;

/** bundle.js minify — export 없는 단일 청크 → 모든 심볼 단축 */
const BUNDLE_MINIFIED_BODY = `function d(n,t){let r;return function(...e){clearTimeout(r),r=setTimeout(()=>n.apply(this,e),t)}}function h(n){console.log(n)}function S(){const n=d(h,300);return React.createElement("input",{onChange:n})}`;

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getCodeByteLength(text) {
  return new TextEncoder().encode(text).length;
}

export function formatCodeBytes(text) {
  return `${getCodeByteLength(text)} B`;
}

function updateCompareCellSize(codeEl, src) {
  const sizeEl = codeEl?.closest('.bp-cell')?.querySelector('.bp-cell-size');
  if (sizeEl) sizeEl.textContent = formatCodeBytes(src);
}

function buildBundleBeforeHtml() {
  return (
    esc(BUNDLE_BEFORE_HEADER) +
    `<span class="code-section-label kept">USED: debounce만 참조</span>\n` +
    `<span class="code-kept">${esc(BUNDLE_APP_USED)}</span>\n\n` +
    `<span class="code-section-label dead">DEAD: lodash 전체 번들 포함</span>\n` +
    `<span class="code-dead">${esc(BUNDLE_LODASH_DEAD)}</span>`
  );
}

function buildBundleShakenHtml() {
  return (
    esc(BUNDLE_SHAKEN_HEADER) +
    `<span class="code-section-label kept">KEPT: debounce.js만 남음</span>\n` +
    `<span class="code-kept">${esc(BUNDLE_SHAKEN_BODY)}</span>`
  );
}

function buildBundleMinifiedHtml() {
  return (
    esc(BUNDLE_MINIFIED_HEADER) +
    `<span class="code-section-label minified">MINIFIED: Terser, esbuild</span>\n` +
    `<span class="code-minified">${esc(BUNDLE_MINIFIED_BODY)}</span>\n` +
    `<span class="code-removed-note">SearchPage→r, handleSearch→t, debounce→d, onSearch→o</span>`
  );
}

function buildTreeShakeDiffHtml() {
  return `
    <div class="ba-diff-split">
      <div class="ba-diff-col">
        <div class="ba-diff-head before">Before <span class="ba-code-meta">531 KiB</span></div>
        <pre class="ba-code ba-diff-code">${buildBundleBeforeHtml()}</pre>
      </div>
      <div class="ba-diff-col">
        <div class="ba-diff-head shaken">Tree Shaked <span class="ba-code-meta">2.8 KiB</span></div>
        <pre class="ba-code ba-diff-code">${buildBundleShakenHtml()}</pre>
      </div>
    </div>`;
}

function buildMinifyDiffHtml() {
  const shaken = esc(BUNDLE_SHAKEN_HEADER) +
    `<span class="code-kept">${esc(BUNDLE_SHAKEN_BODY)}</span>`;
  const minified = esc(BUNDLE_MINIFIED_HEADER) +
    `<span class="code-minified">${esc(BUNDLE_MINIFIED_BODY)}</span>`;
  return `
    <div class="ba-diff-split">
      <div class="ba-diff-col">
        <div class="ba-diff-head shaken">Tree Shaked <span class="ba-code-meta">2.8 KiB</span></div>
        <pre class="ba-code ba-diff-code">${shaken}</pre>
      </div>
      <div class="ba-diff-col">
        <div class="ba-diff-head minified">Minified <span class="ba-code-meta">1.0 KiB</span></div>
        <pre class="ba-code ba-diff-code">${minified}</pre>
      </div>
    </div>
    <p class="ba-diff-footnote"><strong>bundle.js</strong>는 export가 없어 <code>SearchPage</code>, <code>handleSearch</code> 모두 단축됩니다. 소스 파일의 <code>export function</code>만 이름이 유지됩니다.</p>`;
}

export function fillBundleDiffViews(shakeEl, minifyEl) {
  if (shakeEl) shakeEl.innerHTML = buildTreeShakeDiffHtml();
  if (minifyEl) minifyEl.innerHTML = buildMinifyDiffHtml();
}

/** @deprecated */
const MINIFIED_HEADER = BUNDLE_BEFORE_HEADER;
const MINIFIED_USED = BUNDLE_APP_USED;
const MINIFIED_DEAD_APP = BUNDLE_LODASH_DEAD;
const MINIFIED_AFTER_HEADER = BUNDLE_SHAKEN_HEADER;
const MINIFIED_REMOVED_NOTE = '';

function buildMinifiedBeforeHtml() {
  return buildBundleBeforeHtml();
}

function buildMinifiedAfterHtml() {
  return buildBundleShakenHtml();
}

export function fillBuildPipelineCode(beforeEl, shakenEl, minifiedEl) {
  if (beforeEl) beforeEl.innerHTML = buildBundleBeforeHtml();
  if (shakenEl) shakenEl.innerHTML = buildBundleShakenHtml();
  if (minifiedEl) minifiedEl.innerHTML = buildBundleMinifiedHtml();
}

export function fillPipelineRawCode(beforeEl, shakenEl, minifiedEl) {
  const items = [
    [beforeEl, BUNDLE_APP_USED],
    [shakenEl, BUNDLE_SHAKEN_BODY],
    [minifiedEl, BUNDLE_MINIFIED_BODY],
  ];
  items.forEach(([el, src]) => {
    if (!el) return;
    el.textContent = src;
  });
}

const BUNDLE_BEFORE_SHAKE = `function handleSearch(q) {
  console.log(q)
}

function SearchPage(){
  const onSearch = debounce(handleSearch, 300)
  return React.createElement("input", { onChange: onSearch })
}

var FUNC_ERROR_TEXT = 'Expected a function';
var NAN = 0 / 0;
var nativeMax = Math.max;
var nativeMin = Math.min;
var now = function() { return root.Date.now(); };

function debounce(func, wait, options) {
  var lastArgs, lastThis, maxWait, result,
      timerId, lastCallTime, lastInvokeTime = 0,
      leading = false, maxing = false, trailing = true;
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing
      ? nativeMax(toNumber(options.maxWait) || 0, wait)
      : maxWait;
    trailing = 'trailing' in options
      ? !!options.trailing : trailing;
  }
  function invokeFunc(time) {
    var args = lastArgs, thisArg = lastThis;
    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }
  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime;
    var timeSinceLastInvoke = time - lastInvokeTime;
    return (lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWait));
  }
  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) return trailingEdge(time);
    timerId = setTimeout(timerExpired, remainingWait(time));
  }
  function debounced() {
    var time = now(), isInvoking = shouldInvoke(time);
    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;
    if (isInvoking) {
      if (timerId === undefined) return leadingEdge(lastCallTime);
      if (maxing) {
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

function cloneDeep(value) {
  return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
}

function baseClone(value, bitmask, customizer, key, object, stack) {
  var result, isDeep = bitmask & CLONE_DEEP_FLAG,
      isFlat = bitmask & CLONE_FLAT_FLAG,
      isFull = bitmask & CLONE_SYMBOLS_FLAG;
  if (customizer) {
    result = object
      ? customizer(value, key, object, stack)
      : customizer(value);
  }
  if (result !== undefined) return result;
  if (!isObject(value)) return value;
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) return copyArray(value, result);
  } else {
    var tag = getTag(value),
        isFunc = tag == funcTag || tag == genTag;
    if (isBuffer(value)) return cloneBuffer(value, isDeep);
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = (isFlat || isFunc)
        ? {}
        : initCloneByTag(value, tag, isDeep);
      if (!isDeep) {
        return isFlat
          ? copySymbolsIn(value, baseAssignIn(result, value))
          : copySymbols(value, baseAssign(result, value));
      }
    } else {
      if (!cloneableTags[tag]) return object ? value : {};
      result = initCloneByTag(value, tag, isDeep);
    }
  }
  stack || (stack = new Stack);
  var stacked = stack.get(value);
  if (stacked) return stacked;
  stack.set(value, result);
  if (isSet(value)) {
    value.forEach(function(subValue) {
      result.add(baseClone(subValue, bitmask, customizer,
        subValue, value, stack));
    });
  } else if (isMap(value)) {
    value.forEach(function(subValue, key) {
      result.set(key, baseClone(subValue, bitmask, customizer,
        key, value, stack));
    });
  }
  var keysFunc = isFull
    ? (isFlat ? getAllKeysIn : getAllKeys)
    : (isFlat ? keysIn : keys);
  var props = isArr ? undefined : keysFunc(value);
  arrayEach(props || value, function(subValue, key) {
    if (props) { key = subValue; subValue = value[key]; }
    assignValue(result, key, baseClone(subValue, bitmask,
      customizer, key, value, stack));
  });
  return result;
}

function chunk(array, size) {
  size = Math.max(toInteger(size), 0);
  var length = array == null ? 0 : array.length;
  if (!length || size < 1) return [];
  var index = 0, resIndex = 0,
      result = Array(Math.ceil(length / size));
  while (index < length) {
    result[resIndex++] = baseSlice(array, index, (index += size));
  }
  return result;
}

function flatten(array) {
  var length = array == null ? 0 : array.length;
  return length ? baseFlatten(array, 1) : [];
}

function map(collection, iteratee) {
  var func = isArray(collection) ? arrayMap : baseMap;
  return func(collection, baseIteratee(iteratee, 3));
}

function filter(collection, predicate) {
  var func = isArray(collection) ? arrayFilter : baseFilter;
  return func(collection, baseIteratee(predicate, 3));
}

function reduce(collection, iteratee, accumulator) {
  var func = isArray(collection) ? arrayReduce : baseReduce,
      initAccum = arguments.length < 3;
  return func(collection, baseIteratee(iteratee, 4),
    accumulator, initAccum, baseEach);
}

function merge(object) {
  var args = arguments, length = args.length;
  if (length < 2 || object == null) return object;
  var index = 1;
  while (++index < length) {
    baseMerge(object, args[index], index, customDefaultsMerge);
  }
  return object;
}

function isEqual(value, other) {
  return baseIsEqual(value, other);
}`;

const BUNDLE_BEFORE_MIN = `function t(n){console.log(n)}function r(){const o=debounce(t,300);return React.createElement("input",{onChange:o})}
var FUNC_ERROR_TEXT="Expected a function",NAN=0/0,nativeMax=Math.max,nativeMin=Math.min,now=function(){return root.Date.now()};function debounce(n,t,e){var r,i,o,u,c,s,f=0,a=!1,h=!1,p=!0;if("function"!=typeof n)throw new TypeError(FUNC_ERROR_TEXT);t=toNumber(t)||0,isObject(e)&&(a=!!e.leading,h="maxWait"in e,o=h?nativeMax(toNumber(e.maxWait)||0,t):o,p="trailing"in e?!!e.trailing:p);function l(t){var e=r,o=i;return r=i=void 0,f=t,u=n.apply(o,e)}function y(n){return f=n,c=setTimeout(m,t),a?l(n):u}function j(n){var e=n-s;return void 0===s||e>=t||e<0||h&&n-f>=o}function m(){var n=now();if(j(n))return w(n);c=setTimeout(m,function(n){var e=t-(n-s);return h?nativeMax(e,o-(n-f)):e}(n))}function w(n){return c=void 0,p&&r?l(n):(r=i=void 0,u)}function z(){var n=now(),e=j(n);if(r=arguments,i=this,s=n,e){if(void 0===c)return y(s);if(h)return clearTimeout(c),c=setTimeout(m,t),l(s)}return void 0===c&&(c=setTimeout(m,t)),u}return z.cancel=function(){void 0!==c&&clearTimeout(c),f=0,r=i=s=c=void 0},z.flush=function(){return void 0===c?u:w(now())},z}function cloneDeep(n){return baseClone(n,CLONE_DEEP_FLAG|CLONE_SYMBOLS_FLAG)}function baseClone(n,t,e,r,i,o){var u,c=t&CLONE_DEEP_FLAG,s=t&CLONE_FLAT_FLAG,f=t&CLONE_SYMBOLS_FLAG;if(e&&(u=i?e(n,r,i,o):e(n)),void 0!==u)return u;if(!isObject(n))return n;var a=isArray(n);if(a){if(u=initCloneArray(n),!c)return copyArray(n,u)}else{var h=getTag(n),p=h==funcTag||h==genTag;if(isBuffer(n))return cloneBuffer(n,c);if(h==objectTag||h==argsTag||p&&!i){if(u=s||p?{}:initCloneByTag(n,h,c),!c)return s?copySymbolsIn(n,baseAssignIn(u,n)):copySymbols(n,baseAssign(u,n))}else{if(!cloneableTags[h])return i?n:{};u=initCloneByTag(n,h,c)}}o||(o=new Stack);var l=o.get(n);if(l)return l;o.set(n,u),isSet(n)?n.forEach(function(t){u.add(baseClone(t,e,e,t,n,o))}):isMap(n)&&n.forEach(function(t,r){u.set(r,baseClone(t,e,e,r,n,o))});var y=f?s?getAllKeysIn:getAllKeys:s?keysIn:keys,j=a?void 0:y(n);return arrayEach(j||n,function(t,e){j&&(e=t,t=n[e]),assignValue(u,e,baseClone(t,bitmask,customizer,e,n,o))}),u}function chunk(n,t){t=Math.max(toInteger(t),0);var e=null==n?0:n.length;if(!e||t<1)return[];var r=0,i=0,o=Array(Math.ceil(e/t));for(;r<e;)o[i++]=baseSlice(n,r,r+=t);return o}function flatten(n){return null==n||!n.length?[]:baseFlatten(n,1)}function map(n,t){return(isArray(n)?arrayMap:baseMap)(n,baseIteratee(t,3))}function filter(n,t){return(isArray(n)?arrayFilter:baseFilter)(n,baseIteratee(t,3))}function reduce(n,t,e){var r=isArray(n)?arrayReduce:baseReduce,i=arguments.length<3;return r(n,baseIteratee(t,4),e,i,baseEach)}function merge(n){var t=arguments,e=t.length;if(e<2||null==n)return n;var r=1;for(;++r<e;)baseMerge(n,t[r],r,customDefaultsMerge);return n}function isEqual(n,t){return baseIsEqual(n,t)}`;

export function fillCompareGrid(
  beforeSrcEl, afterSrcEl,
  beforeShakeEl, afterShakeEl,
  beforeMinEl, afterMinEl
) {
  const items = [
    [beforeSrcEl,   SOURCE_BEFORE],
    [afterSrcEl,    SOURCE_SHAKEN],
    [beforeShakeEl, BUNDLE_BEFORE_SHAKE],
    [afterShakeEl,  BUNDLE_SHAKEN_BODY],
    [beforeMinEl,   BUNDLE_BEFORE_MIN],
    [afterMinEl,    BUNDLE_MINIFIED_BODY],
  ];
  items.forEach(([el, src]) => {
    if (!el) return;
    el.textContent = src;
    updateCompareCellSize(el, src);
  });
}

export function fillMinifiedCode(beforeEl, afterEl) {
  fillBuildPipelineCode(beforeEl, afterEl, null);
}

export function fillSourcePipeline(beforeEl, shakenEl, minifiedEl) {
  const items = [
    [beforeEl, SOURCE_BEFORE],
    [shakenEl, SOURCE_SHAKEN],
    [minifiedEl, SOURCE_MINIFIED],
  ];
  items.forEach(([el, src]) => {
    if (!el) return;
    el.textContent = src;
    el.classList.add('language-javascript');
  });
}

export function fillSourceCode(beforeEl, afterEl) {
  fillSourcePipeline(beforeEl, afterEl, null);
}

export function renderBundleTreemaps(beforeEl, afterEl, animate = false, { large = false } = {}) {
  if (beforeEl) renderFoamTreemap(beforeEl, BUNDLE_BEFORE_TREE, { animate, large });
  if (afterEl) renderFoamTreemap(afterEl, BUNDLE_AFTER_TREE, { animate, large });
}

export function renderBundleTreemapOutput(outputEl, animate = false, { large = false } = {}) {
  if (outputEl) renderFoamTreemap(outputEl, BUNDLE_BEFORE_TREE, { animate, large });
}

export const BUNDLE_ANALYZER_SETUPS = {
  webpack: {
    install: 'npm install --save-dev webpack-bundle-analyzer',
    build: 'npm run build',
    configFile: 'webpack.config.js',
    browserUrl: 'webpack-bundle-analyzer @ localhost:8888',
    config: `const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  // ...
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      openAnalyzer: true,
    }),
  ],
};`,
  },
  vite: {
    install: 'npm install --save-dev rollup-plugin-visualizer',
    build: 'npm run build',
    configFile: 'vite.config.ts',
    browserUrl: 'rollup-plugin-visualizer @ dist/stats.html',
    config: `import { defineConfig } from 'vite';
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
});`,
  },
  nextjs: {
    install: 'npm install --save-dev @next/bundle-analyzer',
    build: 'ANALYZE=true npm run build',
    configFile: 'next.config.js',
    browserUrl: '@next/bundle-analyzer @ localhost:8888',
    config: `const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // next config...
});`,
  },
};

export function observeTreemapResize(beforeEl, afterEl, onResize) {
  if (!beforeEl && !afterEl) return () => {};
  const targets = [beforeEl, afterEl].filter(Boolean);
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => onResize?.());
  });
  targets.forEach((el) => ro.observe(el));
  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
  };
}

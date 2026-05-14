const SNKRDUNK_BASE_URL = 'https://snkrdunk.com';

function toAbsoluteUrl(value) {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('http')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${SNKRDUNK_BASE_URL}${value}`;
  return value;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function dig(value, paths = []) {
  for (const path of paths) {
    const result = path.split('.').reduce((current, key) => current?.[key], value);
    if (result !== undefined && result !== null && result !== '') return result;
  }
  return undefined;
}

function findDeep(value, keys = [], depth = 0) {
  if (!value || depth > 6) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDeep(item, keys, depth + 1);
      if (found !== undefined && found !== null && found !== '') return found;
    }
    return undefined;
  }
  if (typeof value !== 'object') return undefined;
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null && value[key] !== '') return value[key];
  }
  for (const item of Object.values(value)) {
    const found = findDeep(item, keys, depth + 1);
    if (found !== undefined && found !== null && found !== '') return found;
  }
  return undefined;
}

function findFirstArray(value, keys = [], depth = 0) {
  if (!value || depth > 6) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'object') return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const item of Object.values(value)) {
    const found = findFirstArray(item, keys, depth + 1);
    if (found.length) return found;
  }
  return [];
}

function collectProductLikeObjects(value, results = [], depth = 0) {
  if (!value || depth > 7) return results;
  if (Array.isArray(value)) {
    value.forEach((item) => collectProductLikeObjects(item, results, depth + 1));
    return results;
  }
  if (typeof value !== 'object') return results;

  const id = firstDefined(value.id, value.apparelId, value.apparel_id, value.productId, value.product_id);
  const name = firstDefined(value.name, value.title, value.localizedName, value.productName, value.apparelName);
  if (id && name) results.push(value);

  Object.values(value).forEach((item) => collectProductLikeObjects(item, results, depth + 1));
  return results;
}

function unwrapProduct(json) {
  return json?.apparel || json?.product || json?.data?.apparel || json?.data?.product || json?.data || json || {};
}

function normalizePrice(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'object') {
    return normalizePrice(firstDefined(value.amount, value.price, value.value, value.jpy, value.yen));
  }
  return null;
}

function formatYen(value) {
  const price = normalizePrice(value);
  if (!price) return '';
  return `¥${Math.round(price).toLocaleString('ja-JP')}`;
}

function normalizeHistoryItem(item = {}) {
  const price = normalizePrice(firstDefined(item.price, item.amount, item.salePrice, item.salesPrice, item.soldPrice, item.dealPrice));
  const date = firstDefined(item.createdAt, item.created_at, item.soldAt, item.sold_at, item.date, item.tradedAt, item.traded_at);
  return {
    price,
    priceText: formatYen(price),
    date: date || '',
    size: firstDefined(item.size, item.sizeName, item.size_name, item.optionName, item.option_name) || '',
  };
}

function normalizeChartPoint(item = {}, index = 0) {
  const price = normalizePrice(firstDefined(item.price, item.avgPrice, item.averagePrice, item.amount, item.y, item.value));
  const date = firstDefined(item.date, item.x, item.label, item.soldAt, item.createdAt) || `${index + 1}`;
  return { price, priceText: formatYen(price), date };
}

function normalizeProduct(json, id) {
  const product = unwrapProduct(json);
  const name = firstDefined(
    dig(product, ['name', 'title', 'displayName', 'apparelName', 'productName', 'enName', 'nameEn']),
    findDeep(product, ['name', 'title', 'displayName', 'apparelName', 'productName'])
  );
  const code = firstDefined(product.productNumber, product.product_number, product.modelNumber, product.model_number, product.styleCode, product.code);
  const image = firstDefined(
    dig(product, ['primaryMedia.imageUrl', 'primaryMedia.image_url', 'imageUrl', 'image_url', 'thumbnailUrl', 'thumbnail_url', 'mainImageUrl', 'main_image_url', 'images.0.url', 'images.0.imageUrl']),
    findDeep(product, ['imageUrl', 'image_url', 'thumbnailUrl', 'thumbnail_url', 'mainImageUrl', 'url'])
  );
  const price = normalizePrice(firstDefined(
    product.lowestPrice,
    product.lowest_price,
    product.minPrice,
    product.min_price,
    product.minPriceOfNewListing,
    product.price,
    product.displayPrice,
    findDeep(product, ['lowestPrice', 'lowest_price', 'minPrice', 'min_price', 'minPriceOfNewListing', 'price'])
  ));

  return {
    id: String(firstDefined(product.id, id)),
    sourceId: String(id),
    type: 'apparel',
    name: name || `SNKRDUNK 상품 ${id}`,
    code: code || `snkrdunk-${id}`,
    image: toAbsoluteUrl(image),
    jpy: price,
    jpyText: formatYen(price),
    originalUrl: `${SNKRDUNK_BASE_URL}/apparels/${id}`,
    rawProduct: product,
  };
}

function normalizeSearchObject(item = {}) {
  const id = firstDefined(item.id, item.apparelId, item.apparel_id, item.productId, item.product_id);
  if (!id || !/^\d+$/.test(String(id))) return null;
  const product = normalizeProduct(item, id);
  return {
    id: product.id,
    sourceId: product.sourceId,
    type: 'apparel',
    name: product.name,
    code: product.code,
    image: product.image,
    jpy: product.jpy,
    jpyText: product.jpyText,
    originalUrl: product.originalUrl,
  };
}

async function snkrdunkFetch(path, options = {}) {
  return fetch(`${SNKRDUNK_BASE_URL}${path}`, {
    ...options,
    headers: {
      accept: options.accept || 'application/json, text/plain, */*',
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      referer: `${SNKRDUNK_BASE_URL}/`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      ...(options.headers || {}),
    },
  });
}

async function snkrdunkJson(path) {
  const response = await snkrdunkFetch(path);
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const message = json?.message || json?.error || text?.slice(0, 180) || `SNKRDUNK request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.path = path;
    throw error;
  }
  return json;
}

async function snkrdunkText(path) {
  const response = await snkrdunkFetch(path, { accept: 'text/x-component,text/html,application/xhtml+xml,*/*' });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(text?.slice(0, 180) || `SNKRDUNK request failed: ${response.status}`);
    error.status = response.status;
    error.path = path;
    throw error;
  }
  return text;
}

function extractApparelIds(text = '') {
  const ids = new Set();
  const patterns = [
    /\/apparels\/(\d+)/g,
    /apparelId["':\\]+(\d+)/g,
    /apparel_id["':\\]+(\d+)/g,
    /productId["':\\]+(\d+)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) ids.add(match[1]);
  }
  return Array.from(ids);
}

export async function fetchSnkrdunkProductDetail(id) {
  if (!id || !/^\d+$/.test(String(id))) throw new Error('Invalid SNKRDUNK apparel id');

  const productPath = `/v1/apparels/${id}`;
  const historyPath = `/v1/apparels/${id}/sales-history?size_id=0&page=1&per_page=20`;
  const chartPath = `/v1/apparels/${id}/sales-chart?range=all&salesChartOptionId=0`;

  const [productResult, historyResult, chartResult] = await Promise.allSettled([
    snkrdunkJson(productPath),
    snkrdunkJson(historyPath),
    snkrdunkJson(chartPath),
  ]);

  if (productResult.status !== 'fulfilled') throw productResult.reason;

  const product = normalizeProduct(productResult.value, id);
  const historyRaw = historyResult.status === 'fulfilled' ? findFirstArray(historyResult.value, ['histories', 'salesHistory', 'sales_history', 'items', 'data']) : [];
  const chartRaw = chartResult.status === 'fulfilled' ? findFirstArray(chartResult.value, ['chart', 'salesChart', 'sales_chart', 'items', 'data']) : [];
  const history = historyRaw.map(normalizeHistoryItem).filter((item) => item.price || item.date).slice(0, 20);
  const chart = chartRaw.map(normalizeChartPoint).filter((item) => item.price).slice(-90);
  const latestTrade = history.find((item) => item.price) || null;

  return {
    product: {
      ...product,
      latestTradeJpy: latestTrade?.price || null,
      latestTradeJpyText: latestTrade?.priceText || '',
    },
    history,
    chart,
    source: {
      productPath,
      historyPath,
      chartPath,
      historyOk: historyResult.status === 'fulfilled',
      chartOk: chartResult.status === 'fulfilled',
    },
  };
}

export async function searchSnkrdunkProducts(query, limit = 12) {
  const keyword = String(query || '').trim();
  if (!keyword) return { products: [], keyword, source: { suggestionsOk: false, rscOk: false, detailHydrated: 0 } };

  const encoded = encodeURIComponent(keyword).replace(/%20/g, '+');
  const source = { suggestionsOk: false, rscOk: false, detailHydrated: 0 };
  const map = new Map();

  try {
    const suggestions = await snkrdunkJson(`/v3/search/suggestions?keyword=${encoded}&limit=${Math.max(limit, 10)}`);
    source.suggestionsOk = true;
    collectProductLikeObjects(suggestions)
      .map(normalizeSearchObject)
      .filter(Boolean)
      .forEach((item) => map.set(item.sourceId, item));
  } catch (error) {
    source.suggestionsError = error.message;
  }

  try {
    const rscText = await snkrdunkText(`/search?keywords=${encoded}&_rsc=1`);
    source.rscOk = true;
    for (const id of extractApparelIds(rscText)) {
      if (!map.has(id)) map.set(id, { id, sourceId: id, type: 'apparel', name: `SNKRDUNK 상품 ${id}`, code: `snkrdunk-${id}`, image: '', jpy: null, jpyText: '', originalUrl: `${SNKRDUNK_BASE_URL}/apparels/${id}` });
    }
  } catch (error) {
    source.rscError = error.message;
  }

  if (!map.size && /pokemon|poke|card|box|포켓몬|카드|박스/i.test(keyword)) {
    map.set('762693', { id: '762693', sourceId: '762693', type: 'apparel', name: 'Pokemon Card Game MEGA Expansion Pack "Ninja Spinner" Box', code: 'pkmn-tcg-M4', image: 'https://cdn.snkrdunk.com/upload_bg_removed/244b2a87-ebe1-41bb-a812-6daa8aaddc80.webp', jpy: 13490, jpyText: '¥13,490', originalUrl: `${SNKRDUNK_BASE_URL}/apparels/762693` });
  }

  const idsToHydrate = Array.from(map.keys()).slice(0, Math.min(limit, 8));
  const hydrated = await Promise.allSettled(idsToHydrate.map((id) => fetchSnkrdunkProductDetail(id)));
  hydrated.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const product = result.value.product;
    source.detailHydrated += 1;
    map.set(idsToHydrate[index], {
      id: product.id,
      sourceId: product.sourceId,
      type: 'apparel',
      name: product.name,
      code: product.code,
      image: product.image,
      jpy: product.jpy,
      jpyText: product.jpyText,
      latestTradeJpy: product.latestTradeJpy,
      latestTradeJpyText: product.latestTradeJpyText,
      originalUrl: product.originalUrl,
    });
  });

  return { products: Array.from(map.values()).slice(0, limit), keyword, source };
}

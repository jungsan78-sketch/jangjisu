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
    dig(product, ['imageUrl', 'image_url', 'thumbnailUrl', 'thumbnail_url', 'mainImageUrl', 'main_image_url', 'images.0.url', 'images.0.imageUrl']),
    findDeep(product, ['imageUrl', 'image_url', 'thumbnailUrl', 'thumbnail_url', 'mainImageUrl', 'url'])
  );
  const price = normalizePrice(firstDefined(
    product.lowestPrice,
    product.lowest_price,
    product.minPrice,
    product.min_price,
    product.price,
    product.displayPrice,
    findDeep(product, ['lowestPrice', 'lowest_price', 'minPrice', 'min_price', 'price'])
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

async function snkrdunkJson(path) {
  const response = await fetch(`${SNKRDUNK_BASE_URL}${path}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      referer: `${SNKRDUNK_BASE_URL}/`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    },
  });
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

import {
  buildFreshJangjisuScheduleResponse,
  emptyJangjisuSchedulePayload,
  getJangjisuMonthSourceUrl,
  JANGJISU_SHEET_URL,
  makeJangjisuScheduleCacheKey,
} from '../../lib/jangjisuScheduleSource';
import { readSnapshotCache, writeSnapshotCache } from '../../lib/cloudflareSnapshotCache';
import { getAllowedScheduleMonth } from '../../lib/scheduleMonth';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_STORAGE_SECONDS = 7 * 24 * 60 * 60;
const refreshPromises = new Map();

function isUsablePayload(payload) {
  return payload?.ok === true && Array.isArray(payload.items) && payload.items.length > 0;
}

async function refreshSchedule(cache, cacheKey, selectedMonth) {
  if (refreshPromises.has(cacheKey)) return refreshPromises.get(cacheKey);
  const promise = (async () => {
    const payload = await buildFreshJangjisuScheduleResponse(selectedMonth);
    // The source helper returns ok:false instead of throwing on fetch failures.
    if (!isUsablePayload(payload)) throw new Error('Schedule source unavailable');
    const record = { payload, cachedAt: Date.now() };
    const storage = await writeSnapshotCache(cache, cacheKey, record, CACHE_STORAGE_SECONDS);
    return { record, storage };
  })();
  refreshPromises.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    if (refreshPromises.get(cacheKey) === promise) refreshPromises.delete(cacheKey);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const selectedMonth = getAllowedScheduleMonth(req.query, 2);
  if (!selectedMonth) return res.status(400).json({ ok: false, message: '이번 달과 이전 두 달 일정만 확인할 수 있습니다.' });

  const cacheKey = makeJangjisuScheduleCacheKey(selectedMonth);
  const cache = await readSnapshotCache(cacheKey);
  const cached = isUsablePayload(cache.record?.payload) ? cache.record : null;
  const now = Date.now();
  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({ ...cached.payload, cache: 'hit', cacheStorage: cache.storage, cacheKey, cachedAt: new Date(cached.cachedAt).toISOString() });
  }

  try {
    const result = await refreshSchedule(cache, cacheKey, selectedMonth);
    return res.status(200).json({ ...result.record.payload, cache: cached ? 'refresh' : 'miss', cacheStorage: result.storage, cacheKey, cachedAt: new Date(result.record.cachedAt).toISOString() });
  } catch {
    if (cached) return res.status(200).json({ ...cached.payload, cache: 'stale', cacheStorage: cache.storage, cacheKey, cachedAt: new Date(cached.cachedAt).toISOString() });
    return res.status(200).json({
      ...emptyJangjisuSchedulePayload(selectedMonth, getJangjisuMonthSourceUrl(selectedMonth) || JANGJISU_SHEET_URL),
      cache: 'unavailable',
      cacheStorage: cache.storage,
      cacheKey,
    });
  }
}

import {
  buildFreshJangjisuScheduleResponse,
  emptyJangjisuSchedulePayload,
  getJangjisuMonthSourceUrl,
  JANGJISU_SHEET_URL,
  makeJangjisuScheduleCacheKey,
} from '../../lib/jangjisuScheduleSource';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getAllowedScheduleMonth } from '../../lib/scheduleMonth';

const CACHE_TTL_SECONDS = 60 * 60;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const selectedMonth = getAllowedScheduleMonth(req.query, 2);
  if (!selectedMonth) return res.status(400).json({ ok: false, message: '이번 달과 이전 두 달 일정만 확인할 수 있습니다.' });

  const cacheKey = makeJangjisuScheduleCacheKey(selectedMonth);
  const cached = await getCachedJson(cacheKey);
  const now = Date.now();
  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({ ...cached.payload, cache: 'hit', cacheKey, cachedAt: new Date(cached.cachedAt).toISOString() });
  }

  try {
    const payload = await buildFreshJangjisuScheduleResponse(selectedMonth);
    await setCachedJson(cacheKey, { payload, cachedAt: now }, CACHE_TTL_SECONDS);
    return res.status(200).json({ ...payload, cache: cached?.payload ? 'refresh' : 'miss', cacheKey, cachedAt: new Date(now).toISOString() });
  } catch {
    if (cached?.payload) return res.status(200).json({ ...cached.payload, cache: 'stale', cacheKey, cachedAt: new Date(cached.cachedAt).toISOString() });
    return res.status(200).json({
      ...emptyJangjisuSchedulePayload(selectedMonth, getJangjisuMonthSourceUrl(selectedMonth) || JANGJISU_SHEET_URL),
      cache: 'unavailable',
      cacheKey,
    });
  }
}


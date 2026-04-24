import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { fetchRecentPrisonNotices } from '../../lib/board/prisonNotices';

const CACHE_KEY = 'soop:prison-notices:crawl:v1';
const CACHE_TTL_SECONDS = 300;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const cached = await getCachedJson(CACHE_KEY);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({
      ok: true,
      ...cached.payload,
      cache: 'hit',
      cachedAt: new Date(cached.cachedAt).toISOString(),
    });
  }

  try {
    const notices = await fetchRecentPrisonNotices();
    const payload = {
      notices,
      source: 'soop_board_crawl',
      fetchedAt: new Date().toISOString(),
    };
    await setCachedJson(CACHE_KEY, { payload, cachedAt: now }, CACHE_TTL_SECONDS);
    return res.status(200).json({
      ok: true,
      ...payload,
      cache: cached?.payload ? 'refresh' : 'miss',
      cachedAt: new Date(now).toISOString(),
    });
  } catch (error) {
    if (cached?.payload) {
      return res.status(200).json({
        ok: true,
        ...cached.payload,
        cache: 'stale',
        cachedAt: new Date(cached.cachedAt).toISOString(),
        error: error.message,
      });
    }

    return res.status(200).json({
      ok: false,
      notices: [],
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
      error: error.message,
    });
  }
}

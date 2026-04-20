import { getBaseUrl, getJsonCache, isServerCacheEnabled, setJsonCache } from '../../lib/server-cache';

const CACHE_KEY = 'youtube:prison:v1';
const TTL_SECONDS = 60 * 60 * 2;

function isUsablePayload(payload) {
  return payload && !payload.missingKey && (Array.isArray(payload.videos) || Array.isArray(payload.shorts));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  const cached = await getJsonCache(CACHE_KEY);
  if (cached) {
    return res.status(200).json({ ...cached, cached: true, cacheSource: 'server' });
  }

  try {
    const baseUrl = getBaseUrl(req);
    const liveRes = await fetch(`${baseUrl}/api/prison-youtube`, { cache: 'no-store', headers: { 'x-youtube-cache-bypass': '1' } });
    const live = await liveRes.json();

    if (isUsablePayload(live) && isServerCacheEnabled()) {
      await setJsonCache(CACHE_KEY, { ...live, cachedAt: new Date().toISOString() }, TTL_SECONDS);
    }

    return res.status(200).json({ ...live, cached: false, cacheSource: 'live-fallback' });
  } catch (error) {
    return res.status(200).json({ videos: [], shorts: [], missingKey: false, error: 'prison youtube cached endpoint failed' });
  }
}

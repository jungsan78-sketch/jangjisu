import { getCloudflareContext } from '@opennextjs/cloudflare';
import { fetchMainYoutubePayload, isMainYoutubeUsable } from '../../lib/youtube-data';

const CACHE_KEY = 'youtube:main:v1';
const TTL_SECONDS = 60 * 60;
const RUNTIME_MARKER = 'test2-youtube-kv-cache-20260427-2';

async function getCacheBinding() {
  try {
    const context = await getCloudflareContext({ async: true });
    if (context?.env?.JANGJISU_CACHE) return context.env.JANGJISU_CACHE;
  } catch {}
  try {
    return getCloudflareContext()?.env?.JANGJISU_CACHE || null;
  } catch {
    return null;
  }
}

function isKvNamespace(cache) {
  return cache && typeof cache.get === 'function' && typeof cache.put === 'function';
}

async function readCachedPayload(cache) {
  if (!isKvNamespace(cache)) return null;
  try {
    const value = await cache.get(CACHE_KEY, 'json');
    return value && typeof value === 'object' ? value : null;
  } catch {}
  try {
    const raw = await cache.get(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeCachedPayload(cache, payload) {
  if (!isKvNamespace(cache) || !isMainYoutubeUsable(payload)) return false;
  try {
    await cache.put(CACHE_KEY, JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }), { expirationTtl: TTL_SECONDS });
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const debug = String(req.query?.debug || '') === '1';
  res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=1800, stale-while-revalidate=3600');

  const cache = await getCacheBinding();
  const cacheAvailable = isKvNamespace(cache);
  const cached = await readCachedPayload(cache);

  if (cached && !debug) {
    return res.status(200).json({ ...cached, cached: true, cacheSource: 'cloudflare-kv' });
  }

  try {
    const live = await fetchMainYoutubePayload({ debug });
    const writeOk = await writeCachedPayload(cache, live);

    if (isMainYoutubeUsable(live)) {
      return res.status(200).json({
        ...live,
        cached: false,
        cacheSource: 'direct-lib-fallback',
        debug: debug ? {
          ...(live.debug || {}),
          runtimeMarker: RUNTIME_MARKER,
          cache: { bindingFound: cacheAvailable, hit: Boolean(cached), writeAttempted: cacheAvailable, writeOk },
        } : live.debug,
      });
    }

    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
        cacheSource: 'cloudflare-kv-after-live-empty',
        warning: live?.error || 'live youtube payload empty',
        debug: debug ? { runtimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: true, writeAttempted: cacheAvailable, writeOk } } : cached.debug,
      });
    }

    return res.status(200).json({
      ok: false,
      videos: [],
      shorts: [],
      full: [],
      error: live?.error || 'youtube live endpoint returned empty payload',
      debug: debug ? { runtimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: false, writeAttempted: cacheAvailable, writeOk } } : undefined,
    });
  } catch (error) {
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
        cacheSource: 'cloudflare-kv-after-live-error',
        warning: error?.message || 'youtube live fallback failed',
        debug: debug ? { runtimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: true, fallbackAfterError: true } } : cached.debug,
      });
    }

    return res.status(200).json({
      ok: false,
      videos: [],
      shorts: [],
      full: [],
      error: error?.message || 'youtube cached endpoint failed',
      debug: debug ? { runtimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: false } } : undefined,
    });
  }
}

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildShortsHallOfFame, fetchMainYoutubePayload, fetchPrisonYoutubePayload, isMainYoutubeUsable, isPrisonYoutubeUsable } from '../../lib/youtube-data';

const SHORTS_HALL_KEY = 'youtube:shorts-hall:v1';
const TTL_SECONDS = 60 * 60 * 6;
const RUNTIME_MARKER = 'test2-shorts-hall-api-20260428-2';

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
    const value = await cache.get(SHORTS_HALL_KEY, 'json');
    return value && typeof value === 'object' ? value : null;
  } catch {}
  try {
    const raw = await cache.get(SHORTS_HALL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeCachedPayload(cache, payload) {
  if (!isKvNamespace(cache) || !payload?.ok) return false;
  try {
    await cache.put(SHORTS_HALL_KEY, JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }), { expirationTtl: TTL_SECONDS });
    return true;
  } catch {
    return false;
  }
}

function emptyPayload(debugPayload) {
  return {
    ok: false,
    windowDays: 30,
    refreshLabel: '6시간마다 갱신',
    slots: { memberTop1: null, jangjisu: null, memberTop2: null },
    ...(debugPayload ? { debug: debugPayload } : {}),
  };
}

export default async function handler(req, res) {
  const debug = String(req.query?.debug || '') === '1';
  const refresh = String(req.query?.refresh || '') === '1';
  res.setHeader('Cache-Control', debug || refresh ? 'no-store' : 'public, s-maxage=21600, stale-while-revalidate=21600');

  const cache = await getCacheBinding();
  const cacheAvailable = isKvNamespace(cache);
  const cached = await readCachedPayload(cache);

  if (cached && !refresh) {
    return res.status(200).json({
      ...cached,
      cached: true,
      cacheSource: 'cloudflare-kv',
      debug: debug ? {
        ...(cached.debug || {}),
        runtimeMarker: RUNTIME_MARKER,
        mode: 'cache_only_debug_no_youtube_api_call',
        cache: {
          bindingFound: cacheAvailable,
          hit: true,
          cachedFetchedAt: cached.fetchedAt || '',
          cachedAt: cached.cachedAt || '',
        },
      } : cached.debug,
    });
  }

  if (debug && !refresh) {
    return res.status(200).json(emptyPayload({
      runtimeMarker: RUNTIME_MARKER,
      mode: 'cache_only_debug_no_youtube_api_call',
      cache: { bindingFound: cacheAvailable, hit: false },
      note: 'Use refresh=1 only when you intentionally want to call YouTube API.',
    }));
  }

  try {
    const [main, prison] = await Promise.all([
      fetchMainYoutubePayload({ debug: false }),
      fetchPrisonYoutubePayload({ debug: false }),
    ]);

    const payload = buildShortsHallOfFame(main, prison);
    const writeOk = await writeCachedPayload(cache, payload);

    if (payload.ok) {
      return res.status(200).json({
        ...payload,
        cached: false,
        cacheSource: 'live-youtube-api',
        debug: debug || refresh ? {
          runtimeMarker: RUNTIME_MARKER,
          mode: 'refresh_live_youtube_api_call',
          cache: { bindingFound: cacheAvailable, hit: Boolean(cached), writeAttempted: cacheAvailable, writeOk },
          sourceCounts: {
            mainShorts: main?.shorts?.length || 0,
            prisonShorts: prison?.shorts?.length || 0,
            mainUsable: isMainYoutubeUsable(main),
            prisonUsable: isPrisonYoutubeUsable(prison),
          },
        } : undefined,
      });
    }

    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
        cacheSource: 'cloudflare-kv-after-live-empty',
        warning: 'live shorts hall payload empty',
        debug: debug || refresh ? { runtimeMarker: RUNTIME_MARKER, mode: 'stale_cache_after_refresh_empty', cache: { bindingFound: cacheAvailable, hit: true, writeAttempted: cacheAvailable, writeOk } } : cached.debug,
      });
    }

    return res.status(200).json(emptyPayload(debug || refresh ? { runtimeMarker: RUNTIME_MARKER, mode: 'refresh_live_empty', cache: { bindingFound: cacheAvailable, hit: false, writeAttempted: cacheAvailable, writeOk } } : undefined));
  } catch (error) {
    if (cached) {
      return res.status(200).json({
        ...cached,
        cached: true,
        cacheSource: 'cloudflare-kv-after-live-error',
        warning: error?.message || 'shorts hall live fallback failed',
        debug: debug || refresh ? { runtimeMarker: RUNTIME_MARKER, mode: 'stale_cache_after_refresh_error', cache: { bindingFound: cacheAvailable, hit: true, fallbackAfterError: true } } : cached.debug,
      });
    }

    return res.status(200).json({
      ...emptyPayload(debug || refresh ? { runtimeMarker: RUNTIME_MARKER, mode: 'refresh_live_error', cache: { bindingFound: cacheAvailable, hit: false } } : undefined),
      error: error?.message || 'shorts hall endpoint failed',
    });
  }
}

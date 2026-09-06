import { getCloudflareContext } from '@opennextjs/cloudflare';
import { fetchPrisonYoutubePayload, isPrisonYoutubeUsable } from '../../lib/youtube-data';

const CACHE_KEY = 'youtube:prison:v4';
const TTL_SECONDS = 60 * 60 * 6;
const RUNTIME_MARKER = 'test2-prison-youtube-kv-cache-20260906-6';

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

function getLatestUploadByMember(items = []) {
  const seen = new Set();
  return [...items]
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .filter((item) => {
      if (!item?.member || seen.has(item.member)) return false;
      seen.add(item.member);
      return true;
    });
}

function getResponsePayload(payload, latestOnly) {
  if (!latestOnly) return payload;
  return {
    ...payload,
    videos: getLatestUploadByMember(payload?.videos),
    shorts: getLatestUploadByMember(payload?.shorts),
    latestPerMember: true,
  };
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
  if (!isKvNamespace(cache) || !isPrisonYoutubeUsable(payload)) return false;
  try {
    await cache.put(CACHE_KEY, JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }), { expirationTtl: TTL_SECONDS });
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const debug = String(req.query?.debug || '') === '1';
  const latestOnly = !debug && String(req.query?.view || '') === 'latest';
  res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=21600, stale-while-revalidate=21600');

  const cache = await getCacheBinding();
  const cacheAvailable = isKvNamespace(cache);
  const cached = await readCachedPayload(cache);

  if (cached && !debug) {
    return res.status(200).json({ ...getResponsePayload(cached, latestOnly), cached: true, cacheSource: 'cloudflare-kv' });
  }

  try {
    const live = await fetchPrisonYoutubePayload({ debug });
    const writeOk = await writeCachedPayload(cache, live);

    if (isPrisonYoutubeUsable(live)) {
      return res.status(200).json({
        ...getResponsePayload(live, latestOnly),
        cached: false,
        cacheSource: 'direct-lib-fallback',
        refreshLabel: '6시간마다 갱신',
        debug: debug ? {
          ...(live.debug || {}),
          runtimeMarker: RUNTIME_MARKER,
          cache: { bindingFound: cacheAvailable, hit: Boolean(cached), writeAttempted: cacheAvailable, writeOk },
        } : undefined,
      });
    }

    if (cached) {
      return res.status(200).json({
        ...getResponsePayload(cached, latestOnly),
        cached: true,
        cacheSource: 'cloudflare-kv-after-live-empty',
        warning: live?.error || (live?.sourceComplete === false ? 'live prison youtube source incomplete' : 'live prison youtube payload empty'),
        debug: debug ? {
          ...(live.debug || {}),
          runtimeMarker: RUNTIME_MARKER,
          source: {
            complete: live?.sourceComplete,
            channelCount: live?.sourceChannelCount || 0,
            successCount: live?.sourceSuccessCount || 0,
          },
          cache: { bindingFound: cacheAvailable, hit: true, writeAttempted: cacheAvailable, writeOk },
        } : cached.debug,
      });
    }

    return res.status(200).json({
      videos: [],
      shorts: [],
      missingKey: Boolean(live?.missingKey),
      error: live?.error || 'prison youtube live endpoint returned empty payload',
      debug: debug ? { runtimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: false, writeAttempted: cacheAvailable, writeOk } } : undefined,
    });
  } catch (error) {
    if (cached) {
      return res.status(200).json({
        ...getResponsePayload(cached, latestOnly),
        cached: true,
        cacheSource: 'cloudflare-kv-after-live-error',
        warning: error?.message || 'prison youtube live fallback failed',
        debug: debug ? { runtimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: true, fallbackAfterError: true } } : cached.debug,
      });
    }

    return res.status(200).json({
      videos: [],
      shorts: [],
      missingKey: false,
      error: error?.message || 'prison youtube cached endpoint failed',
      debug: debug ? { runtimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: false } } : undefined,
    });
  }
}


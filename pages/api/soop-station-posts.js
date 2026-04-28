import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { extractStationId } from '../../lib/soop/liveStatus';
import { fetchStationPostsPayload } from '../../lib/soop/stationPosts';

const CACHE_KEY = 'soop:station-posts:payload:v2';
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const RUNTIME_MARKER = 'test2-soop-posts-page-20260428-1';
const TARGET_STATION_IDS = new Set(['ayanesena', 'bxroong', 'isq1158', 'mini1212', 'ddikku0714']);

function getKnownStationIds() {
  return ALL_PRISON_MEMBERS.map((member) => extractStationId(member.station)).filter(Boolean);
}

function getCacheBinding() {
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
    const payload = await cache.get(CACHE_KEY, 'json');
    return payload && typeof payload === 'object' ? payload : null;
  } catch {}
  try {
    const raw = await cache.get(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function stripCacheMarkers(payload) {
  const posts = {};
  Object.entries(payload?.posts || {}).forEach(([stationId, post]) => {
    const { cacheFallback, ...rest } = post || {};
    posts[stationId] = rest;
  });
  return {
    posts,
    fetchedAt: payload?.fetchedAt || new Date().toISOString(),
    source: payload?.source || 'soop_station_posts',
  };
}

async function writeCachedPayload(cache, payload) {
  if (!isKvNamespace(cache) || !payload?.posts || Object.keys(payload.posts).length === 0) return false;
  try {
    await cache.put(CACHE_KEY, JSON.stringify(stripCacheMarkers(payload)), { expirationTtl: CACHE_TTL_SECONDS });
    return true;
  } catch {
    return false;
  }
}

function mergeWithCachedPosts(payload, cachedPayload) {
  const currentPosts = payload?.posts || {};
  const cachedPosts = cachedPayload?.posts || {};
  const mergedPosts = { ...currentPosts };
  const filledFromCache = [];

  getKnownStationIds().forEach((stationId) => {
    if (mergedPosts[stationId] || !cachedPosts[stationId]) return;
    mergedPosts[stationId] = {
      ...cachedPosts[stationId],
      cacheFallback: true,
      source: `${cachedPosts[stationId].source || 'unknown'}_kv_fallback`,
    };
    filledFromCache.push(stationId);
  });

  const missing = getKnownStationIds().filter((stationId) => !mergedPosts[stationId]);
  return {
    ...payload,
    posts: mergedPosts,
    source: filledFromCache.length ? 'soop_board_api_with_kv_fallback' : payload.source,
    debug: {
      ...(payload.debug || {}),
      runtimeMarker: RUNTIME_MARKER,
      pageRuntimeMarker: RUNTIME_MARKER,
      targetPostStatus: Object.fromEntries([...TARGET_STATION_IDS].map((stationId) => [stationId, {
        hasLivePost: Boolean(currentPosts[stationId]),
        hasCachedPost: Boolean(cachedPosts[stationId]),
        hasMergedPost: Boolean(mergedPosts[stationId]),
        liveSource: currentPosts[stationId]?.source || '',
        cachedSource: cachedPosts[stationId]?.source || '',
        mergedSource: mergedPosts[stationId]?.source || '',
      }])),
      matchedCount: Object.keys(mergedPosts).length,
      liveMatchedCount: Object.keys(currentPosts).length,
      missingCount: missing.length,
      missing,
      filledFromCache,
      cache: {
        enabled: Boolean(cachedPayload),
        bindingFound: true,
        hit: Boolean(cachedPayload?.posts),
        cachedFetchedAt: cachedPayload?.fetchedAt || '',
      },
    },
  };
}

function attachRuntimeMarker(payload) {
  return {
    ...payload,
    debug: {
      ...(payload.debug || {}),
      runtimeMarker: RUNTIME_MARKER,
      pageRuntimeMarker: RUNTIME_MARKER,
    },
  };
}

export default async function handler(req, res) {
  const debug = String(req.query?.debug || '') === '1';
  const cache = getCacheBinding();
  const cacheAvailable = isKvNamespace(cache);
  const cachedPayload = await readCachedPayload(cache);

  try {
    const livePayload = await fetchStationPostsPayload({ debug });
    const payload = attachRuntimeMarker(cacheAvailable ? mergeWithCachedPosts(livePayload, cachedPayload) : livePayload);
    const writeOk = await writeCachedPayload(cache, payload);

    if (payload.debug) {
      payload.debug.cache = {
        ...(payload.debug.cache || {}),
        bindingFound: cacheAvailable,
        hit: Boolean(cachedPayload?.posts),
        cachedFetchedAt: cachedPayload?.fetchedAt || '',
        writeAttempted: cacheAvailable && Object.keys(payload.posts || {}).length > 0,
        writeOk,
      };
    }

    res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(payload);
  } catch (error) {
    if (cachedPayload?.posts) {
      res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=1800');
      res.status(200).json({
        ...cachedPayload,
        source: 'kv_fallback_after_station_posts_error',
        servedAt: new Date().toISOString(),
        warning: error?.message || 'SOOP station posts unavailable; served cached payload',
        debug: {
          ...(cachedPayload.debug || {}),
          runtimeMarker: RUNTIME_MARKER,
          pageRuntimeMarker: RUNTIME_MARKER,
          cache: {
            bindingFound: cacheAvailable,
            hit: true,
            cachedFetchedAt: cachedPayload.fetchedAt || '',
            fallbackAfterError: true,
          },
          ...(debug ? { error: error?.stack || error?.message || String(error) } : {}),
        },
      });
      return;
    }

    res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=1800');
    res.status(200).json({
      posts: {},
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: error?.message || 'SOOP station posts unavailable',
      ...(debug ? { debug: { runtimeMarker: RUNTIME_MARKER, pageRuntimeMarker: RUNTIME_MARKER, cache: { bindingFound: cacheAvailable, hit: false }, error: error?.stack || error?.message || String(error) } } : {}),
    });
  }
}

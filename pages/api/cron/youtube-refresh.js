import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildShortsHallOfFame, fetchMainYoutubePayload, fetchPrisonYoutubePayload, getRuntimeEnvValue, isMainYoutubeUsable, isPrisonYoutubeUsable } from '../../../lib/youtube-data';

const MAIN_KEY = 'youtube:main:v1';
const PRISON_KEY = 'youtube:prison:v1';
const SHORTS_HALL_KEY = 'youtube:shorts-hall:v1';
const MAIN_TTL_SECONDS = 60 * 60 * 6;
const PRISON_TTL_SECONDS = 60 * 60 * 6;
const SHORTS_HALL_TTL_SECONDS = 60 * 60 * 6;
const RUNTIME_MARKER = 'test2-youtube-cron-kv-20260428-1';

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

async function setJsonCache(cache, key, value, ttlSeconds) {
  if (!isKvNamespace(cache) || !value) return false;
  try {
    await cache.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

async function isAuthorized(req) {
  const secret = await getRuntimeEnvValue('CRON_SECRET');
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

export default async function handler(req, res) {
  if (!(await isAuthorized(req))) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const cache = await getCacheBinding();
  const cacheAvailable = isKvNamespace(cache);
  const result = {
    ok: true,
    runtimeMarker: RUNTIME_MARKER,
    refreshedAt: new Date().toISOString(),
    refreshLabel: '6시간마다 갱신',
    cache: { bindingFound: cacheAvailable },
    main: { ok: false },
    prison: { ok: false },
    shortsHall: { ok: false },
  };

  if (!cacheAvailable) {
    result.ok = false;
    result.error = 'cloudflare kv binding is not configured';
    return res.status(200).json(result);
  }

  let mainPayload = null;
  let prisonPayload = null;

  try {
    const main = await fetchMainYoutubePayload({ debug: false });
    mainPayload = main;
    result.main.videos = main.videos?.length || 0;
    result.main.shorts = main.shorts?.length || 0;
    result.main.full = main.full?.length || 0;
    result.main.error = main.error || '';
    if (isMainYoutubeUsable(main)) {
      result.main.ok = await setJsonCache(cache, MAIN_KEY, { ...main, cachedAt: result.refreshedAt }, MAIN_TTL_SECONDS);
    } else {
      result.main.skipped = 'empty-or-unavailable';
    }
  } catch (error) {
    result.main.error = error?.message || true;
  }

  try {
    const prison = await fetchPrisonYoutubePayload({ debug: false });
    prisonPayload = prison;
    result.prison.videos = prison.videos?.length || 0;
    result.prison.shorts = prison.shorts?.length || 0;
    result.prison.error = prison.error || '';
    if (isPrisonYoutubeUsable(prison)) {
      result.prison.ok = await setJsonCache(cache, PRISON_KEY, { ...prison, cachedAt: result.refreshedAt }, PRISON_TTL_SECONDS);
    } else {
      result.prison.skipped = 'empty-or-unavailable';
    }
  } catch (error) {
    result.prison.error = error?.message || true;
  }

  try {
    const hall = buildShortsHallOfFame(mainPayload || {}, prisonPayload || {});
    result.shortsHall.slots = Object.values(hall.slots || {}).filter(Boolean).length;
    if (hall.ok) {
      result.shortsHall.ok = await setJsonCache(cache, SHORTS_HALL_KEY, { ...hall, cachedAt: result.refreshedAt }, SHORTS_HALL_TTL_SECONDS);
    } else {
      result.shortsHall.skipped = 'empty-or-unavailable';
    }
  } catch (error) {
    result.shortsHall.error = error?.message || true;
  }

  result.ok = Boolean(result.main.ok || result.prison.ok || result.shortsHall.ok);
  return res.status(200).json(result);
}

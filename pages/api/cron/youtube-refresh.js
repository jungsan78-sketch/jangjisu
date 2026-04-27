import { getCloudflareContext } from '@opennextjs/cloudflare';
import { fetchMainYoutubePayload, fetchPrisonYoutubePayload, getRuntimeEnvValue, isMainYoutubeUsable, isPrisonYoutubeUsable } from '../../../lib/youtube-data';

const MAIN_KEY = 'youtube:main:v1';
const PRISON_KEY = 'youtube:prison:v1';
const MAIN_TTL_SECONDS = 60 * 60;
const PRISON_TTL_SECONDS = 60 * 60 * 2;
const RUNTIME_MARKER = 'test2-youtube-cron-kv-20260427-2';

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
    cache: { bindingFound: cacheAvailable },
    main: { ok: false },
    prison: { ok: false },
  };

  if (!cacheAvailable) {
    result.ok = false;
    result.error = 'cloudflare kv binding is not configured';
    return res.status(200).json(result);
  }

  try {
    const main = await fetchMainYoutubePayload({ debug: false });
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

  result.ok = Boolean(result.main.ok || result.prison.ok);
  return res.status(200).json(result);
}

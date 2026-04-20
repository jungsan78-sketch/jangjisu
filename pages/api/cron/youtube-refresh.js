import { getBaseUrl, isServerCacheEnabled, setJsonCache } from '../../../lib/server-cache';

const MAIN_KEY = 'youtube:main:v1';
const PRISON_KEY = 'youtube:prison:v1';

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

function isMainUsable(payload) {
  return payload && payload.ok !== false && (Array.isArray(payload.videos) || Array.isArray(payload.shorts) || Array.isArray(payload.full));
}

function isPrisonUsable(payload) {
  return payload && !payload.missingKey && (Array.isArray(payload.videos) || Array.isArray(payload.shorts));
}

async function readJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  return res.json();
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  if (!isServerCacheEnabled()) {
    return res.status(200).json({ ok: false, error: 'server cache env is not configured' });
  }

  const baseUrl = getBaseUrl(req);
  const result = {
    ok: true,
    refreshedAt: new Date().toISOString(),
    main: { ok: false },
    prison: { ok: false },
  };

  try {
    const main = await readJson(`${baseUrl}/api/youtube`);
    if (isMainUsable(main)) {
      result.main.ok = await setJsonCache(MAIN_KEY, { ...main, cachedAt: result.refreshedAt }, 60 * 60);
      result.main.videos = main.videos?.length || 0;
      result.main.shorts = main.shorts?.length || 0;
      result.main.full = main.full?.length || 0;
    }
  } catch (error) {
    result.main.error = true;
  }

  try {
    const prison = await readJson(`${baseUrl}/api/prison-youtube`);
    if (isPrisonUsable(prison)) {
      result.prison.ok = await setJsonCache(PRISON_KEY, { ...prison, cachedAt: result.refreshedAt }, 60 * 60 * 2);
      result.prison.videos = prison.videos?.length || 0;
      result.prison.shorts = prison.shorts?.length || 0;
    }
  } catch (error) {
    result.prison.error = true;
  }

  return res.status(200).json(result);
}

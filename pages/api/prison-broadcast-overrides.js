import { getCachedJson, setCachedJson, isRedisConfigured } from '../../lib/upstashRedis';

const ADMIN_PASSWORD = '032359';
const OVERRIDE_KEY = 'prison:broadcast-overrides:v1';
const OVERRIDE_TTL_SECONDS = 60 * 60 * 24 * 3650;

function normalizeOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([id, override]) => id && override && typeof override === 'object')
    .map(([id, override]) => [String(id), {
      title: String(override.title || '').trim(),
      updatedAt: override.updatedAt || null,
    }])
    .filter(([, override]) => override.title));
}

async function readOverrides() {
  return normalizeOverrides(await getCachedJson(OVERRIDE_KEY));
}

function getPassword(req) {
  return String(req.headers['x-admin-password'] || req.body?.password || '').trim();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    const overrides = await readOverrides();
    return res.status(200).json({ ok: true, overrides });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, message: '지원하지 않는 요청입니다.' });
  }

  if (getPassword(req) !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: '비밀번호가 맞지 않습니다.' });
  }

  if (!isRedisConfigured()) {
    return res.status(500).json({ ok: false, message: '저장소 설정이 필요합니다.' });
  }

  const id = String(req.body?.id || '').trim();
  const title = String(req.body?.title || '').trim();
  if (!id) return res.status(400).json({ ok: false, message: '다시보기 ID가 없습니다.' });

  const overrides = await readOverrides();
  if (title) {
    overrides[id] = { title, updatedAt: new Date().toISOString() };
  } else {
    delete overrides[id];
  }

  await setCachedJson(OVERRIDE_KEY, overrides, OVERRIDE_TTL_SECONDS);
  return res.status(200).json({ ok: true, overrides });
}

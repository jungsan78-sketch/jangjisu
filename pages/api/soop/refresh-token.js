import { requestSoopToken } from '../../../lib/soop/openapi';

function normalizeTokenPayload(data = {}) {
  const expiresIn = Number(data.expires_in || data.expiresIn || 0);
  const createdAt = Date.now();
  return {
    accessToken: data.access_token || data.accessToken || '',
    refreshToken: data.refresh_token || data.refreshToken || '',
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 0,
    expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? createdAt + expiresIn * 1000 : 0,
    createdAt,
    raw: data,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const refreshToken = String(req.body?.refreshToken || req.body?.refresh_token || '').trim();
  if (!refreshToken) {
    return res.status(400).json({ ok: false, error: 'refreshToken is required' });
  }

  try {
    const data = await requestSoopToken({ refreshToken });
    const token = normalizeTokenPayload(data);
    if (!token.accessToken) {
      return res.status(502).json({ ok: false, error: 'SOOP refresh response has no access token' });
    }
    return res.status(200).json({ ok: true, token });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'SOOP token refresh failed' });
  }
}

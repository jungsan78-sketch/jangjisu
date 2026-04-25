import { requestSoopToken } from '../../../lib/soop/openapi';

export default async function handler(req, res) {
  const code = String(req.query.code || req.query.authCode || '').trim();

  if (!code) {
    res.redirect('/utility/soop-funding-memo?soopAuth=missing_code');
    return;
  }

  try {
    const tokens = await requestSoopToken({ code });
    const tokenPayload = Buffer.from(JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresIn: tokens.expires_in || 0,
      issuedAt: Date.now(),
    })).toString('base64url');

    res.redirect(`/utility/soop-funding-memo?soopAuth=success&token=${encodeURIComponent(tokenPayload)}`);
  } catch (error) {
    res.redirect(`/utility/soop-funding-memo?soopAuth=failed&message=${encodeURIComponent(error?.message || 'SOOP 인증 실패')}`);
  }
}

import { getSoopAuthConfig, refreshSoopAccessToken } from '../../../lib/soop/auth';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(title, body, status = 200) {
  return { status, html: `
    <html>
      <head><title>${escapeHtml(title)}</title></head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#05070c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
        <div style="max-width:760px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
          <div style="font-size:14px;font-weight:700;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">SOOP DEBUG</div>
          ${body}
        </div>
      </body>
    </html>
  ` };
}

export default async function handler(req, res) {
  try {
    const config = getSoopAuthConfig();
    const refreshed = await refreshSoopAccessToken();

    const page = render('SOOP 토큰 확인 성공', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">토큰 갱신 확인 완료</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">현재 env와 refresh 흐름이 동작하는지 확인한 단계입니다.</p>
      <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;white-space:pre-wrap;word-break:break-word;color:#b8d8ff;">SOOP_CLIENT_ID: ${escapeHtml(config.clientId.slice(0, 8))}...
SOOP_REDIRECT_URI: ${escapeHtml(config.redirectUri)}
refresh access token length: ${escapeHtml(String((refreshed.accessToken || '').length))}
refresh token changed: ${escapeHtml(String(Boolean(refreshed.refreshToken && refreshed.refreshToken !== config.refreshToken)))}
token endpoint: ${escapeHtml(config.tokenUrl)}</div>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">이 페이지는 실제 라이브/공지 조회 엔드포인트 연결 전, 인증 토대가 살아있는지 확인하는 용도입니다.</p>
    `, 200);

    return res.status(page.status).send(page.html);
  } catch (error) {
    const page = render('SOOP 토큰 확인 실패', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">토큰 확인 실패</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">현재 env 또는 refresh 요청 중 문제가 발생했습니다.</p>
      <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#ffd7d4;white-space:pre-wrap;word-break:break-word;">${escapeHtml(error.message)}</div>
    `, 500);

    return res.status(page.status).send(page.html);
  }
}

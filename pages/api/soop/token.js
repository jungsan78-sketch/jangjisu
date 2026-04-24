function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPage(title, body, status = 200) {
  return { status, html: `
    <html>
      <head><title>${escapeHtml(title)}</title></head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#05070c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
        <div style="max-width:760px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
          <div style="font-size:14px;font-weight:700;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">SOOP AUTH</div>
          ${body}
        </div>
      </body>
    </html>
  ` };
}

function readCode(req) {
  if (req.method === 'POST') {
    return req.body?.code || '';
  }
  return req.query?.code || '';
}

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  const clientId = process.env.SOOP_CLIENT_ID;
  const clientSecret = process.env.SOOP_CLIENT_SECRET;
  const redirectUri = process.env.SOOP_REDIRECT_URI;
  const tokenUrl = process.env.SOOP_TOKEN_URL || 'https://openapi.sooplive.com/auth/token';
  const code = String(readCode(req) || '').trim();

  if (!clientId || !clientSecret || !redirectUri) {
    const page = renderPage('SOOP 환경변수 누락', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">환경변수가 누락되었습니다</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">SOOP_CLIENT_ID, SOOP_CLIENT_SECRET, SOOP_REDIRECT_URI를 다시 확인해주세요.</p>
    `, 500);
    return res.status(page.status).send(page.html);
  }

  if (!code) {
    const page = renderPage('SOOP code 없음', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">인증 코드가 없습니다</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">callback에서 전달받은 code가 비어 있습니다.</p>
    `, 400);
    return res.status(page.status).send(page.html);
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code',
    });

    const upstream = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, */*',
      },
      body: body.toString(),
      cache: 'no-store',
    });

    const text = await upstream.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (!upstream.ok) {
      const page = renderPage('SOOP 토큰 교환 실패', `
        <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">토큰 교환 실패</h1>
        <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">SOOP 토큰 엔드포인트 응답이 실패했습니다.</p>
        <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#ffd7d4;overflow:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(text || `HTTP ${upstream.status}`)}</div>
        <p style="margin:16px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">필요하면 SOOP_TOKEN_URL 환경변수로 실제 토큰 경로를 덮어쓸 수 있습니다. 현재 사용 주소: ${escapeHtml(tokenUrl)}</p>
      `, 500);
      return res.status(page.status).send(page.html);
    }

    const accessToken = parsed?.access_token || parsed?.accessToken || '';
    const refreshToken = parsed?.refresh_token || parsed?.refreshToken || '';

    const page = renderPage('SOOP 토큰 교환 성공', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">토큰 교환 성공</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">아래 값을 Vercel 환경변수에 저장하면 다음 단계로 넘어갈 수 있습니다.</p>
      <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;overflow:auto;white-space:pre-wrap;word-break:break-word;">
        <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-bottom:8px;">SOOP_ACCESS_TOKEN</div>
        <div style="color:#b8d8ff;">${escapeHtml(accessToken || '(응답에 access token 없음)')}</div>
      </div>
      <div style="margin-top:16px;padding:16px;border-radius:16px;background:#0b1020;overflow:auto;white-space:pre-wrap;word-break:break-word;">
        <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-bottom:8px;">SOOP_REFRESH_TOKEN</div>
        <div style="color:#b8d8ff;">${escapeHtml(refreshToken || '(응답에 refresh token 없음)')}</div>
      </div>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">이 값들은 채팅에 붙여넣지 말고 Vercel 환경변수에만 넣으세요.</p>
    `, 200);
    return res.status(page.status).send(page.html);
  } catch (error) {
    const page = renderPage('SOOP 토큰 교환 오류', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">토큰 요청 중 오류</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">SOOP 토큰 요청 처리 중 예외가 발생했습니다.</p>
      <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#ffd7d4;overflow:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(error.message)}</div>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">현재 사용 주소: ${escapeHtml(tokenUrl)}</p>
    `, 500);
    return res.status(page.status).send(page.html);
  }
}

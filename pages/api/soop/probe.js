import { soopApiGet } from '../../../lib/soop/client';

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
      <head>
        <meta charSet="utf-8" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#05070c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
        <div style="max-width:960px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
          <div style="font-size:14px;font-weight:700;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">SOOP PROBE</div>
          ${body}
        </div>
      </body>
    </html>
  ` };
}

function resolveUrl(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `https://openapi.sooplive.com${value}`;
  return `https://openapi.sooplive.com/${value}`;
}

export default async function handler(req, res) {
  const raw = req.query.url || req.query.path || '';
  const url = resolveUrl(raw);

  if (!url) {
    const page = render('SOOP probe 사용법', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">조회할 엔드포인트를 넣어주세요</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">문서에 있는 SOOP 조회 경로를 그대로 붙여서 토큰 인증 테스트를 할 수 있습니다.</p>
      <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#b8d8ff;white-space:pre-wrap;word-break:break-word;">예시 1: /api/soop/probe?path=/some/endpoint
예시 2: /api/soop/probe?url=https://openapi.sooplive.com/some/endpoint</div>
    `, 400);
    return res.status(page.status).send(page.html);
  }

  try {
    const result = await soopApiGet(url);
    const page = render('SOOP probe 성공', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">인증된 조회 성공</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">이제 문서에 있는 라이브/게시글 엔드포인트를 바로 검증할 수 있습니다.</p>
      <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#d5e8ff;white-space:pre-wrap;word-break:break-word;">url: ${escapeHtml(url)}
token source: ${escapeHtml(result.tokenSource || '')}</div>
      <pre style="margin-top:16px;padding:16px;border-radius:16px;background:#08101f;color:#b8d8ff;overflow:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(JSON.stringify(result.data, null, 2))}</pre>
    `, 200);
    return res.status(page.status).send(page.html);
  } catch (error) {
    const page = render('SOOP probe 실패', `
      <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">조회 실패</h1>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">입력한 엔드포인트가 잘못되었거나 권한 범위가 맞지 않을 수 있습니다.</p>
      <div style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#d5e8ff;white-space:pre-wrap;word-break:break-word;">url: ${escapeHtml(url)}</div>
      <pre style="margin-top:16px;padding:16px;border-radius:16px;background:#08101f;color:#ffd7d4;overflow:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(error.message)}</pre>
    `, 500);
    return res.status(page.status).send(page.html);
  }
}

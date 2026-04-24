function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <html>
        <head><title>SOOP 인증 실패</title></head>
        <body style="margin:0;font-family:Arial,sans-serif;background:#05070c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
          <div style="max-width:720px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
            <div style="font-size:14px;font-weight:700;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">SOOP AUTH</div>
            <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">인증 실패</h1>
            <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">SOOP에서 오류가 돌아왔습니다.</p>
            <pre style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#ffd7d4;overflow:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(error)}</pre>
          </div>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html>
        <head><title>SOOP code 없음</title></head>
        <body style="margin:0;font-family:Arial,sans-serif;background:#05070c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
          <div style="max-width:720px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
            <div style="font-size:14px;font-weight:700;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">SOOP AUTH</div>
            <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">인증 코드가 없습니다</h1>
            <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">Redirect URI로 code가 전달되지 않았습니다.</p>
          </div>
        </body>
      </html>
    `);
  }

  return res.status(200).send(`
    <html>
      <head><title>SOOP 인증 코드 수신 완료</title></head>
      <body style="margin:0;font-family:Arial,sans-serif;background:#05070c;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;">
        <div style="max-width:720px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.35);">
          <div style="font-size:14px;font-weight:700;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">SOOP AUTH</div>
          <h1 style="margin:12px 0 0;font-size:34px;line-height:1.2;">인증 코드 수신 완료</h1>
          <p style="margin:16px 0 0;color:rgba(255,255,255,0.75);">아래 code를 다음 단계 토큰 교환에 사용하면 됩니다.</p>
          <pre style="margin-top:18px;padding:16px;border-radius:16px;background:#0b1020;color:#b8d8ff;overflow:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(code)}</pre>
          <p style="margin:16px 0 0;color:rgba(255,255,255,0.55);font-size:14px;">Redirect URI는 SOOP 개발자 페이지에서 이 주소로 맞춰두는 것을 권장합니다: https://www.jangjisou.xyz/api/soop/callback</p>
        </div>
      </body>
    </html>
  `);
}

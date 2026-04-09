export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ ok: false, error: 'YOUTUBE_API_KEY is not set' });
  }

  try {
    // 기존 youtube.js 내용은 그대로 두고,
    // 파일 맨 위의 헤더 3줄만 추가하면 됩니다.
    return res.status(200).json({
      ok: true,
      note: '기존 youtube.js 파일 맨 위에 no-cache 헤더만 추가해서 사용하세요.'
    });
  } catch (error) {
    return res.status(200).json({ ok: false, error: error.message });
  }
}

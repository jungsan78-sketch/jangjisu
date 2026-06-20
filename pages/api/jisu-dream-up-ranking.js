export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({ ok: false, error: '서비스가 종료되었습니다.' });
}

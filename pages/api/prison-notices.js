import { getRecentNoticesPayload } from '../../lib/board/noticeCache';

export default async function handler(req, res) {
  const payload = await getRecentNoticesPayload();
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json(payload);
}

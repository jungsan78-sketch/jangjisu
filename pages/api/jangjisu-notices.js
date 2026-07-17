import { getRecentNoticesPayload } from '../../lib/board/noticeCache';

const MAIN_MEMBER_NAME = '장지수';
const MAIN_STATION_ID = 'iamquaddurup';

export default async function handler(req, res) {
  const payload = await getRecentNoticesPayload();
  const notices = (payload.notices || []).filter((item) => item.member === MAIN_MEMBER_NAME || item.stationId === MAIN_STATION_ID);
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({
    ...payload,
    notices,
    source: payload.ok ? 'soop_chapi_board_jangjisu' : payload.source,
  });
}

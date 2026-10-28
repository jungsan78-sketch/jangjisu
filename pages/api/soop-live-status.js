import { getLiveStatusResponsePayload } from '../../lib/soop/liveResponseCache';

export default async function handler(req, res) {
  const debug = String(req.query?.debug || '') === '1';
  res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=600');
  const payload = await getLiveStatusResponsePayload({ debug });
  return res.status(200).json(payload);
}

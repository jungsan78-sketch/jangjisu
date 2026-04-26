import { getLiveStatusResponsePayload } from './live-status';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  const payload = await getLiveStatusResponsePayload();
  return res.status(200).json(payload);
}

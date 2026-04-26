import { getLiveStatusResponsePayload } from './live-status';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  const payload = await getLiveStatusResponsePayload();
  return res.status(200).json(payload);
}

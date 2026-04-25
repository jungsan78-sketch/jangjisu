import { fetchLiveStatusPayload } from '../../lib/soop/liveStatus';

export default async function handler(req, res) {
  try {
    const payload = await fetchLiveStatusPayload();

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({
      ok: true,
      ...payload,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to fetch SOOP live status',
    });
  }
}

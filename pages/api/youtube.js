import { fetchMainYoutubePayload } from '../../lib/youtube-data';

export default async function handler(req, res) {
  const debugMode = String(req.query?.debug || '') === '1';
  res.setHeader('Cache-Control', debugMode ? 'no-store' : 'public, s-maxage=900, stale-while-revalidate=1800');

  try {
    const payload = await fetchMainYoutubePayload({ debug: debugMode });
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(200).json({
      ok: false,
      videos: [],
      shorts: [],
      full: [],
      error: error?.message || 'youtube endpoint failed',
      debug: debugMode ? { runtimeEnvChecked: true } : undefined,
    });
  }
}

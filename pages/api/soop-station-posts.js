import { fetchStationPostsPayload } from '../../lib/soop/stationPosts';

export default async function handler(req, res) {
  const debug = String(req.query?.debug || '') === '1';
  try {
    const payload = await fetchStationPostsPayload({ debug });
    res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(payload);
  } catch (error) {
    res.setHeader('Cache-Control', debug ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=1800');
    res.status(200).json({
      posts: {},
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: error?.message || 'SOOP station posts unavailable',
      ...(debug ? { debug: { error: error?.stack || error?.message || String(error) } } : {}),
    });
  }
}

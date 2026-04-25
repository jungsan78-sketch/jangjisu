import { fetchStationPostsPayload } from '../../lib/soop/stationPosts';

export default async function handler(req, res) {
  try {
    const payload = await fetchStationPostsPayload();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.status(200).json(payload);
  } catch (error) {
    res.status(200).json({
      posts: {},
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: error?.message || 'SOOP station posts unavailable',
    });
  }
}

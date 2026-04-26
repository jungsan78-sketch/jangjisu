import { fetchStationPostsPayload } from '../../lib/soop/stationPosts';

export default async function handler(req, res) {
  try {
    const payload = await fetchStationPostsPayload();
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.status(200).json(payload);
  } catch (error) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    res.status(200).json({
      posts: {},
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: error?.message || 'SOOP station posts unavailable',
    });
  }
}

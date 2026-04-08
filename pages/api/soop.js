const fallback = {
  ok: false,
  channel: {
    id: 'iamquaddurup',
    name: '장지수',
    soopUrl: 'https://www.sooplive.com/station/iamquaddurup',
    vodUrl: 'https://www.sooplive.com/station/iamquaddurup/vod/normal',
    boardUrl: 'https://www.sooplive.com/station/iamquaddurup/board',
    fanCafeUrl: 'https://cafe.naver.com/quaddurupfancafe',
    isLive: null,
    liveTitle: '장지수 방송국',
  },
  vods: [],
  notices: [],
  pinnedPosts: [],
};

export default async function handler(req, res) {
  const collectorUrl = process.env.SOOP_COLLECTOR_URL;

  if (!collectorUrl) {
    return res.status(200).json({
      ...fallback,
      fetchedAt: new Date().toISOString(),
      error: 'SOOP_COLLECTOR_URL is not set',
    });
  }

  try {
    const upstream = await fetch(`${collectorUrl.replace(/\/$/, '')}/jangjisu.json`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!upstream.ok) throw new Error(`collector returned ${upstream.status}`);

    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(200).json({
      ...fallback,
      fetchedAt: new Date().toISOString(),
      error: error.message,
    });
  }
}

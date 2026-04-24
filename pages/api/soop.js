import { fetchLiveStatusPayload } from '../../lib/soop/liveStatus';

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

async function enrichWithLiveStatus(payload) {
  try {
    const live = await fetchLiveStatusPayload();
    const status = live.statuses?.장지수;
    if (!status) return payload;
    return {
      ...payload,
      channel: {
        ...payload.channel,
        isLive: typeof status.isLive === 'boolean' ? status.isLive : payload.channel?.isLive ?? null,
        liveTitle: status.title || payload.channel?.liveTitle || '',
        liveUrl: status.liveUrl || payload.channel?.soopUrl || payload.channel?.liveUrl || '',
      },
      liveSource: live.source,
      liveFetchedAt: live.fetchedAt,
    };
  } catch {
    return payload;
  }
}

export default async function handler(req, res) {
  const collectorUrl = process.env.SOOP_COLLECTOR_URL;

  if (!collectorUrl) {
    const payload = await enrichWithLiveStatus({
      ...fallback,
      fetchedAt: new Date().toISOString(),
      error: 'SOOP_COLLECTOR_URL is not set',
    });
    return res.status(200).json(payload);
  }

  try {
    const upstream = await fetch(`${collectorUrl.replace(/\/$/, '')}/jangjisu.json`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!upstream.ok) throw new Error(`collector returned ${upstream.status}`);

    const data = await upstream.json();
    const payload = await enrichWithLiveStatus(data);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(payload);
  } catch (error) {
    const payload = await enrichWithLiveStatus({
      ...fallback,
      fetchedAt: new Date().toISOString(),
      error: error.message,
    });
    return res.status(200).json(payload);
  }
}

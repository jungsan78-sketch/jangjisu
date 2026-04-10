function formatDuration(isoDuration = '') {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatPublishedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR');
}

function formatViews(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('ko-KR').format(num);
}

function getDurationSeconds(duration = '') {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function uniqueIds(ids) {
  const seen = new Set();
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function uniqueVideos(videos) {
  const seen = new Set();
  return videos.filter((video) => {
    if (!video?.id || seen.has(video.id)) return false;
    seen.add(video.id);
    return true;
  });
}

function excludeIds(videos, blockedIds) {
  const blocked = new Set(blockedIds || []);
  return videos.filter((video) => !blocked.has(video.id));
}

async function getChannelInfo(channelHandle, apiKey) {
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${channelHandle}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const channelJson = await channelRes.json();

  if (!channelRes.ok || !channelJson.items?.length) {
    throw new Error(`Failed to load channel for handle: ${channelHandle}`);
  }

  return {
    title: channelJson.items[0].snippet.title,
  };
}

async function scrapeTabVideoIds(tabUrl) {
  const res = await fetch(tabUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
    },
  });

  const html = await res.text();

  if (!res.ok || !html) {
    throw new Error(`Failed to fetch YouTube tab: ${tabUrl}`);
  }

  const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
  return uniqueIds(matches).slice(0, 24);
}

async function getVideosByIds(ids, apiKey, vertical = false) {
  if (!ids?.length) return [];

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids.join(',')}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const json = await res.json();

  if (!res.ok || !json.items?.length) {
    return [];
  }

  const map = new Map(json.items.map((item) => [item.id, item]));

  return ids
    .map((id) => {
      const details = map.get(id);
      if (!details) return null;

      const duration = details.contentDetails?.duration || '';
      return {
        id,
        title: details.snippet?.title || '',
        thumbnail:
          details.snippet?.thumbnails?.maxres?.url ||
          details.snippet?.thumbnails?.high?.url ||
          details.snippet?.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: details.snippet?.publishedAt || '',
        publishedAtText: formatPublishedAt(details.snippet?.publishedAt || ''),
        views: details.statistics?.viewCount || '0',
        viewsText: formatViews(details.statistics?.viewCount || '0'),
        duration,
        durationText: formatDuration(duration),
        durationSeconds: getDurationSeconds(duration),
        url: vertical
          ? `https://www.youtube.com/shorts/${id}`
          : `https://www.youtube.com/watch?v=${id}`,
      };
    })
    .filter(Boolean);
}

function fillToCount(primary, fallback, count) {
  const result = [...primary];
  for (const item of fallback) {
    if (result.length >= count) break;
    if (!result.some((video) => video.id === item.id)) {
      result.push(item);
    }
  }
  return result.slice(0, count);
}

async function fallbackUploads(channelHandle, apiKey) {
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${channelHandle}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const channelJson = await channelRes.json();
  const uploads = channelJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return [];

  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=24&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const playlistJson = await playlistRes.json();
  return uniqueIds((playlistJson.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean));
}

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ ok: false, error: 'YOUTUBE_API_KEY is not set' });
  }

  try {
    const [mainInfo, fullInfo] = await Promise.all([
      getChannelInfo('jisoujang', apiKey),
      getChannelInfo('jisoujang_full', apiKey),
    ]);

    let shortsIds = [];
    let fullIds = [];
    let uploadsIds = [];

    try {
      [shortsIds, fullIds, uploadsIds] = await Promise.all([
        scrapeTabVideoIds('https://www.youtube.com/@jisoujang/shorts'),
        scrapeTabVideoIds('https://www.youtube.com/@jisoujang_full/videos'),
        fallbackUploads('jisoujang', apiKey),
      ]);
    } catch (e) {
      const [mainFallback, fullFallbackIds] = await Promise.all([
        fallbackUploads('jisoujang', apiKey),
        fallbackUploads('jisoujang_full', apiKey),
      ]);
      shortsIds = mainFallback;
      fullIds = fullFallbackIds;
      uploadsIds = mainFallback;
    }

    const [shortsSource, fullSource, uploadsSource] = await Promise.all([
      getVideosByIds(shortsIds.slice(0, 24), apiKey, true),
      getVideosByIds(fullIds.slice(0, 24), apiKey, false),
      getVideosByIds(uploadsIds.slice(0, 24), apiKey, false),
    ]);

    let shorts = uniqueVideos(shortsSource).map((video) => ({
      ...video,
      url: `https://www.youtube.com/shorts/${video.id}`,
    }));
    let videos = uniqueVideos(excludeIds(uploadsSource, shorts.map((video) => video.id)));
    let full = uniqueVideos(fullSource);

    if (!videos.length || !shorts.length || !full.length) {
      const [mainFallback, fullFallbackIds] = await Promise.all([
        fallbackUploads('jisoujang', apiKey),
        fallbackUploads('jisoujang_full', apiKey),
      ]);

      const [fallbackMain, fallbackFullSource] = await Promise.all([
        getVideosByIds(mainFallback.slice(0, 24), apiKey, false),
        getVideosByIds(fullFallbackIds.slice(0, 24), apiKey, false),
      ]);

      const fallbackShorts = uniqueVideos(fallbackMain)
        .filter((video) => video.durationSeconds > 0 && video.durationSeconds <= 70)
        .map((video) => ({
          ...video,
          url: `https://www.youtube.com/shorts/${video.id}`,
        }));
      const fallbackVideos = uniqueVideos(excludeIds(fallbackMain, fallbackShorts.map((video) => video.id)));
      const fallbackFull = uniqueVideos(fallbackFullSource);

      videos = fillToCount(videos, fallbackVideos, 9);
      shorts = fillToCount(shorts, fallbackShorts, 8);
      full = fillToCount(full, fallbackFull, 9);
    }

    return res.status(200).json({
      ok: true,
      channels: {
        latest: {
          title: mainInfo.title,
          url: 'https://www.youtube.com/@jisoujang',
          videosUrl: 'https://www.youtube.com/@jisoujang/videos',
          shortsUrl: 'https://www.youtube.com/@jisoujang/shorts',
        },
        full: {
          title: fullInfo.title,
          url: 'https://www.youtube.com/@jisoujang_full',
          videosUrl: 'https://www.youtube.com/@jisoujang_full/videos',
        },
      },
      videos: videos.slice(0, 9),
      shorts: shorts.slice(0, 8),
      full: full.slice(0, 9),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({ ok: false, error: error.message });
  }
}

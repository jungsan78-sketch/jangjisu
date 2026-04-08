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

async function getChannelTitle(channelHandle, apiKey) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${channelHandle}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok || !json.items?.length) {
    throw new Error(`Failed to load channel title for ${channelHandle}`);
  }
  return json.items[0].snippet.title;
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
    throw new Error(`Failed to fetch tab ${tabUrl}`);
  }

  const ids = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
  return uniqueIds(ids).slice(0, 18);
}

async function getUploadsFallbackIds(channelHandle, apiKey) {
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${channelHandle}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const channelJson = await channelRes.json();
  const uploadsId = channelJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return [];

  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=24&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const playlistJson = await playlistRes.json();

  return uniqueIds((playlistJson.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean));
}

async function getVideosByIds(ids, apiKey, shortsMode = false) {
  if (!ids?.length) return [];

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids.join(',')}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok || !json.items?.length) return [];

  const byId = new Map(json.items.map((item) => [item.id, item]));

  return ids
    .map((id) => {
      const details = byId.get(id);
      if (!details) return null;

      const duration = details.contentDetails?.duration || '';
      const durationSeconds = getDurationSeconds(duration);

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
        durationSeconds,
        url: shortsMode
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
    if (!result.some((v) => v.id === item.id)) result.push(item);
  }
  return result.slice(0, count);
}

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ ok: false, error: 'YOUTUBE_API_KEY is not set' });
  }

  try {
    const [mainTitle, fullTitle] = await Promise.all([
      getChannelTitle('jisoujang', apiKey),
      getChannelTitle('jisoujang_full', apiKey),
    ]);

    let videosIds = [];
    let shortsIds = [];
    let fullIds = [];

    try {
      [videosIds, shortsIds, fullIds] = await Promise.all([
        scrapeTabVideoIds('https://www.youtube.com/@jisoujang/videos'),
        scrapeTabVideoIds('https://www.youtube.com/@jisoujang/shorts'),
        scrapeTabVideoIds('https://www.youtube.com/@jisoujang_full/videos'),
      ]);
    } catch {
      const [mainFallbackIds, fullFallbackIds] = await Promise.all([
        getUploadsFallbackIds('jisoujang', apiKey),
        getUploadsFallbackIds('jisoujang_full', apiKey),
      ]);

      videosIds = mainFallbackIds;
      shortsIds = mainFallbackIds;
      fullIds = fullFallbackIds;
    }

    let [videos, shorts, full] = await Promise.all([
      getVideosByIds(videosIds.slice(0, 12), apiKey, false),
      getVideosByIds(shortsIds.slice(0, 12), apiKey, true),
      getVideosByIds(fullIds.slice(0, 12), apiKey, false),
    ]);

    if (!videos.length || !shorts.length || !full.length) {
      const [mainFallbackIds, fullFallbackIds] = await Promise.all([
        getUploadsFallbackIds('jisoujang', apiKey),
        getUploadsFallbackIds('jisoujang_full', apiKey),
      ]);

      const [fallbackVideos, fallbackShorts, fallbackFull] = await Promise.all([
        getVideosByIds(mainFallbackIds.slice(0, 18), apiKey, false),
        getVideosByIds(mainFallbackIds.slice(0, 18), apiKey, true),
        getVideosByIds(fullFallbackIds.slice(0, 18), apiKey, false),
      ]);

      videos = fillToCount(videos, fallbackVideos, 9);
      shorts = fillToCount(shorts, fallbackShorts, 8);
      full = fillToCount(full, fallbackFull, 9);
    }

    return res.status(200).json({
      ok: true,
      channels: {
        latest: {
          title: mainTitle,
          url: 'https://www.youtube.com/@jisoujang',
          videosUrl: 'https://www.youtube.com/@jisoujang/videos',
          shortsUrl: 'https://www.youtube.com/@jisoujang/shorts',
        },
        full: {
          title: fullTitle,
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
    return res.status(200).json({
      ok: false,
      error: error.message,
    });
  }
}

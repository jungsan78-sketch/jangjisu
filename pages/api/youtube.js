import { getCloudflareContext } from '@opennextjs/cloudflare';

function getRuntimeEnvValue(name) {
  try {
    const value = getCloudflareContext()?.env?.[name];
    if (value) return value;
  } catch {}
  return process.env[name];
}

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

function isShortLike(video, knownShortIds = []) {
  const shortSet = new Set(knownShortIds);
  return shortSet.has(video?.id) || (Number(video?.durationSeconds || 0) > 0 && Number(video.durationSeconds) <= 70);
}

function isLongForm(video, knownShortIds = []) {
  return !isShortLike(video, knownShortIds) && Number(video?.durationSeconds || 0) > 70;
}

function excludeIds(videos, blockedIds) {
  const blocked = new Set(blockedIds || []);
  return videos.filter((video) => !blocked.has(video.id));
}

function summarizeVideos(videos) {
  return (videos || []).map((video) => ({
    id: video.id,
    title: video.title,
    url: video.url,
    durationText: video.durationText,
    durationSeconds: video.durationSeconds,
  }));
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
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
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

  const chunks = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }

  const results = [];
  for (const chunk of chunks) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${chunk.join(',')}&key=${apiKey}`,
      { cache: 'no-store' }
    );
    const json = await res.json();
    if (!res.ok || !json.items?.length) continue;

    const map = new Map(json.items.map((item) => [item.id, item]));
    results.push(
      ...chunk
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
            url: vertical ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
          };
        })
        .filter(Boolean)
    );
  }

  return results;
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

async function getUploadsPlaylistId(channelHandle, apiKey) {
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${channelHandle}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const channelJson = await channelRes.json();
  return channelJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || '';
}

async function fallbackUploads(channelHandle, apiKey, maxResults = 24, maxPages = 1) {
  const uploads = await getUploadsPlaylistId(channelHandle, apiKey);
  if (!uploads) return [];

  const ids = [];
  let pageToken = '';
  let pages = 0;

  while (pages < maxPages && ids.length < maxResults) {
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`,
      { cache: 'no-store' }
    );
    const playlistJson = await playlistRes.json();
    if (!playlistRes.ok) break;

    ids.push(...(playlistJson.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean));
    pageToken = playlistJson.nextPageToken || '';
    pages += 1;
    if (!pageToken) break;
  }

  return uniqueIds(ids).slice(0, maxResults);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
  const apiKey = getRuntimeEnvValue('YOUTUBE_API_KEY');
  const debugMode = req.query?.debug === '1';

  if (!apiKey) {
    return res.status(200).json({ ok: false, error: 'YOUTUBE_API_KEY is not set', debug: debugMode ? { runtimeEnvChecked: true } : undefined });
  }

  try {
    const [mainInfo, fullInfo] = await Promise.all([
      getChannelInfo('jisoujang', apiKey),
      getChannelInfo('jisoujang_full', apiKey),
    ]);

    let shortsIds = [];
    let fullIds = [];
    let uploadsIds = [];
    let deepUploadsIds = [];
    let sourceMode = 'primary';

    try {
      [shortsIds, fullIds, uploadsIds, deepUploadsIds] = await Promise.all([
        scrapeTabVideoIds('https://www.youtube.com/@jisoujang/shorts'),
        scrapeTabVideoIds('https://www.youtube.com/@jisoujang_full/videos'),
        fallbackUploads('jisoujang', apiKey, 24, 1),
        fallbackUploads('jisoujang', apiKey, 220, 8),
      ]);
    } catch (e) {
      const [mainFallback, mainDeepFallback, fullFallbackIds] = await Promise.all([
        fallbackUploads('jisoujang', apiKey, 24, 1),
        fallbackUploads('jisoujang', apiKey, 220, 8),
        fallbackUploads('jisoujang_full', apiKey, 24, 1),
      ]);
      shortsIds = mainFallback;
      fullIds = fullFallbackIds;
      uploadsIds = mainFallback;
      deepUploadsIds = mainDeepFallback;
      sourceMode = 'fallback';
    }

    const [shortsSource, fullSource, uploadsSource, deepUploadsSource] = await Promise.all([
      getVideosByIds(shortsIds.slice(0, 24), apiKey, true),
      getVideosByIds(fullIds.slice(0, 24), apiKey, false),
      getVideosByIds(uploadsIds.slice(0, 24), apiKey, false),
      getVideosByIds(deepUploadsIds, apiKey, false),
    ]);

    let shorts = uniqueVideos([
      ...shortsSource,
      ...uploadsSource.filter((video) => isShortLike(video, shortsIds)),
    ]).map((video) => ({
      ...video,
      url: `https://www.youtube.com/shorts/${video.id}`,
    }));

    const deepLongformPool = uniqueVideos(
      excludeIds(
        deepUploadsSource.filter((video) => isLongForm(video, shortsIds)),
        shorts.map((video) => video.id)
      )
    );

    let videos = deepLongformPool.slice(0, 9);
    let full = uniqueVideos(fullSource);

    if (!videos.length || !shorts.length || !full.length) {
      const [mainDeepFallback, fullFallbackIds] = await Promise.all([
        fallbackUploads('jisoujang', apiKey, 220, 8),
        fallbackUploads('jisoujang_full', apiKey, 24, 1),
      ]);

      const [fallbackMainDeep, fallbackFullSource] = await Promise.all([
        getVideosByIds(mainDeepFallback, apiKey, false),
        getVideosByIds(fullFallbackIds.slice(0, 24), apiKey, false),
      ]);

      const fallbackShorts = uniqueVideos(fallbackMainDeep.filter((video) => isShortLike(video, shortsIds))).map((video) => ({
        ...video,
        url: `https://www.youtube.com/shorts/${video.id}`,
      }));
      const fallbackVideos = uniqueVideos(
        excludeIds(
          fallbackMainDeep.filter((video) => isLongForm(video, shortsIds)),
          fallbackShorts.map((video) => video.id)
        )
      );
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
      ...(debugMode
        ? {
            debug: {
              runtimeEnvChecked: true,
              sourceMode,
              shortsIds: shortsIds.slice(0, 24),
              fullIds: fullIds.slice(0, 24),
              uploadsIds: uploadsIds.slice(0, 24),
              deepUploadsIds: deepUploadsIds.slice(0, 220),
              shortsSource: summarizeVideos(shortsSource),
              uploadsSource: summarizeVideos(uploadsSource),
              deepUploadsSource: summarizeVideos(deepUploadsSource.slice(0, 80)),
              fullSource: summarizeVideos(fullSource),
              classifiedVideos: summarizeVideos(videos),
              classifiedShorts: summarizeVideos(shorts),
              classifiedFull: summarizeVideos(full),
            },
          }
        : {}),
    });
  } catch (error) {
    return res.status(200).json({ ok: false, error: error.message, debug: debugMode ? { runtimeEnvChecked: true } : undefined });
  }
}

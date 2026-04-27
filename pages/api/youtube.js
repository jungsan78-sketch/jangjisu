import { getCloudflareContext } from '@opennextjs/cloudflare';

const RUNTIME_MARKER = 'test2-youtube-direct-20260427-1';
const MAIN_HANDLE = 'jisoujang';
const FULL_HANDLE = 'jisoujang_full';

async function getRuntimeEnvValue(name) {
  try {
    const context = await getCloudflareContext({ async: true });
    const value = context?.env?.[name];
    if (value) return value;
  } catch {}
  try {
    const value = getCloudflareContext()?.env?.[name];
    if (value) return value;
  } catch {}
  return process.env[name] || '';
}

function formatDuration(isoDuration = '') {
  const match = String(isoDuration).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getDurationSeconds(duration = '') {
  const match = String(duration).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || '0', 10) * 3600) + (parseInt(match[2] || '0', 10) * 60) + parseInt(match[3] || '0', 10);
}

function formatViews(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('ko-KR').format(num);
}

function formatPublishedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR');
}

function uniqueById(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message = json?.error?.message || `YouTube request failed: ${response.status}`;
    throw new Error(message);
  }
  return json;
}

async function getChannel(channelHandle, apiKey) {
  const json = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${channelHandle}&key=${apiKey}`);
  const item = json.items?.[0];
  if (!item) throw new Error(`Failed to load channel for handle: ${channelHandle}`);
  return {
    title: item.snippet?.title || channelHandle,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || '',
  };
}

async function getUploadIds(playlistId, apiKey, maxResults = 50, maxPages = 2) {
  if (!playlistId) return [];
  const ids = [];
  let pageToken = '';
  let pages = 0;
  while (pages < maxPages && ids.length < maxResults) {
    const json = await fetchJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`);
    ids.push(...(json.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean));
    pageToken = json.nextPageToken || '';
    pages += 1;
    if (!pageToken) break;
  }
  return [...new Set(ids)].slice(0, maxResults);
}

async function getVideosByIds(ids, apiKey) {
  if (!ids.length) return [];
  const chunks = [];
  for (let index = 0; index < ids.length; index += 50) chunks.push(ids.slice(index, index + 50));
  const videos = [];
  for (const chunk of chunks) {
    const json = await fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${chunk.join(',')}&key=${apiKey}`);
    const byId = new Map((json.items || []).map((item) => [item.id, item]));
    chunk.forEach((id) => {
      const item = byId.get(id);
      if (!item) return;
      const duration = item.contentDetails?.duration || '';
      const durationSeconds = getDurationSeconds(duration);
      videos.push({
        id,
        title: item.snippet?.title || '',
        thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: item.snippet?.publishedAt || '',
        publishedAtText: formatPublishedAt(item.snippet?.publishedAt || ''),
        views: item.statistics?.viewCount || '0',
        viewsText: formatViews(item.statistics?.viewCount || '0'),
        duration,
        durationText: formatDuration(duration),
        durationSeconds,
        url: durationSeconds > 0 && durationSeconds <= 70 ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      });
    });
  }
  return uniqueById(videos);
}

function pickShorts(videos) {
  return videos.filter((video) => Number(video.durationSeconds || 0) > 0 && Number(video.durationSeconds) <= 70).map((video) => ({ ...video, url: `https://www.youtube.com/shorts/${video.id}` }));
}

function pickLongform(videos) {
  return videos.filter((video) => Number(video.durationSeconds || 0) > 70).map((video) => ({ ...video, url: `https://www.youtube.com/watch?v=${video.id}` }));
}

export default async function handler(req, res) {
  const debugMode = String(req.query?.debug || '') === '1';
  res.setHeader('Cache-Control', debugMode ? 'no-store' : 'public, s-maxage=900, stale-while-revalidate=1800');

  const apiKey = await getRuntimeEnvValue('YOUTUBE_API_KEY');
  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      videos: [],
      shorts: [],
      full: [],
      error: 'YOUTUBE_API_KEY is not set',
      debug: debugMode ? { runtimeMarker: RUNTIME_MARKER, runtimeEnvChecked: true } : undefined,
    });
  }

  try {
    const [mainChannel, fullChannel] = await Promise.all([
      getChannel(MAIN_HANDLE, apiKey),
      getChannel(FULL_HANDLE, apiKey),
    ]);
    const [mainIds, fullIds] = await Promise.all([
      getUploadIds(mainChannel.uploadsPlaylistId, apiKey, 80, 2),
      getUploadIds(fullChannel.uploadsPlaylistId, apiKey, 36, 1),
    ]);
    const [mainUploads, fullUploads] = await Promise.all([
      getVideosByIds(mainIds, apiKey),
      getVideosByIds(fullIds, apiKey),
    ]);
    const shorts = pickShorts(mainUploads).slice(0, 8);
    const videos = pickLongform(mainUploads).slice(0, 9);
    const full = pickLongform(fullUploads).slice(0, 9);

    return res.status(200).json({
      ok: true,
      channels: {
        latest: {
          title: mainChannel.title,
          url: 'https://www.youtube.com/@jisoujang',
          videosUrl: 'https://www.youtube.com/@jisoujang/videos',
          shortsUrl: 'https://www.youtube.com/@jisoujang/shorts',
        },
        full: {
          title: fullChannel.title,
          url: 'https://www.youtube.com/@jisoujang_full',
          videosUrl: 'https://www.youtube.com/@jisoujang_full/videos',
        },
      },
      videos,
      shorts,
      full,
      fetchedAt: new Date().toISOString(),
      ...(debugMode ? {
        debug: {
          runtimeMarker: RUNTIME_MARKER,
          runtimeEnvChecked: true,
          sourceMode: 'youtube_data_api_uploads_only',
          mainIds: mainIds.slice(0, 20),
          fullIds: fullIds.slice(0, 20),
          counts: { videos: videos.length, shorts: shorts.length, full: full.length },
        },
      } : {}),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      videos: [],
      shorts: [],
      full: [],
      error: error?.message || 'youtube endpoint failed',
      debug: debugMode ? { runtimeMarker: RUNTIME_MARKER, runtimeEnvChecked: true } : undefined,
    });
  }
}

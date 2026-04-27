import { getCloudflareContext } from '@opennextjs/cloudflare';

export const YOUTUBE_DIRECT_MARKER = 'test2-youtube-lib-direct-20260427-2';

const MAIN_HANDLE = 'jisoujang';
const FULL_HANDLE = 'jisoujang_full';
const MAIN_VIDEO_MIN_SECONDS = 180;
const MAIN_UPLOAD_LOOKBACK_COUNT = 240;
const MAIN_UPLOAD_LOOKBACK_PAGES = 6;
const FULL_UPLOAD_LOOKBACK_COUNT = 36;
const FULL_UPLOAD_LOOKBACK_PAGES = 1;
const SHORTS_MAX_SECONDS = 180;
const FIVE_MONTHS_MS = 1000 * 60 * 60 * 24 * 31 * 5;
const SHORTS_KEYWORDS = ['#shorts', '#쇼츠', 'shorts', '쇼츠'];

const PRISON_YOUTUBE_CHANNELS = [
  { nickname: '냥냥두둥', url: 'https://www.youtube.com/channel/UCCAaGF_vfM6QygNRCp4x1dw' },
  { nickname: '치치', url: 'https://www.youtube.com/@chichi0e0' },
  { nickname: '아야네세나', url: 'https://www.youtube.com/@%EC%95%84%EC%95%BC%EB%84%A4%EC%84%B8%EB%82%98' },
  { nickname: '포포', url: 'https://www.youtube.com/@%EB%B2%84%ED%8A%9C%EB%B2%84%ED%8F%AC%ED%8F%AC' },
  { nickname: '구월이', url: 'https://www.youtube.com/@%EA%B5%AC%EC%9B%94%EC%9D%B4' },
  { nickname: '띠꾸', url: 'https://www.youtube.com/@ddikku_0714' },
];

export async function getRuntimeEnvValue(name) {
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

export async function getYoutubeApiKey() {
  return (await getRuntimeEnvValue('YOUTUBE_API_KEY')) || (await getRuntimeEnvValue('NEXT_PUBLIC_YOUTUBE_API_KEY')) || '';
}

function formatDuration(isoOrSeconds = '') {
  if (typeof isoOrSeconds === 'number') {
    const hours = Math.floor(isoOrSeconds / 3600);
    const minutes = Math.floor((isoOrSeconds % 3600) / 60);
    const seconds = isoOrSeconds % 60;
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  const match = String(isoOrSeconds).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
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
  if (!Number.isFinite(num) || !num) return '';
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

function uniqueIds(ids = []) {
  return [...new Set(ids.filter(Boolean))];
}

function getBestThumbnail(thumbnails = {}) {
  return thumbnails.maxres?.url || thumbnails.standard?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';
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

async function youtubeFetch(path, params, apiKey) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return fetchJson(url.toString());
}

async function getChannelByHandle(channelHandle, apiKey) {
  const json = await youtubeFetch('channels', { part: 'snippet,contentDetails', forHandle: channelHandle }, apiKey);
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
    const json = await youtubeFetch('playlistItems', { part: 'contentDetails', playlistId, maxResults: 50, pageToken }, apiKey);
    ids.push(...(json.items || []).map((item) => item.contentDetails?.videoId).filter(Boolean));
    pageToken = json.nextPageToken || '';
    pages += 1;
    if (!pageToken) break;
  }
  return uniqueIds(ids).slice(0, maxResults);
}

async function getVideosByIds(ids, apiKey) {
  if (!ids.length) return [];
  const chunks = [];
  for (let index = 0; index < ids.length; index += 50) chunks.push(ids.slice(index, index + 50));
  const videos = [];
  for (const chunk of chunks) {
    const json = await youtubeFetch('videos', { part: 'contentDetails,statistics,snippet', id: chunk.join(',') }, apiKey);
    const byId = new Map((json.items || []).map((item) => [item.id, item]));
    chunk.forEach((id) => {
      const item = byId.get(id);
      if (!item) return;
      const duration = item.contentDetails?.duration || '';
      const durationSeconds = getDurationSeconds(duration);
      videos.push({
        id,
        title: item.snippet?.title || '',
        thumbnail: getBestThumbnail(item.snippet?.thumbnails || {}) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: item.snippet?.publishedAt || '',
        publishedAtText: formatPublishedAt(item.snippet?.publishedAt || ''),
        views: item.statistics?.viewCount || '0',
        viewsText: formatViews(item.statistics?.viewCount || '0'),
        duration,
        durationText: formatDuration(duration),
        durationSeconds,
        url: durationSeconds > 0 && durationSeconds < MAIN_VIDEO_MIN_SECONDS ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      });
    });
  }
  return uniqueById(videos);
}

function pickShorts(videos) {
  return videos.filter((video) => Number(video.durationSeconds || 0) > 0 && Number(video.durationSeconds) < MAIN_VIDEO_MIN_SECONDS).map((video) => ({ ...video, url: `https://www.youtube.com/shorts/${video.id}` }));
}

function pickLongform(videos) {
  return videos.filter((video) => Number(video.durationSeconds || 0) >= MAIN_VIDEO_MIN_SECONDS).map((video) => ({ ...video, url: `https://www.youtube.com/watch?v=${video.id}` }));
}

function getHandle(url = '') {
  const decoded = decodeURIComponent(url);
  const match = decoded.match(/youtube\.com\/@([^/?#]+)/i);
  return match ? `@${match[1]}` : '';
}

function getChannelId(url = '') {
  const match = url.match(/youtube\.com\/channel\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function getChannelTabUrls(url = '') {
  const base = url.replace(/\/(videos|shorts)\/?$/i, '').replace(/\/$/, '');
  return { videosUrl: `${base}/videos`, shortsUrl: `${base}/shorts` };
}

function isWithinFiveMonths(publishedAt = '') {
  if (!publishedAt) return false;
  return Date.now() - new Date(publishedAt).getTime() <= FIVE_MONTHS_MS;
}

function isPrisonShort(title, seconds) {
  const text = String(title || '').toLowerCase();
  return (seconds > 0 && seconds <= SHORTS_MAX_SECONDS) || SHORTS_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

async function resolvePrisonChannel(channel, apiKey) {
  const directId = getChannelId(channel.url);
  if (directId) return directId;
  const handle = getHandle(channel.url);
  if (!handle) return '';
  try {
    const byHandle = await youtubeFetch('channels', { part: 'id', forHandle: handle }, apiKey);
    const id = byHandle.items?.[0]?.id;
    if (id) return id;
  } catch {}
  const searched = await youtubeFetch('search', { part: 'snippet', type: 'channel', maxResults: 1, q: handle.replace('@', '') }, apiKey);
  return searched.items?.[0]?.snippet?.channelId || '';
}

async function getRecentPrisonUploadIds(uploadsId, apiKey) {
  const ids = [];
  let pageToken = '';
  let pages = 0;
  while (pages < 8 && ids.length < 220) {
    const playlist = await youtubeFetch('playlistItems', { part: 'snippet,contentDetails', playlistId: uploadsId, maxResults: 50, pageToken }, apiKey);
    ids.push(...(playlist.items || [])
      .filter((item) => isWithinFiveMonths(item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt))
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean));
    pageToken = playlist.nextPageToken || '';
    pages += 1;
    if (!pageToken) break;
  }
  return uniqueIds(ids);
}

async function getPrisonChannelVideos(channel, apiKey) {
  const channelId = await resolvePrisonChannel(channel, apiKey);
  if (!channelId) return [];
  const channelInfo = await youtubeFetch('channels', { part: 'contentDetails,snippet', id: channelId }, apiKey);
  const uploadsId = channelInfo.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return [];
  const videoIds = await getRecentPrisonUploadIds(uploadsId, apiKey);
  if (!videoIds.length) return [];
  const rawVideos = await getVideosByIds(videoIds, apiKey);
  const { videosUrl, shortsUrl } = getChannelTabUrls(channel.url);
  return rawVideos.map((video) => {
    const shorts = isPrisonShort(video.title, video.durationSeconds);
    return {
      ...video,
      member: channel.nickname,
      channelTitle: channel.nickname,
      channelUrl: channel.url,
      videosUrl,
      shortsUrl,
      type: shorts ? 'shorts' : 'video',
      url: shorts ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`,
    };
  });
}

export async function fetchMainYoutubePayload(options = {}) {
  const apiKey = options.apiKey || await getYoutubeApiKey();
  const debug = Boolean(options.debug);
  if (!apiKey) {
    return { ok: false, videos: [], shorts: [], full: [], error: 'YOUTUBE_API_KEY is not set', ...(debug ? { debug: { runtimeMarker: YOUTUBE_DIRECT_MARKER, runtimeEnvChecked: true } } : {}) };
  }

  const [mainChannel, fullChannel] = await Promise.all([
    getChannelByHandle(MAIN_HANDLE, apiKey),
    getChannelByHandle(FULL_HANDLE, apiKey),
  ]);
  const [mainIds, fullIds] = await Promise.all([
    getUploadIds(mainChannel.uploadsPlaylistId, apiKey, MAIN_UPLOAD_LOOKBACK_COUNT, MAIN_UPLOAD_LOOKBACK_PAGES),
    getUploadIds(fullChannel.uploadsPlaylistId, apiKey, FULL_UPLOAD_LOOKBACK_COUNT, FULL_UPLOAD_LOOKBACK_PAGES),
  ]);
  const [mainUploads, fullUploads] = await Promise.all([
    getVideosByIds(mainIds, apiKey),
    getVideosByIds(fullIds, apiKey),
  ]);
  const shorts = pickShorts(mainUploads).slice(0, 8);
  const videos = pickLongform(mainUploads).slice(0, 9);
  const full = pickLongform(fullUploads).slice(0, 9);

  return {
    ok: true,
    channels: {
      latest: { title: mainChannel.title, url: 'https://www.youtube.com/@jisoujang', videosUrl: 'https://www.youtube.com/@jisoujang/videos', shortsUrl: 'https://www.youtube.com/@jisoujang/shorts' },
      full: { title: fullChannel.title, url: 'https://www.youtube.com/@jisoujang_full', videosUrl: 'https://www.youtube.com/@jisoujang_full/videos' },
    },
    videos,
    shorts,
    full,
    fetchedAt: new Date().toISOString(),
    ...(debug ? { debug: { runtimeMarker: YOUTUBE_DIRECT_MARKER, runtimeEnvChecked: true, sourceMode: 'youtube_data_api_uploads_only', mainVideoMinSeconds: MAIN_VIDEO_MIN_SECONDS, mainIds: mainIds.slice(0, 30), fullIds: fullIds.slice(0, 20), counts: { videos: videos.length, shorts: shorts.length, full: full.length } } } : {}),
  };
}

export async function fetchPrisonYoutubePayload(options = {}) {
  const apiKey = options.apiKey || await getYoutubeApiKey();
  if (!apiKey) return { videos: [], shorts: [], missingKey: true };
  try {
    const results = await Promise.allSettled(PRISON_YOUTUBE_CHANNELS.map((channel) => getPrisonChannelVideos(channel, apiKey)));
    const merged = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return {
      videos: merged.filter((item) => item.type === 'video').slice(0, 24),
      shorts: merged.filter((item) => item.type === 'shorts').slice(0, 30),
      missingKey: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { videos: [], shorts: [], missingKey: false, error: true };
  }
}

export function countYoutubeItems(payload, keys) {
  return keys.reduce((sum, key) => sum + (Array.isArray(payload?.[key]) ? payload[key].length : 0), 0);
}

export function isMainYoutubeUsable(payload) {
  return payload && payload.ok !== false && countYoutubeItems(payload, ['videos', 'shorts', 'full']) > 0;
}

export function isPrisonYoutubeUsable(payload) {
  return payload && !payload.missingKey && countYoutubeItems(payload, ['videos', 'shorts']) > 0;
}

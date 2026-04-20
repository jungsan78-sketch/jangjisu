const YOUTUBE_CHANNELS = [
  { nickname: '냥냥두둥', url: 'https://www.youtube.com/channel/UCCAaGF_vfM6QygNRCp4x1dw' },
  { nickname: '치치', url: 'https://www.youtube.com/@chichi0e0' },
  { nickname: '아야네세나', url: 'https://www.youtube.com/@%EC%95%84%EC%95%BC%EB%84%A4%EC%84%B8%EB%82%98' },
  { nickname: '포포', url: 'https://www.youtube.com/@%EB%B2%84%ED%8A%9C%EB%B2%84%ED%8F%AC%ED%8F%AC' },
  { nickname: '구월이', url: 'https://www.youtube.com/@%EA%B5%AC%EC%9B%94%EC%9D%B4' },
  { nickname: '띠꾸', url: 'https://www.youtube.com/@ddikku_0714' },
];

const SHORTS_KEYWORDS = ['#shorts', '#쇼츠', 'shorts', '쇼츠'];
const FIVE_MONTHS_MS = 1000 * 60 * 60 * 24 * 31 * 5;
const SHORTS_MAX_SECONDS = 180;

function getDurationSeconds(duration = '') {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h = 0, m = 0, s = 0] = match;
  return Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
}

function formatDuration(seconds = 0) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function formatViews(value) {
  const num = Number(value || 0);
  if (!num) return '';
  return new Intl.NumberFormat('ko-KR').format(num);
}

function uniqueIds(ids) {
  const seen = new Set();
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
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

function isShortsVideo(title, seconds) {
  const text = String(title || '').toLowerCase();
  return (seconds > 0 && seconds <= SHORTS_MAX_SECONDS) || SHORTS_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

function getBestThumbnail(thumbnails = {}) {
  return thumbnails.maxres?.url || thumbnails.standard?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '';
}

async function youtubeFetch(path, params, apiKey) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`YouTube API failed: ${res.status}`);
  return res.json();
}

async function resolveChannel(channel, apiKey) {
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

async function getUploadVideoIds(uploadsId, apiKey) {
  const ids = [];
  let pageToken = '';
  let pages = 0;

  while (pages < 8 && ids.length < 220) {
    const playlist = await youtubeFetch('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploadsId,
      maxResults: 50,
      pageToken,
    }, apiKey);

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

async function getChannelVideos(channel, apiKey) {
  const channelId = await resolveChannel(channel, apiKey);
  if (!channelId) return [];

  const channelInfo = await youtubeFetch('channels', { part: 'contentDetails,snippet', id: channelId }, apiKey);
  const uploadsId = channelInfo.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) return [];

  const videoIds = await getUploadVideoIds(uploadsId, apiKey);
  if (!videoIds.length) return [];

  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const details = await youtubeFetch('videos', {
      part: 'contentDetails,statistics,snippet',
      id: videoIds.slice(i, i + 50).join(','),
      maxResults: 50,
    }, apiKey);
    results.push(...(details.items || []));
  }

  const { videosUrl, shortsUrl } = getChannelTabUrls(channel.url);

  return results.map((item) => {
    const seconds = getDurationSeconds(item.contentDetails?.duration);
    const title = item.snippet?.title || '';
    const shorts = isShortsVideo(title, seconds);

    return {
      id: item.id,
      title,
      member: channel.nickname,
      channelTitle: item.snippet?.channelTitle || channel.nickname,
      publishedAt: item.snippet?.publishedAt || '',
      thumbnail: getBestThumbnail(item.snippet?.thumbnails || {}),
      url: shorts ? `https://www.youtube.com/shorts/${item.id}` : `https://www.youtube.com/watch?v=${item.id}`,
      channelUrl: channel.url,
      videosUrl,
      shortsUrl,
      type: shorts ? 'shorts' : 'video',
      durationSeconds: seconds,
      durationText: formatDuration(seconds),
      viewsText: formatViews(item.statistics?.viewCount),
    };
  });
}

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  if (!apiKey) {
    return res.status(200).json({ videos: [], shorts: [], missingKey: true });
  }

  try {
    const results = await Promise.allSettled(YOUTUBE_CHANNELS.map((channel) => getChannelVideos(channel, apiKey)));
    const merged = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    return res.status(200).json({
      videos: merged.filter((item) => item.type === 'video').slice(0, 24),
      shorts: merged.filter((item) => item.type === 'shorts').slice(0, 30),
      missingKey: false,
    });
  } catch (error) {
    return res.status(200).json({ videos: [], shorts: [], missingKey: false, error: true });
  }
}

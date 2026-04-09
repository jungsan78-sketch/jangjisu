function setNoCache(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

async function getChannel(channelHandle, apiKey, part = 'contentDetails,snippet') {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=${part}&forHandle=${channelHandle}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok || !json.items?.length) {
    throw new Error(`Failed to load channel: ${channelHandle}`);
  }
  return json.items[0];
}

async function getPlaylistVideoIds(playlistId, apiKey, maxResults = 24) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok || !json.items?.length) return [];
  return json.items.map((item) => item.contentDetails?.videoId).filter(Boolean);
}

async function getVideoDetails(ids, apiKey, shortsMode = false) {
  if (!ids.length) return [];
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids.join(',')}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const json = await res.json();
  if (!res.ok || !json.items?.length) return [];

  return ids.map((id) => {
    const details = json.items.find((item) => item.id === id);
    if (!details) return null;

    const duration = details.contentDetails?.duration || '';

    return {
      id,
      title: details.snippet?.title || '',
      thumbnail:
        details.snippet?.thumbnails?.maxres?.url ||
        details.snippet?.thumbnails?.high?.url ||
        details.snippet?.thumbnails?.medium?.url ||
        details.snippet?.thumbnails?.default?.url ||
        '',
      publishedAt: details.snippet?.publishedAt || '',
      publishedAtText: formatPublishedAt(details.snippet?.publishedAt || ''),
      viewsText: formatViews(details.statistics?.viewCount || '0'),
      durationText: formatDuration(duration),
      durationSeconds: getDurationSeconds(duration),
      url: shortsMode
        ? `https://www.youtube.com/shorts/${id}`
        : `https://www.youtube.com/watch?v=${id}`,
    };
  }).filter(Boolean);
}

export default async function handler(req, res) {
  setNoCache(res);

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ ok: false, error: 'YOUTUBE_API_KEY is not set' });
  }

  try {
    const [mainChannel, fullChannel] = await Promise.all([
      getChannel('jisoujang', apiKey),
      getChannel('jisoujang_full', apiKey),
    ]);

    const [mainIds, fullIds] = await Promise.all([
      getPlaylistVideoIds(mainChannel.contentDetails.relatedPlaylists.uploads, apiKey, 24),
      getPlaylistVideoIds(fullChannel.contentDetails.relatedPlaylists.uploads, apiKey, 24),
    ]);

    const [mainVideos, fullVideosRaw] = await Promise.all([
      getVideoDetails(mainIds, apiKey, false),
      getVideoDetails(fullIds, apiKey, false),
    ]);

    const videos = mainVideos
      .filter((video) => video.durationSeconds > 60)
      .slice(0, 9);

    const shorts = mainVideos
      .filter((video) => video.durationSeconds > 0 && video.durationSeconds <= 60)
      .slice(0, 8)
      .map((video) => ({
        ...video,
        url: `https://www.youtube.com/shorts/${video.id}`,
      }));

    const full = fullVideosRaw
      .filter((video) => video.durationSeconds > 60)
      .slice(0, 9);

    return res.status(200).json({
      ok: true,
      channels: {
        latest: {
          title: mainChannel.snippet?.title || '장지수',
          url: 'https://www.youtube.com/@jisoujang',
          videosUrl: 'https://www.youtube.com/@jisoujang/videos',
          shortsUrl: 'https://www.youtube.com/@jisoujang/shorts',
        },
        full: {
          title: fullChannel.snippet?.title || '장지수 풀영상',
          url: 'https://www.youtube.com/@jisoujang_full',
          videosUrl: 'https://www.youtube.com/@jisoujang_full/videos',
        },
      },
      videos,
      shorts,
      full,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: error.message,
    });
  }
}

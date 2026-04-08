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

function isShortVideo(duration = '') {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return false;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds > 0 && totalSeconds <= 60;
}

async function getUploadsPlaylistId(channelHandle, apiKey) {
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&forHandle=${channelHandle}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const channelJson = await channelRes.json();

  if (!channelRes.ok || !channelJson.items?.length) {
    throw new Error(`Failed to load channel for handle: ${channelHandle}`);
  }

  return {
    uploadsPlaylistId: channelJson.items[0].contentDetails.relatedPlaylists.uploads,
    channelTitle: channelJson.items[0].snippet.title,
  };
}

async function getPlaylistVideos(playlistId, apiKey, maxResults = 12) {
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const playlistJson = await playlistRes.json();

  if (!playlistRes.ok || !playlistJson.items?.length) {
    return [];
  }

  const videoIds = playlistJson.items
    .map((item) => item.contentDetails?.videoId)
    .filter(Boolean)
    .join(',');

  if (!videoIds) return [];

  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`,
    { cache: 'no-store' }
  );
  const videosJson = await videosRes.json();

  if (!videosRes.ok || !videosJson.items?.length) {
    return [];
  }

  const statsMap = new Map(videosJson.items.map((video) => [video.id, video]));

  return playlistJson.items
    .map((item) => {
      const videoId = item.contentDetails?.videoId;
      const details = statsMap.get(videoId);
      if (!videoId || !details) return null;

      const duration = details.contentDetails?.duration || '';
      return {
        id: videoId,
        title: item.snippet?.title || details.snippet?.title || '',
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          details.snippet?.thumbnails?.high?.url ||
          details.snippet?.thumbnails?.medium?.url ||
          '',
        publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || '',
        publishedAtText: formatPublishedAt(item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || ''),
        views: details.statistics?.viewCount || '0',
        viewsText: formatViews(details.statistics?.viewCount || '0'),
        duration,
        durationText: formatDuration(duration),
        isShort: isShortVideo(duration),
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    })
    .filter(Boolean);
}

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      error: 'YOUTUBE_API_KEY is not set',
    });
  }

  try {
    const mainChannel = await getUploadsPlaylistId('jisoujang', apiKey);
    const fullChannel = await getUploadsPlaylistId('jisoujang_full', apiKey);

    const [mainVideos, fullVideos] = await Promise.all([
      getPlaylistVideos(mainChannel.uploadsPlaylistId, apiKey, 14),
      getPlaylistVideos(fullChannel.uploadsPlaylistId, apiKey, 12),
    ]);

    const shorts = mainVideos.filter((video) => video.isShort).slice(0, 8);
    const longform = mainVideos.filter((video) => !video.isShort).slice(0, 8);

    return res.status(200).json({
      ok: true,
      channels: {
        main: {
          title: mainChannel.channelTitle,
          handle: '@jisoujang',
          url: 'https://www.youtube.com/@jisoujang',
        },
        full: {
          title: fullChannel.channelTitle,
          handle: '@jisoujang_full',
          url: 'https://www.youtube.com/@jisoujang_full',
        },
      },
      main: {
        longform,
        shorts,
      },
      full: fullVideos,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: error.message,
    });
  }
}

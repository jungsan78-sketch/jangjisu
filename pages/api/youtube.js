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

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

async function getPlaylistVideos(playlistId, apiKey, maxResults = 30) {
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

  return uniqueBy(
    playlistJson.items
      .map((item) => {
        const videoId = item.contentDetails?.videoId;
        const details = statsMap.get(videoId);
        if (!videoId || !details) return null;

        const duration = details.contentDetails?.duration || '';
        const durationSeconds = getDurationSeconds(duration);

        return {
          id: videoId,
          title: item.snippet?.title || details.snippet?.title || '',
          thumbnail:
            item.snippet?.thumbnails?.maxres?.url ||
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            details.snippet?.thumbnails?.maxres?.url ||
            details.snippet?.thumbnails?.high?.url ||
            details.snippet?.thumbnails?.medium?.url ||
            '',
          publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || '',
          publishedAtText: formatPublishedAt(item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || ''),
          views: details.statistics?.viewCount || '0',
          viewsText: formatViews(details.statistics?.viewCount || '0'),
          duration,
          durationText: formatDuration(duration),
          durationSeconds,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      })
      .filter(Boolean),
    (item) => item.id
  );
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

    const [latestRaw, fullRaw] = await Promise.all([
      getPlaylistVideos(mainChannel.uploadsPlaylistId, apiKey, 24),
      getPlaylistVideos(fullChannel.uploadsPlaylistId, apiKey, 24),
    ]);

    const latestVideos = fillToCount(
      latestRaw.filter((video) => video.durationSeconds > 0),
      latestRaw,
      9
    );

    const fullVideos = fillToCount(
      fullRaw.filter((video) => video.durationSeconds > 180),
      fullRaw,
      9
    );

    return res.status(200).json({
      ok: true,
      channels: {
        latest: {
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
      latestVideos,
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

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.json({ ok: false, error: "NO API KEY" });
  }

  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang&key=${apiKey}`
  );
  const channel = await channelRes.json();

  const uploads = channel.items[0].contentDetails.relatedPlaylists.uploads;

  const listRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=25&key=${apiKey}`
  );
  const list = await listRes.json();

  const ids = list.items.map(v => v.contentDetails.videoId).join(',');

  const videoRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids}&key=${apiKey}`
  );
  const videos = await videoRes.json();

  const map = {};
  videos.items.forEach(v => map[v.id] = v);

  const result = list.items.map(v => {
    const detail = map[v.contentDetails.videoId];
    const duration = detail.contentDetails.duration;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const sec =
      (parseInt(match[1]||0)*3600) +
      (parseInt(match[2]||0)*60) +
      parseInt(match[3]||0);

    return {
      id: v.contentDetails.videoId,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.high.url,
      url: `https://www.youtube.com/watch?v=${v.contentDetails.videoId}`,
      sec
    };
  });

  const shorts = result.filter(v => v.sec <= 60);
  const long = result.filter(v => v.sec > 60);

  res.json({
    ok: true,
    shorts: shorts.slice(0,8),
    videos: long.slice(0,9)
  });
}

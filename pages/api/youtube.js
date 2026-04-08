export default async function handler(req, res) {
  const API_KEY = process.env.YOUTUBE_API_KEY;

  const MAIN_CHANNEL = "UCUu4o4YxE4V2z0w7Wc9H9Og"; // jisoujang
  const FULL_CHANNEL = "UC0v3tFhTz7s7aQX6ixkmKsg"; // jisoujang_full

  try {
    const getUploadsPlaylist = async (channelId) => {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`
      );
      const j = await r.json();
      return j.items[0].contentDetails.relatedPlaylists.uploads;
    };

    const getVideos = async (playlistId) => {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=8&playlistId=${playlistId}&key=${API_KEY}`
      );
      const j = await r.json();

      const ids = j.items.map(i => i.snippet.resourceId.videoId).join(",");

      const v = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${ids}&key=${API_KEY}`
      );
      const vj = await v.json();

      return j.items.map((item, i) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        date: item.snippet.publishedAt,
        stats: vj.items[i],
      }));
    };

    const mainPlaylist = await getUploadsPlaylist(MAIN_CHANNEL);
    const fullPlaylist = await getUploadsPlaylist(FULL_CHANNEL);

    const mainVideos = await getVideos(mainPlaylist);
    const fullVideos = await getVideos(fullPlaylist);

    const shorts = mainVideos.filter(v =>
      v.stats.contentDetails.duration.includes("PT") &&
      !v.stats.contentDetails.duration.includes("M")
    );

    const longform = mainVideos.filter(v =>
      v.stats.contentDetails.duration.includes("M")
    );

    res.json({
      ok: true,
      main: {
        longform,
        shorts
      },
      full: fullVideos
    });

  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
}
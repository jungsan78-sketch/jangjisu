export default async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) return res.json({ ok:false, error:"NO KEY" });

  const ch1 = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang&key=${key}`).then(r=>r.json());
  const ch2 = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang_full&key=${key}`).then(r=>r.json());

  const up1 = ch1.items[0].contentDetails.relatedPlaylists.uploads;
  const up2 = ch2.items[0].contentDetails.relatedPlaylists.uploads;

  async function getList(pid){
    const list = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${pid}&maxResults=25&key=${key}`).then(r=>r.json());
    const ids = list.items.map(v=>v.contentDetails.videoId).join(',');

    const vids = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids}&key=${key}`).then(r=>r.json());

    const map = {};
    vids.items.forEach(v=>map[v.id]=v);

    return list.items.map(v=>{
      const d = map[v.contentDetails.videoId];
      const dur = d.contentDetails.duration;

      const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const sec = (m[1]?+m[1]*3600:0)+(m[2]?+m[2]*60:0)+(m[3]?+m[3]:0);

      return {
        id:v.contentDetails.videoId,
        title:v.snippet.title,
        thumb:v.snippet.thumbnails.high.url,
        views:d.statistics.viewCount,
        date:v.snippet.publishedAt,
        duration:dur,
        sec
      }
    })
  }

  const main = await getList(up1);
  const full = await getList(up2);

  const shorts = main.filter(v=>v.sec<=60);
  const long = main.filter(v=>v.sec>60);

  res.json({
    ok:true,
    shorts:shorts.slice(0,8),
    videos:long.slice(0,9),
    full:full.slice(0,9)
  })
}

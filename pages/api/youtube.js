export default async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) return res.status(500).json({ ok: false, error: "NO KEY" });

  try {
    // 1. 성능 최적화: Promise.all을 사용해 채널 정보 병렬 호출
    const [ch1, ch2] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang&key=${key}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang_full&key=${key}`).then(r => r.json())
    ]);

    // 2. 안정성 최적화: 채널 데이터 응답 오류 방어
    if (!ch1.items?.[0] || !ch2.items?.[0]) {
      return res.status(404).json({ ok: false, error: "채널 데이터를 불러올 수 없습니다." });
    }

    const up1 = ch1.items[0].contentDetails.relatedPlaylists.uploads;
    const up2 = ch2.items[0].contentDetails.relatedPlaylists.uploads;

    async function getList(pid) {
      const list = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${pid}&maxResults=25&key=${key}`).then(r => r.json());
      
      if (!list.items || list.items.length === 0) return [];

      const ids = list.items.map(v => v.contentDetails.videoId).join(',');
      const vids = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids}&key=${key}`).then(r => r.json());

      const map = {};
      if (vids.items) {
        vids.items.forEach(v => map[v.id] = v);
      }

      return list.items.map(v => {
        const d = map[v.contentDetails.videoId];
        if (!d) return null;

        const dur = d.contentDetails.duration;
        const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const sec = (m[1] ? +m[1] * 3600 : 0) + (m[2] ? +m[2] * 60 : 0) + (m[3] ? +m[3] : 0);

        const snippet = d.snippet;
        const hasShortsKeyword = 
          /#shorts/i.test(snippet.title) || 
          /#shorts/i.test(snippet.description) || 
          (snippet.tags && snippet.tags.some(tag => tag.toLowerCase().includes('shorts')));

        const isShorts = sec <= 60 && hasShortsKeyword;

        // 🚨 핵심 수정 부분: 썸네일 완전 탐색 폴백(Fallback) 로직
        // 최고 화질부터 최저 화질까지 순차적으로 확인하여 존재하는 이미지를 무조건 가져옵니다.
        const thumbnails = snippet.thumbnails || {};
        const bestThumbnailUrl = 
          thumbnails.maxres?.url || 
          thumbnails.standard?.url || 
          thumbnails.high?.url || 
          thumbnails.medium?.url || 
          thumbnails.default?.url || 
          ''; // 모든 화질이 없을 경우를 대비한 최후의 안전망 (빈 문자열)

        return {
          id: v.contentDetails.videoId,
          title: snippet.title,
          thumb: bestThumbnailUrl, // 수정된 썸네일 로직 적용
          views: d.statistics.viewCount,
          date: snippet.publishedAt,
          duration: dur,
          sec,
          isShorts
        };
      }).filter(Boolean);
    }

    // 4. 성능 최적화: 영상 목록 데이터 파싱 병렬 처리
    const [main, full] = await Promise.all([
      getList(up1),
      getList(up2)
    ]);

    // 5. 확정된 분류 기준 적용 (쇼츠/롱폼 분리)
    const shorts = main.filter(v => v.isShorts);
    const long = main.filter(v => !v.isShorts);

    return res.status(200).json({
      ok: true,
      shorts: shorts.slice(0, 8),
      videos: long.slice(0, 9),
      full: full.slice(0, 9)
    });

  } catch (error) {
    console.error("YouTube API Error:", error);
    return res.status(500).json({ ok: false, error: "서버 처리 중 오류가 발생했습니다." });
  }
}
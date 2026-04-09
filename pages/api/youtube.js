export default async function handler(req, res) {
  // 🚨 1. 강력한 캐시 무효화 (브라우저가 예전 데이터를 기억하지 못하게 헤더 설정)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const key = process.env.YOUTUBE_API_KEY;

  if (!key) return res.status(500).json({ ok: false, error: "NO KEY" });

  try {
    // 🚨 2. API 요청 시 서버 측 캐시 무효화 옵션 추가
    const fetchOptions = { cache: 'no-store' };

    // 성능 최적화: 채널 정보 병렬 호출
    const [ch1, ch2] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang&key=${key}`, fetchOptions).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang_full&key=${key}`, fetchOptions).then(r => r.json())
    ]);

    if (!ch1.items?.[0] || !ch2.items?.[0]) {
      return res.status(404).json({ ok: false, error: "채널 데이터를 불러올 수 없습니다." });
    }

    const up1 = ch1.items[0].contentDetails.relatedPlaylists.uploads;
    const up2 = ch2.items[0].contentDetails.relatedPlaylists.uploads;

    async function getList(pid) {
      const list = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${pid}&maxResults=25&key=${key}`, fetchOptions).then(r => r.json());
      
      if (!list.items || list.items.length === 0) return [];

      const ids = list.items.map(v => v.contentDetails.videoId).join(',');
      const vids = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids}&key=${key}`, fetchOptions).then(r => r.json());

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

        // 🚨 3. 쇼츠 분류 기준 완화: 태그 상관없이 61초 이하(오차 감안)면 무조건 쇼츠로 판별
        const isShorts = sec <= 61;

        // 🚨 4. 썸네일 완전 탐색 폴백 로직 (빈 화면 방지)
        const thumbnails = d.snippet.thumbnails || {};
        const bestThumbnailUrl = 
          thumbnails.maxres?.url || 
          thumbnails.standard?.url || 
          thumbnails.high?.url || 
          thumbnails.medium?.url || 
          thumbnails.default?.url || 
          '';

        return {
          id: v.contentDetails.videoId,
          title: d.snippet.title,
          thumb: bestThumbnailUrl,
          views: d.statistics.viewCount,
          date: d.snippet.publishedAt,
          duration: dur,
          sec,
          isShorts
        };
      }).filter(Boolean);
    }

    // 영상 목록 파싱 병렬 처리
    const [main, full] = await Promise.all([
      getList(up1),
      getList(up2)
    ]);

    // 본채널(main) 영상만 쇼츠와 롱폼으로 분리합니다.
    const shorts = main.filter(v => v.isShorts);
    const long = main.filter(v => !v.isShorts);

    return res.status(200).json({
      ok: true,
      shorts: shorts.slice(0, 8),
      videos: long.slice(0, 9),
      // 🚨 5. 풀영상 채널은 필터링 없이 그대로 9개 가져옵니다 (절대 건드리지 않음)
      full: full.slice(0, 9)
    });

  } catch (error) {
    console.error("YouTube API Error:", error);
    return res.status(500).json({ ok: false, error: "서버 처리 중 오류가 발생했습니다." });
  }
}

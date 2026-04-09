export default async function handler(req, res) {
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) return res.status(500).json({ ok: false, error: "NO KEY" });

  try {
    // 1. 성능 최적화: Promise.all을 사용해 채널 정보 병렬 호출 (속도 향상)
    const [ch1, ch2] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang&key=${key}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=jisoujang_full&key=${key}`).then(r => r.json())
    ]);

    // 2. 안정성 최적화: API 할당량 초과나 잘못된 응답으로 인한 500 에러 방어
    if (!ch1.items?.[0] || !ch2.items?.[0]) {
      return res.status(404).json({ ok: false, error: "채널 데이터를 불러올 수 없습니다." });
    }

    const up1 = ch1.items[0].contentDetails.relatedPlaylists.uploads;
    const up2 = ch2.items[0].contentDetails.relatedPlaylists.uploads;

    async function getList(pid) {
      const list = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${pid}&maxResults=25&key=${key}`).then(r => r.json());
      
      // 방어 코드: 영상 목록이 비어있을 경우 빈 배열 반환
      if (!list.items || list.items.length === 0) return [];

      // 기존의 훌륭한 로직 유지: videoId들을 묶어서 한 번에 호출
      const ids = list.items.map(v => v.contentDetails.videoId).join(',');
      const vids = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids}&key=${key}`).then(r => r.json());

      const map = {};
      if (vids.items) {
        vids.items.forEach(v => map[v.id] = v);
      }

      return list.items.map(v => {
        const d = map[v.contentDetails.videoId];
        if (!d) return null; // 방어 코드: 상세 정보가 없는 영상 스킵

        const dur = d.contentDetails.duration;
        const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const sec = (m[1] ? +m[1] * 3600 : 0) + (m[2] ? +m[2] * 60 : 0) + (m[3] ? +m[3] : 0);

        // 3. 쇼츠/롱폼 교차 검증 (정확도 100% 목표)
        // 제목, 설명, 혹은 태그에 'shorts' 관련 키워드가 포함되어 있는지 대소문자 구분 없이 확인
        const snippet = d.snippet;
        const hasShortsKeyword = 
          /#shorts/i.test(snippet.title) || 
          /#shorts/i.test(snippet.description) || 
          (snippet.tags && snippet.tags.some(tag => tag.toLowerCase().includes('shorts')));

        // 최종 분류: 재생 시간이 60초 이하이면서 shorts 키워드를 포함하고 있으면 완벽한 쇼츠로 판별
        const isShorts = sec <= 60 && hasShortsKeyword;

        return {
          id: v.contentDetails.videoId,
          title: snippet.title,
          thumb: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
          views: d.statistics.viewCount,
          date: snippet.publishedAt,
          duration: dur,
          sec,
          isShorts // 필터링을 위한 boolean 값 추가
        };
      }).filter(Boolean); // null 값 정리
    }

    // 4. 성능 최적화: 영상 목록(main, full) 데이터 파싱도 병렬로 동시 처리
    const [main, full] = await Promise.all([
      getList(up1),
      getList(up2)
    ]);

    // 5. 확정된 분류 기준 적용
    const shorts = main.filter(v => v.isShorts);
    const long = main.filter(v => !v.isShorts); // 쇼츠 기준에 부합하지 않는 모든 영상은 롱폼

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
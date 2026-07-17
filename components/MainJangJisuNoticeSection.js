import { useEffect, useState } from 'react';
import LatestNoticeGrid from './notices/LatestNoticeGrid';

const NOTICE_REFRESH_MS = 30 * 60 * 1000;
const JANGJISU_BOARD_URL = 'https://www.sooplive.com/station/iamquaddurup/board';

export default function MainJangJisuNoticeSection() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadNotices = async () => {
      try {
        const res = await fetch('/api/jangjisu-notices');
        const json = await res.json();
        if (mounted) setNotices(Array.isArray(json.notices) ? json.notices : []);
      } catch {
        if (mounted) setNotices([]);
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    loadNotices();
    const timer = setInterval(loadNotices, NOTICE_REFRESH_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <section id="notice" data-main-notice="true" className="relative mx-auto mt-8 max-w-7xl bg-transparent px-6 py-8 text-white shadow-none lg:px-8 lg:py-10">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black tracking-[0.38em] text-sky-300/65 sm:text-[11px]">LATEST UPDATES</div>
          <h3 className="mt-2 text-[32px] font-black tracking-[-0.045em] text-white sm:text-[40px]">최신 공지소식</h3>
        </div>
        <a href={JANGJISU_BOARD_URL} target="_blank" rel="noreferrer" className="shrink-0 pb-1 text-xs font-bold text-white/58 transition hover:translate-x-0.5 hover:text-white sm:text-sm">더보기 →</a>
      </div>

      <LatestNoticeGrid
        notices={notices.slice(0, 8)}
        loaded={loaded}
        emptyMessage="최근 1주일 기준으로 수집된 장지수 공지가 없습니다."
      />
    </section>
  );
}

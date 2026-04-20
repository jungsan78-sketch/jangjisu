import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY_PREFIX = 'sou-new-youtube-toast:';

function getRecentItems(items = []) {
  const dayMs = 24 * 60 * 60 * 1000;
  return (items || []).filter((item) => {
    const time = new Date(item?.publishedAt || '').getTime();
    return Number.isFinite(time) && Date.now() - time < dayMs;
  });
}

export default function NewYoutubeToast({ videos = [], shorts = [], scope = 'main' }) {
  const [visible, setVisible] = useState(false);
  const recentVideos = useMemo(() => getRecentItems(videos), [videos]);
  const recentShorts = useMemo(() => getRecentItems(shorts), [shorts]);
  const notice = useMemo(() => {
    const hasVideos = recentVideos.length > 0;
    const hasShorts = recentShorts.length > 0;
    if (!hasVideos && !hasShorts) return null;
    const newestIds = [...recentVideos, ...recentShorts]
      .map((item) => item?.id)
      .filter(Boolean)
      .sort()
      .join('|');
    const message = hasVideos && hasShorts
      ? '새로운 편집 영상과 쇼츠가 업로드되었습니다'
      : hasShorts
        ? '새로운 쇼츠가 업로드되었습니다'
        : '새로운 편집 영상이 업로드되었습니다';
    return { message, key: `${STORAGE_KEY_PREFIX}${scope}:${newestIds}` };
  }, [recentVideos, recentShorts, scope]);

  useEffect(() => {
    if (!notice || typeof window === 'undefined') return undefined;
    try {
      if (window.localStorage.getItem(notice.key)) return undefined;
      window.localStorage.setItem(notice.key, '1');
    } catch {}
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!visible || !notice) return null;

  const scrollToYoutube = () => {
    const target = document.querySelector('#youtube, #recent-youtube');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setVisible(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[96px] z-[110] flex justify-center px-4">
      <div className="relative pointer-events-auto overflow-hidden rounded-[26px] border border-red-200/20 bg-[linear-gradient(180deg,rgba(18,23,35,0.94),rgba(8,10,16,0.96))] px-6 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.48),0_0_34px_rgba(239,68,68,0.13)] backdrop-blur-xl animate-[newYoutubeToastIn_360ms_ease-out]">
        <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-red-500/20 blur-2xl" />
        <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-amber-300/14 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-red-200/80 animate-[youtubeSpark_1500ms_ease-out_infinite]" style={{ left: `${18 + i * 12}%`, top: `${18 + (i % 3) * 18}%`, animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
        <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200/20 bg-red-500/16 text-xl shadow-[0_0_24px_rgba(239,68,68,0.18)]">🎉</div>
          <div>
            <div className="text-base font-black text-white sm:text-lg">{notice.message}</div>
            <button onClick={scrollToYoutube} className="mt-2 rounded-full border border-white/10 bg-white/7 px-4 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/12 hover:text-white">YOUTUBE 탭에서 확인하기</button>
          </div>
          <button onClick={() => setVisible(false)} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/30 text-xs font-black text-white/55 transition hover:text-white" aria-label="닫기">×</button>
        </div>
      </div>
    </div>
  );
}

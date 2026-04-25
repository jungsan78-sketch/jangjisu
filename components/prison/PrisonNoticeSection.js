import { useEffect, useMemo, useState } from 'react';

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}시간 전`;
  return `${Math.floor(diffMs / day)}일 전`;
}

function NoticeCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="group relative block overflow-visible rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 transition hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3 text-[11px] font-black tracking-[0.12em] text-white/42">
        <span>{item.member}</span>
        <span>{formatRelativeTime(item.createdAt)}</span>
      </div>
      <div className="mt-3 line-clamp-2 text-[15px] font-semibold leading-6 text-white/92">{item.title}</div>
      <div className="mt-3 text-xs font-semibold text-cyan-100/80">글 열기</div>
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 hidden w-[300px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,12,22,0.98),rgba(4,8,15,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.46)] group-hover:block">
        <div className="border-b border-white/8 px-4 py-3">
          <div className="text-[11px] font-black tracking-[0.14em] text-cyan-100/70">{item.member} 최근 글 요약</div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="text-sm font-black leading-6 text-white">{item.title}</div>
          <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold leading-6 text-white/75">{item.summary || '요약 준비중'}</div>
        </div>
      </div>
    </a>
  );
}

export default function PrisonNoticeSection() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadNotices = async () => {
      try {
        const res = await fetch('/api/prison-notices');
        const json = await res.json();
        if (!mounted) return;
        setNotices(Array.isArray(json.notices) ? json.notices : []);
      } catch {
        if (mounted) setNotices([]);
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    loadNotices();
    const timer = setInterval(loadNotices, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const grouped = useMemo(() => notices.slice(0, 18), [notices]);

  return (
    <section id="notice" className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/20 sm:mt-8 sm:rounded-[32px] sm:p-6 lg:p-8">
      <div className="mb-4 flex items-center gap-3 sm:mb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200/18 bg-amber-200/10 text-base text-amber-100 sm:h-10 sm:w-10 sm:text-lg">📢</span>
        <h3 className="text-[24px] font-black tracking-tight text-white sm:text-[34px]">최근 1주일 멤버 글</h3>
      </div>
      {!loaded ? (
        <div className="rounded-[20px] border border-white/10 bg-[#0b0f17] p-5 text-sm font-semibold text-white/65 sm:rounded-[24px] sm:p-6">최근 게시글을 불러오는 중입니다.</div>
      ) : grouped.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map((item) => <NoticeCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="rounded-[20px] border border-white/10 bg-[#0b0f17] p-5 text-sm font-semibold text-white/65 sm:rounded-[24px] sm:p-6">최근 1주일 기준으로 수집된 멤버 글이 없습니다.</div>
      )}
    </section>
  );
}

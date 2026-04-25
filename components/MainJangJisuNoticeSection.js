import { useEffect, useState } from 'react';

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return '방금 전';
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}시간 전`;
  return `${Math.floor(diffMs / day)}일 전`;
}

function NoticeCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="group relative block min-h-[210px] overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.20)] transition duration-300 hover:-translate-y-1 hover:border-blue-200/35 hover:bg-white/[0.07] hover:shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-blue-200/[0.035] transition group-hover:bg-blue-200/[0.07]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-lg shadow-black/20">
            {item.profileImage ? <img src={item.profileImage} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-black text-white/90">{item.member || '장지수'}</div>
            <div className="mt-0.5 text-[11px] font-bold tracking-[0.08em] text-blue-100/45">SOOP STATION</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black text-white/65">{formatRelativeTime(item.createdAt)}</span>
      </div>

      <div className="relative mt-5 line-clamp-2 text-[17px] font-black leading-7 text-white">{item.title}</div>
      <div className="relative mt-3 line-clamp-3 min-h-[66px] rounded-[18px] border border-white/[0.07] bg-black/15 px-4 py-3 text-[13px] font-semibold leading-[22px] text-white/65">
        {item.summary || '본문 요약을 불러오는 중입니다.'}
      </div>
      <div className="relative mt-4 flex items-center justify-between">
        <span className="text-xs font-black text-blue-100/85">글 열기</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-100/15 bg-blue-100/10 text-sm text-blue-50 transition group-hover:translate-x-0.5 group-hover:border-blue-100/30">↗</span>
      </div>
    </a>
  );
}

export default function MainJangJisuNoticeSection() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadNotices = async () => {
      try {
        const res = await fetch('/api/jangjisu-notices');
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

  return (
    <section id="notice" className="relative mx-auto mt-8 max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-white shadow-xl shadow-black/20 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200/20 bg-blue-500/12 text-lg text-blue-100">📢</span>
          <div>
            <h3 className="text-[28px] font-black tracking-tight text-white sm:text-[34px]">장지수 공지</h3>
            <p className="mt-1 text-sm font-semibold text-white/45">장지수 방송국에 직접 올라온 최근 글만 보여줍니다.</p>
          </div>
        </div>
        {notices.length ? <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white/55">최근 {notices.length}개</div> : null}
      </div>

      {!loaded ? (
        <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-sm font-semibold text-white/65">장지수 공지를 불러오는 중입니다.</div>
      ) : notices.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notices.slice(0, 6).map((item) => <NoticeCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-sm font-semibold text-white/65">최근 1주일 기준으로 수집된 장지수 공지가 없습니다.</div>
      )}
    </section>
  );
}

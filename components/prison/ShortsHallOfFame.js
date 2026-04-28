import { useEffect, useState } from 'react';
import { formatRelativeTime } from './prisonShared';

const SHORTS_HALL_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function HallShortCard({ label, subLabel, video, highlight = false }) {
  return (
    <a
      href={video?.url || '#'}
      target={video?.url ? '_blank' : undefined}
      rel={video?.url ? 'noreferrer' : undefined}
      className={`group block overflow-hidden rounded-[24px] border p-3 transition duration-300 sm:p-4 ${highlight ? 'border-amber-200/24 bg-amber-300/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_34px_rgba(245,158,11,0.13),0_20px_45px_rgba(0,0,0,0.24)]' : 'border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_38px_rgba(0,0,0,0.20)] hover:border-cyan-100/22 hover:bg-cyan-300/[0.07] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_28px_rgba(103,232,249,0.12),0_22px_46px_rgba(0,0,0,0.25)]'} ${video?.url ? 'hover:-translate-y-1' : 'pointer-events-none opacity-50'}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className={`text-[12px] font-black tracking-[0.12em] ${highlight ? 'text-amber-100' : 'text-cyan-100'}`}>{label}</div>
          <div className="mt-0.5 text-[11px] font-black text-white/42">{subLabel}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${highlight ? 'bg-amber-300/14 text-amber-50' : 'bg-cyan-300/10 text-cyan-50'}`}>{video?.member || '-'}</span>
      </div>

      <div className="relative overflow-hidden rounded-[18px] bg-[#07111f] aspect-[9/14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {video?.thumbnail ? <img src={video.thumbnail} alt={video.title || ''} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center text-3xl">🏆</div>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/32 to-transparent p-3">
          <div className="line-clamp-2 text-[12px] font-black leading-5 text-white sm:text-[13px]">{video?.title || '쇼츠 데이터 준비중'}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-black text-white/52">
        <span>{video?.viewsText ? `조회 ${video.viewsText}` : '조회수 집계중'}</span>
        <span>{formatRelativeTime(video?.publishedAt) || video?.publishedAtText || ''}</span>
      </div>
    </a>
  );
}

export default function ShortsHallOfFame() {
  const [payload, setPayload] = useState({ loaded: false, slots: {} });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/shorts-hall-of-fame');
        const json = res.ok ? await res.json() : null;
        if (!mounted) return;
        setPayload({ ...(json || {}), loaded: true });
      } catch {
        if (!mounted) return;
        setPayload({ loaded: true, slots: {} });
      }
    }

    load();
    const timer = setInterval(load, SHORTS_HALL_REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const slots = payload?.slots || {};
  const hasAny = Boolean(slots.memberTop1 || slots.jangjisu || slots.memberTop2);
  if (payload.loaded && !hasAny) return null;

  return (
    <section className="mb-10 w-full max-w-none rounded-[28px] border border-white/8 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_22px_58px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[24px] font-black tracking-[-0.04em] text-white sm:text-[30px]">🏆 최근 30일 명예의 쇼츠</div>
          <div className="mt-1 text-xs font-black text-white/45">최근 30일 기준 조회수 상위 쇼츠</div>
        </div>
        <span className="w-fit rounded-full bg-white/[0.055] px-3 py-1.5 text-[11px] font-black text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">6시간마다 갱신</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:gap-5">
        <HallShortCard label="멤버 TOP 1" subLabel="조회수 1위" video={slots.memberTop1} />
        <HallShortCard label="장지수 (수장)" subLabel="장지수 최고" video={slots.jangjisu} highlight />
        <HallShortCard label="멤버 TOP 2" subLabel="조회수 2위" video={slots.memberTop2} />
      </div>
    </section>
  );
}

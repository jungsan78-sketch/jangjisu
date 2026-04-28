import { useEffect, useState } from 'react';
import { formatRelativeTime } from './prisonShared';

const SHORTS_HALL_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function HallSpot({ label, rankLabel, video, highlight = false }) {
  return (
    <a
      href={video?.url || '#'}
      target={video?.url ? '_blank' : undefined}
      rel={video?.url ? 'noreferrer' : undefined}
      className={`group relative flex min-w-0 flex-col items-center text-center transition duration-500 ${highlight ? 'md:-translate-y-8' : 'md:translate-y-5'} ${video?.url ? 'hover:-translate-y-1 md:hover:-translate-y-10' : 'pointer-events-none opacity-55'}`}
    >
      <div className={`pointer-events-none absolute -top-10 h-44 w-44 rounded-full blur-3xl ${highlight ? 'bg-amber-300/22' : 'bg-cyan-300/12'}`} />
      <div className="relative z-10 mb-3">
        <div className={`text-[13px] font-black tracking-[0.14em] ${highlight ? 'text-amber-50' : 'text-cyan-50'}`}>{label}</div>
        <div className="mt-2 text-[26px] font-black tracking-[-0.06em] text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.16)] sm:text-[32px]">
          {video?.viewsText ? `조회 ${video.viewsText}` : '조회수 집계중'}
        </div>
        <div className="mt-1 text-[12px] font-black text-white/48">{formatRelativeTime(video?.publishedAt) || video?.publishedAtText || rankLabel}</div>
      </div>

      <div className={`relative z-10 overflow-hidden rounded-[24px] bg-black/20 shadow-[0_28px_70px_rgba(0,0,0,0.38),0_0_42px_rgba(103,232,249,0.10)] ring-1 ring-white/10 transition duration-500 group-hover:shadow-[0_34px_90px_rgba(0,0,0,0.46),0_0_55px_rgba(251,191,36,0.16)] ${highlight ? 'w-[210px] sm:w-[250px] lg:w-[292px]' : 'w-[178px] sm:w-[218px] lg:w-[252px]'}`}>
        <div className="aspect-[9/14] overflow-hidden rounded-[24px]">
          {video?.thumbnail ? (
            <img src={video.thumbnail} alt={video.title || ''} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.20),transparent_56%),linear-gradient(180deg,#101827,#030712)] text-4xl">🏆</div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/86 via-black/36 to-transparent p-4">
          <div className="line-clamp-2 text-[13px] font-black leading-5 text-white sm:text-[15px] sm:leading-6">{video?.title || '쇼츠 데이터 준비중'}</div>
        </div>
        <div className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-black shadow-[0_10px_26px_rgba(0,0,0,0.30)] backdrop-blur ${highlight ? 'bg-amber-300/85 text-[#251403]' : 'bg-cyan-200/82 text-[#04111c]'}`}>{video?.member || '-'}</div>
      </div>

      <div className={`relative z-0 mt-4 h-5 rounded-[50%] blur-[1px] ${highlight ? 'w-[260px] bg-amber-200/16 shadow-[0_0_34px_rgba(251,191,36,0.22)]' : 'w-[190px] bg-cyan-200/10 shadow-[0_0_26px_rgba(103,232,249,0.12)]'}`} />
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
    <section className="relative mb-14 w-full max-w-none overflow-hidden rounded-[34px] px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.16),transparent_32%),radial-gradient(circle_at_20%_45%,rgba(103,232,249,0.13),transparent_28%),radial-gradient(circle_at_80%_45%,rgba(147,197,253,0.11),transparent_26%)]" />
      <div className="pointer-events-none absolute left-[14%] top-16 h-1.5 w-1.5 rounded-full bg-cyan-200/80 shadow-[0_0_18px_rgba(103,232,249,0.85)]" />
      <div className="pointer-events-none absolute left-[31%] top-28 h-1 w-1 rounded-full bg-amber-200/80 shadow-[0_0_16px_rgba(251,191,36,0.75)]" />
      <div className="pointer-events-none absolute right-[22%] top-20 h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.75)]" />
      <div className="pointer-events-none absolute right-[12%] bottom-24 h-1 w-1 rounded-full bg-cyan-200/70 shadow-[0_0_16px_rgba(103,232,249,0.7)]" />

      <div className="relative z-10 mb-12 text-center">
        <div className="text-[30px] font-black tracking-[-0.06em] text-white drop-shadow-[0_0_26px_rgba(251,191,36,0.18)] sm:text-[42px]">🏆 최근 30일 명예의 쇼츠</div>
        <div className="mt-2 text-sm font-black text-white/48">최근 30일 기준 조회수 상위 쇼츠 · 6시간마다 갱신</div>
      </div>

      <div className="relative z-10 grid items-end justify-items-center gap-8 md:grid-cols-[1fr_1.18fr_1fr] md:gap-6 lg:gap-10">
        <HallSpot label="멤버 TOP 1" rankLabel="조회수 1위" video={slots.memberTop1} />
        <HallSpot label="장지수 (수장)" rankLabel="장지수 최고" video={slots.jangjisu} highlight />
        <HallSpot label="멤버 TOP 2" rankLabel="조회수 2위" video={slots.memberTop2} />
      </div>
    </section>
  );
}

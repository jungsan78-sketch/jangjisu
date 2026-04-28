import { useEffect, useState } from 'react';
import { formatRelativeTime } from './prisonShared';

const SHORTS_HALL_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function ChiefBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-100/32 bg-[linear-gradient(135deg,rgba(103,232,249,0.24),rgba(139,92,246,0.22),rgba(226,232,240,0.16))] px-3 py-1 text-[11px] font-black text-cyan-50 shadow-[0_0_18px_rgba(103,232,249,0.25),inset_0_1px_0_rgba(255,255,255,0.20)]">
      수장
    </span>
  );
}

function getToneClasses(tone, highlight) {
  if (highlight) {
    return {
      label: 'text-cyan-50',
      glow: 'bg-[radial-gradient(circle,rgba(103,232,249,0.18),transparent_62%)]',
      ring: 'ring-cyan-100/18 shadow-[0_32px_92px_rgba(0,0,0,0.46),0_0_58px_rgba(103,232,249,0.18),0_0_38px_rgba(139,92,246,0.13)]',
      pedestal: 'w-[282px] bg-[radial-gradient(ellipse,rgba(103,232,249,0.20),rgba(139,92,246,0.10),transparent_68%)] shadow-[0_0_42px_rgba(103,232,249,0.18)]',
      memberBadge: 'bg-cyan-100/82 text-[#03131d]',
    };
  }

  if (tone === 'gold') {
    return {
      label: 'text-amber-100 drop-shadow-[0_0_14px_rgba(251,191,36,0.24)]',
      glow: 'bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_62%)]',
      ring: 'ring-amber-100/18 shadow-[0_26px_76px_rgba(0,0,0,0.40),0_0_46px_rgba(251,191,36,0.16)]',
      pedestal: 'w-[216px] bg-[radial-gradient(ellipse,rgba(251,191,36,0.20),rgba(245,158,11,0.10),transparent_68%)] shadow-[0_0_34px_rgba(251,191,36,0.18)]',
      memberBadge: 'bg-amber-200/86 text-[#241303]',
    };
  }

  return {
    label: 'text-slate-100 drop-shadow-[0_0_14px_rgba(226,232,240,0.18)]',
    glow: 'bg-[radial-gradient(circle,rgba(226,232,240,0.16),transparent_62%)]',
    ring: 'ring-slate-100/18 shadow-[0_26px_76px_rgba(0,0,0,0.40),0_0_46px_rgba(226,232,240,0.12)]',
    pedestal: 'w-[216px] bg-[radial-gradient(ellipse,rgba(226,232,240,0.16),rgba(148,163,184,0.10),transparent_68%)] shadow-[0_0_34px_rgba(226,232,240,0.13)]',
    memberBadge: 'bg-slate-100/84 text-[#07111f]',
  };
}

function HallSpot({ label, medal, video, highlight = false, tone = 'gold' }) {
  const toneClasses = getToneClasses(tone, highlight);
  const timeText = formatRelativeTime(video?.publishedAt) || video?.publishedAtText || '';

  return (
    <a
      href={video?.url || '#'}
      target={video?.url ? '_blank' : undefined}
      rel={video?.url ? 'noreferrer' : undefined}
      className={`group relative flex min-w-0 flex-col items-center text-center transition duration-500 ${highlight ? 'md:-translate-y-7' : 'md:translate-y-5'} ${video?.url ? 'hover:-translate-y-1 md:hover:-translate-y-9' : 'pointer-events-none opacity-55'}`}
    >
      <div className={`pointer-events-none absolute -top-14 h-52 w-52 rounded-full blur-3xl ${toneClasses.glow}`} />

      <div className="relative z-10 mb-5 flex min-h-[104px] flex-col items-center justify-end">
        <div className={`flex items-center justify-center gap-2 text-[14px] font-black tracking-[0.10em] ${toneClasses.label}`}>
          {highlight ? (
            <>
              <span>장지수</span>
              <ChiefBadge />
            </>
          ) : (
            <>
              <span className="text-[18px] leading-none">{medal}</span>
              <span>{label}</span>
            </>
          )}
        </div>
        <div className="mt-2 text-[15px] font-black text-white/82">{video?.member || '-'}</div>
        <div className="mt-2 text-[27px] font-black tracking-[-0.07em] text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.16)] sm:text-[34px]">
          {video?.viewsText ? `조회 ${video.viewsText}` : '조회수 집계중'}
        </div>
        <div className="mt-1 text-[12px] font-black text-white/46">{timeText}</div>
      </div>

      <div className={`relative z-10 overflow-hidden rounded-[24px] bg-black/20 ring-1 transition duration-500 group-hover:scale-[1.015] ${toneClasses.ring} ${highlight ? 'w-[216px] sm:w-[260px] lg:w-[304px]' : 'w-[184px] sm:w-[224px] lg:w-[258px]'}`}>
        <div className="aspect-[9/14] overflow-hidden rounded-[24px]">
          {video?.thumbnail ? (
            <img src={video.thumbnail} alt={video.title || ''} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.20),transparent_56%),linear-gradient(180deg,#101827,#030712)] text-4xl">🏆</div>
          )}
        </div>
        <div className="absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-black shadow-[0_10px_26px_rgba(0,0,0,0.30)] backdrop-blur ${toneClasses.memberBadge}">{video?.member || '-'}</div>
        <div className="absolute inset-x-3 bottom-3 rounded-[16px] border border-white/10 bg-black/58 px-3 py-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
          <div className="line-clamp-2 text-[12px] font-black leading-5 text-white sm:text-[14px] sm:leading-6">{video?.title || '쇼츠 데이터 준비중'}</div>
        </div>
      </div>

      <div className={`relative z-0 mt-4 h-6 rounded-[50%] blur-[1px] ${toneClasses.pedestal}`} />
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(103,232,249,0.13),transparent_26%),radial-gradient(circle_at_18%_42%,rgba(251,191,36,0.17),transparent_28%),radial-gradient(circle_at_82%_42%,rgba(226,232,240,0.14),transparent_27%)]" />
      <div className="pointer-events-none absolute left-[10%] top-14 h-1.5 w-1.5 rounded-full bg-amber-200/90 shadow-[0_0_18px_rgba(251,191,36,0.9)]" />
      <div className="pointer-events-none absolute left-[18%] top-28 h-1 w-1 rounded-full bg-amber-300/80 shadow-[0_0_16px_rgba(251,191,36,0.75)]" />
      <div className="pointer-events-none absolute left-[31%] top-20 h-1 w-1 rounded-full bg-amber-100/80 shadow-[0_0_16px_rgba(251,191,36,0.7)]" />
      <div className="pointer-events-none absolute left-1/2 top-28 h-[340px] w-[250px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(103,232,249,0.16),rgba(139,92,246,0.10),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute right-[28%] top-24 h-1.5 w-1.5 rounded-full bg-cyan-100/80 shadow-[0_0_18px_rgba(103,232,249,0.76)]" />
      <div className="pointer-events-none absolute right-[16%] top-16 h-1.5 w-1.5 rounded-full bg-slate-100/90 shadow-[0_0_18px_rgba(226,232,240,0.75)]" />
      <div className="pointer-events-none absolute right-[9%] bottom-24 h-1 w-1 rounded-full bg-slate-200/80 shadow-[0_0_16px_rgba(226,232,240,0.7)]" />

      <div className="relative z-10 mb-14 text-center">
        <div className="text-[30px] font-black tracking-[-0.06em] text-white drop-shadow-[0_0_26px_rgba(103,232,249,0.15)] sm:text-[42px]">🏆 최근 30일 명예의 쇼츠</div>
        <div className="mt-2 text-sm font-black text-white/48">최근 30일 기준 조회수 상위 쇼츠 · 6시간마다 갱신</div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1260px] flex-col items-center gap-12 md:flex-row md:items-end md:justify-between md:gap-0">
        <div className="flex min-w-[258px] flex-1 justify-center md:justify-start">
          <HallSpot label="멤버 TOP 1" medal="🥇" video={slots.memberTop1} tone="gold" />
        </div>
        <div className="flex min-w-[304px] flex-[1.12] justify-center">
          <HallSpot label="장지수" video={slots.jangjisu} highlight tone="chief" />
        </div>
        <div className="flex min-w-[258px] flex-1 justify-center md:justify-end">
          <HallSpot label="멤버 TOP 2" medal="🥈" video={slots.memberTop2} tone="silver" />
        </div>
      </div>
    </section>
  );
}

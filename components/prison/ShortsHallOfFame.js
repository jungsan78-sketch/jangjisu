import { useEffect, useState } from 'react';
import { formatRelativeTime } from './prisonShared';
import { MemberBadges } from './MemberBadges';

const SHORTS_HALL_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

function stripHashtags(title = '') {
  return String(title)
    .replace(/#[^\s#]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getToneClasses(tone, highlight) {
  if (highlight) {
    return {
      label: 'text-cyan-50',
      glow: 'bg-[radial-gradient(circle,rgba(103,232,249,0.18),transparent_62%)]',
      ring: 'border-cyan-100/25 shadow-[0_34px_94px_rgba(0,0,0,0.52),0_0_62px_rgba(103,232,249,0.20),inset_0_1px_0_rgba(255,255,255,0.15)]',
      plaque: 'border-cyan-100/20 bg-[linear-gradient(135deg,rgba(8,145,178,0.30),rgba(30,41,59,0.92),rgba(109,40,217,0.22))] text-cyan-50',
      accent: 'from-cyan-100 via-white to-violet-300',
      pedestal: 'from-cyan-300/25 via-violet-400/15 to-transparent shadow-[0_0_46px_rgba(103,232,249,0.20)]',
    };
  }

  if (tone === 'gold') {
    return {
      label: 'text-amber-100 drop-shadow-[0_0_14px_rgba(251,191,36,0.24)]',
      glow: 'bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_62%)]',
      ring: 'border-amber-200/30 shadow-[0_28px_82px_rgba(0,0,0,0.46),0_0_48px_rgba(251,191,36,0.18),inset_0_1px_0_rgba(255,255,255,0.13)]',
      plaque: 'border-amber-200/25 bg-[linear-gradient(135deg,rgba(146,64,14,0.46),rgba(30,41,59,0.94),rgba(120,53,15,0.35))] text-amber-100',
      accent: 'from-amber-200 via-yellow-50 to-amber-400',
      pedestal: 'from-amber-300/26 via-orange-400/13 to-transparent shadow-[0_0_40px_rgba(251,191,36,0.18)]',
    };
  }

  return {
    label: 'text-slate-100 drop-shadow-[0_0_14px_rgba(226,232,240,0.18)]',
    glow: 'bg-[radial-gradient(circle,rgba(226,232,240,0.16),transparent_62%)]',
    ring: 'border-slate-200/24 shadow-[0_28px_82px_rgba(0,0,0,0.46),0_0_46px_rgba(226,232,240,0.13),inset_0_1px_0_rgba(255,255,255,0.12)]',
    plaque: 'border-slate-200/20 bg-[linear-gradient(135deg,rgba(71,85,105,0.54),rgba(15,23,42,0.95),rgba(100,116,139,0.35))] text-slate-100',
    accent: 'from-slate-200 via-white to-slate-400',
    pedestal: 'from-slate-200/20 via-slate-400/12 to-transparent shadow-[0_0_38px_rgba(226,232,240,0.14)]',
  };
}

function HallSpot({ medal, award, video, highlight = false, tone = 'gold' }) {
  const toneClasses = getToneClasses(tone, highlight);
  const timeText = formatRelativeTime(video?.publishedAt) || video?.publishedAtText || '';
  const displayTitle = stripHashtags(video?.title) || video?.title || '쇼츠 데이터 준비중';
  const memberName = video?.member || '-';

  return (
    <a
      href={video?.url || '#'}
      target={video?.url ? '_blank' : undefined}
      rel={video?.url ? 'noreferrer' : undefined}
      className={`group relative flex min-w-0 flex-col items-center text-center transition duration-500 ${highlight ? 'md:-translate-y-7' : 'md:translate-y-5'} ${video?.url ? 'hover:-translate-y-1 md:hover:-translate-y-9' : 'pointer-events-none opacity-55'}`}
    >
      <div className={`pointer-events-none absolute -top-16 h-60 w-60 rounded-full blur-3xl transition duration-700 group-hover:scale-110 ${toneClasses.glow}`} />

      <div className="relative z-20 mb-4 flex min-h-[116px] flex-col items-center justify-end">
        <div className={`mb-3 rounded-full border px-4 py-1.5 text-[10px] font-black tracking-[0.24em] shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-xl ${toneClasses.plaque}`}>
          {award}
        </div>
        <div className={`flex items-center justify-center gap-2.5 text-[16px] font-black tracking-[0.08em] sm:text-[18px] ${toneClasses.label}`}>
          {highlight ? (
            <>
              <span>장지수</span>
              <MemberBadges nickname="장지수" />
            </>
          ) : (
            <>
              <span className="text-[24px] leading-none sm:text-[27px]">{medal}</span>
              <span>{memberName}</span>
              <MemberBadges nickname={memberName} />
            </>
          )}
        </div>
        <div className="mt-2 text-[27px] font-black tracking-[-0.07em] text-white drop-shadow-[0_0_24px_rgba(255,255,255,0.16)] sm:text-[34px]">
          {video?.viewsText ? `조회수 ${video.viewsText}` : '조회수 집계중'}
        </div>
        <div className="mt-1 text-[12px] font-black text-white/46">{timeText}</div>
      </div>

      <div className={`relative z-10 overflow-hidden rounded-[26px] border bg-black/25 transition duration-500 group-hover:scale-[1.015] ${toneClasses.ring} ${highlight ? 'w-[216px] sm:w-[260px] lg:w-[304px]' : 'w-[184px] sm:w-[224px] lg:w-[258px]'}`}>
        <div className={`absolute inset-x-8 top-0 z-20 h-px bg-gradient-to-r ${toneClasses.accent}`} />
        <div className={`absolute -left-8 top-9 z-20 h-px w-24 rotate-[-45deg] bg-gradient-to-r ${toneClasses.accent} opacity-55`} />
        <div className={`absolute -right-8 top-9 z-20 h-px w-24 rotate-45 bg-gradient-to-r ${toneClasses.accent} opacity-55`} />
        <div className="aspect-[9/14] overflow-hidden rounded-[25px]">
          {video?.thumbnail ? (
            <img src={video.thumbnail} alt={displayTitle} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.20),transparent_56%),linear-gradient(180deg,#101827,#030712)] text-4xl">🏆</div>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-3 rounded-[17px] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.68),rgba(2,6,23,0.90))] px-3 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
          <div className="line-clamp-2 text-[12px] font-black leading-5 text-white sm:text-[14px] sm:leading-6">{displayTitle}</div>
        </div>
      </div>

      <div className={`relative z-0 mt-4 h-7 w-[86%] rounded-[50%] bg-gradient-to-r blur-[1px] ${toneClasses.pedestal}`} />
      <div className="relative z-10 -mt-5 h-[20px] w-[72%] rounded-[50%] border-t border-white/15 bg-slate-950/55 shadow-[0_12px_20px_rgba(0,0,0,0.32)]" />
    </a>
  );
}

export default function ShortsHallOfFame() {
  const [payload, setPayload] = useState({ loaded: false, slots: {} });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/shorts-hall-of-fame?members=20260826');
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

  return (
    <section id="shorts-hall" className="relative mb-14 scroll-mt-6 w-full max-w-none overflow-hidden rounded-[34px] border border-white/[0.07] bg-[linear-gradient(145deg,rgba(3,7,18,0.96),rgba(9,17,35,0.97)_48%,rgba(3,7,18,0.98))] px-4 py-10 shadow-[0_34px_90px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-8 sm:py-12 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_4%,rgba(103,232,249,0.17),transparent_25%),radial-gradient(circle_at_18%_44%,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_82%_44%,rgba(226,232,240,0.15),transparent_27%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(110deg,transparent_10%,rgba(255,255,255,0.04)_30%,transparent_47%,rgba(103,232,249,0.045)_65%,transparent_84%)]" />
      <div className="pointer-events-none absolute -left-32 top-8 h-[520px] w-48 origin-top rotate-[18deg] bg-gradient-to-b from-amber-100/[0.09] via-amber-200/[0.025] to-transparent blur-2xl" />
      <div className="pointer-events-none absolute -right-32 top-8 h-[520px] w-48 origin-top -rotate-[18deg] bg-gradient-to-b from-cyan-100/[0.08] via-cyan-200/[0.025] to-transparent blur-2xl" />
      <div className="pointer-events-none absolute left-[10%] top-14 h-1.5 w-1.5 rounded-full bg-amber-200/90 shadow-[0_0_18px_rgba(251,191,36,0.9)]" />
      <div className="pointer-events-none absolute left-[18%] top-28 h-1 w-1 rounded-full bg-amber-300/80 shadow-[0_0_16px_rgba(251,191,36,0.75)]" />
      <div className="pointer-events-none absolute left-[31%] top-20 h-1 w-1 rounded-full bg-amber-100/80 shadow-[0_0_16px_rgba(251,191,36,0.7)]" />
      <div className="pointer-events-none absolute left-1/2 top-28 h-[340px] w-[250px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(103,232,249,0.16),rgba(139,92,246,0.10),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute right-[28%] top-24 h-1.5 w-1.5 rounded-full bg-cyan-100/80 shadow-[0_0_18px_rgba(103,232,249,0.76)]" />
      <div className="pointer-events-none absolute right-[16%] top-16 h-1.5 w-1.5 rounded-full bg-slate-100/90 shadow-[0_0_18px_rgba(226,232,240,0.75)]" />
      <div className="pointer-events-none absolute right-[9%] bottom-24 h-1 w-1 rounded-full bg-slate-200/80 shadow-[0_0_16px_rgba(226,232,240,0.7)]" />

      <div className="relative z-10 mb-16 text-center">
        <div className="mx-auto mb-4 flex w-fit items-center gap-3 text-[10px] font-black tracking-[0.34em] text-amber-200/80 sm:text-[11px]">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-200/60" />
          SOU SHORTS AWARDS
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-200/60" />
        </div>
        <div className="text-[30px] font-black tracking-[-0.06em] text-white drop-shadow-[0_0_30px_rgba(103,232,249,0.18)] sm:text-[44px]">명예의 쇼츠</div>
        <div className="mx-auto mt-4 h-px w-36 bg-gradient-to-r from-transparent via-white/28 to-transparent" />
        <div className="mt-3 text-xs font-bold tracking-[-0.02em] text-white/45 sm:text-sm">최근 30일을 빛낸 쇼츠 · 6시간마다 갱신</div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1260px] flex-col items-center gap-14 md:flex-row md:items-end md:justify-between md:gap-0">
        <div className="order-2 flex min-w-[258px] flex-1 justify-center md:order-1 md:justify-start">
          <HallSpot medal="🥇" award="조회수 대상" video={slots.memberTop1} tone="gold" />
        </div>
        <div className="order-1 flex min-w-[304px] flex-[1.12] justify-center md:order-2">
          <HallSpot award="수장 특별상" video={slots.jangjisu} highlight tone="chief" />
        </div>
        <div className="order-3 flex min-w-[258px] flex-1 justify-center md:justify-end">
          <HallSpot medal="🥈" award="조회수 우수상" video={slots.memberTop2} tone="silver" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-[8%] bottom-0 h-28 rounded-[50%_50%_0_0] border-t border-white/[0.07] bg-[radial-gradient(ellipse_at_center,rgba(148,163,184,0.10),rgba(2,6,23,0.08)_52%,transparent_72%)]" />
    </section>
  );
}


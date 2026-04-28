import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CalendarPreview from './CalendarPreview';
import RecentYoutubeSection from './RecentYoutubeSection';
import { PrisonMemberLiveGridContent } from '../PrisonMemberLiveGrid';
import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';

const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LOGO_SRC = '/prison-logo.webp';
const LOGO_FALLBACK_SRC = '/prison-logo.svg';
const FAN_CAFE_URL = 'https://cafe.naver.com/quaddurupfancafe';

function viewerCount(status) {
  const value = Number(status?.viewerCount || 0);
  return Number.isFinite(value) ? value : 0;
}

function formatViewerCount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '0';
  if (number >= 10000) {
    const man = number / 10000;
    return `${Number.isInteger(man) ? man.toFixed(0) : man.toFixed(1)}만`;
  }
  if (number >= 1000) {
    const chun = number / 1000;
    return `${Number.isInteger(chun) ? chun.toFixed(0) : chun.toFixed(1)}천`;
  }
  return String(Math.floor(number));
}

function RoleMiniBadge({ nickname }) {
  const type = nickname === '장지수' ? 'warden' : nickname === '린링' ? 'captain' : '';
  if (!type) return null;
  const label = type === 'warden' ? '수장' : '반장';
  const className = type === 'warden'
    ? 'border-amber-200/35 bg-[linear-gradient(135deg,rgba(251,191,36,0.36),rgba(120,53,15,0.34))] text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.30),inset_0_1px_0_rgba(255,255,255,0.24)]'
    : 'border-cyan-200/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.34),rgba(30,64,175,0.32))] text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.28),inset_0_1px_0_rgba(255,255,255,0.22)]';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${className}`}>{label}</span>;
}

function SidebarLogo({ compact = false }) {
  return (
    <img
      src={LOGO_SRC}
      onError={(event) => { event.currentTarget.src = LOGO_FALLBACK_SRC; }}
      alt="장지수용소"
      className={`${compact ? 'h-12 w-[168px]' : 'h-[210px] w-[330px] scale-[1.18]'} max-w-none object-contain drop-shadow-[0_0_32px_rgba(103,232,249,0.28)]`}
    />
  );
}

function SidebarNavItem({ href, label, icon, tone = 'blue', external = false }) {
  const toneClass = tone === 'green'
    ? 'text-emerald-100 hover:bg-emerald-400/10 hover:shadow-[0_0_26px_rgba(16,185,129,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
    : tone === 'red'
      ? 'text-red-50 hover:bg-red-500/10 hover:shadow-[0_0_26px_rgba(239,68,68,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
      : tone === 'gold'
        ? 'text-amber-50 hover:bg-amber-300/10 hover:shadow-[0_0_26px_rgba(245,158,11,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]'
        : 'text-sky-50 hover:bg-sky-400/10 hover:shadow-[0_0_26px_rgba(56,189,248,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]';

  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`group flex items-center gap-3 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] px-4 py-3 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_14px_30px_rgba(0,0,0,0.20)] transition duration-300 hover:-translate-y-0.5 ${toneClass}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/30 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.18)]">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function LivePreviewCard({ preview }) {
  if (!preview?.member || !preview?.status) return null;
  const { member, status, top } = preview;
  const safeTop = Math.min(Math.max(Number(top || 260), 190), typeof window !== 'undefined' ? window.innerHeight - 190 : 720);

  return createPortal(
    <div className="pointer-events-none fixed left-[288px] z-[2147483647] w-[300px] overflow-hidden rounded-[24px] bg-[#080d16]/98 text-white shadow-[0_28px_80px_rgba(0,0,0,0.76),0_0_52px_rgba(56,189,248,0.20),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl" style={{ top: safeTop, transform: 'translateY(-50%)' }}>
      <div className="relative h-[166px] bg-black">
        {status.thumbnailUrl ? (
          <img src={status.thumbnailUrl} alt={`${member.nickname} 방송 썸네일`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_58%),linear-gradient(180deg,#101827,#030712)]">
            <img src={member.image} alt={`${member.nickname} 프로필`} className="h-20 w-20 rounded-full object-cover opacity-90 shadow-[0_0_24px_rgba(103,232,249,0.14)]" loading="lazy" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <img src={member.image} alt="" className="h-8 w-8 rounded-full object-cover shadow-[0_0_14px_rgba(255,255,255,0.12)]" loading="lazy" />
            <span className="truncate text-sm font-black text-white">{member.nickname}</span>
            <RoleMiniBadge nickname={member.nickname} />
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-950/70 px-2.5 py-1 text-xs font-black text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff3347] shadow-[0_0_10px_rgba(255,51,71,0.85)]" />
            {formatViewerCount(status.viewerCount)}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="line-clamp-2 text-[15px] font-black leading-6 text-white">{status.title || '방송 중'}</div>
      </div>
    </div>,
    document.body
  );
}

function LiveMemberList() {
  const [payload, setPayload] = useState(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadLive() {
      try {
        const res = await fetch('/api/live-status');
        const json = res.ok ? await res.json() : null;
        if (!mounted) return;
        setPayload(json || null);
        setFailed(!json);
      } catch {
        if (!mounted) return;
        setFailed(true);
      }
    }

    loadLive();
    const timer = setInterval(loadLive, LIVE_REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const liveMembers = useMemo(() => {
    const statuses = payload?.statuses || {};
    return ALL_PRISON_MEMBERS
      .map((member) => ({ member, status: statuses[member.nickname] }))
      .filter((item) => item.status?.isLive)
      .sort((a, b) => viewerCount(b.status) - viewerCount(a.status))
      .slice(0, 5);
  }, [payload]);

  return (
    <section className="mt-7 border-t border-white/8 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black tracking-[-0.02em] text-white">방송중 멤버</h2>
        <span className="rounded-full bg-white/[0.045] px-2.5 py-1 text-[10px] font-black text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">TOP 5</span>
      </div>

      {liveMembers.length > 0 ? (
        <div className="space-y-3">
          {liveMembers.map(({ member, status }) => (
            <a
              key={member.nickname}
              href={status.liveUrl || member.station}
              target="_blank"
              rel="noreferrer"
              onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setPreview({ member, status, top: rect.top + rect.height / 2 });
              }}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setPreview({ member, status, top: rect.top + rect.height / 2 });
              }}
              onMouseLeave={() => setPreview(null)}
              className="flex items-center gap-3 rounded-2xl px-1.5 py-2 transition hover:bg-white/[0.045] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
            >
              <img src={member.image} alt={`${member.nickname} 프로필`} className="h-10 w-10 shrink-0 rounded-full bg-slate-900 object-cover shadow-[0_0_18px_rgba(56,189,248,0.14)]" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[15px] font-black leading-5 tracking-[-0.03em] text-white">{member.nickname}</span>
                  <RoleMiniBadge nickname={member.nickname} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[12px] font-black text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff3347] shadow-[0_0_10px_rgba(255,51,71,0.85)]" />
                <span>{formatViewerCount(status.viewerCount)}</span>
              </div>
            </a>
          ))}
          <LivePreviewCard preview={preview} />
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.035] px-4 py-4 text-sm font-bold leading-6 text-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {failed ? '방송 상태 확인중입니다.' : '현재 방송중인 멤버가 없습니다.'}
        </div>
      )}
    </section>
  );
}

function PrisonSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[274px] border-r border-white/10 bg-[#05070c]/92 px-5 py-5 shadow-[18px_0_70px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:block">
      <a href="#top" className="mb-5 flex h-[210px] items-center justify-center overflow-visible p-0">
        <SidebarLogo />
      </a>

      <nav className="space-y-2.5">
        <SidebarNavItem href="#shorts-hall" label="명예의 쇼츠" icon="🏆" tone="gold" />
        <SidebarNavItem href="#schedule" label="일정" icon="⛓" />
        <SidebarNavItem href="#recent-youtube" label="YOUTUBE" icon="▶" tone="red" />
        <SidebarNavItem href="/utility" label="유틸리티" icon="🛠" />
        <SidebarNavItem href="/jangjisu-prison/crews" label="종겜 크루 목록" icon="👥" tone="green" />
        <SidebarNavItem href={FAN_CAFE_URL} label="팬카페" icon="N" tone="green" external />
      </nav>

      <LiveMemberList />
    </aside>
  );
}

function MobilePrisonNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/88 px-4 py-3 backdrop-blur-xl xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <a href="#top" className="flex h-14 w-[168px] items-center justify-start overflow-hidden rounded-2xl bg-white/[0.035] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_rgba(0,0,0,0.18)]">
          <SidebarLogo compact />
        </a>
        <a href={FAN_CAFE_URL} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-300/8 px-3 py-2 text-xs font-black text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">팬카페</a>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <a href="#shorts-hall" className="shrink-0 rounded-full bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">🏆 명예의 쇼츠</a>
        <a href="#schedule" className="shrink-0 rounded-full bg-sky-400/8 px-4 py-2 text-xs font-black text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">일정</a>
        <a href="#recent-youtube" className="shrink-0 rounded-full bg-red-500/8 px-4 py-2 text-xs font-black text-red-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">YOUTUBE</a>
        <a href="/utility" className="shrink-0 rounded-full bg-sky-400/8 px-4 py-2 text-xs font-black text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">유틸리티</a>
        <a href="/jangjisu-prison/crews" className="shrink-0 rounded-full bg-emerald-400/8 px-4 py-2 text-xs font-black text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">종겜 크루</a>
      </nav>
    </header>
  );
}

export default function PrisonPageContent() {
  return (
    <>
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        html, body { overflow-x: hidden; }
        @media (min-width: 1280px) {
          .sou-prison-content {
            margin-left: 274px !important;
            width: calc(100vw - 274px) !important;
            max-width: calc(100vw - 274px) !important;
          }
          .sou-prison-main {
            width: min(calc(100vw - 314px), 2200px) !important;
            max-width: min(calc(100vw - 314px), 2200px) !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .sou-prison-main > *,
          .sou-prison-main #members,
          .sou-prison-main #schedule,
          .sou-prison-main #recent-youtube,
          .sou-prison-main .sou-member-live-section {
            width: 100% !important;
            max-width: none !important;
          }
        }
        @keyframes youtubeTabIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>

      <div id="top" className="sou-prison-page min-h-screen w-full overflow-x-hidden bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-56 w-56 rounded-full bg-slate-500/10 blur-3xl sm:h-72 sm:w-72" />
          <div className="absolute top-20 right-[-70px] h-64 w-64 rounded-full bg-amber-500/8 blur-3xl sm:h-80 sm:w-80" />
          <div className="absolute bottom-0 left-1/2 h-56 w-[18rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl sm:h-72 sm:w-[30rem]" />
        </div>

        <div className="sou-prison-shell relative min-h-screen w-full max-w-none overflow-x-hidden">
          <PrisonSidebar />
          <div className="sou-prison-content min-w-0 max-w-none">
            <MobilePrisonNav />
            <main className="sou-prison-main relative w-full max-w-none overflow-x-hidden px-4 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8 xl:px-7">
              <section className="overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:rounded-[36px]" aria-label="장지수용소 대문">
                <div className="relative overflow-hidden">
                  <img src="/jangjisu-prison-hero.png" alt="장지수용소" className="block h-auto w-full object-contain" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,0.18),transparent_16%,transparent_84%,rgba(5,7,12,0.18)),linear-gradient(180deg,rgba(0,0,0,0.015),transparent_52%,rgba(5,7,12,0.14))]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#05070c]/45 to-transparent sm:h-16" />
                </div>
              </section>

              <div id="members" className="scroll-mt-6 w-full max-w-none overflow-x-hidden">
                <PrisonMemberLiveGridContent />
              </div>
              <CalendarPreview />
              <RecentYoutubeSection />
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

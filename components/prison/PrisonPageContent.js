import { useEffect, useMemo, useState } from 'react';
import CalendarPreview from './CalendarPreview';
import RecentYoutubeSection from './RecentYoutubeSection';
import { PrisonMemberLiveGridContent } from '../PrisonMemberLiveGrid';
import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';

const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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

function SidebarNavItem({ href, label, icon, tone = 'blue' }) {
  const toneClass = tone === 'green'
    ? 'border-emerald-300/18 bg-emerald-400/8 text-emerald-100 hover:border-emerald-200/38 hover:bg-emerald-400/14 hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]'
    : tone === 'red'
      ? 'border-red-300/18 bg-red-500/8 text-red-50 hover:border-red-200/38 hover:bg-red-500/14 hover:shadow-[0_0_24px_rgba(239,68,68,0.12)]'
      : tone === 'gold'
        ? 'border-amber-200/20 bg-amber-300/8 text-amber-50 hover:border-amber-100/40 hover:bg-amber-300/14 hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]'
        : 'border-sky-300/18 bg-sky-400/8 text-sky-50 hover:border-sky-200/38 hover:bg-sky-400/14 hover:shadow-[0_0_24px_rgba(56,189,248,0.12)]';

  return (
    <a href={href} className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition duration-300 hover:-translate-y-0.5 ${toneClass}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-black/24 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function LiveMemberList() {
  const [payload, setPayload] = useState(null);
  const [failed, setFailed] = useState(false);

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
      .slice(0, 8);
  }, [payload]);

  return (
    <section className="mt-7 border-t border-white/8 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black tracking-[-0.02em] text-white">방송중 멤버</h2>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-black text-white/50">5분 갱신</span>
      </div>

      {liveMembers.length > 0 ? (
        <div className="space-y-3">
          {liveMembers.map(({ member, status }) => (
            <a key={member.nickname} href={status.liveUrl || member.station} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-transparent px-1.5 py-1.5 transition hover:border-white/10 hover:bg-white/[0.045]">
              <img src={member.image} alt={`${member.nickname} 프로필`} className="h-9 w-9 shrink-0 rounded-full border border-sky-200/30 bg-slate-900 object-cover shadow-[0_0_18px_rgba(56,189,248,0.12)]" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-black text-white">{member.nickname}</div>
                <div className="truncate text-[11px] font-bold text-white/42">{status.category || status.title || 'LIVE'}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[12px] font-black text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff3347] shadow-[0_0_10px_rgba(255,51,71,0.85)]" />
                <span>{formatViewerCount(status.viewerCount)}</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-4 text-sm font-bold leading-6 text-white/50">
          {failed ? '방송 상태 확인중입니다.' : '현재 방송중인 멤버가 없습니다.'}
        </div>
      )}
    </section>
  );
}

function PrisonSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[274px] shrink-0 border-r border-white/10 bg-[#05070c]/92 px-5 py-5 shadow-[18px_0_70px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:block">
      <a href="#top" className="group mb-7 flex items-center gap-3 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.11),transparent_62%),rgba(255,255,255,0.035)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_45px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:border-sky-200/22">
        <img src="/prison-logo.svg" alt="장지수용소" className="h-[68px] w-full object-contain drop-shadow-[0_0_22px_rgba(103,232,249,0.16)]" />
      </a>

      <nav className="space-y-2.5">
        <SidebarNavItem href="#members" label="멤버 라이브" icon="▣" />
        <SidebarNavItem href="#schedule" label="일정" icon="⛓" />
        <SidebarNavItem href="#recent-youtube" label="YOUTUBE" icon="▶" tone="red" />
        <SidebarNavItem href="/utility" label="유틸리티" icon="🛠" />
        <SidebarNavItem href="/jangjisu-prison/crews" label="종겜 크루 목록" icon="👥" tone="green" />
        <SidebarNavItem href="/" label="SOU 메인" icon="↩" tone="gold" />
      </nav>

      <LiveMemberList />
    </aside>
  );
}

function MobilePrisonNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/88 px-4 py-3 backdrop-blur-xl xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <a href="#top" className="flex h-12 w-[128px] items-center justify-start overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-2">
          <img src="/prison-logo.svg" alt="장지수용소" className="h-10 w-full object-contain" />
        </a>
        <a href="/" className="rounded-full border border-amber-200/20 bg-amber-300/8 px-3 py-2 text-xs font-black text-amber-50">SOU 메인</a>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <a href="#members" className="shrink-0 rounded-full border border-sky-300/18 bg-sky-400/8 px-4 py-2 text-xs font-black text-sky-50">멤버 라이브</a>
        <a href="#schedule" className="shrink-0 rounded-full border border-sky-300/18 bg-sky-400/8 px-4 py-2 text-xs font-black text-sky-50">일정</a>
        <a href="#recent-youtube" className="shrink-0 rounded-full border border-red-300/18 bg-red-500/8 px-4 py-2 text-xs font-black text-red-50">YOUTUBE</a>
        <a href="/utility" className="shrink-0 rounded-full border border-sky-300/18 bg-sky-400/8 px-4 py-2 text-xs font-black text-sky-50">유틸리티</a>
        <a href="/jangjisu-prison/crews" className="shrink-0 rounded-full border border-emerald-300/18 bg-emerald-400/8 px-4 py-2 text-xs font-black text-emerald-50">종겜 크루</a>
      </nav>
    </header>
  );
}

export default function PrisonPageContent() {
  return (
    <>
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        @keyframes youtubeTabIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>

      <div id="top" className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-56 w-56 rounded-full bg-slate-500/10 blur-3xl sm:h-72 sm:w-72" />
          <div className="absolute top-20 right-[-70px] h-64 w-64 rounded-full bg-amber-500/8 blur-3xl sm:h-80 sm:w-80" />
          <div className="absolute bottom-0 left-1/2 h-56 w-[18rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl sm:h-72 sm:w-[30rem]" />
        </div>

        <div className="relative flex min-h-screen">
          <PrisonSidebar />
          <div className="min-w-0 flex-1">
            <MobilePrisonNav />
            <main className="relative mx-auto max-w-[1880px] px-4 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 xl:px-9 2xl:px-10">
              <section className="overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:rounded-[36px]" aria-label="장지수용소 대문">
                <div className="relative overflow-hidden">
                  <img src="/jangjisu-prison-hero.png" alt="장지수용소" className="block h-auto w-full object-contain" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,0.18),transparent_16%,transparent_84%,rgba(5,7,12,0.18)),linear-gradient(180deg,rgba(0,0,0,0.015),transparent_52%,rgba(5,7,12,0.14))]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#05070c]/45 to-transparent sm:h-16" />
                </div>
              </section>

              <div id="members" className="scroll-mt-6">
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

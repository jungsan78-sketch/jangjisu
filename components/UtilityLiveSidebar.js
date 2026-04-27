import { useEffect, useMemo, useState } from 'react';
import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';

const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_CACHE_KEY = 'sou:utility-live-status:v1';

function isUtilityPath() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/utility' || window.location.pathname.startsWith('/utility/');
}

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

function readCachedLivePayload() {
  if (typeof window === 'undefined') return null;
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(LIVE_CACHE_KEY) || 'null');
    if (!cached?.payload || !cached?.savedAt) return null;
    if (Date.now() - Number(cached.savedAt) > LIVE_REFRESH_INTERVAL_MS) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

function writeCachedLivePayload(payload) {
  if (typeof window === 'undefined' || !payload) return;
  try {
    window.sessionStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({ payload, savedAt: Date.now() }));
  } catch {}
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

function UtilityLiveMemberList() {
  const [payload, setPayload] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isUtilityPath()) return undefined;
    let mounted = true;

    async function loadLive(force = false) {
      const cached = !force ? readCachedLivePayload() : null;
      if (cached) {
        setPayload(cached);
        setFailed(false);
        return;
      }

      try {
        const res = await fetch('/api/live-status');
        const json = res.ok ? await res.json() : null;
        if (!mounted) return;
        setPayload(json || null);
        setFailed(!json);
        if (json) writeCachedLivePayload(json);
      } catch {
        if (!mounted) return;
        setFailed(true);
      }
    }

    loadLive(false);
    const timer = setInterval(() => loadLive(false), LIVE_REFRESH_INTERVAL_MS);
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
      .sort((a, b) => viewerCount(b.status) - viewerCount(a.status));
  }, [payload]);

  return (
    <section className="mt-7 border-t border-white/8 pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black tracking-[-0.02em] text-white">방송중 멤버</h2>
        <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-black text-white/50">5분 저장</span>
      </div>

      {liveMembers.length > 0 ? (
        <div className="max-h-[38vh] space-y-3 overflow-y-auto overflow-x-visible pr-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.32)_transparent]">
          {liveMembers.map(({ member, status }) => (
            <a key={member.nickname} href={status.liveUrl || member.station} target="_blank" rel="noreferrer" className="group/live relative flex items-center gap-3 rounded-2xl border border-transparent px-1.5 py-2 transition hover:border-white/10 hover:bg-white/[0.045]">
              <img src={member.image} alt={`${member.nickname} 프로필`} className="h-10 w-10 shrink-0 rounded-full border border-sky-200/30 bg-slate-900 object-cover shadow-[0_0_18px_rgba(56,189,248,0.12)]" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-black leading-5 tracking-[-0.03em] text-white">{member.nickname}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[12px] font-black text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff3347] shadow-[0_0_10px_rgba(255,51,71,0.85)]" />
                <span>{formatViewerCount(status.viewerCount)}</span>
              </div>
              <div className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 hidden w-[300px] -translate-y-1/2 overflow-hidden rounded-[24px] border border-white/12 bg-[#080d16]/96 shadow-[0_28px_80px_rgba(0,0,0,0.48),0_0_32px_rgba(56,189,248,0.08)] backdrop-blur-xl group-hover/live:block">
                <div className="relative h-[166px] bg-black">
                  {status.thumbnailUrl ? <img src={status.thumbnailUrl} alt={`${member.nickname} 방송 썸네일`} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_58%),linear-gradient(180deg,#101827,#030712)]"><img src={member.image} alt={`${member.nickname} 프로필`} className="h-20 w-20 rounded-full border border-white/15 object-cover opacity-90" loading="lazy" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2"><img src={member.image} alt="" className="h-8 w-8 rounded-full border border-white/15 object-cover" loading="lazy" /><span className="truncate text-sm font-black text-white">{member.nickname}</span></div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200/25 bg-rose-950/70 px-2.5 py-1 text-xs font-black text-rose-50"><span className="h-1.5 w-1.5 rounded-full bg-[#ff3347] shadow-[0_0_10px_rgba(255,51,71,0.85)]" />{formatViewerCount(status.viewerCount)}</span>
                  </div>
                </div>
                <div className="p-4"><div className="mb-1 text-[10px] font-black tracking-[0.18em] text-sky-100/70">LIVE TITLE</div><div className="line-clamp-2 text-[15px] font-black leading-6 text-white">{status.title || '방송 중'}</div></div>
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

export default function UtilityLiveSidebar() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isUtilityPath());
  }, []);

  if (!enabled) return null;

  return (
    <>
      <style jsx global>{`
        @media (min-width: 1280px) {
          body:has(#sou-utility-sidebar) header {
            display: none !important;
          }
          body:has(#sou-utility-sidebar) main {
            width: calc(100% - 274px) !important;
            max-width: 1880px !important;
            margin-left: 274px !important;
            margin-right: 0 !important;
            padding-left: 36px !important;
            padding-right: 36px !important;
          }
        }
      `}</style>
      <aside id="sou-utility-sidebar" className="fixed left-0 top-0 z-50 hidden h-screen w-[274px] border-r border-white/10 bg-[#05070c]/94 px-5 py-5 text-white shadow-[18px_0_70px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:block">
        <a href="/utility" className="group mb-7 flex items-center gap-3 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.11),transparent_62%),rgba(255,255,255,0.035)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_45px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:border-sky-200/22">
          <img src="/site-icon.png" alt="SOU" className="h-[68px] w-full object-contain drop-shadow-[0_0_22px_rgba(103,232,249,0.16)]" />
        </a>

        <nav className="space-y-2.5">
          <SidebarNavItem href="/utility" label="유틸리티 홈" icon="🛠" />
          <SidebarNavItem href="/utility/overwatch-random" label="오버워치 랜덤" icon="🎲" tone="gold" />
          <SidebarNavItem href="/utility/soop-funding-memo" label="SOOP 펀딩메모" icon="📝" tone="green" />
          <SidebarNavItem href="/jangjisu-prison" label="장지수용소" icon="▣" tone="red" />
          <SidebarNavItem href="/" label="SOU 메인" icon="↩" tone="blue" />
        </nav>

        <UtilityLiveMemberList />
      </aside>
    </>
  );
}

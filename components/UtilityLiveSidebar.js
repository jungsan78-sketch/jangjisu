import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';

const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_CACHE_KEY = 'sou:utility-live-status:v1';
const LOGO_SRC = '/prison-logo.webp';
const LOGO_FALLBACK_SRC = '/prison-logo.svg';
const FAN_CAFE_URL = 'https://cafe.naver.com/quaddurupfancafe';

function isUtilityPath(pathname = '') {
  return pathname === '/utility' || pathname.startsWith('/utility/');
}

function isCrewsPath(pathname = '') {
  return pathname === '/jangjisu-prison/crews';
}

function isSidebarPath(pathname = '') {
  return isUtilityPath(pathname) || isCrewsPath(pathname);
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

function RoleMiniBadge({ nickname }) {
  if (nickname === '장지수') return <span className="rounded-full bg-amber-300/12 px-2 py-0.5 text-[10px] font-black text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">수장</span>;
  if (nickname === '린링') return <span className="rounded-full bg-cyan-300/12 px-2 py-0.5 text-[10px] font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">반장</span>;
  return null;
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

  return (
    <div className="pointer-events-none fixed left-[288px] z-[9999] w-[300px] overflow-hidden rounded-[24px] bg-[#080d16]/98 text-white shadow-[0_28px_80px_rgba(0,0,0,0.62),0_0_42px_rgba(56,189,248,0.14),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl" style={{ top: safeTop, transform: 'translateY(-50%)' }}>
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
        <div className="mb-1 text-[10px] font-black tracking-[0.18em] text-sky-100/70">LIVE TITLE</div>
        <div className="line-clamp-2 text-[15px] font-black leading-6 text-white">{status.title || '방송 중'}</div>
      </div>
    </div>
  );
}

function SidebarLiveMemberList({ currentPath }) {
  const [payload, setPayload] = useState(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!isSidebarPath(currentPath)) return undefined;
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
  }, [currentPath]);

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

function UnifiedPrisonNavItems() {
  return (
    <>
      <SidebarNavItem href="/jangjisu-prison#members" label="멤버 라이브" icon="▣" />
      <SidebarNavItem href="/jangjisu-prison#schedule" label="일정" icon="⛓" />
      <SidebarNavItem href="/jangjisu-prison#recent-youtube" label="YOUTUBE" icon="▶" tone="red" />
      <SidebarNavItem href="/utility" label="유틸리티" icon="🛠" tone="blue" />
      <SidebarNavItem href="/jangjisu-prison/crews" label="종겜 크루 목록" icon="👥" tone="green" />
      <SidebarNavItem href={FAN_CAFE_URL} label="팬카페" icon="N" tone="green" external />
    </>
  );
}

export default function UtilityLiveSidebar() {
  const router = useRouter();
  const currentPath = router.asPath?.split('?')[0] || router.pathname || '';
  const enabled = isSidebarPath(currentPath);

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
        <a href="/jangjisu-prison" className="group mb-7 flex items-center gap-3 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.12),transparent_62%),rgba(255,255,255,0.035)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_45px_rgba(0,0,0,0.22),0_0_28px_rgba(56,189,248,0.06)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_52px_rgba(0,0,0,0.28),0_0_34px_rgba(56,189,248,0.11)]">
          <img src={LOGO_SRC} onError={(event) => { event.currentTarget.src = LOGO_FALLBACK_SRC; }} alt="장지수용소" className="h-[104px] w-full object-contain drop-shadow-[0_0_30px_rgba(103,232,249,0.24)]" />
        </a>

        <nav className="space-y-2.5">
          <UnifiedPrisonNavItems />
        </nav>

        <SidebarLiveMemberList currentPath={currentPath} />
      </aside>
    </>
  );
}

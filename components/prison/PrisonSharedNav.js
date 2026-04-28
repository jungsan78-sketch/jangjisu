const LOGO_SRC = '/prison-logo.webp';
const LOGO_FALLBACK_SRC = '/prison-logo.svg';
const FAN_CAFE_URL = 'https://cafe.naver.com/quaddurupfancafe';

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

export function PrisonSharedSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[274px] border-r border-white/10 bg-[#05070c]/92 px-5 py-5 shadow-[18px_0_70px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:block">
      <a href="/jangjisu-prison-v2#top" className="mb-5 flex h-[210px] items-center justify-center overflow-visible p-0">
        <SidebarLogo />
      </a>
      <nav className="space-y-2.5">
        <SidebarNavItem href="/jangjisu-prison-v2#shorts-hall" label="명예의 쇼츠" icon="🏆" tone="gold" />
        <SidebarNavItem href="/jangjisu-prison-v2#schedule" label="일정" icon="⛓" />
        <SidebarNavItem href="/jangjisu-prison-v2#recent-youtube" label="YOUTUBE" icon="▶" tone="red" />
        <SidebarNavItem href="/utility" label="유틸리티" icon="🛠" />
        <SidebarNavItem href="/jangjisu-prison/crews" label="종겜 크루 목록" icon="👥" tone="green" />
        <SidebarNavItem href={FAN_CAFE_URL} label="팬카페" icon="N" tone="green" external />
      </nav>
    </aside>
  );
}

export function PrisonSharedMobileNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/88 px-4 py-3 backdrop-blur-xl xl:hidden">
      <div className="flex items-center justify-between gap-3">
        <a href="/jangjisu-prison-v2#top" className="flex h-14 w-[168px] items-center justify-start overflow-hidden rounded-2xl bg-white/[0.035] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_rgba(0,0,0,0.18)]">
          <SidebarLogo compact />
        </a>
        <a href={FAN_CAFE_URL} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-300/8 px-3 py-2 text-xs font-black text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">팬카페</a>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <a href="/jangjisu-prison-v2#shorts-hall" className="shrink-0 rounded-full bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">🏆 명예의 쇼츠</a>
        <a href="/jangjisu-prison-v2#schedule" className="shrink-0 rounded-full bg-sky-400/8 px-4 py-2 text-xs font-black text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">일정</a>
        <a href="/jangjisu-prison-v2#recent-youtube" className="shrink-0 rounded-full bg-red-500/8 px-4 py-2 text-xs font-black text-red-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">YOUTUBE</a>
        <a href="/utility" className="shrink-0 rounded-full bg-sky-400/8 px-4 py-2 text-xs font-black text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">유틸리티</a>
        <a href="/jangjisu-prison/crews" className="shrink-0 rounded-full bg-emerald-400/8 px-4 py-2 text-xs font-black text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">종겜 크루</a>
      </nav>
    </header>
  );
}

export function PrisonSharedLayout({ children, mainClassName = '' }) {
  return (
    <div className="sou-prison-page min-h-screen bg-[#05070c] text-white">
      <PrisonSharedSidebar />
      <div className="xl:ml-[274px]">
        <PrisonSharedMobileNav />
        <main className={`relative mx-auto max-w-7xl px-5 py-8 lg:px-8 ${mainClassName}`}>{children}</main>
      </div>
    </div>
  );
}

export default function PrisonSharedNav() {
  return (
    <>
      <PrisonSharedSidebar />
      <PrisonSharedMobileNav />
    </>
  );
}

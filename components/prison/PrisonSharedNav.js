import MobileAppDrawer from '../navigation/MobileAppDrawer';
import { useRouter } from 'next/router';

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

function SidebarNavItem({ href, label, tone = 'slate', external = false, compact = false, activePaths }) {
  const router = useRouter();
  const isActive = !external && (activePaths || [href]).includes(router.pathname);
  const toneClass = tone === 'green'
    ? 'border-emerald-300/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(16,185,129,0.07))] text-emerald-50 hover:border-emerald-200/34 hover:shadow-[0_0_26px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.10)]'
    : tone === 'gold'
      ? 'border-amber-300/15 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))] text-amber-50 hover:border-amber-200/30 hover:shadow-[0_0_26px_rgba(245,158,11,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]'
      : tone === 'teal'
        ? 'border-teal-300/17 bg-[linear-gradient(180deg,rgba(45,212,191,0.13),rgba(45,212,191,0.045))] text-teal-50 hover:border-teal-200/30 hover:shadow-[0_0_26px_rgba(45,212,191,0.14),inset_0_1px_0_rgba(255,255,255,0.10)]'
        : tone === 'blue'
          ? 'border-sky-300/16 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(56,189,248,0.04))] text-sky-50 hover:border-sky-200/30 hover:shadow-[0_0_26px_rgba(56,189,248,0.14),inset_0_1px_0_rgba(255,255,255,0.10)]'
          : tone === 'violet'
            ? 'border-violet-300/16 bg-[linear-gradient(180deg,rgba(139,92,246,0.13),rgba(139,92,246,0.045))] text-violet-50 hover:border-violet-200/30 hover:shadow-[0_0_26px_rgba(139,92,246,0.14),inset_0_1px_0_rgba(255,255,255,0.10)]'
            : 'border-white/9 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] text-slate-50 hover:border-white/18 hover:bg-white/[0.075]';

  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`group flex min-h-[52px] items-center justify-center rounded-[17px] border px-3 py-3 text-center font-black tracking-[-0.025em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 ${compact ? 'text-[12px]' : 'text-[14px]'} ${toneClass} ${isActive ? 'ring-1 ring-white/35 shadow-[0_0_24px_rgba(103,232,249,0.14),inset_0_1px_0_rgba(255,255,255,0.14)]' : ''}`}>
      <span className="leading-5">{label}</span>
    </a>
  );
}

export function PrisonSharedSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[274px] border-r border-white/10 bg-[#05070c]/92 px-5 py-5 shadow-[18px_0_70px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:block">
      <a href="/jangjisu-prison#top" className="mb-5 flex h-[210px] items-center justify-center overflow-visible p-0">
        <SidebarLogo />
      </a>
      <nav className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <SidebarNavItem href="/jangjisu-prison" label="수용소 메인" tone="gold" activePaths={['/jangjisu-prison', '/jangjisu-prison-v2']} compact />
          <SidebarNavItem href="/" label="SOU 아카이브" tone="slate" compact />
        </div>
        <SidebarNavItem href="/jangjisu-prison/schedule-calendar" label="일정 캘린더" tone="teal" />
        <SidebarNavItem href="/jangjisu-prison/broadcast-data" label="방송 데이터 캘린더" tone="blue" />
        <SidebarNavItem href={FAN_CAFE_URL} label="팬카페" tone="green" external />
        <div className="grid grid-cols-2 gap-2.5">
          <SidebarNavItem href="/jangjisu-prison/multiview" label="멀티뷰" tone="violet" compact />
          <SidebarNavItem href="/jangjisu-prison/crews" label="숲 크루 목록" tone="slate" compact />
        </div>
      </nav>
    </aside>
  );
}

export function PrisonSharedMobileNav() {
  return (
    <MobileAppDrawer
      brand="장지수용소"
      subtitle="SOU PRISON"
      logoSrc={LOGO_SRC}
      logoFallbackSrc={LOGO_FALLBACK_SRC}
      logoAlt="장지수용소"
      logoWide
      homeHref="/jangjisu-prison"
      breakpoint="xl"
      menuLayout="grid"
      items={[
        { href: '/jangjisu-prison', label: '수용소 메인', tone: 'gold', activePaths: ['/jangjisu-prison', '/jangjisu-prison-v2'] },
        { href: '/', label: 'SOU 아카이브', tone: 'slate' },
        { href: '/jangjisu-prison/schedule-calendar', label: '일정 캘린더', tone: 'teal', span: 2 },
        { href: '/jangjisu-prison/broadcast-data', label: '방송 데이터 캘린더', tone: 'blue', span: 2 },
        { href: FAN_CAFE_URL, label: '팬카페', tone: 'green', external: true, span: 2 },
        { href: '/jangjisu-prison/multiview', label: '멀티뷰', tone: 'violet' },
        { href: '/jangjisu-prison/crews', label: '숲 크루 목록', tone: 'slate' },
      ]}
    />
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


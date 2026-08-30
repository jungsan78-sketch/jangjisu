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
  const isGreen = tone === 'green';

  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`group relative flex min-h-[48px] items-center justify-start overflow-hidden py-2.5 text-left font-black tracking-[-0.02em] transition duration-300 hover:translate-x-1 hover:text-white ${compact ? 'px-4 text-[12px]' : 'px-5 text-[15px]'} ${isGreen ? 'text-emerald-100/90' : 'text-sky-50/85'} ${isActive ? 'translate-x-1 text-white' : ''}`}>
      <span aria-hidden="true" className={`absolute left-1 top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${isActive ? 'h-6 w-1' : 'h-1.5 w-1.5 group-hover:h-6 group-hover:w-1'} ${isGreen ? 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.58)]' : 'bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.55)]'}`} />
      <span className="whitespace-nowrap leading-5">{label}</span>
      <span aria-hidden="true" className={`absolute bottom-1 left-5 right-2 h-px origin-left bg-gradient-to-r transition duration-300 ${isGreen ? 'from-emerald-300/0 via-emerald-300/45 to-emerald-300/0' : 'from-cyan-300/0 via-cyan-300/45 to-cyan-300/0'} ${isActive ? 'scale-x-100 opacity-100' : 'scale-x-[0.18] opacity-0 group-hover:scale-x-100 group-hover:opacity-100'}`} />
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


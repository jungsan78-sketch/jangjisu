import MemberBoardPreview from './MemberBoardPreview';
import CalendarPreview from './CalendarPreview';
import RecentYoutubeSection from './RecentYoutubeSection';
import PrisonNoticeSection from './PrisonNoticeSection';

function NavChip({ href, label, tone = 'neutral', icon = '', external = false }) {
  const toneClass = tone === 'green'
    ? 'border-[#03C75A]/30 bg-[#03C75A]/15 text-[#8df0b6] hover:bg-[#03C75A]/22'
    : tone === 'blue'
      ? 'border-[#3b82f6]/30 bg-[#3b82f6]/15 text-[#b8d8ff] hover:bg-[#3b82f6]/22'
      : tone === 'red'
        ? 'border-[#ff4e45]/30 bg-[#ff4e45]/15 text-[#ffb2ae] hover:bg-[#ff4e45]/22'
        : tone === 'prison'
          ? 'border-amber-200/26 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(148,163,184,0.08))] text-amber-100 hover:bg-amber-300/16 hover:shadow-[0_0_30px_rgba(245,158,11,0.16)]'
          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10';

  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-semibold backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_0_24px_rgba(255,255,255,0.08)] sm:gap-2 sm:px-4 sm:text-sm ${toneClass}`}>
      {icon ? <span>{icon}</span> : null}
      <span>{label}</span>
    </a>
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

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-50px] h-56 w-56 rounded-full bg-slate-500/10 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute top-20 right-[-70px] h-64 w-64 rounded-full bg-amber-500/8 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[18rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl sm:h-72 sm:w-[30rem]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4 lg:px-8">
          <a href="/" className="block h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.07] hover:border-white/25 sm:h-14 sm:w-14">
            <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
          </a>
          <nav className="flex w-full flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:gap-3">
              <NavChip href="#schedule" label="일정" tone="blue" icon="⛓️" />
              <NavChip href="#notice" label="공지" tone="blue" icon="📢" />
              <NavChip href="#recent-youtube" label="YOUTUBE" tone="red" icon="▶" />
              <NavChip href="/utility" label="유틸리티" tone="blue" icon="🛠️" />
              <NavChip href="/jangjisu-prison/crews" label="종겜 크루 목록" tone="green" icon="👥" />
            </div>
            <div className="flex w-full justify-start lg:justify-end">
              <NavChip href="/" label="SOU 메인" tone="prison" icon="↩" />
            </div>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1700px] px-4 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:rounded-[36px]" aria-label="장지수용소 대문">
          <div className="relative overflow-hidden">
            <img src="/jangjisu-prison-hero.png" alt="장지수용소" className="block h-auto w-full object-contain" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,0.18),transparent_16%,transparent_84%,rgba(5,7,12,0.18)),linear-gradient(180deg,rgba(0,0,0,0.015),transparent_52%,rgba(5,7,12,0.14))]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#05070c]/45 to-transparent sm:h-16" />
          </div>
        </section>

        <MemberBoardPreview />
        <CalendarPreview />
        <PrisonNoticeSection />
        <RecentYoutubeSection />
      </main>
    </>
  );
}

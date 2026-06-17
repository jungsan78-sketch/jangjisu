const NAV_ITEMS = [
  { href: '/jisu-dream#up-ranking', label: '신청자 UP순위', icon: 'UP', tone: 'dream' },
];

function DreamNavItem({ href, label, icon, tone = 'blue' }) {
  const toneClass = tone === 'dream'
    ? 'border-white/[0.07] bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.13),transparent_34%),linear-gradient(135deg,rgba(10,28,44,0.94),rgba(25,22,54,0.92))] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_14px_34px_rgba(0,0,0,0.24)] hover:border-cyan-200/[0.12] hover:bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.18),transparent_34%),linear-gradient(135deg,rgba(11,32,50,0.96),rgba(31,25,66,0.94))] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_38px_rgba(0,0,0,0.28),0_0_24px_rgba(34,211,238,0.08)]'
    : 'border-white/[0.055] bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.022))] text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_28px_rgba(0,0,0,0.22)] hover:border-white/[0.09] hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.065),rgba(255,255,255,0.032))] hover:text-white';

  return (
    <a href={href} className={`group relative flex items-center gap-3 overflow-hidden rounded-[19px] border px-4 py-3.5 text-sm font-black transition duration-300 hover:-translate-y-0.5 ${toneClass}`}>
      <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-[linear-gradient(180deg,rgba(12,22,35,0.94),rgba(5,10,18,0.98))] text-[10px] font-black tracking-[-0.04em] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_20px_rgba(0,0,0,0.22)]">
        <span className={`absolute inset-0 ${tone === 'dream' ? 'bg-[radial-gradient(circle_at_50%_25%,rgba(103,232,249,0.16),transparent_56%)]' : 'bg-[radial-gradient(circle_at_50%_25%,rgba(148,163,184,0.10),transparent_56%)]'}`} />
        <span className="relative z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white/[0.035] px-1 text-[7px] ring-1 ring-inset ring-white/[0.08]">{icon}</span>
      </span>
      <span className="relative z-10 tracking-[-0.01em]">{label}</span>
    </a>
  );
}

function DreamSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[218px] border-r border-white/[0.055] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.07),transparent_28%),linear-gradient(180deg,rgba(3,7,18,0.985),rgba(4,9,18,0.97))] px-4 py-5 shadow-[24px_0_70px_rgba(0,0,0,0.30)] backdrop-blur-xl lg:block">
      <a href="/" className="mx-auto mb-8 flex h-[108px] w-[150px] items-center justify-center transition hover:scale-[1.035]">
        <img src="/jisu-dream-logo.png" alt="지수의꿈" className="max-h-full max-w-full object-contain drop-shadow-[0_0_22px_rgba(59,130,246,0.18)]" />
      </a>

      <nav className="space-y-2.5">
        {NAV_ITEMS.map((item) => <DreamNavItem key={item.href} {...item} />)}
      </nav>

      <div className="absolute inset-x-4 bottom-5 space-y-2 border-t border-white/[0.055] pt-4">
        <DreamNavItem href="/" label="SOU 아카이브" icon="H" />
        <DreamNavItem href="/jangjisu-prison" label="장지수용소 모드" icon="P" />
      </div>
    </aside>
  );
}

function DreamMobileNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.055] bg-[#05070c]/92 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <a href="/" className="flex h-12 w-[88px] items-center justify-start">
          <img src="/jisu-dream-logo.png" alt="지수의꿈" className="max-h-full max-w-full object-contain drop-shadow-[0_0_14px_rgba(59,130,246,0.14)]" />
        </a>
        <a href="/" className="rounded-full border border-white/[0.06] bg-white/[0.035] px-3 py-2 text-xs font-black text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">홈</a>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => <a key={item.href} href={item.href} className="shrink-0 rounded-full border border-cyan-200/[0.08] bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(139,92,246,0.08))] px-4 py-2 text-xs font-black text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">◉ {item.label}</a>)}
      </nav>
    </header>
  );
}

export default function DreamServerLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      <DreamSidebar />
      <div className="lg:pl-[218px]">
        <DreamMobileNav />
        <main className="relative min-h-screen px-5 py-7 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}

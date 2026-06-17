const NAV_ITEMS = [
  { href: '/jisu-dream#up-ranking', label: '지수의꿈 UP순', icon: 'UP', tone: 'dream' },
];

function DreamNavItem({ href, label, icon, tone = 'blue' }) {
  const toneClass = tone === 'dream'
    ? 'border-cyan-200/16 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(139,92,246,0.12))] text-cyan-50 hover:border-cyan-200/28 hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(139,92,246,0.17))] hover:shadow-[0_0_28px_rgba(34,211,238,0.14)]'
    : 'border-white/10 bg-white/[0.045] text-white/78 hover:bg-white/[0.08]';

  return (
    <a href={href} className={`group flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_30px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-0.5 ${toneClass}`}>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/18 bg-black/35 text-[10px] font-black tracking-[-0.04em] text-white shadow-[0_0_20px_rgba(34,211,238,0.12)]">
        <span className="absolute inset-x-0 top-0 h-1/2 bg-cyan-300/24" />
        <span className="absolute inset-x-0 top-1/2 h-px bg-white/25" />
        <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white/25 bg-[#09101c] text-[7px]">{icon}</span>
      </span>
      <span>{label}</span>
    </a>
  );
}

function DreamSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[218px] border-r border-white/10 bg-[linear-gradient(180deg,rgba(3,7,18,0.97),rgba(5,10,20,0.94))] px-4 py-5 shadow-[24px_0_70px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:block">
      <a href="/" className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.05] hover:border-white/20">
        <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
      </a>

      <div className="mb-4 px-2">
        <div className="text-[10px] font-black tracking-[0.28em] text-cyan-100/40">JISU DREAM</div>
        <div className="mt-1 text-lg font-black text-white">지수의꿈 서버</div>
      </div>

      <nav className="space-y-2.5">
        {NAV_ITEMS.map((item) => <DreamNavItem key={item.href} {...item} />)}
      </nav>

      <div className="absolute inset-x-4 bottom-5 space-y-2 border-t border-white/10 pt-4">
        <DreamNavItem href="/" label="팬 아카이브" icon="H" />
        <DreamNavItem href="/jangjisu-prison" label="장지수용소 모드" icon="P" />
      </div>
    </aside>
  );
}

function DreamMobileNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070c]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <a href="/" className="flex items-center gap-3">
          <img src="/site-icon.png" alt="SOU" className="h-11 w-11 rounded-full border border-white/10" />
          <div><div className="text-[10px] font-black tracking-[0.24em] text-cyan-100/40">JISU DREAM</div><div className="text-sm font-black text-white">지수의꿈 서버</div></div>
        </a>
        <a href="/" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/70">홈</a>
      </div>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => <a key={item.href} href={item.href} className="shrink-0 rounded-full border border-cyan-200/15 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-50">◉ {item.label}</a>)}
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

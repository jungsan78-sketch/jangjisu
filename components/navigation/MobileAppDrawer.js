import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/router';

const BREAKPOINT_CLASS = {
  lg: 'lg:hidden',
  xl: 'xl:hidden',
};

const TONE_CLASS = {
  blue: 'bg-sky-300/10 text-sky-50',
  teal: 'bg-teal-300/10 text-teal-50',
  green: 'bg-emerald-300/10 text-emerald-50',
  gold: 'bg-amber-300/10 text-amber-50',
  red: 'bg-rose-300/10 text-rose-50',
};

const GRID_TONE_CLASS = {
  blue: 'border-sky-300/18 bg-[linear-gradient(180deg,rgba(56,189,248,0.13),rgba(56,189,248,0.055))] text-sky-50',
  teal: 'border-teal-300/20 bg-[linear-gradient(180deg,rgba(45,212,191,0.14),rgba(45,212,191,0.055))] text-teal-50',
  green: 'border-emerald-300/24 bg-[linear-gradient(180deg,rgba(16,185,129,0.20),rgba(16,185,129,0.08))] text-emerald-50',
  gold: 'border-amber-300/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.13),rgba(245,158,11,0.05))] text-amber-50',
  violet: 'border-violet-300/18 bg-[linear-gradient(180deg,rgba(139,92,246,0.14),rgba(139,92,246,0.055))] text-violet-50',
  slate: 'border-slate-300/14 bg-[linear-gradient(180deg,rgba(148,163,184,0.11),rgba(148,163,184,0.035))] text-slate-50',
};

export default function MobileAppDrawer({
  brand,
  subtitle = '',
  logoSrc,
  logoFallbackSrc = '',
  logoAlt,
  homeHref,
  items = [],
  breakpoint = 'lg',
  logoWide = false,
  menuLayout = 'list',
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const breakpointClass = BREAKPOINT_CLASS[breakpoint] || BREAKPOINT_CLASS.lg;

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className={`sou-mobile-app-header sticky top-0 z-[75] border-b border-white/10 bg-[#05070c]/88 px-3 backdrop-blur-2xl ${breakpointClass}`}>
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3">
          <a href={homeHref} onClick={close} className="flex min-w-0 items-center gap-3 rounded-2xl py-1 pr-2" aria-label={`${brand} 홈`}>
            <span className={`flex h-12 shrink-0 items-center overflow-hidden ${logoWide ? 'w-[116px] justify-start' : 'w-12 justify-center rounded-2xl bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'}`}>
              <img
                src={logoSrc}
                alt={logoAlt || brand}
                onError={logoFallbackSrc ? (event) => { event.currentTarget.src = logoFallbackSrc; } : undefined}
                className={`${logoWide ? 'h-16 w-[126px] max-w-none' : 'h-11 w-11 rounded-xl'} object-contain`}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-black tracking-[-0.025em] text-white">{brand}</span>
              {subtitle ? <span className="mt-0.5 block truncate text-[10px] font-bold tracking-[0.08em] text-white/38">{subtitle}</span> : null}
            </span>
          </a>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="전체 메뉴 열기"
            aria-controls={panelId}
            aria-expanded={open}
            className="flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-[5px] rounded-2xl bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.24)] active:scale-95"
          >
            <span className="h-[2px] w-5 rounded-full bg-white" />
            <span className="h-[2px] w-5 rounded-full bg-white" />
            <span className="h-[2px] w-5 rounded-full bg-white" />
          </button>
        </div>
      </header>

      <div className={`fixed inset-0 z-[110] ${breakpointClass} ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
        <button
          type="button"
          aria-label="메뉴 닫기"
          onClick={close}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
          tabIndex={open ? 0 : -1}
        />
        <aside
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={`${brand} 전체 메뉴`}
          className={`sou-mobile-drawer-panel absolute inset-y-0 right-0 flex w-[min(86vw,360px)] flex-col border-l border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_32%),#07101c] shadow-[-28px_0_90px_rgba(0,0,0,0.48)] transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3 px-5 pb-5">
            <div>
              <div className="text-[20px] font-black tracking-[-0.03em] text-white">전체 메뉴</div>
              <div className="mt-1 text-xs font-bold text-white/38">{brand}</div>
            </div>
            <button type="button" onClick={close} aria-label="전체 메뉴 닫기" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-2xl font-light text-white active:scale-95">×</button>
          </div>

          <nav className={`flex-1 overflow-y-auto px-4 pb-5 ${menuLayout === 'grid' ? 'grid auto-rows-min grid-cols-2 gap-2.5' : 'space-y-2'}`}>
            {items.map((item) => {
              const activePaths = item.activePaths || [item.href];
              const isActive = !item.external && activePaths.includes(router.pathname);
              const isGrid = menuLayout === 'grid';
              return (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={(event) => {
                  close();
                  item.onClick?.(event);
                }}
                {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className={isGrid
                  ? `group flex min-h-[58px] items-center justify-center rounded-[18px] border px-3 py-3 text-center text-[14px] font-black tracking-[-0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_28px_rgba(0,0,0,0.18)] transition active:scale-[0.985] ${item.span === 2 ? 'col-span-2' : 'col-span-1'} ${GRID_TONE_CLASS[item.tone] || GRID_TONE_CLASS.slate} ${isActive ? 'ring-1 ring-white/38 shadow-[0_0_24px_rgba(103,232,249,0.15),inset_0_1px_0_rgba(255,255,255,0.14)]' : ''}`
                  : 'group flex min-h-[56px] items-center gap-3 rounded-[20px] bg-white/[0.045] px-3.5 py-2.5 text-[15px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_12px_26px_rgba(0,0,0,0.16)] active:scale-[0.985]'}
              >
                {!isGrid && item.icon ? <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base ${TONE_CLASS[item.tone] || TONE_CLASS.blue}`}>{item.icon}</span> : null}
                <span className={isGrid ? 'min-w-0 leading-5' : 'min-w-0 flex-1 truncate'}>{item.label}</span>
                {!isGrid ? <span className="text-lg text-white/22 transition group-active:translate-x-0.5">›</span> : null}
              </a>
              );
            })}
          </nav>

          <div className="mx-4 border-t border-white/8 px-1 pt-4 text-center text-[10px] font-bold tracking-[0.16em] text-white/24">SOU MOBILE</div>
        </aside>
      </div>
    </>
  );
}


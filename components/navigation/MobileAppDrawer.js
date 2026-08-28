import { useEffect, useId, useState } from 'react';

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
}) {
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

          <nav className="flex-1 space-y-2 overflow-y-auto px-4 pb-5">
            {items.map((item) => (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={(event) => {
                  close();
                  item.onClick?.(event);
                }}
                {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="group flex min-h-[56px] items-center gap-3 rounded-[20px] bg-white/[0.045] px-3.5 py-2.5 text-[15px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_12px_26px_rgba(0,0,0,0.16)] active:scale-[0.985]"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base ${TONE_CLASS[item.tone] || TONE_CLASS.blue}`}>{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="text-lg text-white/22 transition group-active:translate-x-0.5">›</span>
              </a>
            ))}
          </nav>

          <div className="mx-4 border-t border-white/8 px-1 pt-4 text-center text-[10px] font-bold tracking-[0.16em] text-white/24">SOU MOBILE</div>
        </aside>
      </div>
    </>
  );
}


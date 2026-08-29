import { useEffect, useState } from 'react';

const QUICK_LINKS = [
  { id: 'shorts-hall', label: '명예의 쇼츠', icon: '🏆' },
  { id: 'notice', label: '공지사항', icon: '📢' },
  { id: 'member-live', label: '멤버 LIVE', icon: '●' },
  { id: 'schedule', label: '방송 일정', icon: '▦' },
  { id: 'recent-youtube', label: 'YOUTUBE', icon: '▶' },
];

export default function PrisonQuickNav() {
  const [activeId, setActiveId] = useState(QUICK_LINKS[0].id);

  useEffect(() => {
    let frame = 0;
    const initialHashId = window.location.hash.replace(/^#/, '');
    const hasKnownInitialHash = QUICK_LINKS.some((item) => item.id === initialHashId);
    let initialHashHandled = !hasKnownInitialHash;
    const updateActiveSection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!initialHashHandled) {
          const initialTarget = document.getElementById(initialHashId);
          if (initialTarget) {
            initialHashHandled = true;
            initialTarget.scrollIntoView({ block: 'start' });
          }
        }
        const sections = QUICK_LINKS
          .map((item) => document.getElementById(item.id))
          .filter(Boolean);
        if (!sections.length) return;
        const marker = window.innerHeight * 0.38;
        let current = sections[0];
        sections.forEach((section) => {
          if (section.getBoundingClientRect().top <= marker) current = section;
        });
        setActiveId(current.id);
      });
    };

    updateActiveSection();
    const delayedUpdate = window.setTimeout(updateActiveSection, 800);
    const settledUpdate = window.setTimeout(updateActiveSection, 2400);
    const layoutRoot = document.querySelector('main') || document.body;
    const layoutObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateActiveSection) : null;
    layoutObserver?.observe(layoutRoot);
    const contentObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(updateActiveSection) : null;
    contentObserver?.observe(layoutRoot, { childList: true, subtree: true });
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(delayedUpdate);
      window.clearTimeout(settledUpdate);
      layoutObserver?.disconnect();
      contentObserver?.disconnect();
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  function moveToSection(event, id) {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }

  return (
    <nav aria-label="수용소 섹션 바로가기" className="sou-prison-quick-nav sticky top-3 z-40 hidden w-full xl:block">
      <div className="grid w-full grid-cols-5 gap-2 rounded-[22px] bg-[#07101c]/92 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_48px_rgba(0,0,0,0.38),0_0_24px_rgba(56,189,248,0.07)] backdrop-blur-xl">
        {QUICK_LINKS.map((item) => {
          const active = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => moveToSection(event, item.id)}
              aria-current={active ? 'location' : undefined}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-[15px] px-2.5 text-[12px] font-bold transition duration-300 ${active ? 'bg-cyan-300 text-[#04101b] shadow-[0_0_22px_rgba(103,232,249,0.34)]' : 'bg-white/[0.045] text-white/68 hover:bg-white/10 hover:text-white'}`}
            >
              <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] text-[12px] ${active ? 'bg-[#04101b]/10' : 'bg-white/[0.055]'}`}>{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

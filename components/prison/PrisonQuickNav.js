import { useEffect, useState } from 'react';

const QUICK_LINKS = [
  { id: 'shorts-hall', label: '명예의 쇼츠', icon: '♛' },
  { id: 'notice', label: '공지사항', icon: '!' },
  { id: 'member-live', label: '멤버 LIVE', icon: '●' },
  { id: 'schedule', label: '방송 일정', icon: '▦' },
  { id: 'recent-youtube', label: 'YOUTUBE', icon: '▶' },
];

export default function PrisonQuickNav() {
  const [activeId, setActiveId] = useState(QUICK_LINKS[0].id);

  useEffect(() => {
    let frame = 0;
    const updateActiveSection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
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
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(delayedUpdate);
      window.clearTimeout(settledUpdate);
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
    <nav aria-label="수용소 섹션 바로가기" className="sou-prison-quick-nav fixed left-[288px] top-1/2 z-40 hidden w-fit -translate-y-1/2 flex-col items-start gap-2 min-[1800px]:flex">
      <div className="w-fit rounded-[22px] bg-[#07101c]/92 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_48px_rgba(0,0,0,0.38),0_0_24px_rgba(56,189,248,0.07)] backdrop-blur-xl">
        {QUICK_LINKS.map((item) => {
          const active = activeId === item.id;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => moveToSection(event, item.id)}
              aria-current={active ? 'location' : undefined}
              className={`group relative mb-1 flex h-11 w-11 items-center justify-center rounded-[15px] text-[13px] font-black transition duration-300 last:mb-0 ${active ? 'bg-cyan-300 text-[#04101b] shadow-[0_0_22px_rgba(103,232,249,0.34)]' : 'bg-white/[0.045] text-white/58 hover:bg-white/10 hover:text-white'}`}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="pointer-events-none absolute left-[52px] top-1/2 w-max -translate-y-1/2 translate-x-1 rounded-xl bg-[#07101c]/96 px-3 py-2 text-[11px] font-black text-white opacity-0 shadow-[0_12px_30px_rgba(0,0,0,0.42)] transition duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}


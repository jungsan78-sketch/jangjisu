import { useEffect, useState } from 'react';

const PARTICIPANT_LIST_URL = 'https://www.jisoodream.xyz/';
const SERVER_WIKI_URL = 'https://hanol0927.github.io/jisoudream/';

export default function SiteFooter({ className = '' }) {
  const [dreamMenuOpen, setDreamMenuOpen] = useState(false);

  useEffect(() => {
    const handleClick = (event) => {
      const link = event.target?.closest?.('a[href="/jisu-dream"], a[href^="/jisu-dream#"]');
      if (!link) return;
      event.preventDefault();
      setDreamMenuOpen(true);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setDreamMenuOpen(false);
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <footer className={`px-5 pb-8 pt-12 text-center lg:px-8 ${className}`}>
        <div className="mx-auto max-w-7xl border-t border-white/[0.06] pt-6">
          <p className="text-xs font-semibold tracking-[0.08em] text-white/35 sm:text-sm">
            ©2026 SANE. <span className="ml-1">All rights reserved.</span>
          </p>
        </div>
      </footer>

      {dreamMenuOpen ? (
        <div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/72 px-5 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDreamMenuOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-[28px] border border-cyan-200/15 bg-[#08101d]/98 p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.72),0_0_48px_rgba(34,211,238,0.12)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black tracking-tight">지수의꿈 서버</div>
                <div className="mt-1 text-xs font-bold text-white/45">이동할 메뉴를 선택해주세요.</div>
              </div>
              <button
                type="button"
                onClick={() => setDreamMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-lg font-black text-white/65 transition hover:bg-white/[0.11] hover:text-white"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="grid gap-3">
              <a
                href={PARTICIPANT_LIST_URL}
                className="flex items-center justify-between rounded-2xl border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.13),rgba(59,130,246,0.09))] px-5 py-4 text-sm font-black text-cyan-50 transition hover:-translate-y-0.5 hover:border-cyan-100/30 hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.20),rgba(59,130,246,0.14))]"
              >
                <span>참가자 목록</span>
                <span className="text-cyan-200/70">→</span>
              </a>
              <a
                href={SERVER_WIKI_URL}
                className="flex items-center justify-between rounded-2xl border border-violet-200/15 bg-[linear-gradient(135deg,rgba(139,92,246,0.13),rgba(59,130,246,0.08))] px-5 py-4 text-sm font-black text-violet-50 transition hover:-translate-y-0.5 hover:border-violet-100/30 hover:bg-[linear-gradient(135deg,rgba(139,92,246,0.20),rgba(59,130,246,0.13))]"
              >
                <span>서버 위키</span>
                <span className="text-violet-200/70">→</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

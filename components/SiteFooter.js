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
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDreamMenuOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-[30px] border border-white/16 bg-[#08111f] p-6 text-white shadow-[0_34px_110px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.03),0_0_60px_rgba(34,211,238,0.14)] sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/12 text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">◉</span>
                  <div className="text-[22px] font-black tracking-tight text-white">지수의꿈 서버</div>
                </div>
                <div className="mt-3 text-sm font-bold leading-6 text-white/70">원하는 메뉴를 선택해주세요.</div>
              </div>
              <button
                type="button"
                onClick={() => setDreamMenuOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-xl font-black text-white/80 transition hover:bg-white/[0.14] hover:text-white"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4">
              <a
                href={PARTICIPANT_LIST_URL}
                className="group flex items-center justify-between rounded-[22px] border border-cyan-200/28 bg-[#0d2233] px-5 py-5 text-base font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_28px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-cyan-100/45 hover:bg-[#123049]"
              >
                <div>
                  <div className="text-[17px] font-black text-cyan-50">참가자 목록</div>
                  <div className="mt-1 text-xs font-bold text-cyan-100/65">신청자와 순위를 확인합니다.</div>
                </div>
                <span className="text-xl text-cyan-200 transition group-hover:translate-x-1">→</span>
              </a>
              <a
                href={SERVER_WIKI_URL}
                className="group flex items-center justify-between rounded-[22px] border border-violet-200/28 bg-[#1a1730] px-5 py-5 text-base font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_28px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-violet-100/45 hover:bg-[#252044]"
              >
                <div>
                  <div className="text-[17px] font-black text-violet-50">서버 위키</div>
                  <div className="mt-1 text-xs font-bold text-violet-100/65">서버 정보와 이용 안내를 확인합니다.</div>
                </div>
                <span className="text-xl text-violet-200 transition group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

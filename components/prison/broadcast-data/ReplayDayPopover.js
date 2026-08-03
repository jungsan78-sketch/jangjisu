import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function formatDuration(seconds) {
  const totalMinutes = Math.max(0, Math.floor(Number(seconds || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}시간 ${minutes}분`;
  if (hours) return `${hours}시간`;
  return `${minutes}분`;
}

export default function ReplayDayPopover({ replays = [] }) {
  const anchorRef = useRef(null);
  const pinnedRef = useRef(false);
  const closeTimerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState(null);
  const sortedReplays = useMemo(
    () => [...replays].sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || ''))),
    [replays],
  );

  const clearCloseTimer = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openPreview = () => {
    clearCloseTimer();
    setActive(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    if (pinnedRef.current) return;
    closeTimerRef.current = setTimeout(() => setActive(false), 140);
  };

  const closePreview = () => {
    pinnedRef.current = false;
    clearCloseTimer();
    setActive(false);
  };

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined;
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 12;
      const width = Math.min(560, window.innerWidth - viewportPadding * 2);
      const estimatedHeight = Math.min(window.innerHeight - viewportPadding * 2, 122 + sortedReplays.length * 162);
      const left = Math.min(
        window.innerWidth - width - viewportPadding,
        Math.max(viewportPadding, rect.left + rect.width / 2 - width / 2),
      );
      const placeAbove = rect.top > estimatedHeight + 18;
      const top = placeAbove
        ? rect.top - estimatedHeight - 10
        : Math.min(window.innerHeight - estimatedHeight - viewportPadding, rect.bottom + 10);
      setPosition({ left, top: Math.max(viewportPadding, top), width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const onKeyDown = (event) => { if (event.key === 'Escape') closePreview(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active, sortedReplays.length]);

  useEffect(() => () => clearCloseTimer(), []);

  if (!sortedReplays.length) return null;
  const firstReplay = sortedReplays[0];

  return (
    <>
      <span className="min-w-0 flex-1 truncate rounded-lg bg-teal-300/[0.08] px-2 py-1 text-[10px] font-black text-teal-100/80">
        {firstReplay.title}
        {sortedReplays.length > 1 ? ` 외 ${sortedReplays.length - 1}개` : ''}
      </span>
      <button
        ref={anchorRef}
        type="button"
        aria-expanded={active}
        aria-label={`${firstReplay.title}${sortedReplays.length > 1 ? ` 외 ${sortedReplays.length - 1}개` : ''} 다시보기 목록 열기`}
        onMouseEnter={openPreview}
        onMouseLeave={scheduleClose}
        onFocus={openPreview}
        onClick={() => {
          pinnedRef.current = !active || !pinnedRef.current;
          setActive(!active || pinnedRef.current);
        }}
        className={`absolute inset-0 z-20 cursor-pointer rounded-2xl bg-transparent transition duration-200 hover:bg-teal-300/[0.035] hover:shadow-[inset_0_0_0_1px_rgba(94,234,212,0.20),0_12px_30px_rgba(0,0,0,0.12)] focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(165,243,252,0.58)] ${active ? 'bg-teal-300/[0.025] shadow-[inset_0_0_0_1px_rgba(94,234,212,0.25)]' : ''}`}
      />

      {active && position && typeof document !== 'undefined' ? createPortal(
        <div
          role="dialog"
          aria-label="해당 날짜 다시보기 목록"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          className="fixed z-[400] overflow-hidden rounded-[20px] border border-teal-200/20 bg-[#07131f]/98 shadow-[0_26px_80px_rgba(0,0,0,0.65),0_0_34px_rgba(45,212,191,0.10)] backdrop-blur-xl"
          style={{ left: position.left, top: position.top, width: position.width, maxHeight: 'calc(100vh - 24px)' }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <div>
              <div className="text-sm font-black text-white">다시보기 {sortedReplays.length}개</div>
              <div className="mt-0.5 text-[10px] font-bold text-white/35">선택하면 SOOP 다시보기로 이동합니다.</div>
            </div>
            <button type="button" onClick={closePreview} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-sm font-black text-white/55 hover:bg-white/[0.12] hover:text-white" aria-label="다시보기 목록 닫기">×</button>
          </div>
          <div className="max-h-[calc(100vh-96px)] space-y-2.5 overflow-y-auto p-3">
            {sortedReplays.map((replay) => (
              <a
                key={replay.id || replay.url}
                href={replay.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-white/[0.035] transition hover:border-teal-200/25 hover:bg-teal-300/[0.07] hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:flex-row"
              >
                <div className="aspect-video w-full shrink-0 overflow-hidden bg-black/35 sm:h-[135px] sm:w-[240px] sm:aspect-auto">
                  {replay.thumbnailUrl ? <img src={replay.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3.5">
                  <div className="line-clamp-3 text-[15px] font-black leading-[1.45] text-white sm:text-[16px]">{replay.title}</div>
                  <div className="mt-2 text-xs font-black text-teal-100/60 sm:text-[13px]">
                    {replay.durationText || formatDuration(replay.durationSeconds)}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}


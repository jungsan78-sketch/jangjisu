import { useEffect, useMemo, useState } from 'react';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function parseMonthLabel(label) {
  const matched = String(label || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!matched) return null;
  return { year: Number(matched[1]), month: Number(matched[2]) };
}

function buildCalendarCells(monthLabel, items) {
  const parsed = parseMonthLabel(monthLabel);
  if (!parsed) return [];

  const { year, month } = parsed;
  const days = new Date(year, month, 0).getDate();
  const lead = new Date(year, month - 1, 1).getDay();
  const total = Math.ceil((lead + days) / 7) * 7;
  const map = new Map((items || []).map((item) => [Number(item.dayNumber), item]));

  return Array.from({ length: total }, (_, index) => {
    const day = index - lead + 1;
    if (day < 1 || day > days) return null;
    return map.get(day) || { dayNumber: day, broadcasts: [] };
  });
}

function BroadcastPill({ broadcast }) {
  const timeline = (broadcast.timeline || []).slice(0, 4);
  return (
    <a
      href={broadcast.url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-[14px] border border-white/[0.065] bg-white/[0.045] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:-translate-y-0.5 hover:border-cyan-200/20 hover:bg-cyan-300/[0.08] sm:rounded-[16px] sm:px-3 sm:py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-black text-cyan-100 sm:text-xs">{broadcast.member}</span>
        {broadcast.durationText ? <span className="shrink-0 rounded-full bg-black/22 px-1.5 py-0.5 text-[8px] font-black text-white/62 sm:text-[10px]">{broadcast.durationText}</span> : null}
      </div>
      <div className="mt-1 truncate text-[10px] font-black leading-4 text-white/88 sm:text-[12px] sm:leading-5">{broadcast.title}</div>
      {timeline.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {timeline.map((title, index) => (
            <span key={`${broadcast.id}-${title}-${index}`} className="max-w-full truncate rounded-full bg-black/18 px-1.5 py-0.5 text-[8px] font-extrabold text-white/56 sm:text-[10px]">{title}</span>
          ))}
        </div>
      ) : null}
    </a>
  );
}

export default function BroadcastSummaryCalendar() {
  const [payload, setPayload] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/prison-broadcast-summary?t=${Date.now()}`, { cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (mounted) setPayload(json || null);
      } catch {
        if (mounted) setPayload(null);
      } finally {
        if (mounted) setLoaded(true);
      }
    }

    load();
    const timer = setInterval(load, 60 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const monthLabel = payload?.monthLabel || '';
  const parsedMonth = parseMonthLabel(monthLabel);
  const cells = useMemo(() => buildCalendarCells(monthLabel, payload?.items || []), [monthLabel, payload]);
  const totalCount = payload?.totalCount || 0;

  return (
    <section id="broadcast-summary" className="mt-8 w-full max-w-none rounded-[28px] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-5 lg:p-7">
      <div className="w-full rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.13),transparent_28%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_50px_rgba(0,0,0,0.26),0_0_36px_rgba(45,212,191,0.05)] sm:rounded-[30px] sm:p-5 lg:p-7">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-teal-200/16 bg-teal-300/10 text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">▤</span>
              <div className="text-[22px] font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[34px]">방송요약</div>
            </div>
            <p className="mt-2 text-xs font-bold leading-5 text-white/42 sm:text-sm">다시보기 시작일 기준으로 이번 달 방송 흐름을 달력에 정리합니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="rounded-full bg-white/[0.055] px-3 py-1.5 text-[11px] font-black text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">1시간마다 갱신</span>
            {loaded ? <span className="rounded-full bg-teal-300/10 px-3 py-1.5 text-[11px] font-black text-teal-100/80">{totalCount}개 다시보기</span> : null}
            <div className="text-[10px] font-black tracking-[0.28em] text-white/35 sm:text-sm sm:tracking-[0.45em]">{parsedMonth?.year || ''}</div>
          </div>
        </div>

        <div className="mb-4 text-[22px] font-black text-white sm:text-[30px]">{parsedMonth ? `${parsedMonth.month}월 방송요약 달력` : '방송요약 달력'}</div>

        {!loaded ? (
          <div className="rounded-[22px] bg-[#05101d] p-6 text-sm font-bold text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">다시보기 기록을 불러오는 중입니다.</div>
        ) : !payload?.ok ? (
          <div className="rounded-[22px] bg-[#05101d] p-6 text-sm font-bold leading-6 text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">{payload?.message || '이번 달 다시보기 기록을 아직 불러오지 못했습니다.'}</div>
        ) : (
          <div className="w-full rounded-[22px] bg-[#05101d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.18)] sm:rounded-[28px] sm:p-5">
            <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-[11px] font-black text-white/58 sm:mb-4 sm:gap-3 sm:text-[15px]">
              {DAY_LABELS.map((dayLabel, index) => <div key={dayLabel} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{dayLabel}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
              {cells.map((cell, index) => {
                if (!cell) return <div key={`empty-${index}`} className="min-h-[110px] rounded-[16px] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:min-h-[170px] sm:rounded-[22px]" />;
                const day = Number(cell.dayNumber);
                const broadcasts = cell.broadcasts || [];
                const hasItems = broadcasts.length > 0;
                const weekdayIndex = parsedMonth ? new Date(parsedMonth.year, parsedMonth.month - 1, day).getDay() : 0;
                return (
                  <div key={day} className={`relative min-h-[110px] overflow-hidden rounded-[16px] p-2 transition-all duration-300 hover:-translate-y-1 sm:min-h-[170px] sm:rounded-[22px] sm:p-3 ${hasItems ? 'bg-[linear-gradient(180deg,rgba(8,28,38,0.95),rgba(7,17,31,0.98))] shadow-[inset_0_0_0_1px_rgba(94,234,212,0.08),0_0_18px_rgba(45,212,191,0.04)]' : 'bg-[#07111f] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'}`}>
                    <div className="mb-2 flex items-start justify-between gap-1">
                      <div className={`text-[12px] font-black sm:text-[17px] ${weekdayIndex === 0 ? 'text-[#ff8e8e]' : weekdayIndex === 6 ? 'text-[#89b4ff]' : 'text-white/95'}`}>{day}</div>
                      {hasItems ? <span className="rounded-full bg-teal-300/12 px-1.5 py-0.5 text-[8px] font-black text-teal-100 sm:text-[10px]">{broadcasts.length}개</span> : null}
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {broadcasts.slice(0, 2).map((broadcast) => <BroadcastPill key={broadcast.id} broadcast={broadcast} />)}
                      {broadcasts.length > 2 ? <div className="rounded-full bg-white/[0.045] px-2 py-1 text-center text-[9px] font-black text-white/45 sm:text-[10px]">+{broadcasts.length - 2}개 더 있음</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

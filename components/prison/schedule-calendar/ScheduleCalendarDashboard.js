import { useMemo, useState } from 'react';
import ScheduleMemberBar from './ScheduleMemberRail';
import ScheduleMonthGrid from './ScheduleMonthGrid';
import useScheduleCalendarData from './useScheduleCalendarData';

export default function ScheduleCalendarDashboard() {
  const [selected, setSelected] = useState('jangjisu');
  const { currentMonth, entries, events, loaded, failedCount } = useScheduleCalendarData();
  const selectedEntry = entries.find((entry) => entry.key === selected);
  const visibleEvents = useMemo(() => events.filter((event) => event.memberKey === selected), [events, selected]);

  return (
    <div className="sou-calendar-dashboard w-full max-w-none rounded-[24px] bg-white/[0.025] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_70px_rgba(0,0,0,0.22)] sm:rounded-[28px] sm:p-3.5">
      <header className="sou-calendar-toolbar mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-[linear-gradient(180deg,#081525,#06101d)] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_12px_30px_rgba(0,0,0,0.18)] sm:px-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[18px] font-black tracking-[-0.035em] text-white sm:text-[21px]">일정 캘린더</h1>
          <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-black text-white/82">{currentMonth.year}년 {currentMonth.month}월</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {failedCount > 0 ? <span className="rounded-full bg-amber-300/8 px-3 py-1.5 text-[10px] font-bold text-amber-100/72">일부 일정 확인 중</span> : null}
          <span className="rounded-full bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black text-cyan-100">1시간마다 갱신</span>
          {selectedEntry?.sourceUrl ? <a href={selectedEntry.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[10px] font-black text-white/72 transition hover:bg-white/10 hover:text-white">원본 일정 ↗</a> : null}
        </div>
      </header>

      <ScheduleMemberBar entries={entries} selected={selected} onSelect={setSelected} />
      <div className="w-full min-w-0 max-w-none">
        {!loaded ? <div className="rounded-[24px] bg-[#06101d] px-5 py-20 text-center text-sm font-black text-white/48">일정을 불러오는 중입니다.</div> : <ScheduleMonthGrid year={currentMonth.year} month={currentMonth.month} events={visibleEvents} />}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import ScheduleMemberRail, { ScheduleMemberChips } from './ScheduleMemberRail';
import ScheduleMonthGrid from './ScheduleMonthGrid';
import useScheduleCalendarData from './useScheduleCalendarData';

export default function ScheduleCalendarDashboard() {
  const [selected, setSelected] = useState('jangjisu');
  const { currentMonth, entries, events, loaded, failedCount } = useScheduleCalendarData();
  const selectedEntry = entries.find((entry) => entry.key === selected);
  const visibleEvents = useMemo(() => selected === 'all' ? events : events.filter((event) => event.memberKey === selected), [events, selected]);

  return (
    <div className="w-full max-w-none rounded-[28px] bg-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_70px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-5 lg:p-7">
      <header className="mb-5 rounded-[26px] bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_34%),linear-gradient(180deg,#081525,#06101d)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_48px_rgba(0,0,0,0.24)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[30px] font-black tracking-[-0.04em] text-white sm:text-[40px]">일정 캘린더</h1>
            <p className="mt-2 text-sm font-bold text-white/44">멤버 일정을 월간 캘린더로 한눈에 확인할 수 있습니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="rounded-[16px] bg-white/[0.06] px-4 py-3 text-[15px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">{currentMonth.year}년 {currentMonth.month}월</div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-2 text-[11px] font-black text-cyan-100">1시간마다 갱신</span>
            {selectedEntry?.sourceUrl ? <a href={selectedEntry.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/[0.06] px-3 py-2 text-[11px] font-black text-white/72 transition hover:bg-white/10 hover:text-white">원본 일정 보기 ↗</a> : null}
          </div>
        </div>
        {failedCount > 0 ? <div className="mt-4 rounded-[14px] bg-amber-300/8 px-4 py-3 text-xs font-bold text-amber-100/72">일부 멤버 일정은 이전 데이터로 표시하거나 확인 중입니다.</div> : null}
      </header>

      <ScheduleMemberChips entries={entries} selected={selected} onSelect={setSelected} />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
        <main className="min-w-0">
          {!loaded ? <div className="rounded-[24px] bg-[#06101d] px-5 py-20 text-center text-sm font-black text-white/48">일정을 불러오는 중입니다.</div> : <ScheduleMonthGrid year={currentMonth.year} month={currentMonth.month} events={visibleEvents} selected={selected} />}
        </main>
        <ScheduleMemberRail entries={entries} selected={selected} onSelect={setSelected} />
      </div>
    </div>
  );
}


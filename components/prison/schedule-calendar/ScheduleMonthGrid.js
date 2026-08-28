import { useMemo } from 'react';
import { buildMonthCells } from '../../../lib/prisonScheduleCalendar';
import ScheduleEvent from './ScheduleEvent';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dateKey(year, month, day) {
  return `${year}-${month}-${day}`;
}

export default function ScheduleMonthGrid({ year, month, events }) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const grouped = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const list = map.get(event.day) || [];
      list.push(event);
      map.set(event.day, list);
    });
    return map;
  }, [events]);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const scheduledDays = cells.filter(Boolean).filter((day) => (grouped.get(day) || []).length > 0);

  return (
    <>
      <div className="sou-calendar-grid hidden overflow-hidden rounded-[24px] bg-[#06101d] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_64px_rgba(0,0,0,0.24)] lg:block">
        <div className="grid grid-cols-7 border-b border-white/[0.07] bg-white/[0.025]">
          {WEEKDAYS.map((weekday, index) => <div key={weekday} className={`px-3 py-3.5 text-center text-[15px] font-black ${index === 0 ? 'text-rose-400' : index === 6 ? 'text-sky-500' : 'text-white/52'}`}>{weekday}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="min-h-[170px] border-b border-r border-white/[0.045] bg-white/[0.012]" />;
            const dayEvents = grouped.get(day) || [];
            const weekday = index % 7;
            const isToday = isCurrentMonth && today.getDate() === day;
            return (
              <section key={dateKey(year, month, day)} className={`sou-calendar-day min-h-[190px] border-b border-r border-white/[0.055] p-3 transition ${isToday ? 'bg-cyan-300/[0.055] shadow-[inset_0_0_0_1px_rgba(103,232,249,0.12)]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.004))]'}`}>
                <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
                  <span className={`text-[17px] font-black ${weekday === 0 ? 'text-rose-400' : weekday === 6 ? 'text-sky-500' : 'text-white/86'}`}>{day}</span>
                  {isToday ? <span className="rounded-full bg-cyan-300/12 px-2 py-0.5 text-[8px] font-black tracking-[0.14em] text-cyan-100">TODAY</span> : null}
                </div>
                <div className="space-y-2">
                  {dayEvents.map((event) => <ScheduleEvent key={event.id} event={event} showMember={false} compact />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {scheduledDays.length ? scheduledDays.map((day) => {
          const dayEvents = grouped.get(day) || [];
          const weekday = new Date(year, month - 1, day).getDay();
          const isToday = isCurrentMonth && today.getDate() === day;
          return <section key={`mobile-${day}`} className={`sou-calendar-mobile-day rounded-[20px] bg-[#07111f] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_12px_28px_rgba(0,0,0,0.18)] ${isToday ? 'ring-1 ring-cyan-200/20' : ''}`}><div className="mb-3 flex items-center gap-2"><span className={`text-[22px] font-black ${weekday === 0 ? 'text-rose-400' : weekday === 6 ? 'text-sky-500' : 'text-white'}`}>{day}일</span><span className="text-sm font-black text-white/44">{WEEKDAYS[weekday]}</span>{isToday ? <span className="ml-auto rounded-full bg-cyan-300/12 px-2 py-1 text-[9px] font-black text-cyan-100">TODAY</span> : null}</div><div className="space-y-2.5">{dayEvents.map((event) => <ScheduleEvent key={event.id} event={event} showMember={false} />)}</div></section>;
        }) : <div className="rounded-[20px] bg-white/[0.035] px-5 py-10 text-center text-sm font-bold text-white/45">선택한 멤버의 이번 달 일정이 없습니다.</div>}
      </div>
    </>
  );
}


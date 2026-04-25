import { useEffect, useMemo, useState } from 'react';
import { PRISON_SCHEDULE_SOURCES } from '../../data/prisonScheduleSources';
import { SCHEDULE_MEMBERS } from '../../data/prisonMembers';
import WeeklyAllScheduleView from './WeeklyAllScheduleView';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function parseMonthFromLabel(label) {
  const m = String(label || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!m) {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

function buildCalendarCells(schedule) {
  const { year, month } = parseMonthFromLabel(schedule.monthLabel);
  const days = new Date(year, month, 0).getDate();
  const lead = new Date(year, month - 1, 1).getDay();
  const total = Math.ceil((lead + days) / 7) * 7;
  const map = new Map((schedule.items || []).map((item) => [Number(item.dayNumber), item]));
  return Array.from({ length: total }, (_, i) => {
    const day = i - lead + 1;
    if (day < 1 || day > days) return null;
    return map.get(day) || { dayNumber: day, title: '', empty: true };
  });
}

function startOfDay(value) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function shiftDay(value, days) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function buildCenteredWeekDates(centerDate) {
  return Array.from({ length: 5 }, (_, index) => shiftDay(centerDate, index - 2));
}

function FilterButton({ label, image, active, onClick }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[12px] font-black transition sm:py-2 sm:pl-2 sm:pr-4 sm:text-[15px] ${active ? 'border-amber-200/32 bg-amber-300/12 text-white shadow-[0_0_18px_rgba(245,158,11,0.10)]' : 'border-white/10 bg-white/[0.06] text-white/72 hover:bg-white/10'}`}>
      {image ? <img src={image} alt="" className="h-6 w-6 rounded-full border border-white/12 object-cover sm:h-7 sm:w-7" loading="lazy" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-[10px] sm:h-7 sm:w-7">ALL</span>}
      <span>{label}</span>
    </button>
  );
}

function DayDetailModal({ isOpen, month, day, items, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/72 p-3 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,30,0.98),rgba(5,10,19,0.98))] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black tracking-[0.22em] text-cyan-200/70">DAY DETAIL</div>
            <div className="mt-2 text-[24px] font-black text-white sm:text-[30px]">{month}월 {day}일 일정</div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">닫기</button>
        </div>
        <div className="space-y-2.5">
          {items.map((item, index) => {
            const off = String(item.title || '').includes('휴방');
            return (
              <div key={`${item.member}-${item.title}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                <div className={`text-sm font-black ${off ? 'text-rose-100' : 'text-cyan-100'}`}>{item.member}</div>
                <div className={`mt-1.5 text-sm leading-6 break-keep ${off ? 'text-rose-50' : 'text-white/90'}`}>{item.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPreview() {
  const [selectedMember, setSelectedMember] = useState('전체보기');
  const [scheduleState, setScheduleState] = useState(() => Object.fromEntries(PRISON_SCHEDULE_SOURCES.map((source) => [source.key, { monthLabel: '', items: [], loaded: false }])));
  const [detailModal, setDetailModal] = useState({ isOpen: false, day: null, items: [] });
  const [centerDate, setCenterDate] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const results = await Promise.allSettled(
        PRISON_SCHEDULE_SOURCES.map((source) => fetch(source.endpoint).then((res) => res.json())),
      );
      if (!mounted) return;

      const nextState = {};
      PRISON_SCHEDULE_SOURCES.forEach((source, index) => {
        const result = results[index];
        nextState[source.key] = {
          monthLabel: result.status === 'fulfilled' ? result.value.monthLabel || '' : '',
          items: result.status === 'fulfilled' && Array.isArray(result.value.items) ? result.value.items : [],
          loaded: true,
        };
      });
      setScheduleState(nextState);
    };

    load();
    const timer = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const scheduleEntries = useMemo(
    () => PRISON_SCHEDULE_SOURCES.map((source) => ({ ...source, ...(scheduleState[source.key] || { monthLabel: '', items: [], loaded: false }) })),
    [scheduleState],
  );

  const calendarSchedule = useMemo(() => {
    const monthLabel = scheduleEntries.find((entry) => entry.monthLabel)?.monthLabel || '';
    const itemMap = new Map();

    scheduleEntries.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        if (!item?.dayNumber) return;
        if (!itemMap.has(item.dayNumber)) itemMap.set(item.dayNumber, item);
      });
    });

    return { monthLabel, items: Array.from(itemMap.values()) };
  }, [scheduleEntries]);

  const cells = useMemo(() => buildCalendarCells(calendarSchedule), [calendarSchedule]);
  const { year, month } = useMemo(() => parseMonthFromLabel(calendarSchedule.monthLabel), [calendarSchedule.monthLabel]);
  const today = new Date();
  const schedules = useMemo(
    () => scheduleEntries.flatMap((entry) => (entry.items || []).filter((item) => !item.empty && String(item.title || '').trim()).map((item) => ({
      day: item.dayNumber,
      member: entry.member,
      title: item.title,
      year,
      month,
    }))),
    [scheduleEntries, year, month],
  );
  const visible = selectedMember === '전체보기' ? schedules : schedules.filter((item) => item.member === selectedMember);
  const byDay = useMemo(() => {
    const map = new Map();
    visible.forEach((item) => {
      const list = map.get(item.day) || [];
      list.push(item);
      map.set(item.day, list);
    });
    return map;
  }, [visible]);
  const weeklyDates = useMemo(() => buildCenteredWeekDates(centerDate), [centerDate]);
  const weeklyGroupedSchedules = useMemo(() => {
    const map = new Map();
    schedules.forEach((item) => {
      const key = `${item.year}-${item.month}-${item.day}`;
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    });
    return map;
  }, [schedules]);
  const isLoaded = scheduleEntries.every((entry) => entry.loaded);

  return (
    <>
      <section id="schedule" className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/20 sm:mt-8 sm:rounded-[32px] sm:p-6 lg:p-8">
        <div className="rounded-[24px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:rounded-[30px] sm:p-5 lg:p-7">
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
            <div className="text-[22px] font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[34px]">{month}월 달력</div>
            <div className="text-[10px] font-black tracking-[0.28em] text-white/35 sm:text-sm sm:tracking-[0.45em]">{year}</div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 rounded-[20px] border border-white/8 bg-[#05101d] p-2.5 sm:mb-5 sm:rounded-[24px] sm:p-3">
            <FilterButton label="전체보기" active={selectedMember === '전체보기'} onClick={() => setSelectedMember('전체보기')} />
            {SCHEDULE_MEMBERS.map((member) => (
              <FilterButton key={member.nickname} label={member.nickname} image={member.image} active={selectedMember === member.nickname} onClick={() => setSelectedMember(member.nickname)} />
            ))}
          </div>

          {selectedMember === '전체보기' ? <WeeklyAllScheduleView dates={weeklyDates} onMoveDay={(days) => setCenterDate((prev) => shiftDay(prev, days))} groupedSchedules={weeklyGroupedSchedules} /> : <div className="rounded-[22px] border border-white/10 bg-[#05101d] p-3 sm:rounded-[28px] sm:p-5">
            <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-[11px] font-black text-white/58 sm:mb-4 sm:gap-3 sm:text-[15px]">
              {WEEKDAY_LABELS.map((dayLabel, index) => <div key={dayLabel} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{dayLabel}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
              {cells.map((cell, index) => {
                if (!cell) return <div key={`e-${index}`} className="min-h-[82px] rounded-[16px] border border-white/5 bg-white/[0.02] sm:min-h-[132px] sm:rounded-[22px]" />;

                const day = Number(cell.dayNumber);
                const list = byDay.get(day) || [];
                const isToday = today.getMonth() + 1 === month && today.getDate() === day;
                const hasItem = list.length > 0;
                const offDay = list.some((item) => String(item.title || '').includes('휴방'));
                const displayLimit = 3;
                const visibleItems = list.slice(0, displayLimit);
                const hiddenCount = Math.max(0, list.length - displayLimit);

                return (
                  <div key={day} className={`group relative overflow-hidden min-h-[82px] rounded-[16px] border p-2 transition-all duration-300 hover:-translate-y-1 sm:min-h-[132px] sm:rounded-[22px] sm:p-3.5 ${isToday ? 'border-cyan-300/50 bg-[linear-gradient(180deg,rgba(7,27,46,0.98),rgba(5,12,24,0.98))] shadow-[0_0_0_1px_rgba(103,232,249,0.18),0_0_22px_rgba(34,211,238,0.12)]' : offDay ? 'border-orange-300/20 bg-[linear-gradient(180deg,rgba(34,20,7,0.82),rgba(8,14,25,0.98))] hover:border-orange-200/30 hover:shadow-[0_14px_30px_rgba(251,146,60,0.10)]' : hasItem ? 'border-white/10 bg-[linear-gradient(180deg,rgba(11,23,38,0.96),rgba(7,17,31,0.98))] hover:border-cyan-300/20 hover:shadow-[0_14px_30px_rgba(56,189,248,0.08)]' : 'border-white/8 bg-[#07111f] hover:border-white/12 hover:bg-[#091729]'}`}>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:h-14" />
                    <div className="relative flex items-start justify-between gap-1 sm:gap-2">
                      <div className={`text-[12px] font-black sm:text-[17px] ${day === 5 || day === 12 || day === 19 || day === 26 ? 'text-[#ff8e8e]' : day === 4 || day === 11 || day === 18 ? 'text-[#89b4ff]' : 'text-white/95'}`}>{day}</div>
                      {isToday ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-1.5 py-0.5 text-[8px] font-black tracking-[0.12em] text-cyan-100 sm:px-2 sm:text-[10px] sm:tracking-[0.18em]">TODAY</span> : hasItem ? <span className={`mt-1 h-2 w-2 rounded-full sm:mt-1.5 sm:h-2.5 sm:w-2.5 ${offDay ? 'bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.55)]' : 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.45)]'}`} /> : null}
                    </div>
                    <div className="relative mt-2 space-y-1 sm:mt-4 sm:space-y-2">
                      {visibleItems.map((item) => {
                        const off = String(item.title || '').includes('휴방');
                        return <div key={`${item.day}-${item.member}-${item.title}`} className={`line-clamp-2 text-[9px] font-black leading-4 break-keep sm:text-[13px] sm:leading-6 ${off ? 'text-rose-100' : 'text-white/92'}`}>{off ? <><span>{item.member}</span><span className="ml-1">휴방</span></> : <><span className="text-cyan-100">{item.member}</span><span className="px-1 text-white/42 sm:px-1.5">-</span><span>{item.title}</span></>}</div>;
                      })}
                      {hiddenCount > 0 ? <button type="button" onClick={() => setDetailModal({ isOpen: true, day, items: list })} className="text-[9px] font-black leading-4 text-cyan-200/85 underline decoration-dotted underline-offset-2 transition hover:text-cyan-100 sm:text-[12px] sm:leading-5">+{hiddenCount} 더보기</button> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {!isLoaded ? <div className="mt-4 text-sm font-bold text-white/55">멤버 일정표 데이터를 불러오는 중입니다.</div> : null}
            {isLoaded && visible.length === 0 ? <div className="mt-4 text-sm font-bold text-white/55">선택한 메뉴의 일정 데이터가 아직 비어 있습니다.</div> : null}
          </div>}
        </div>
      </section>

      <DayDetailModal isOpen={detailModal.isOpen} month={month} day={detailModal.day} items={detailModal.items} onClose={() => setDetailModal({ isOpen: false, day: null, items: [] })} />
    </>
  );
}

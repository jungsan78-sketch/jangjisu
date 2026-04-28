import { useEffect, useMemo, useState } from 'react';
import { PRISON_SCHEDULE_SOURCES } from '../../data/prisonScheduleSources';
import { SCHEDULE_MEMBERS } from '../../data/prisonMembers';
import WeeklyAllScheduleView from './WeeklyAllScheduleView';

const SCHEDULE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function parseMonthFromLabel(label) {
  const matched = String(label || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!matched) return null;
  return { year: Number(matched[1]), month: Number(matched[2]) };
}

function buildCalendarCells(monthLabel, items) {
  const parsed = parseMonthFromLabel(monthLabel);
  if (!parsed) return [];
  const { year, month } = parsed;
  const days = new Date(year, month, 0).getDate();
  const lead = new Date(year, month - 1, 1).getDay();
  const total = Math.ceil((lead + days) / 7) * 7;
  const map = new Map((items || []).map((item) => [Number(item.dayNumber), item]));
  return Array.from({ length: total }, (_, index) => {
    const day = index - lead + 1;
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

function hasScheduleItems(entry) {
  return (entry?.items || []).some((item) => !item.empty && String(item.title || '').trim());
}

function FilterButton({ label, image, active, linked, onClick }) {
  const stateClass = active
    ? 'border-amber-200/28 bg-amber-300/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_22px_rgba(245,158,11,0.20)]'
    : linked
      ? 'border-cyan-200/22 bg-cyan-300/[0.075] text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_0_18px_rgba(103,232,249,0.12),0_10px_22px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:border-cyan-100/36 hover:bg-cyan-300/[0.12] hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_28px_rgba(103,232,249,0.22),0_14px_28px_rgba(0,0,0,0.16)]'
      : 'border-white/8 bg-white/[0.055] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:bg-white/10 hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_16px_rgba(56,189,248,0.08)]';

  return (
    <button onClick={onClick} className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full border py-1.5 pl-1.5 pr-3 text-[12px] font-black transition duration-300 sm:py-2 sm:pl-2 sm:pr-4 sm:text-[15px] ${stateClass}`}>
      {linked ? <span className="pointer-events-none absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.9)]" /> : null}
      {image ? <img src={image} alt="" className="h-6 w-6 rounded-full object-cover shadow-[0_0_10px_rgba(255,255,255,0.08)] sm:h-7 sm:w-7" loading="lazy" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.07] text-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:h-7 sm:w-7">ALL</span>}
      <span>{label}</span>
    </button>
  );
}

export default function CalendarPreview() {
  const [selectedMember, setSelectedMember] = useState('전체보기');
  const [centerDate, setCenterDate] = useState(() => startOfDay(new Date()));
  const [scheduleState, setScheduleState] = useState(() => Object.fromEntries(PRISON_SCHEDULE_SOURCES.map((source) => [source.key, { monthLabel: '', items: [], loaded: false }])));

  useEffect(() => {
    let mounted = true;

    async function load() {
      const results = await Promise.allSettled(PRISON_SCHEDULE_SOURCES.map((source) => fetch(source.endpoint).then((res) => res.json())));
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
    }

    load();
    const timer = setInterval(load, SCHEDULE_REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const scheduleEntries = useMemo(() => PRISON_SCHEDULE_SOURCES.map((source) => ({ ...source, ...(scheduleState[source.key] || { monthLabel: '', items: [], loaded: false }) })), [scheduleState]);
  const isLoaded = scheduleEntries.every((entry) => entry.loaded);
  const monthLabel = scheduleEntries.find((entry) => entry.monthLabel)?.monthLabel || '';
  const parsedMonth = useMemo(() => parseMonthFromLabel(monthLabel), [monthLabel]);

  const schedules = useMemo(() => {
    if (!parsedMonth) return [];
    return scheduleEntries.flatMap((entry) => (entry.items || [])
      .filter((item) => !item.empty && String(item.title || '').trim())
      .map((item) => ({ day: item.dayNumber, member: entry.member, title: item.title, year: parsedMonth.year, month: parsedMonth.month })));
  }, [scheduleEntries, parsedMonth]);

  const selectedSource = scheduleEntries.find((entry) => entry.member === selectedMember);
  const visibleSchedules = selectedMember === '전체보기' ? schedules : schedules.filter((item) => item.member === selectedMember);
  const linkedMemberOrder = useMemo(() => new Map(PRISON_SCHEDULE_SOURCES.map((source, index) => [source.member, index])), []);
  const scheduleMemberButtons = useMemo(() => {
    return [...SCHEDULE_MEMBERS].sort((a, b) => {
      if (a.nickname === '장지수') return -1;
      if (b.nickname === '장지수') return 1;

      const aEntry = scheduleEntries.find((entry) => entry.member === a.nickname);
      const bEntry = scheduleEntries.find((entry) => entry.member === b.nickname);
      const aLinked = linkedMemberOrder.has(a.nickname);
      const bLinked = linkedMemberOrder.has(b.nickname);
      const aHasItems = hasScheduleItems(aEntry);
      const bHasItems = hasScheduleItems(bEntry);

      if (aHasItems !== bHasItems) return aHasItems ? -1 : 1;
      if (aLinked !== bLinked) return aLinked ? -1 : 1;
      if (aLinked && bLinked) return linkedMemberOrder.get(a.nickname) - linkedMemberOrder.get(b.nickname);
      return SCHEDULE_MEMBERS.indexOf(a) - SCHEDULE_MEMBERS.indexOf(b);
    });
  }, [linkedMemberOrder, scheduleEntries]);
  const weeklyDates = useMemo(() => buildCenteredWeekDates(centerDate), [centerDate]);
  const weeklyGroupedSchedules = useMemo(() => {
    const map = new Map();
    visibleSchedules.forEach((item) => {
      const key = `${item.year}-${item.month}-${item.day}`;
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    });
    return map;
  }, [visibleSchedules]);
  const memberCalendarCells = useMemo(() => buildCalendarCells(monthLabel, selectedSource?.items || []), [monthLabel, selectedSource]);
  const today = new Date();

  if (!isLoaded || !parsedMonth) return <div id="schedule" aria-hidden="true" style={{ display: 'none' }} />;

  return (
    <section id="schedule" className="mt-6 w-full max-w-none rounded-[28px] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.24)] sm:mt-8 sm:rounded-[32px] sm:p-5 lg:p-7">
      <div className="w-full max-w-none rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_50px_rgba(0,0,0,0.28),0_0_36px_rgba(56,189,248,0.055)] sm:rounded-[30px] sm:p-5 lg:p-7">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="text-[22px] font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[34px]">{parsedMonth.month}월 일정표</div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="rounded-full bg-white/[0.055] px-3 py-1.5 text-[11px] font-black text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">1시간마다 갱신</span>
            {selectedMember !== '전체보기' && selectedSource?.sourceUrl ? <a href={selectedSource.sourceUrl} target="_blank" rel="noreferrer" className="rounded-full bg-sky-300/10 px-3 py-1.5 text-[11px] font-black text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-sky-300/16">시트보기</a> : null}
            <div className="text-[10px] font-black tracking-[0.28em] text-white/35 sm:text-sm sm:tracking-[0.45em]">{parsedMonth.year}</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-[20px] bg-[#05101d] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_rgba(56,189,248,0.05)] sm:mb-5 sm:rounded-[24px] sm:p-3">
          <FilterButton label="전체보기" active={selectedMember === '전체보기'} onClick={() => setSelectedMember('전체보기')} />
          {scheduleMemberButtons.map((member) => <FilterButton key={member.nickname} label={member.nickname} image={member.image} linked={linkedMemberOrder.has(member.nickname)} active={selectedMember === member.nickname} onClick={() => setSelectedMember(member.nickname)} />)}
        </div>

        {selectedMember === '전체보기' ? (
          <WeeklyAllScheduleView dates={weeklyDates} groupedSchedules={weeklyGroupedSchedules} />
        ) : (
          <div className="w-full max-w-none rounded-[22px] bg-[#05101d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.18)] sm:rounded-[28px] sm:p-5">
            <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-[11px] font-black text-white/58 sm:mb-4 sm:gap-3 sm:text-[15px]">
              {WEEKDAY_LABELS.map((dayLabel, index) => <div key={dayLabel} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{dayLabel}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
              {memberCalendarCells.map((cell, index) => {
                if (!cell) return <div key={`e-${index}`} className="min-h-[82px] rounded-[16px] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:min-h-[132px] sm:rounded-[22px]" />;
                const day = Number(cell.dayNumber);
                const hasItem = Boolean(String(cell.title || '').trim());
                const offDay = String(cell.title || '').includes('휴방');
                const isToday = today.getMonth() + 1 === parsedMonth.month && today.getDate() === day;
                return (
                  <div key={day} className={`group relative min-h-[82px] overflow-hidden rounded-[16px] p-2 transition-all duration-300 hover:-translate-y-1 sm:min-h-[132px] sm:rounded-[22px] sm:p-3.5 ${isToday ? 'bg-[linear-gradient(180deg,rgba(7,27,46,0.98),rgba(5,12,24,0.98))] shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16),0_0_22px_rgba(103,232,249,0.08)]' : offDay ? 'bg-[linear-gradient(180deg,rgba(34,20,7,0.82),rgba(8,14,25,0.98))] shadow-[inset_0_0_0_1px_rgba(251,146,60,0.12)]' : hasItem ? 'bg-[linear-gradient(180deg,rgba(11,23,38,0.96),rgba(7,17,31,0.98))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]' : 'bg-[#07111f] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'}`}>
                    <div className="relative flex items-start justify-between gap-1 sm:gap-2">
                      <div className={`text-[12px] font-black sm:text-[17px] ${[5, 12, 19, 26].includes(day) ? 'text-[#ff8e8e]' : [4, 11, 18, 25].includes(day) ? 'text-[#89b4ff]' : 'text-white/95'}`}>{day}</div>
                      {isToday ? <span className="rounded-full bg-cyan-300/12 px-1.5 py-0.5 text-[8px] font-black tracking-[0.12em] text-cyan-100 shadow-[0_0_12px_rgba(103,232,249,0.16)] sm:px-2 sm:text-[10px]">TODAY</span> : hasItem ? <span className={`mt-1 h-2 w-2 rounded-full sm:mt-1.5 sm:h-2.5 sm:w-2.5 ${offDay ? 'bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.55)]' : 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.45)]'}`} /> : null}
                    </div>
                    {hasItem ? <div className={`relative mt-2 line-clamp-3 text-[9px] font-black leading-4 break-keep sm:mt-4 sm:text-[13px] sm:leading-6 ${offDay ? 'text-rose-100' : 'text-white/92'}`}>{cell.title}</div> : null}
                  </div>
                );
              })}
            </div>
            {visibleSchedules.length === 0 ? <div className="mt-4 text-sm font-bold text-white/55">선택한 멤버의 일정 데이터가 아직 비어 있습니다.</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}

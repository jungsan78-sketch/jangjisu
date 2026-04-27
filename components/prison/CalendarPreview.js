import { useEffect, useMemo, useState } from 'react';
import { PRISON_SCHEDULE_SOURCES } from '../../data/prisonScheduleSources';
import { SCHEDULE_MEMBERS } from '../../data/prisonMembers';
import WeeklyAllScheduleView from './WeeklyAllScheduleView';

function parseMonthFromLabel(label) {
  const matched = String(label || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!matched) return null;
  return { year: Number(matched[1]), month: Number(matched[2]) };
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
  const isLoaded = scheduleEntries.every((entry) => entry.loaded);
  const monthLabel = scheduleEntries.find((entry) => entry.monthLabel)?.monthLabel || '';
  const parsedMonth = useMemo(() => parseMonthFromLabel(monthLabel), [monthLabel]);

  const schedules = useMemo(() => {
    if (!parsedMonth) return [];
    return scheduleEntries.flatMap((entry) => (entry.items || [])
      .filter((item) => !item.empty && String(item.title || '').trim())
      .map((item) => ({
        day: item.dayNumber,
        member: entry.member,
        title: item.title,
        year: parsedMonth.year,
        month: parsedMonth.month,
      })));
  }, [scheduleEntries, parsedMonth]);

  const visibleSchedules = selectedMember === '전체보기' ? schedules : schedules.filter((item) => item.member === selectedMember);
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

  if (!isLoaded || !parsedMonth) {
    return <div id="schedule" aria-hidden="true" style={{ display: 'none' }} />;
  }

  return (
    <section id="schedule" className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/20 sm:mt-8 sm:rounded-[32px] sm:p-6 lg:p-8">
      <div className="rounded-[24px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:rounded-[30px] sm:p-5 lg:p-7">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
          <div className="text-[22px] font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[34px]">{parsedMonth.month}월 일정표</div>
          <div className="text-[10px] font-black tracking-[0.28em] text-white/35 sm:text-sm sm:tracking-[0.45em]">{parsedMonth.year}</div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-[20px] border border-white/8 bg-[#05101d] p-2.5 sm:mb-5 sm:rounded-[24px] sm:p-3">
          <FilterButton label="전체보기" active={selectedMember === '전체보기'} onClick={() => setSelectedMember('전체보기')} />
          {SCHEDULE_MEMBERS.map((member) => <FilterButton key={member.nickname} label={member.nickname} image={member.image} active={selectedMember === member.nickname} onClick={() => setSelectedMember(member.nickname)} />)}
        </div>

        <WeeklyAllScheduleView dates={weeklyDates} onMoveDay={(days) => setCenterDate((prev) => shiftDay(prev, days))} groupedSchedules={weeklyGroupedSchedules} />
        {visibleSchedules.length === 0 ? <div className="mt-4 text-sm font-bold text-white/55">선택한 메뉴의 일정 데이터가 아직 비어 있습니다.</div> : null}
      </div>
    </section>
  );
}

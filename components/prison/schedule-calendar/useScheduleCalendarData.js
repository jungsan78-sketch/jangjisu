import { useEffect, useMemo, useState } from 'react';
import { PRISON_SCHEDULE_SOURCES } from '../../../data/prisonScheduleSources';
import { SCHEDULE_MEMBERS } from '../../../data/prisonMembers';
import { startVisibleInterval } from '../../../lib/visibleInterval';
import { isSameMonth, parseMonthLabel, splitScheduleTitle } from '../../../lib/prisonScheduleCalendar';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const PROFILE_MAP = new Map(SCHEDULE_MEMBERS.map((member) => [member.nickname, member]));

function monthUrl(monthInfo) {
  return `/api/prison-schedule?year=${monthInfo.year}&month=${monthInfo.month}`;
}

export default function useScheduleCalendarData(selectedKey, selectedMonth) {
  const [states, setStates] = useState({});
  const stateKey = selectedMonth.monthKey;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch(monthUrl(selectedMonth));
        if (!response.ok) throw new Error(`schedule ${response.status}`);
        const payload = await response.json();
        if (!payload.ok || !Array.isArray(payload.schedules)) throw new Error('schedule unavailable');
        if (!mounted) return;
        const scheduleMap = new Map(payload.schedules.map((schedule) => [schedule.member, schedule]));
        const sourceStates = Object.fromEntries(PRISON_SCHEDULE_SOURCES.map((source) => {
          const schedule = scheduleMap.get(source.member) || {};
          return [source.key, {
            loaded: true,
            failed: false,
            monthLabel: schedule.monthLabel || payload.monthLabel || selectedMonth.monthLabel,
            sourceUrl: schedule.sourceUrl || source.sourceUrl || '',
            items: Array.isArray(schedule.items) ? schedule.items : [],
          }];
        }));
        setStates((previous) => ({ ...previous, [stateKey]: { loadedAt: Date.now(), sourceStates } }));
      } catch {
        if (!mounted) return;
        setStates((previous) => ({ ...previous, [stateKey]: { ...(previous[stateKey] || {}), failed: true, loadedAt: Date.now() } }));
      }
    }

    const cached = states[stateKey];
    if (!cached?.loadedAt || Date.now() - cached.loadedAt >= REFRESH_INTERVAL_MS) load();
    const stopPolling = startVisibleInterval(load, REFRESH_INTERVAL_MS);
    return () => { mounted = false; stopPolling(); };
  }, [selectedMonth, stateKey]);

  const entries = useMemo(() => PRISON_SCHEDULE_SOURCES.map((source, colorIndex) => {
    const monthState = states[selectedMonth.monthKey] || {};
    const state = monthState.sourceStates?.[source.key] || { loaded: Boolean(monthState.loadedAt), failed: Boolean(monthState.failed) };
    const profile = PROFILE_MAP.get(source.member) || {};
    const sourceMonth = parseMonthLabel(state.monthLabel);
    const monthMatches = !sourceMonth || isSameMonth(sourceMonth, selectedMonth);
    const items = monthMatches ? (state.items || []).filter((item) => {
      const itemYear = Number(item.year || selectedMonth.year);
      const itemMonth = Number(item.month || selectedMonth.month);
      return itemYear === selectedMonth.year && itemMonth === selectedMonth.month && !item.empty && String(item.title || '').trim();
    }) : [];
    return { ...source, ...state, items, image: profile.image || '', station: profile.station || '', colorIndex };
  }), [selectedMonth, states]);

  const events = useMemo(() => entries.flatMap((entry) => entry.items.map((item, itemIndex) => ({
    id: `${entry.key}-${item.dayNumber}-${itemIndex}-${item.title}`,
    day: Number(item.dayNumber),
    member: entry.member,
    memberKey: entry.key,
    memberImage: entry.image,
    memberStation: entry.station,
    colorIndex: entry.colorIndex,
    title: String(item.title || ''),
    segments: splitScheduleTitle(item.title, { jangjisu: entry.key === 'jangjisu' }),
  })).filter((event) => Number.isInteger(event.day) && event.day > 0)), [entries]);

  return {
    currentMonth: selectedMonth,
    entries,
    events,
    loaded: Boolean(states[selectedMonth.monthKey]?.loadedAt),
    failedCount: entries.find((entry) => entry.key === selectedKey)?.failed ? 1 : 0,
  };
}


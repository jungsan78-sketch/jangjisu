import { useEffect, useMemo, useState } from 'react';
import { PRISON_SCHEDULE_SOURCES } from '../../../data/prisonScheduleSources';
import { SCHEDULE_MEMBERS } from '../../../data/prisonMembers';
import { startVisibleInterval } from '../../../lib/visibleInterval';
import { isSameMonth, parseMonthLabel, splitScheduleTitle } from '../../../lib/prisonScheduleCalendar';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const PROFILE_MAP = new Map(SCHEDULE_MEMBERS.map((member) => [member.nickname, member]));

function monthUrl(endpoint, monthInfo) {
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}year=${monthInfo.year}&month=${monthInfo.month}`;
}

export default function useScheduleCalendarData(selectedKey, selectedMonth) {
  const [states, setStates] = useState({});
  const stateKey = `${selectedMonth.monthKey}:${selectedKey}`;

  useEffect(() => {
    let mounted = true;
    const source = PRISON_SCHEDULE_SOURCES.find((entry) => entry.key === selectedKey);
    if (!source) return undefined;

    async function load() {
      try {
        const response = await fetch(monthUrl(source.endpoint, selectedMonth), { cache: 'no-store' });
        if (!response.ok) throw new Error(`schedule ${response.status}`);
        const payload = await response.json();
        if (!mounted) return;
        setStates((previous) => ({ ...previous, [stateKey]: {
          loaded: true,
          failed: false,
          loadedAt: Date.now(),
          monthLabel: payload.monthLabel || selectedMonth.monthLabel,
          sourceUrl: payload.sourceUrl || source.sourceUrl || '',
          items: Array.isArray(payload.items) ? payload.items : [],
        } }));
      } catch {
        if (!mounted) return;
        setStates((previous) => ({ ...previous, [stateKey]: { ...(previous[stateKey] || {}), loaded: true, failed: true, loadedAt: Date.now() } }));
      }
    }

    const cached = states[stateKey];
    if (!cached?.loadedAt || Date.now() - cached.loadedAt >= REFRESH_INTERVAL_MS) load();
    const stopPolling = startVisibleInterval(load, REFRESH_INTERVAL_MS);
    return () => { mounted = false; stopPolling(); };
  }, [selectedKey, selectedMonth, stateKey]);

  const entries = useMemo(() => PRISON_SCHEDULE_SOURCES.map((source, colorIndex) => {
    const state = states[`${selectedMonth.monthKey}:${source.key}`] || {};
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
    segments: splitScheduleTitle(item.title),
  })).filter((event) => Number.isInteger(event.day) && event.day > 0)), [entries]);

  return {
    currentMonth: selectedMonth,
    entries,
    events,
    loaded: Boolean(entries.find((entry) => entry.key === selectedKey)?.loaded),
    failedCount: entries.find((entry) => entry.key === selectedKey)?.failed ? 1 : 0,
  };
}

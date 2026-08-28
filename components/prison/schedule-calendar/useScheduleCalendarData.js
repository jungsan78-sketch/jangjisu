import { useEffect, useMemo, useState } from 'react';
import { PRISON_SCHEDULE_SOURCES } from '../../../data/prisonScheduleSources';
import { SCHEDULE_MEMBERS } from '../../../data/prisonMembers';
import { startVisibleInterval } from '../../../lib/visibleInterval';
import { getCurrentKstMonth, isSameMonth, parseMonthLabel, splitScheduleTitle } from '../../../lib/prisonScheduleCalendar';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const PROFILE_MAP = new Map(SCHEDULE_MEMBERS.map((member) => [member.nickname, member]));

function cacheAwareUrl(endpoint) {
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${Date.now()}`;
}

export default function useScheduleCalendarData() {
  const currentMonth = useMemo(() => getCurrentKstMonth(), []);
  const [states, setStates] = useState(() => Object.fromEntries(PRISON_SCHEDULE_SOURCES.map((source) => [source.key, { loaded: false, failed: false, monthLabel: '', items: [] }])));

  useEffect(() => {
    let mounted = true;
    async function load() {
      const results = await Promise.allSettled(PRISON_SCHEDULE_SOURCES.map((source) => fetch(cacheAwareUrl(source.endpoint), { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error(`schedule ${response.status}`);
        return response.json();
      })));
      if (!mounted) return;
      setStates((previous) => {
        const next = { ...previous };
        PRISON_SCHEDULE_SOURCES.forEach((source, index) => {
          const result = results[index];
          if (result.status === 'fulfilled') {
            next[source.key] = {
              loaded: true,
              failed: false,
              monthLabel: result.value.monthLabel || currentMonth.monthLabel,
              sourceUrl: result.value.sourceUrl || source.sourceUrl || '',
              items: Array.isArray(result.value.items) ? result.value.items : [],
            };
          } else {
            next[source.key] = { ...(previous[source.key] || {}), loaded: true, failed: true };
          }
        });
        return next;
      });
    }
    load();
    const stopPolling = startVisibleInterval(load, REFRESH_INTERVAL_MS);
    return () => { mounted = false; stopPolling(); };
  }, [currentMonth.monthLabel]);

  const entries = useMemo(() => PRISON_SCHEDULE_SOURCES.map((source, colorIndex) => {
    const state = states[source.key] || {};
    const profile = PROFILE_MAP.get(source.member) || {};
    const sourceMonth = parseMonthLabel(state.monthLabel);
    const monthMatches = !sourceMonth || isSameMonth(sourceMonth, currentMonth);
    const items = monthMatches ? (state.items || []).filter((item) => {
      const itemYear = Number(item.year || currentMonth.year);
      const itemMonth = Number(item.month || currentMonth.month);
      return itemYear === currentMonth.year && itemMonth === currentMonth.month && !item.empty && String(item.title || '').trim();
    }) : [];
    return { ...source, ...state, items, image: profile.image || '', station: profile.station || '', colorIndex };
  }), [currentMonth, states]);

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
    currentMonth,
    entries,
    events,
    loaded: entries.every((entry) => entry.loaded),
    failedCount: entries.filter((entry) => entry.failed).length,
  };
}



import { useEffect, useMemo, useState } from 'react';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getCurrentKstMonthLabel() {
  const shifted = new Date(Date.now() + KST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  return `${year}년 ${month}월`;
}

function parseMonthLabel(label) {
  const matched = String(label || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!matched) return null;
  return { year: Number(matched[1]), month: Number(matched[2]) };
}

function formatDurationText(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  if (minutes > 0) return `${minutes}분`;
  return '0분';
}

function getKstDateParts(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function getBroadcastTimeRangeText(broadcast) {
  const endedAt = getBroadcastEndedAt(broadcast);
  if (Number.isNaN(endedAt.getTime())) return '';
  const durationSeconds = Math.max(0, Number(broadcast?.durationSeconds || 0));
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
  const start = getKstDateParts(startedAt);
  const end = getKstDateParts(endedAt);
  if (!start || !end) return '';
  const startTime = `${String(start.hour).padStart(2, '0')}시`;
  const endTime = `${String(end.hour).padStart(2, '0')}시`;
  const sameDay = start.year === end.year && start.month === end.month && start.day === end.day;
  if (sameDay) return `${start.day}일 ${startTime} ~ ${endTime}`;
  const sameMonth = start.year === end.year && start.month === end.month;
  if (sameMonth) return `${start.day}일 ${startTime} ~ ${end.day}일 ${endTime}`;
  return `${start.month}/${start.day} ${startTime} ~ ${end.month}/${end.day} ${endTime}`;
}

function compareMonth(parts, parsedMonth) {
  if (!parts || !parsedMonth) return 0;
  return (parts.year * 12 + parts.month) - (parsedMonth.year * 12 + parsedMonth.month);
}

function getBroadcastEndedAt(broadcast) {
  return new Date(broadcast?.endedAt || broadcast?.startedAt || '');
}

function getBroadcastStartDay(broadcast, parsedMonth) {
  const endedAt = getBroadcastEndedAt(broadcast);
  if (Number.isNaN(endedAt.getTime())) return Number(broadcast?._calendarDay || 0);
  const durationSeconds = Math.max(0, Number(broadcast?.durationSeconds || 0));
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
  const parts = getKstDateParts(startedAt);
  if (!parts || !parsedMonth) return Number(broadcast?._calendarDay || 0);
  const monthDiff = compareMonth(parts, parsedMonth);
  if (monthDiff < 0) return 1;
  if (monthDiff > 0) return 0;
  return parts.day;
}

function getBroadcastEndDay(broadcast, parsedMonth) {
  const endedAt = getBroadcastEndedAt(broadcast);
  if (Number.isNaN(endedAt.getTime()) || !parsedMonth) return Number(broadcast?._calendarDay || 0);
  const parts = getKstDateParts(endedAt);
  const monthDiff = compareMonth(parts, parsedMonth);
  if (monthDiff < 0) return 0;
  if (monthDiff > 0) return new Date(parsedMonth.year, parsedMonth.month, 0).getDate();
  return parts?.day || getBroadcastStartDay(broadcast, parsedMonth);
}

function isMultiDayBroadcast(broadcast, parsedMonth) {
  const startDay = getBroadcastStartDay(broadcast, parsedMonth);
  const endDay = getBroadcastEndDay(broadcast, parsedMonth);
  return Boolean(startDay && endDay && endDay > startDay);
}

function buildCalendarCells(monthLabel, items, selectedMember) {
  const parsed = parseMonthLabel(monthLabel);
  if (!parsed) return [];
  const { year, month } = parsed;
  const days = new Date(year, month, 0).getDate();
  const lead = new Date(year, month - 1, 1).getDay();
  const total = Math.ceil((lead + days) / 7) * 7;
  const map = new Map((Array.isArray(items) ? items : []).map((item) => [Number(item.dayNumber), item]));

  return Array.from({ length: total }, (_, index) => {
    const day = index - lead + 1;
    if (day < 1 || day > days) return null;
    const base = map.get(day) || { dayNumber: day, broadcasts: [] };
    const broadcasts = (selectedMember
      ? (base.broadcasts || []).filter((broadcast) => broadcast.member === selectedMember)
      : (base.broadcasts || [])
    ).map((broadcast) => ({ ...broadcast, _calendarDay: day }));
    const totalSeconds = broadcasts.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0);
    return { ...base, broadcasts, totalSeconds, totalDurationText: formatDurationText(totalSeconds) };
  });
}

function buildWeeks(cells) {
  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

function assignSegmentLanes(segments) {
  const laneEnds = [];
  return segments
    .sort((a, b) => a.startColumn - b.startColumn || b.span - a.span || String(a.broadcast.title || '').localeCompare(String(b.broadcast.title || '')))
    .map((segment) => {
      let lane = laneEnds.findIndex((endColumn) => segment.startColumn > endColumn);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = segment.endColumn;
      return { ...segment, lane };
    });
}

function buildWeekSegments(weekCells, parsedMonth, allBroadcasts) {
  if (!parsedMonth) return [];
  const realCells = weekCells.filter(Boolean);
  if (!realCells.length) return [];
  const weekStart = Number(realCells[0].dayNumber);
  const weekEnd = Number(realCells[realCells.length - 1].dayNumber);
  const seen = new Set();
  const candidates = [];

  (allBroadcasts || []).forEach((broadcast) => {
      const id = String(broadcast?.id || `${broadcast?.member}-${broadcast?.title}-${broadcast?._calendarDay}`);
      if (seen.has(id)) return;
      seen.add(id);
      const startDay = getBroadcastStartDay(broadcast, parsedMonth);
      const endDay = getBroadcastEndDay(broadcast, parsedMonth);
      if (!startDay || !endDay || endDay <= startDay) return;
      const segmentStart = Math.max(startDay, weekStart);
      const segmentEnd = Math.min(endDay, weekEnd);
      if (segmentStart > segmentEnd) return;
      const startIndex = weekCells.findIndex((weekCell) => Number(weekCell?.dayNumber) === segmentStart);
      const endIndex = weekCells.findIndex((weekCell) => Number(weekCell?.dayNumber) === segmentEnd);
      if (startIndex < 0 || endIndex < 0) return;
      candidates.push({
        broadcast,
        startDay,
        endDay,
        segmentStart,
        segmentEnd,
        startColumn: startIndex + 1,
        endColumn: endIndex + 1,
        span: endIndex - startIndex + 1,
        isStart: segmentStart === startDay,
        isEnd: segmentEnd === endDay,
      });
  });

  return assignSegmentLanes(candidates);
}

function MultiDayBroadcastCard({ segment }) {
  const duration = segment.broadcast.durationText || formatDurationText(segment.broadcast.durationSeconds);
  const rangeText = getBroadcastTimeRangeText(segment.broadcast) || `${segment.startDay}일 ~ ${segment.endDay}일`;
  const [previewActive, setPreviewActive] = useState(false);

  return (
    <a
      href={segment.broadcast.url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setPreviewActive(true)}
      onMouseLeave={() => setPreviewActive(false)}
      onFocus={() => setPreviewActive(true)}
      onBlur={() => setPreviewActive(false)}
      className={`group relative z-20 block h-[78px] overflow-hidden border border-teal-200/[0.12] bg-[radial-gradient(circle_at_100%_0%,rgba(45,212,191,0.10),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.070),rgba(255,255,255,0.028))] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_24px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-teal-200/28 hover:bg-teal-300/[0.08] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_16px_30px_rgba(0,0,0,0.28)] ${segment.isStart ? 'rounded-l-[18px]' : 'rounded-l-sm border-l-0'} ${segment.isEnd ? 'rounded-r-[18px]' : 'rounded-r-sm border-r-0'}`}
      style={{
        gridColumn: `${segment.startColumn} / ${segment.endColumn + 1}`,
        gridRow: 1,
        alignSelf: 'end',
        marginBottom: `${10 + segment.lane * 86}px`,
      }}
      title={`${segment.broadcast.title} · ${duration} · ${segment.startDay}~${segment.endDay}일`}
    >
      {segment.broadcast.thumbnailUrl ? (
        <div className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ${previewActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
          {previewActive ? <img src={segment.broadcast.thumbnailUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,13,0.78),rgba(2,8,13,0.36),rgba(2,8,13,0.72))]" />
        </div>
      ) : null}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-teal-200/[0.04] transition group-hover:bg-teal-200/[0.08]" />
      <div className="relative z-10 flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-black text-teal-50/90 sm:text-[11px]">{rangeText}</span>
        <span className="shrink-0 text-[11px] font-black text-teal-50 sm:text-[12px]">{duration}</span>
      </div>
      <div className="relative z-10 mt-1.5 flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-black tracking-[-0.025em] text-white sm:text-[15px]">{segment.broadcast.title}</span>
        <span className="shrink-0 text-[10px] font-black text-white/38">↗</span>
      </div>
    </a>
  );
}

function BroadcastPill({ broadcast, rangeText = '' }) {
  const duration = broadcast.durationText || formatDurationText(broadcast.durationSeconds);
  const [previewActive, setPreviewActive] = useState(false);
  return (
    <a
      href={broadcast.url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setPreviewActive(true)}
      onMouseLeave={() => setPreviewActive(false)}
      onFocus={() => setPreviewActive(true)}
      onBlur={() => setPreviewActive(false)}
      className="group relative block min-h-[96px] overflow-hidden rounded-[18px] border border-teal-200/[0.12] bg-[radial-gradient(circle_at_100%_0%,rgba(45,212,191,0.10),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.070),rgba(255,255,255,0.028))] px-3.5 pb-3.5 pt-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_24px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-teal-200/28 hover:bg-teal-300/[0.08]"
    >
      {broadcast.thumbnailUrl ? (
        <div className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ${previewActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
          {previewActive ? <img src={broadcast.thumbnailUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,13,0.40),rgba(2,8,13,0.78))]" />
        </div>
      ) : null}
      <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-black/32 px-2.5 py-1 text-[11px] font-black leading-none text-teal-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:text-[12px]">{duration}</span>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-teal-200/[0.04] transition group-hover:bg-teal-200/[0.08]" />
      <div className="relative z-10 line-clamp-3 text-[15px] font-black leading-[1.35] tracking-[-0.04em] text-white sm:text-[17px]" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
        {broadcast.title}
      </div>
      <div className="relative z-10 mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-black text-white/40 sm:text-[12px]">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-200/60 shadow-[0_0_8px_rgba(94,234,212,0.5)]" />
        <span>{broadcast.member}</span>
        {rangeText ? <span className="rounded-full bg-teal-300/10 px-2 py-0.5 text-teal-100/75">{rangeText}</span> : null}
      </div>
    </a>
  );
}

function RankCard({ stat, rank }) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_18%_0%,rgba(45,212,191,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.060),rgba(255,255,255,0.020))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.055)] transition hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(0,0,0,0.34),0_0_36px_rgba(45,212,191,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-teal-200/[0.035] transition group-hover:bg-teal-200/[0.07]" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-200/12 bg-black/24 text-[15px] font-black text-teal-100">{rank}</div>
        <img src={stat.memberImage} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-teal-200/12 bg-slate-900 object-cover shadow-[0_0_20px_rgba(45,212,191,0.12)]" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[19px] font-black text-white">{stat.member}</div>
          <div className="mt-1 text-[13px] font-bold text-white/50">{stat.broadcastCount}개 다시보기</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[24px] font-black tracking-[-0.04em] text-teal-50">{formatDurationText(stat.totalSeconds)}</div>
        </div>
      </div>
    </div>
  );
}

function MemberFilterButton({ stat, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 pr-4 text-[14px] font-black transition sm:text-[16px] ${active ? 'border-[#2fbfb2]/32 bg-teal-300/14 text-white shadow-[0_0_24px_rgba(45,212,191,0.14),inset_0_1px_0_rgba(255,255,255,0.045)]' : 'border-[#253f4c]/80 bg-slate-950/28 text-white/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] hover:-translate-y-0.5 hover:border-[#2fbfb2]/28 hover:bg-teal-300/[0.07] hover:text-white hover:shadow-[0_0_20px_rgba(45,212,191,0.10),inset_0_1px_0_rgba(255,255,255,0.035)]'}`}
    >
      <img src={stat.memberImage} alt="" className="h-8 w-8 rounded-full bg-slate-900 object-cover shadow-[0_0_14px_rgba(255,255,255,0.06)]" loading="lazy" />
      <span>{stat.member}</span>
      <span className="rounded-full bg-black/22 px-2 py-1 text-[11px] text-white/56 sm:text-[12px]">{formatDurationText(stat.totalSeconds)}</span>
    </button>
  );
}

export default function BroadcastSummaryCalendar() {
  const [payload, setPayload] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedMember, setSelectedMember] = useState('장지수');
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const summaryRes = await fetch(`/api/prison-broadcast-summary?t=${Date.now()}`, { cache: 'no-store' });
        const json = summaryRes.ok ? await summaryRes.json() : null;
        if (mounted) {
          setPayload(json || null);
        }
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

  const monthLabel = payload?.monthLabel || getCurrentKstMonthLabel();
  const parsedMonth = parseMonthLabel(monthLabel);
  const rawMemberStats = Array.isArray(payload?.memberStats) ? payload.memberStats : [];
  const memberStats = rawMemberStats.length ? rawMemberStats : [{ member: '장지수', memberImage: '/profile-jangjisu.png', totalSeconds: 0, broadcastCount: 0 }];
  const selectedStat = memberStats.find((stat) => stat.member === selectedMember) || memberStats[0];
  const activeMember = selectedStat?.member || '장지수';
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const items = rawItems;
  const cells = useMemo(() => buildCalendarCells(monthLabel, items, activeMember), [monthLabel, items, activeMember]);
  const weeks = useMemo(() => buildWeeks(cells), [cells]);
  const activeBroadcasts = useMemo(() => {
    const seen = new Map();
    items.forEach((day) => (day.broadcasts || []).forEach((broadcast) => {
      if (broadcast.member === activeMember && !seen.has(broadcast.id)) seen.set(broadcast.id, broadcast);
    }));
    return Array.from(seen.values());
  }, [items, activeMember]);
  const mobileCells = useMemo(() => cells.filter((cell) => cell?.broadcasts?.length), [cells]);
  const totalCount = Number(payload?.totalCount || 0);
  const ranking = memberStats.filter((stat) => Number(stat.totalSeconds || 0) > 0).sort((a, b) => b.totalSeconds - a.totalSeconds).slice(0, 5);

  useEffect(() => {
    if (!memberStats.length) return;
    if (!memberStats.some((stat) => stat.member === selectedMember)) setSelectedMember(memberStats[0].member);
  }, [memberStats, selectedMember]);

  useEffect(() => {
    setExpandedDays({});
  }, [activeMember, monthLabel]);

  return (
    <section id="broadcast-summary" className="mx-auto w-full max-w-none rounded-[28px] bg-white/[0.030] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_70px_rgba(0,0,0,0.22)] sm:rounded-[32px] sm:p-5 lg:p-7">
      <div className="w-full rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.13),transparent_28%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_50px_rgba(0,0,0,0.26),0_0_36px_rgba(45,212,191,0.05)] sm:rounded-[30px] sm:p-5 lg:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-white/[0.055] px-3 py-1.5 text-[12px] font-black text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">1시간마다 갱신</span>
            {loaded ? <span className="rounded-full bg-teal-300/10 px-3 py-1.5 text-[12px] font-black text-teal-100/80">{totalCount}개 다시보기</span> : null}
            <div className="text-[12px] font-black tracking-[0.28em] text-white/35 sm:text-sm sm:tracking-[0.45em]">{parsedMonth?.year || ''}</div>
        </div>

        <div className="mb-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-[25px] font-black text-white sm:text-[32px]">{parsedMonth ? `${parsedMonth.month}월 다시보기 시간 순위` : '다시보기 시간 순위'}</div>
              <div className="mt-1 text-[13px] font-bold text-white/48 sm:text-[15px]">이번 달 다시보기 영상시간 합산 기준입니다.</div>
            </div>
          </div>
          {ranking.length ? (
            <div className="grid gap-3 xl:grid-cols-3">
              {ranking.slice(0, 3).map((stat, index) => <RankCard key={stat.member} stat={stat} rank={`${index + 1}위`} />)}
            </div>
          ) : (
            <div className="rounded-[22px] bg-[#05101d] p-5 text-[15px] font-bold text-white/54 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">아직 이번 달 다시보기 시간이 집계되지 않았습니다.</div>
          )}
        </div>

        <div className="mb-6 rounded-[24px] bg-[#05101d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
          <div className="mb-3 text-[16px] font-black text-white/76">멤버 선택</div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {memberStats.map((stat) => <MemberFilterButton key={stat.member} stat={stat} active={activeMember === stat.member} onClick={() => setSelectedMember(stat.member)} />)}
          </div>
        </div>

        <div key={`${activeMember}-${monthLabel}`} className="member-calendar-enter">
        <div className="mb-4 text-[24px] font-black text-white sm:text-[32px]">{parsedMonth ? `${parsedMonth.month}월 ${activeMember} 다시보기 방송시간 / 방송제목 통계` : '다시보기 방송시간 / 방송제목 통계'}</div>

        {!loaded ? (
          <div className="rounded-[22px] bg-[#05101d] p-6 text-[15px] font-bold text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">다시보기 기록을 불러오는 중입니다.</div>
        ) : !payload?.ok ? (
          <div className="rounded-[22px] bg-[#05101d] p-6 text-[15px] font-bold leading-7 text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">{payload?.message || '이번 달 다시보기 기록을 아직 불러오지 못했습니다.'}</div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {mobileCells.length ? mobileCells.map((cell) => (
                <div key={`mobile-${cell.dayNumber}`} className="rounded-[22px] bg-[#05101d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_32px_rgba(0,0,0,0.16)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-[20px] font-black text-white">{parsedMonth?.month}월 {cell.dayNumber}일</div>
                  </div>
                  <div className="space-y-2">{cell.broadcasts.map((broadcast) => {
                    const rangeText = getBroadcastTimeRangeText(broadcast);
                    return <BroadcastPill key={broadcast.id} broadcast={broadcast} rangeText={rangeText} />;
                  })}</div>
                </div>
              )) : <div className="rounded-[22px] bg-[#05101d] p-6 text-sm font-bold text-white/55">이번 달 다시보기가 없습니다.</div>}
            </div>
            <div className="hidden w-full rounded-[24px] bg-[#05101d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_42px_rgba(0,0,0,0.18)] sm:rounded-[30px] sm:p-5 md:block">
            <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-[13px] font-black text-white/62 sm:mb-4 sm:gap-3 sm:text-[16px]">
              {DAY_LABELS.map((dayLabel, index) => <div key={dayLabel} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{dayLabel}</div>)}
            </div>
            <div className="space-y-1.5 sm:space-y-3">
              {weeks.map((week, weekIndex) => {
                const weekSegments = buildWeekSegments(week, parsedMonth, activeBroadcasts);
                const laneCount = weekSegments.length ? Math.max(...weekSegments.map((segment) => segment.lane)) + 1 : 0;
                return (
                  <div key={`week-${weekIndex}`} className="relative grid grid-cols-7 gap-1.5 sm:gap-3">
                    {week.map((cell, index) => {
                      if (!cell) return <div key={`empty-${weekIndex}-${index}`} className="min-h-[130px] rounded-[18px] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:min-h-[250px] sm:rounded-[24px]" style={{ gridColumn: index + 1, gridRow: 1 }} />;
                      const day = Number(cell.dayNumber);
                      const allBroadcasts = cell.broadcasts || [];
                      const broadcasts = allBroadcasts.filter((broadcast) => !isMultiDayBroadcast(broadcast, parsedMonth));
                      const hasItems = allBroadcasts.length > 0;
                      const weekdayIndex = parsedMonth ? new Date(parsedMonth.year, parsedMonth.month - 1, day).getDay() : 0;
                      const dayKey = `${activeMember}-${day}`;
                      const isExpanded = Boolean(expandedDays[dayKey]);
                      const visibleBroadcasts = isExpanded ? broadcasts : broadcasts.slice(0, 3);
                      return (
                        <div key={day} className={`relative min-h-[130px] overflow-hidden rounded-[18px] p-2.5 transition-all duration-300 hover:-translate-y-1 sm:min-h-[250px] sm:rounded-[24px] sm:p-3.5 ${hasItems ? 'bg-[linear-gradient(180deg,rgba(8,28,38,0.95),rgba(7,17,31,0.98))] shadow-[inset_0_0_0_1px_rgba(94,234,212,0.08),0_0_18px_rgba(45,212,191,0.04)]' : 'bg-[#07111f] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'}`} style={{ gridColumn: index + 1, gridRow: 1, paddingBottom: laneCount ? `${laneCount * 86 + 18}px` : undefined }}>
                          <div className="mb-2 flex items-start justify-between gap-1">
                            <div>
                              <div className={`text-[14px] font-black sm:text-[19px] ${weekdayIndex === 0 ? 'text-[#ff8e8e]' : weekdayIndex === 6 ? 'text-[#89b4ff]' : 'text-white/95'}`}>{day}</div>
                            </div>
                            {hasItems ? <span className="rounded-full bg-teal-300/12 px-2 py-1 text-[9px] font-black text-teal-100 sm:text-[11px]">{allBroadcasts.length}개</span> : null}
                          </div>
                          <div className="space-y-2">
                            {visibleBroadcasts.map((broadcast) => <BroadcastPill key={broadcast.id} broadcast={broadcast} rangeText={getBroadcastTimeRangeText(broadcast)} />)}
                            {broadcasts.length > 3 ? (
                              <button type="button" onClick={() => setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }))} className="w-full rounded-full border border-teal-200/10 bg-teal-300/[0.055] px-2 py-1.5 text-center text-[11px] font-black text-teal-50/80 transition hover:border-teal-200/24 hover:bg-teal-300/[0.10] sm:text-[12px]">
                                {isExpanded ? '접기' : `+${broadcasts.length - 3}개 더보기`}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    {weekSegments.map((segment) => <MultiDayBroadcastCard key={`${segment.broadcast.id}-${weekIndex}-${segment.segmentStart}-${segment.segmentEnd}`} segment={segment} />)}
                  </div>
                );
              })}
            </div>
            </div>
          </>
        )}
        </div>
      </div>
      <style jsx>{`
        @keyframes memberCalendarIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .member-calendar-enter {
          animation: memberCalendarIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .member-calendar-enter { animation: none; }
        }
      `}</style>
    </section>
  );
}

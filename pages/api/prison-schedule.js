import { getAllowedScheduleMonth } from '../../lib/scheduleMonth';
import { PRISON_MANUAL_SCHEDULES } from '../../data/prisonManualSchedules';
import { readSnapshotCache, writeSnapshotCache } from '../../lib/cloudflareSnapshotCache';
import { buildFreshJangjisuScheduleResponse } from '../../lib/jangjisuScheduleSource';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const SNAPSHOT_VERSION = 'v1';
const SNAPSHOT_FRESH_MS = 60 * 60 * 1000;
const SNAPSHOT_STORAGE_SECONDS = 100 * 24 * 60 * 60;
const snapshotRefreshPromises = new Map();

const SOURCES = [
  {
    id: 'jangjisu',
    key: '장지수',
    sheetId: '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM',
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM/edit',
    mode: 'sheetNameCandidates',
  },
  {
    id: 'guweol',
    key: '구월이',
    sheetId: '1J0H1eHRB05ojAW3kqHrQBoMU68DjJV4SgRViwszyZBs',
    gids: { '2026-07': '739202309', '2026-08': '1765161556' },
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1J0H1eHRB05ojAW3kqHrQBoMU68DjJV4SgRViwszyZBs/edit?gid=1765161556#gid=1765161556',
    mode: 'fixedGid',
  },
  {
    id: 'linling',
    key: '린링',
    sheetId: '1qu7DXG99c9WbR5g-t1HL2BU_bFlqhxwN45tscolZ_U0',
    gids: { '2026-07': '1838232194', '2026-08': '730341520' },
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1qu7DXG99c9WbR5g-t1HL2BU_bFlqhxwN45tscolZ_U0/edit?gid=730341520#gid=730341520',
    mode: 'fixedGid',
  },
  {
    id: 'youoneul',
    key: '유오늘',
    sheetId: '1OLJnia52yhNXvbTlt273EqO3kIggUy1e-uZso60eHwo',
    gids: { '2026-07': '1665931711', '2026-08': '996600110' },
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1OLJnia52yhNXvbTlt273EqO3kIggUy1e-uZso60eHwo/edit?gid=996600110#gid=996600110',
    mode: 'fixedGid',
  },
  {
    id: 'honoe1330',
    key: '이치유',
    sheetId: '1wIZ3u6S_4asH9ov7Akm7vdkleWZrKqiH',
    gids: { '2026-08': '1452473631' },
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1wIZ3u6S_4asH9ov7Akm7vdkleWZrKqiH/edit?gid=1452473631#gid=1452473631',
    mode: 'fixedGid',
  },
  {
    id: 'doodong',
    key: '냥냥두둥',
    sheetId: '1UAfIiDQG3J5RUmIuyEtF54_L7g8dw1ACTYFTT6w-UKs',
    gids: { '2026-08': '1650576825' },
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1UAfIiDQG3J5RUmIuyEtF54_L7g8dw1ACTYFTT6w-UKs/edit?gid=1650576825#gid=1650576825',
    mode: 'fixedGid',
  },
];

const monthKey = (monthInfo) => `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;

const buildSheetCandidates = (monthInfo) => [
  `${String(monthInfo.year).slice(2)}년 ${monthInfo.month}월`,
  `${monthInfo.year}년 ${monthInfo.month}월`,
  `${monthInfo.month}월`,
  `${monthInfo.month}월 일정표`,
].map((sheetName) => ({ ...monthInfo, sheetName }));

const getSourceGid = (source, monthInfo) => source.gids?.[monthKey(monthInfo)] || '';

const getSourceUrl = (source, monthInfo) => {
  const gid = getSourceGid(source, monthInfo);
  return gid ? `https://docs.google.com/spreadsheets/d/${source.sheetId}/edit?gid=${gid}#gid=${gid}` : source.sourceUrl;
};

const csvToRows = (text) => {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
  }

  return rows.map((cells) => cells.map((cell) => String(cell || '').replace(/\u00a0/g, ' ').trim()));
};

const extractRowsFromGvizJson = (text) => {
  const match = text.match(/setResponse\((.*)\);?\s*$/s);
  if (!match) return [];
  const payload = JSON.parse(match[1]);
  const tableRows = payload?.table?.rows || [];
  return tableRows.map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return '';
      if (typeof cell.f === 'string' && cell.f.trim()) return cell.f.trim();
      if (cell.v == null) return '';
      return String(cell.v).trim();
    }),
  );
};

const fetchRowsFromUrls = async (urls) => {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache', pragma: 'no-cache' } });
      if (!response.ok) {
        lastError = new Error(`${response.status} ${response.statusText}`);
        continue;
      }
      const text = await response.text();
      const rows = url.includes('out:json') ? extractRowsFromGvizJson(text) : csvToRows(text);
      if (rows.length > 0) return { rows, fetchedUrl: url };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('시트 데이터를 불러오지 못했습니다.');
};

const extractCalendarDay = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2})(?:\s|$)/);
  if (!match) return null;
  const day = Number(match[1]);
  return day >= 1 && day <= 31 ? day : null;
};

const getDateCells = (row) => row
  .map((cell, columnIndex) => ({ day: extractCalendarDay(cell), columnIndex }))
  .filter(({ day }) => day != null);

const isDateRow = (row) => {
  const dateCells = getDateCells(row);
  if (!dateCells.length) return false;

  let wrappedToNextMonth = false;
  return dateCells.every(({ day }, index) => {
    if (index === 0) return true;
    const previousDay = dateCells[index - 1].day;
    if (day > previousDay) return true;
    if (!wrappedToNextMonth && previousDay >= 28 && day <= 7) {
      wrappedToNextMonth = true;
      return true;
    }
    return false;
  });
};

const normalizeScheduleText = (value) => {
  const normalized = String(value || '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*\\\s*/g, ' \\ ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!normalized) return '';
  const placeholderOnly = normalized.replace(/[\s/\\|ㆍ·•・‧⋅—–-]+/g, '').trim();
  return placeholderOnly ? normalized : '';
};

const isDecorationOnly = (value) => /^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(String(value || ''));

const isWeekdayHeaderRow = (row) => {
  const weekdayCount = row.filter((cell) => DAY_LABELS.includes(String(cell || '').trim())).length;
  return weekdayCount >= 5;
};

const parseScheduleRows = (rows, targetYear, targetMonth) => {
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const itemsMap = new Map();
  let lastIncludedDay = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!isDateRow(row)) continue;

    const dateCells = getDateCells(row);
    const activeDays = [];
    dateCells.forEach(({ day, columnIndex }) => {
      if (day < 1 || day > daysInMonth) return;
      if (lastIncludedDay === 0) {
        if (day <= 7) {
          activeDays.push({ day, columnIndex });
          lastIncludedDay = day;
        }
        return;
      }
      if (day > lastIncludedDay) {
        activeDays.push({ day, columnIndex });
        lastIncludedDay = day;
      }
    });

    if (!activeDays.length) continue;

    let nextRowIndex = rowIndex + 1;
    const detailRows = [];
    while (nextRowIndex < rows.length && !isDateRow(rows[nextRowIndex])) {
      if (!isWeekdayHeaderRow(rows[nextRowIndex])) detailRows.push(rows[nextRowIndex]);
      nextRowIndex += 1;
    }

    const columnSteps = dateCells
      .slice(1)
      .map((cell, index) => cell.columnIndex - dateCells[index].columnIndex)
      .filter((step) => step > 0);
    const fallbackColumnStep = columnSteps.length ? Math.min(...columnSteps) : 1;

    activeDays.forEach(({ day, columnIndex }) => {
      const nextNumericColumn = dateCells.find((cell) => cell.columnIndex > columnIndex)?.columnIndex
        ?? Math.min(row.length, columnIndex + fallbackColumnStep);
      const detailTexts = [];
      detailRows.forEach((detailRow) => {
        for (let column = columnIndex; column < nextNumericColumn; column += 1) {
          const text = normalizeScheduleText(detailRow[column] || '');
          if (text && !isDecorationOnly(text)) detailTexts.push(text);
        }
      });
      const uniqueTexts = Array.from(new Set(detailTexts));
      const dateObject = new Date(targetYear, targetMonth - 1, day);
      itemsMap.set(day, {
        dayNumber: day,
        day: DAY_LABELS[dateObject.getDay()],
        date: `${targetMonth}월 ${day}일`,
        title: uniqueTexts.join(' / '),
        empty: uniqueTexts.length === 0,
      });
    });
  }

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const existing = itemsMap.get(day);
    if (existing) return existing;
    const dateObject = new Date(targetYear, targetMonth - 1, day);
    return {
      dayNumber: day,
      day: DAY_LABELS[dateObject.getDay()],
      date: `${targetMonth}월 ${day}일`,
      title: '',
      empty: true,
    };
  });
};

const fetchCandidateSchedule = async (source, candidate) => {
  const encodedSheet = encodeURIComponent(candidate.sheetName);
  const urls = [
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/export?format=csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:json&sheet=${encodedSheet}`,
  ];
  const { rows, fetchedUrl } = await fetchRowsFromUrls(urls);
  const items = parseScheduleRows(rows, candidate.year, candidate.month);
  return { monthLabel: candidate.monthLabel, sheetName: candidate.sheetName, items, fetchedUrl };
};

const fetchFixedGidSchedule = async (source, monthInfo) => {
  const { year, month } = monthInfo;
  const gid = getSourceGid(source, monthInfo);
  if (!gid) throw new Error('선택한 달의 고정 시트 정보를 찾지 못했습니다.');
  const urls = [
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:json&gid=${gid}`,
  ];
  const { rows, fetchedUrl } = await fetchRowsFromUrls(urls);
  const items = parseScheduleRows(rows, year, month);
  return { monthLabel: `${year}년 ${month}월`, sheetName: '', items, fetchedUrl, sourceUrl: getSourceUrl(source, monthInfo) };
};

const fetchSourceSchedule = async (source, monthInfo) => {
  if (source.id === 'jangjisu') {
    const result = await buildFreshJangjisuScheduleResponse(monthInfo);
    return { ...result, member: source.key };
  }

  if (source.mode === 'fixedGid' && getSourceGid(source, monthInfo)) {
    const result = await fetchFixedGidSchedule(source, monthInfo);
    return { ok: result.items.some((item) => !item.empty), member: source.key, ...result };
  }

  const candidates = buildSheetCandidates(monthInfo);
  for (const candidate of candidates) {
    try {
      const result = await fetchCandidateSchedule(source, candidate);
      return { ok: result.items.some((item) => !item.empty), member: source.key, ...result };
    } catch {
      // 현재 월 후보 시트만 시도합니다. 다음 달 시트가 미리 생겨도 현재 월을 유지합니다.
    }
  }

  return { ok: false, member: source.key, monthLabel: '', sheetName: '', items: [], fetchedUrl: '' };
};

const getSnapshotKey = (monthInfo) => `prison:schedules:${monthKey(monthInfo)}:${SNAPSHOT_VERSION}`;

const REMOTE_MEMBER_NAMES = new Set(SOURCES.map((source) => source.key));

const buildManualSchedules = (monthInfo) => Object.values(PRISON_MANUAL_SCHEDULES).filter((schedule) => !REMOTE_MEMBER_NAMES.has(schedule.member)).map((schedule) => ({
  ok: true,
  member: schedule.member,
  monthLabel: monthInfo.monthLabel,
  sheetName: '',
  sourceUrl: '',
  fetchedUrl: '',
  items: (schedule.items || []).filter((item) => Number(item.year) === monthInfo.year && Number(item.month) === monthInfo.month),
}));

const flattenScheduleItems = (schedules) => schedules.flatMap((schedule) =>
  (schedule.items || [])
    .filter((item) => !item.empty && String(item.title || '').trim())
    .map((item) => ({ ...item, member: schedule.member })),
);

const buildSnapshotPayload = (monthInfo, schedules, sourceStatus) => ({
  ok: schedules.some((schedule) => (schedule.items || []).some((item) => !item.empty && String(item.title || '').trim())),
  monthLabel: monthInfo.monthLabel,
  members: schedules.map((schedule) => schedule.member),
  schedules,
  items: flattenScheduleItems(schedules),
  sourceUrl: '',
  sourceStatus,
  fetchedAt: new Date().toISOString(),
});

async function collectScheduleSnapshot(monthInfo, previousPayload) {
  const results = await Promise.allSettled(SOURCES.map((source) => fetchSourceSchedule(source, monthInfo)));
  const previousByMember = new Map((previousPayload?.schedules || []).map((schedule) => [schedule.member, schedule]));
  const remoteSchedules = SOURCES.map((source, index) => {
    const result = results[index];
    if (result.status === 'fulfilled' && result.value.ok) return result.value;
    return previousByMember.get(source.key) || null;
  }).filter(Boolean);
  const manualSchedules = buildManualSchedules(monthInfo);
  const schedules = [...remoteSchedules, ...manualSchedules];
  const remoteSuccessCount = results.filter((result) => result.status === 'fulfilled' && result.value.ok).length;

  if (remoteSuccessCount === 0 && previousPayload?.schedules?.length) {
    return { payload: previousPayload, refreshed: false };
  }
  if (remoteSuccessCount === 0) throw new Error('일정 원본을 불러오지 못했습니다.');

  return {
    payload: buildSnapshotPayload(monthInfo, schedules, [
      ...SOURCES.map((source, index) => ({
        member: source.key,
        ok: results[index].status === 'fulfilled' && results[index].value.ok,
        stale: !(results[index].status === 'fulfilled' && results[index].value.ok) && previousByMember.has(source.key),
      })),
      ...manualSchedules.map((schedule) => ({ member: schedule.member, ok: true, manual: true })),
    ]),
    refreshed: true,
  };
}

async function refreshScheduleSnapshot(cache, key, monthInfo) {
  if (snapshotRefreshPromises.has(key)) return snapshotRefreshPromises.get(key);
  const promise = (async () => {
    const result = await collectScheduleSnapshot(monthInfo, cache.record?.payload);
    if (!result.refreshed) return { record: cache.record, storage: cache.storage, stale: true };
    const record = { payload: result.payload, cachedAt: Date.now() };
    const storage = await writeSnapshotCache(cache, key, record, SNAPSHOT_STORAGE_SECONDS);
    return { record, storage, stale: false };
  })();
  snapshotRefreshPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    if (snapshotRefreshPromises.get(key) === promise) snapshotRefreshPromises.delete(key);
  }
}

async function serveScheduleSnapshot(res, monthInfo) {
  const key = getSnapshotKey(monthInfo);
  const cache = await readSnapshotCache(key);
  const cachedAt = Number(cache.record?.cachedAt || 0);
  if (cache.record?.payload && cachedAt && Date.now() - cachedAt < SNAPSHOT_FRESH_MS) {
    return res.status(200).json({ ...cache.record.payload, cache: 'hit', cacheStorage: cache.storage, cachedAt: new Date(cachedAt).toISOString() });
  }

  try {
    const result = await refreshScheduleSnapshot(cache, key, monthInfo);
    return res.status(200).json({
      ...result.record.payload,
      cache: result.stale ? 'stale' : cache.record?.payload ? 'refresh' : 'miss',
      cacheStorage: result.storage,
      cachedAt: new Date(result.record.cachedAt).toISOString(),
    });
  } catch {
    if (cache.record?.payload) {
      return res.status(200).json({ ...cache.record.payload, cache: 'stale', cacheStorage: cache.storage, cachedAt: new Date(cache.record.cachedAt).toISOString() });
    }
    return res.status(200).json({ ok: false, monthLabel: monthInfo.monthLabel, members: [], schedules: [], items: [], cache: 'unavailable', cacheStorage: cache.storage });
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');

  const selectedMonth = getAllowedScheduleMonth(req.query, 2);
  if (!selectedMonth) {
    return res.status(400).json({ ok: false, message: '이번 달과 이전 두 달 일정만 확인할 수 있습니다.' });
  }

  const requestedKey = String(req.query.key || '').trim();
  if (!requestedKey) return serveScheduleSnapshot(res, selectedMonth);

  const activeSources = requestedKey ? SOURCES.filter((source) => source.id === requestedKey) : SOURCES;
  if (!activeSources.length) {
    return res.status(404).json({ ok: false, message: '일정 소스를 찾지 못했습니다.' });
  }

  const results = await Promise.allSettled(activeSources.map((source) => fetchSourceSchedule(source, selectedMonth)));
  const schedules = results
    .filter((result) => result.status === 'fulfilled' && result.value.ok)
    .map((result) => result.value);

  const monthLabel = schedules[0]?.monthLabel || selectedMonth.monthLabel;
  const items = schedules.flatMap((schedule) =>
    (schedule.items || [])
      .filter((item) => !item.empty && String(item.title || '').trim())
      .map((item) => ({ ...item, member: schedule.member })),
  );

  return res.status(200).json({
    ok: schedules.length > 0,
    monthLabel,
    members: schedules.map((schedule) => schedule.member),
    schedules,
    items,
    sourceUrl: schedules[0]?.sourceUrl || getSourceUrl(activeSources[0], selectedMonth) || '',
    sourceStatus: results.map((result, index) => ({
      member: activeSources[index].key,
      ok: result.status === 'fulfilled' ? result.value.ok : false,
    })),
    fetchedAt: new Date().toISOString(),
  });
}


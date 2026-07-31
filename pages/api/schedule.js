import { fetchRowsByGid, isIgnoredCalendarText, normalizeScheduleText } from '../../lib/scheduleSheet';
import { fetchMonthlySheet } from '../../lib/monthlySheetResolver';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo } from '../../lib/scheduleMonth';

const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_VERSION = 'v9';
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const KNOWN_MONTH_GIDS = {
  '2026-04': '315851366',
  '2026-05': '215076926',
  '2026-06': '1486425307',
  '2026-07': '1207442777',
};

function getMonthKey(monthInfo) {
  return `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;
}

function makeCacheKey(monthInfo) {
  return `schedule:jangjisu:${getMonthKey(monthInfo)}:${CACHE_VERSION}`;
}

function getKnownMonthGid(monthInfo) {
  return KNOWN_MONTH_GIDS[getMonthKey(monthInfo)] || '';
}

function getKnownMonthSourceUrl(monthInfo) {
  const gid = getKnownMonthGid(monthInfo);
  return gid ? `${SHEET_URL}?gid=${gid}#gid=${gid}` : '';
}

function isDateRow(row) {
  return row.filter((cell) => /^\d{1,2}$/.test(String(cell || '').trim())).length >= 5;
}

function buildMonthItems(targetYear, targetMonth, itemsMap) {
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
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
}

function parseCurrentMonthRows(rows, targetYear, targetMonth) {
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const itemsMap = new Map();
  let lastIncludedDay = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!isDateRow(row)) continue;

    const numericCells = row
      .map((cell, columnIndex) => ({ text: String(cell || '').trim(), columnIndex }))
      .filter(({ text }) => /^\d{1,2}$/.test(text));

    const activeDays = [];
    numericCells.forEach(({ text, columnIndex }) => {
      const day = Number(text);
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

    if (activeDays.length === 0) continue;

    let nextRowIndex = rowIndex + 1;
    const detailRows = [];
    while (nextRowIndex < rows.length && !isDateRow(rows[nextRowIndex])) {
      detailRows.push(rows[nextRowIndex]);
      nextRowIndex += 1;
    }

    activeDays.forEach(({ day, columnIndex }) => {
      const nextNumericColumn = numericCells.find((cell) => cell.columnIndex > columnIndex)?.columnIndex ?? row.length;
      const detailTexts = [];

      detailRows.forEach((detailRow) => {
        for (let column = columnIndex; column < nextNumericColumn; column += 1) {
          const text = normalizeScheduleText(detailRow[column] || '');
          if (text && !isIgnoredCalendarText(text)) detailTexts.push(text);
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

  return buildMonthItems(targetYear, targetMonth, itemsMap);
}

function emptyCurrentMonthPayload(currentMonth, sourceUrl = SHEET_URL, message = '현재 월 일정 데이터를 불러오지 못했습니다.') {
  return {
    ok: false,
    source: 'google_sheet_gid',
    sourceUrl,
    monthLabel: currentMonth.monthLabel,
    sheetName: currentMonth.sheetName,
    items: [],
    message,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchCurrentMonthRows(currentMonth) {
  const knownGid = getKnownMonthGid(currentMonth);
  if (knownGid) {
    const result = await fetchRowsByGid(SHEET_ID, knownGid);
    return {
      ...result,
      gid: knownGid,
      sourceUrl: `${SHEET_URL}?gid=${knownGid}#gid=${knownGid}`,
      source: 'google_sheet_gid',
    };
  }

  const result = await fetchMonthlySheet(SHEET_ID, currentMonth, 'short-year-month');
  return {
    ...result,
    source: 'google_sheet_name',
  };
}

async function buildFreshScheduleResponse(currentMonth) {
  try {
    const result = await fetchCurrentMonthRows(currentMonth);
    const items = parseCurrentMonthRows(result.rows, currentMonth.year, currentMonth.month);

    return {
      ok: items.some((item) => !item.empty),
      source: result.source,
      sourceUrl: result.sourceUrl || getKnownMonthSourceUrl(currentMonth) || SHEET_URL,
      monthLabel: currentMonth.monthLabel,
      sheetName: currentMonth.sheetName,
      gid: result.gid || '',
      fetchedUrl: result.fetchedUrl,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return emptyCurrentMonthPayload(
      currentMonth,
      getKnownMonthSourceUrl(currentMonth) || SHEET_URL,
      `${currentMonth.sheetName} 탭을 찾지 못했거나 일정 데이터를 불러오지 못했습니다.`,
    );
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const currentMonth = getKstMonthInfo();
  const cacheKey = makeCacheKey(currentMonth);
  const cached = await getCachedJson(cacheKey);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({
      ...cached.payload,
      cache: 'hit',
      cacheKey,
      cachedAt: new Date(cached.cachedAt).toISOString(),
    });
  }

  try {
    const payload = await buildFreshScheduleResponse(currentMonth);
    await setCachedJson(cacheKey, { payload, cachedAt: now }, CACHE_TTL_SECONDS);

    return res.status(200).json({
      ...payload,
      cache: cached?.payload ? 'refresh' : 'miss',
      cacheKey,
      cachedAt: new Date(now).toISOString(),
    });
  } catch {
    if (cached?.payload) {
      return res.status(200).json({
        ...cached.payload,
        cache: 'stale',
        cacheKey,
        cachedAt: new Date(cached.cachedAt).toISOString(),
      });
    }

    return res.status(200).json({
      ...emptyCurrentMonthPayload(currentMonth, getKnownMonthSourceUrl(currentMonth) || SHEET_URL),
      cache: 'unavailable',
      cacheKey,
    });
  }
}


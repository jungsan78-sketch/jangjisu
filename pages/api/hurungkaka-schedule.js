import {
  buildMonthCandidates,
  detectMonthFromRows,
  fetchRowsByGid,
  fetchRowsBySheetName,
  parseLooseCalendarRows,
  parseScheduleListRows,
  parseScheduleRows,
  pickBestSchedule,
} from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey, sameScheduleMonth } from '../../lib/scheduleMonth';

const SHEET_ID = '1gWZgS8ExyOdZAJGW6MMY49zCMgf4QAA2aQokkY31z4Y';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const CACHE_TTL_SECONDS = 60 * 60;

const EXTRA_SHEET_NAME_CANDIDATES = (monthInfo) => [
  `${monthInfo.month}월`,
  `${monthInfo.year}년 ${monthInfo.month}월`,
  `${String(monthInfo.year).slice(2)}년 ${monthInfo.month}월`,
  `${monthInfo.month}`,
];

function emptyCurrentMonthPayload(currentMonth, fetchedUrl = '') {
  return {
    ok: false,
    source: 'google_sheet_auto',
    sourceUrl: SHEET_URL,
    monthLabel: currentMonth.monthLabel,
    items: [],
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
    message: '후룽카카 일정 시트에서 현재 월 데이터를 찾지 못했습니다.',
  };
}

async function fetchCurrentMonthRows(currentMonth) {
  const candidates = [
    ...buildMonthCandidates(new Date(currentMonth.year, currentMonth.month - 1, 1)).map((candidate) => candidate.sheetName),
    ...EXTRA_SHEET_NAME_CANDIDATES(currentMonth),
  ];

  const tried = new Set();
  let lastError = null;

  for (const sheetName of candidates) {
    if (!sheetName || tried.has(sheetName)) continue;
    tried.add(sheetName);

    try {
      const result = await fetchRowsBySheetName(SHEET_ID, sheetName);
      return { ...result, source: 'sheet_name', sheetName };
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const result = await fetchRowsByGid(SHEET_ID, '0');
    return { ...result, source: 'gid', gid: '0' };
  } catch (error) {
    throw lastError || error;
  }
}

async function buildFreshScheduleResponse(currentMonth) {
  const { rows, fetchedUrl, source, sheetName, gid } = await fetchCurrentMonthRows(currentMonth);
  const detected = detectMonthFromRows(rows, new Date());

  if (!sameScheduleMonth(detected, currentMonth)) {
    return {
      ...emptyCurrentMonthPayload(currentMonth, fetchedUrl),
      source: `google_sheet_${source}`,
      sheetName,
      gid,
    };
  }

  const gridItems = parseScheduleRows(rows, currentMonth.year, currentMonth.month);
  const looseItems = parseLooseCalendarRows(rows, currentMonth.year, currentMonth.month);
  const listItems = parseScheduleListRows(rows, currentMonth.year, currentMonth.month);
  const items = pickBestSchedule([gridItems, looseItems, listItems]);

  if (!items.some((item) => !item.empty && String(item.title || '').trim())) {
    return {
      ...emptyCurrentMonthPayload(currentMonth, fetchedUrl),
      source: `google_sheet_${source}`,
      sheetName,
      gid,
      items,
    };
  }

  return {
    ok: true,
    source: `google_sheet_${source}`,
    sourceUrl: SHEET_URL,
    monthLabel: currentMonth.monthLabel,
    sheetName,
    gid,
    items,
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const currentMonth = getKstMonthInfo();
  const cacheKey = makeMonthlyScheduleCacheKey('schedule:hurungkaka:v1', new Date());
  const cached = await getCachedJson(cacheKey);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({
      ...cached.payload,
      cache: 'hit',
      cachedAt: new Date(cached.cachedAt).toISOString(),
    });
  }

  try {
    const payload = await buildFreshScheduleResponse(currentMonth);
    await setCachedJson(cacheKey, { payload, cachedAt: now }, CACHE_TTL_SECONDS);

    return res.status(200).json({
      ...payload,
      cache: cached?.payload ? 'refresh' : 'miss',
      cachedAt: new Date(now).toISOString(),
    });
  } catch {
    if (cached?.payload) {
      return res.status(200).json({
        ...cached.payload,
        cache: 'stale',
        cachedAt: new Date(cached.cachedAt).toISOString(),
      });
    }

    return res.status(200).json({
      ok: false,
      sourceUrl: SHEET_URL,
      monthLabel: currentMonth.monthLabel,
      items: [],
      message: '후룽카카 일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
    });
  }
}

import { detectMonthFromRows, parseScheduleListRows, parseScheduleRows, pickBestSchedule } from '../../lib/scheduleSheet';
import { fetchMonthlySheet } from '../../lib/monthlySheetResolver';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey, sameScheduleMonth } from '../../lib/scheduleMonth';

const SHEET_ID = '1OLJnia52yhNXvbTlt273EqO3kIggUy1e-uZso60eHwo';
const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_PREFIX = 'schedule:youoneul:v5';

function emptyCurrentMonthPayload(currentMonth, sourceUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`, fetchedUrl = '') {
  return {
    ok: false,
    source: 'google_sheet_name',
    sourceUrl,
    monthLabel: currentMonth.monthLabel,
    sheetName: `${currentMonth.month}월`,
    items: [],
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
    message: '유오늘 일정 시트에서 현재 월 데이터를 찾지 못했습니다.',
  };
}

async function buildFreshScheduleResponse(currentMonth) {
  const { rows, fetchedUrl, sourceUrl, sheetName, gid } = await fetchMonthlySheet(SHEET_ID, currentMonth, 'month');
  const detected = detectMonthFromRows(rows, new Date());

  if (detected && !sameScheduleMonth(detected, currentMonth)) {
    return emptyCurrentMonthPayload(currentMonth, sourceUrl, fetchedUrl);
  }

  const gridItems = parseScheduleRows(rows, currentMonth.year, currentMonth.month);
  const listItems = parseScheduleListRows(rows, currentMonth.year, currentMonth.month);
  const items = pickBestSchedule([gridItems, listItems]);

  if (!items.some((item) => !item.empty && String(item.title || '').trim())) {
    return { ...emptyCurrentMonthPayload(currentMonth, sourceUrl, fetchedUrl), sheetName, gid, items };
  }

  return {
    ok: true,
    source: 'google_sheet_name',
    sourceUrl,
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
  const cacheKey = makeMonthlyScheduleCacheKey(CACHE_PREFIX, new Date());
  const cached = await getCachedJson(cacheKey);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({ ...cached.payload, cache: 'hit', cachedAt: new Date(cached.cachedAt).toISOString() });
  }

  try {
    const payload = await buildFreshScheduleResponse(currentMonth);
    await setCachedJson(cacheKey, { payload, cachedAt: now }, CACHE_TTL_SECONDS);
    return res.status(200).json({ ...payload, cache: cached?.payload ? 'refresh' : 'miss', cachedAt: new Date(now).toISOString() });
  } catch {
    if (cached?.payload) return res.status(200).json({ ...cached.payload, cache: 'stale', cachedAt: new Date(cached.cachedAt).toISOString() });
    return res.status(200).json({ ...emptyCurrentMonthPayload(currentMonth), cache: 'unavailable' });
  }
}

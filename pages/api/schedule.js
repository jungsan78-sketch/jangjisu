import { fetchRowsBySheetName, parseScheduleRows } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey } from '../../lib/scheduleMonth';

const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const CACHE_TTL_SECONDS = 60 * 60;

async function buildFreshScheduleResponse(currentMonth) {
  try {
    const { rows, fetchedUrl } = await fetchRowsBySheetName(SHEET_ID, currentMonth.sheetName);
    const items = parseScheduleRows(rows, currentMonth.year, currentMonth.month);

    return {
      ok: items.some((item) => !item.empty),
      source: 'google_sheet_csv',
      sourceUrl: `${SHEET_URL}?sheet=${encodeURIComponent(currentMonth.sheetName)}`,
      monthLabel: currentMonth.monthLabel,
      sheetName: currentMonth.sheetName,
      fetchedUrl,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return {
      ok: false,
      sourceUrl: SHEET_URL,
      monthLabel: currentMonth.monthLabel,
      sheetName: currentMonth.sheetName,
      items: [],
      message: '현재 월 일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
    };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const currentMonth = getKstMonthInfo();
  const cacheKey = makeMonthlyScheduleCacheKey('schedule:jangjisu', new Date());
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
      sheetName: currentMonth.sheetName,
      items: [],
      message: '현재 월 일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
    });
  }
}

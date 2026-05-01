import { detectMonthFromRows, fetchRowsByGid, parseScheduleListRows, parseScheduleRows, pickBestSchedule } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey, sameScheduleMonth } from '../../lib/scheduleMonth';

const SHEET_ID = '1qu7DXG99c9WbR5g-t1HL2BU_bFlqhxwN45tscolZ_U0';
const SHEET_GID = '1306533963';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const CACHE_TTL_SECONDS = 60 * 60;

function emptyCurrentMonthPayload(currentMonth, fetchedUrl = '') {
  return {
    ok: false,
    source: 'google_sheet_gid',
    sourceUrl: SHEET_URL,
    monthLabel: currentMonth.monthLabel,
    items: [],
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
    message: '린링 일정 시트에서 현재 월 데이터를 찾지 못했습니다.',
  };
}

async function buildFreshScheduleResponse(currentMonth) {
  const { rows, fetchedUrl } = await fetchRowsByGid(SHEET_ID, SHEET_GID);
  const detected = detectMonthFromRows(rows, new Date());

  if (!sameScheduleMonth(detected, currentMonth)) {
    return emptyCurrentMonthPayload(currentMonth, fetchedUrl);
  }

  const gridItems = parseScheduleRows(rows, currentMonth.year, currentMonth.month);
  const listItems = parseScheduleListRows(rows, currentMonth.year, currentMonth.month);
  const items = pickBestSchedule([gridItems, listItems]);

  if (!items.some((item) => !item.empty && String(item.title || '').trim())) {
    return { ...emptyCurrentMonthPayload(currentMonth, fetchedUrl), items };
  }

  return {
    ok: true,
    source: 'google_sheet_gid',
    sourceUrl: SHEET_URL,
    monthLabel: currentMonth.monthLabel,
    items,
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const currentMonth = getKstMonthInfo();
  const cacheKey = makeMonthlyScheduleCacheKey('schedule:rinring:v2', new Date());
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
    return res.status(200).json({ ok: false, sourceUrl: SHEET_URL, monthLabel: currentMonth.monthLabel, items: [], message: '린링 일정 데이터를 불러오지 못했습니다.', fetchedAt: new Date().toISOString(), cache: 'unavailable' });
  }
}

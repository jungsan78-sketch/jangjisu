import { fetchRowsByGid, parseScheduleRows } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo } from '../../lib/scheduleMonth';

const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_VERSION = 'v2';

const JANGJISU_MONTHLY_GIDS = {
  '2026-04': '315851366',
  '2026-05': '215076926',
};

function getMonthKey(monthInfo) {
  return `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;
}

function makeCacheKey(monthInfo) {
  return `schedule:jangjisu:${getMonthKey(monthInfo)}:${CACHE_VERSION}`;
}

function getCurrentMonthGid(monthInfo) {
  return JANGJISU_MONTHLY_GIDS[getMonthKey(monthInfo)] || '';
}

function emptyCurrentMonthPayload(currentMonth, message = '현재 월 일정 데이터를 불러오지 못했습니다.') {
  const gid = getCurrentMonthGid(currentMonth);
  return {
    ok: false,
    source: 'google_sheet_gid',
    sourceUrl: gid ? `${SHEET_URL}?gid=${gid}#gid=${gid}` : SHEET_URL,
    monthLabel: currentMonth.monthLabel,
    sheetName: currentMonth.sheetName,
    gid,
    items: [],
    message,
    fetchedAt: new Date().toISOString(),
  };
}

async function buildFreshScheduleResponse(currentMonth) {
  const gid = getCurrentMonthGid(currentMonth);
  if (!gid) {
    return emptyCurrentMonthPayload(currentMonth, '현재 월에 연결된 장지수 일정 시트 gid가 없습니다.');
  }

  try {
    const { rows, fetchedUrl } = await fetchRowsByGid(SHEET_ID, gid);
    const items = parseScheduleRows(rows, currentMonth.year, currentMonth.month);

    return {
      ok: items.some((item) => !item.empty),
      source: 'google_sheet_gid',
      sourceUrl: `${SHEET_URL}?gid=${gid}#gid=${gid}`,
      monthLabel: currentMonth.monthLabel,
      sheetName: currentMonth.sheetName,
      gid,
      fetchedUrl,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return emptyCurrentMonthPayload(currentMonth);
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
      ...emptyCurrentMonthPayload(currentMonth),
      cache: 'unavailable',
      cacheKey,
    });
  }
}

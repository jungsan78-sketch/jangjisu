import { detectMonthFromRows, fetchRowsByGid, parseScheduleListRows, parseScheduleRows, pickBestSchedule } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey, sameScheduleMonth } from '../../lib/scheduleMonth';

const SHEET_ID = '1qu7DXG99c9WbR5g-t1HL2BU_bFlqhxwN45tscolZ_U0';
const MONTHLY_GIDS = {
  '2026-05': '1306533963',
  '2026-06': '1058789800',
};
const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_PREFIX = 'schedule:rinring:v4';

function getMonthKey(monthInfo) {
  return `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;
}

function getCurrentMonthGid(monthInfo) {
  return MONTHLY_GIDS[getMonthKey(monthInfo)] || '';
}

function getSheetUrl(gid = '') {
  return gid ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${gid}#gid=${gid}` : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
}

function sanitizeRinringScheduleItems(items) {
  return items.map((item) => {
    const title = String(item.title || '');
    if (!title) return item;

    const cleanedParts = title
      .split(/\s*\/\s*/g)
      .map((part) => part.trim())
      .filter((part) => part && !/^\d{1,2}$/.test(part));
    const cleanedTitle = Array.from(new Set(cleanedParts)).join(' / ');

    return {
      ...item,
      title: cleanedTitle,
      empty: cleanedTitle.length === 0,
    };
  });
}

function emptyCurrentMonthPayload(currentMonth, fetchedUrl = '') {
  const gid = getCurrentMonthGid(currentMonth);
  return {
    ok: false,
    source: 'google_sheet_gid',
    sourceUrl: getSheetUrl(gid),
    monthLabel: currentMonth.monthLabel,
    gid,
    items: [],
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
    message: '린링 일정 시트에서 현재 월 데이터를 찾지 못했습니다.',
  };
}

async function buildFreshScheduleResponse(currentMonth) {
  const gid = getCurrentMonthGid(currentMonth);
  if (!gid) return emptyCurrentMonthPayload(currentMonth);

  const { rows, fetchedUrl } = await fetchRowsByGid(SHEET_ID, gid);
  const detected = detectMonthFromRows(rows, new Date());

  if (!sameScheduleMonth(detected, currentMonth)) {
    return emptyCurrentMonthPayload(currentMonth, fetchedUrl);
  }

  const gridItems = parseScheduleRows(rows, currentMonth.year, currentMonth.month);
  const listItems = parseScheduleListRows(rows, currentMonth.year, currentMonth.month);
  const items = sanitizeRinringScheduleItems(pickBestSchedule([gridItems, listItems]));

  if (!items.some((item) => !item.empty && String(item.title || '').trim())) {
    return { ...emptyCurrentMonthPayload(currentMonth, fetchedUrl), items };
  }

  return {
    ok: true,
    source: 'google_sheet_gid',
    sourceUrl: getSheetUrl(gid),
    monthLabel: currentMonth.monthLabel,
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
    return res.status(200).json({ ok: false, sourceUrl: getSheetUrl(getCurrentMonthGid(currentMonth)), monthLabel: currentMonth.monthLabel, items: [], message: '린링 일정 데이터를 불러오지 못했습니다.', fetchedAt: new Date().toISOString(), cache: 'unavailable' });
  }
}

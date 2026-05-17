import { detectMonthFromRows, fetchRowsByGid, parseScheduleListRows, parseScheduleRows, pickBestSchedule } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey, sameScheduleMonth } from '../../lib/scheduleMonth';

const SHEET_ID = '1OLJnia52yhNXvbTlt273EqO3kIggUy1e-uZso60eHwo';
const SHEET_GID = '1672412190';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_PREFIX = 'schedule:youoneul:v3';

const YOUONEUL_SCHEDULE_PATCHES = {
  '2026-05': {
    set: {
      17: '마인짐 섭종\n롤페 읽고 섭종콘 참여',
      24: '가족식사 휴방',
      25: '장지수용소\n노래자랑',
    },
    clear: [26, 27, 28, 29, 30],
  },
};

function getMonthKey(monthInfo) {
  return `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;
}

function patchYouoneulScheduleItems(items, monthInfo) {
  const patch = YOUONEUL_SCHEDULE_PATCHES[getMonthKey(monthInfo)];
  if (!patch) return items;

  const setMap = patch.set || {};
  const clearSet = new Set(patch.clear || []);

  return items.map((item) => {
    const dayNumber = Number(item.dayNumber);

    if (clearSet.has(dayNumber)) {
      return {
        ...item,
        title: '',
        empty: true,
      };
    }

    if (Object.prototype.hasOwnProperty.call(setMap, dayNumber)) {
      return {
        ...item,
        title: setMap[dayNumber],
        empty: false,
      };
    }

    return item;
  });
}

function emptyCurrentMonthPayload(currentMonth, fetchedUrl = '') {
  return {
    ok: false,
    source: 'google_sheet_gid',
    sourceUrl: SHEET_URL,
    monthLabel: currentMonth.monthLabel,
    items: [],
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
    message: '유오늘 일정 시트에서 현재 월 데이터를 찾지 못했습니다.',
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
  const items = patchYouoneulScheduleItems(pickBestSchedule([gridItems, listItems]), currentMonth);

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
    return res.status(200).json({ ok: false, sourceUrl: SHEET_URL, monthLabel: currentMonth.monthLabel, items: [], message: '유오늘 일정 데이터를 불러오지 못했습니다.', fetchedAt: new Date().toISOString(), cache: 'unavailable' });
  }
}

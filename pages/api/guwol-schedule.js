import { detectMonthFromRows, fetchRowsByGid, parseLooseCalendarRows, parseScheduleListRows, parseScheduleRows, pickBestSchedule } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';

const SHEET_ID = '1J0H1eHRB05ojAW3kqHrQBoMU68DjJV4SgRViwszyZBs';
const SHEET_GID = '1645820954';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const CACHE_KEY = 'schedule:guwol:current';
const CACHE_TTL_SECONDS = 60 * 60;

async function buildFreshScheduleResponse() {
  const { rows, fetchedUrl } = await fetchRowsByGid(SHEET_ID, SHEET_GID);
  const detected = detectMonthFromRows(rows, new Date());

  const looseItems = parseLooseCalendarRows(rows, detected.year, detected.month);
  const gridItems = parseScheduleRows(rows, detected.year, detected.month);
  const listItems = parseScheduleListRows(rows, detected.year, detected.month);
  const items = pickBestSchedule([looseItems, gridItems, listItems]);

  if (!items.some((item) => !item.empty && String(item.title || '').trim())) {
    return {
      ok: false,
      source: 'google_sheet_gid',
      sourceUrl: SHEET_URL,
      monthLabel: detected.monthLabel,
      items,
      fetchedUrl,
      fetchedAt: new Date().toISOString(),
      message: '구월이 일정 시트에서 이번 달 데이터를 찾지 못했습니다.',
    };
  }

  return {
    ok: true,
    source: 'google_sheet_gid',
    sourceUrl: SHEET_URL,
    monthLabel: detected.monthLabel,
    items,
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const cached = await getCachedJson(CACHE_KEY);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({
      ...cached.payload,
      cache: 'hit',
      cachedAt: new Date(cached.cachedAt).toISOString(),
    });
  }

  try {
    const payload = await buildFreshScheduleResponse();
    await setCachedJson(CACHE_KEY, { payload, cachedAt: now }, CACHE_TTL_SECONDS);

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
      monthLabel: '',
      items: [],
      message: '구월이 일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
    });
  }
}

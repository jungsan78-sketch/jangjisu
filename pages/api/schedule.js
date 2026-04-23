import { buildMonthCandidates, fetchRowsBySheetName, parseScheduleRows } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';

const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const CACHE_KEY = 'schedule:jangjisu:current';
const CACHE_TTL_SECONDS = 60 * 30;

async function buildFreshScheduleResponse() {
  const candidates = buildMonthCandidates();

  for (const candidate of candidates) {
    try {
      const { rows, fetchedUrl } = await fetchRowsBySheetName(SHEET_ID, candidate.sheetName);
      const items = parseScheduleRows(rows, candidate.year, candidate.month);

      if (items.some((item) => !item.empty)) {
        return {
          ok: true,
          source: 'google_sheet_csv',
          sourceUrl: `${SHEET_URL}?sheet=${encodeURIComponent(candidate.sheetName)}`,
          monthLabel: candidate.monthLabel,
          sheetName: candidate.sheetName,
          fetchedUrl,
          items,
          fetchedAt: new Date().toISOString(),
        };
      }
    } catch {
      // 다음 후보 시트로 계속 시도
    }
  }

  return {
    ok: false,
    sourceUrl: SHEET_URL,
    monthLabel: '',
    items: [],
    message: '일정 데이터를 불러오지 못했습니다.',
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
      message: '일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
    });
  }
}

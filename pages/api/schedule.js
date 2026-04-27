import { buildMonthCandidates, fetchRowsBySheetName, parseScheduleRows } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';

const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const CACHE_KEY = 'schedule:jangjisu:current';
const CACHE_TTL_SECONDS = 60 * 60;

function buildCurrentMonthCandidates(baseDate = new Date()) {
  return buildMonthCandidates(baseDate).filter(
    (candidate) => candidate.year === baseDate.getFullYear() && candidate.month === baseDate.getMonth() + 1,
  );
}

async function buildFreshScheduleResponse() {
  const candidates = buildCurrentMonthCandidates();

  for (const candidate of candidates) {
    try {
      const { rows, fetchedUrl } = await fetchRowsBySheetName(SHEET_ID, candidate.sheetName);
      const items = parseScheduleRows(rows, candidate.year, candidate.month);

      return {
        ok: items.some((item) => !item.empty),
        source: 'google_sheet_csv',
        sourceUrl: `${SHEET_URL}?sheet=${encodeURIComponent(candidate.sheetName)}`,
        monthLabel: candidate.monthLabel,
        sheetName: candidate.sheetName,
        fetchedUrl,
        items,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      // 현재 월 후보 시트만 사용합니다. 다음 달 시트가 미리 생겨도 현재 월을 유지합니다.
    }
  }

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  return {
    ok: false,
    sourceUrl: SHEET_URL,
    monthLabel,
    items: [],
    message: '현재 월 일정 데이터를 불러오지 못했습니다.',
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

    const currentDate = new Date();

    return res.status(200).json({
      ok: false,
      sourceUrl: SHEET_URL,
      monthLabel: `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`,
      items: [],
      message: '현재 월 일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
    });
  }
}

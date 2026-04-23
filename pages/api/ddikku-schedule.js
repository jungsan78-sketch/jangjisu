import { detectMonthFromRows, fetchRowsByGid, parseScheduleListRows, parseScheduleRows, pickBestSchedule } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';

const SHEET_ID = '165CKJlUjtZW9NYzHRPZuHDxNKLETpgYt48cxrMKuUGc';
const SHEET_GID = '1059909393';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const CACHE_KEY = 'schedule:ddikku:current:v2';
const CACHE_TTL_SECONDS = 60 * 30;

function normalizeSegment(text) {
  return String(text || '')
    .replace(/^\s*[23]부\s*/u, '')
    .replace(/^\s*[:：\-–—]\s*/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractAllowedParts(title) {
  const source = String(title || '')
    .replace(/\r/g, '\n')
    .replace(/\s*\/\s*/g, '\n')
    .replace(/\s*\\\s*/g, '\n')
    .replace(/([1234]부)/gu, '\n$1');

  const segments = source
    .split('\n')
    .map((segment) => String(segment || '').trim())
    .filter(Boolean);

  const parts = [];

  segments.forEach((segment) => {
    if (/^휴방/u.test(segment) || /\b휴방\b/u.test(segment)) {
      parts.push('휴방');
      return;
    }

    if (!/^[23]부/u.test(segment)) return;

    const normalized = normalizeSegment(segment)
      .replace(/\s*[14]부.*$/u, '')
      .trim();

    if (normalized) parts.push(normalized);
  });

  return Array.from(new Set(parts)).join('/');
}

function mergeFilteredItems(primaryItems = [], fallbackItems = []) {
  const fallbackMap = new Map(fallbackItems.map((item) => [Number(item.dayNumber), item]));

  return primaryItems.map((item) => {
    const primaryTitle = extractAllowedParts(item?.title || '');
    const fallbackTitle = extractAllowedParts(fallbackMap.get(Number(item.dayNumber))?.title || '');
    const title = primaryTitle || fallbackTitle;

    return {
      ...item,
      title,
      empty: !title,
    };
  });
}

async function buildFreshScheduleResponse() {
  const { rows, fetchedUrl } = await fetchRowsByGid(SHEET_ID, SHEET_GID);
  const detected = detectMonthFromRows(rows, new Date());

  const gridItems = parseScheduleRows(rows, detected.year, detected.month);
  const listItems = parseScheduleListRows(rows, detected.year, detected.month);
  const mergedItems = mergeFilteredItems(gridItems, listItems);
  const listFilteredItems = mergeFilteredItems(listItems, gridItems);
  const items = pickBestSchedule([mergedItems, listFilteredItems]);

  if (!items.some((item) => !item.empty && String(item.title || '').trim())) {
    return {
      ok: false,
      source: 'google_sheet_gid',
      sourceUrl: SHEET_URL,
      monthLabel: detected.monthLabel,
      items,
      fetchedUrl,
      fetchedAt: new Date().toISOString(),
      message: '띠꾸 일정 시트에서 이번 달 데이터를 찾지 못했습니다.',
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
      message: '띠꾸 일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
    });
  }
}

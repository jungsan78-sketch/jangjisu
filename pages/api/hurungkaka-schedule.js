import { normalizeScheduleText } from '../../lib/scheduleSheet';
import { fetchMonthlySheet } from '../../lib/monthlySheetResolver';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey } from '../../lib/scheduleMonth';

const SHEET_ID = '1gWZgS8ExyOdZAJGW6MMY49zCMgf4QAA2aQokkY31z4Y';
const CACHE_TTL_SECONDS = 60 * 60;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildEmptyMonthItems(targetYear, targetMonth) {
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const items = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObject = new Date(targetYear, targetMonth - 1, day);
    items.push({
      dayNumber: day,
      day: DAY_LABELS[dateObject.getDay()],
      date: `${targetMonth}월 ${day}일`,
      title: '',
      empty: true,
    });
  }

  return items;
}

function parseCalendarDateCell(value, targetYear, targetMonth) {
  const text = normalizeText(value);
  if (!text) return null;

  const monthDay = text.match(/^(\d{1,2})\s*[\/.]\s*(\d{1,2})$/);
  if (monthDay) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    if (month === targetMonth) return { year: targetYear, month, day };
    return null;
  }

  const dayOnly = text.match(/^(\d{1,2})$/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    if (day >= 1 && day <= daysInMonth) return { year: targetYear, month: targetMonth, day };
  }

  return null;
}

function isCalendarDateRow(row, targetYear, targetMonth) {
  const dateCells = row.filter((cell) => parseCalendarDateCell(cell, targetYear, targetMonth));
  return dateCells.length >= 2;
}

function isIgnoredHurungkakaText(value) {
  const text = normalizeScheduleText(value);
  if (!text) return true;
  if (/^(월|화|수|목|금|토|일)$/u.test(text)) return true;
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i.test(text)) return true;
  if (/^\d{1,2}\s*[\/.]\s*\d{1,2}$/u.test(text)) return true;
  if (/^\d{1,2}$/u.test(text)) return true;
  return false;
}

function collectScheduleTexts(rows, startRowIndex, endRowIndexExclusive, columnIndex) {
  const texts = [];

  for (let rowIndex = startRowIndex; rowIndex < endRowIndexExclusive; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const text = normalizeScheduleText(row[columnIndex] || '');
    if (!text || isIgnoredHurungkakaText(text)) continue;
    texts.push(text);
  }

  return Array.from(new Set(texts));
}

function parseHurungkakaCalendarRows(rows, targetYear, targetMonth) {
  const items = buildEmptyMonthItems(targetYear, targetMonth);
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    if (!isCalendarDateRow(row, targetYear, targetMonth)) continue;

    const dayCells = row
      .map((cell, columnIndex) => ({ parsed: parseCalendarDateCell(cell, targetYear, targetMonth), columnIndex }))
      .filter(({ parsed }) => parsed && parsed.day >= 1 && parsed.day <= daysInMonth);

    if (dayCells.length === 0) continue;

    let nextDateRowIndex = rowIndex + 1;
    while (nextDateRowIndex < rows.length && !isCalendarDateRow(rows[nextDateRowIndex] || [], targetYear, targetMonth)) {
      nextDateRowIndex += 1;
    }

    dayCells.forEach(({ parsed, columnIndex }) => {
      const scheduleTexts = collectScheduleTexts(rows, rowIndex + 1, nextDateRowIndex, columnIndex);
      const target = items[parsed.day - 1];
      if (!target) return;
      target.title = scheduleTexts.join(' / ');
      target.empty = scheduleTexts.length === 0;
    });
  }

  return items;
}

function emptyCurrentMonthPayload(currentMonth, sourceUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`, fetchedUrl = '') {
  return {
    ok: false,
    source: 'google_sheet_name',
    sourceUrl,
    monthLabel: currentMonth.monthLabel,
    sheetName: `${currentMonth.month}월`,
    items: buildEmptyMonthItems(currentMonth.year, currentMonth.month),
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
    message: '후룽카카 일정 시트에서 현재 월 데이터를 찾지 못했습니다.',
  };
}

async function buildFreshScheduleResponse(currentMonth) {
  const { rows, fetchedUrl, sourceUrl, sheetName, gid } = await fetchMonthlySheet(SHEET_ID, currentMonth, 'month');
  const items = parseHurungkakaCalendarRows(rows, currentMonth.year, currentMonth.month);

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
  const cacheKey = makeMonthlyScheduleCacheKey('schedule:hurungkaka:v4', new Date());
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
      ...emptyCurrentMonthPayload(currentMonth),
      cache: 'unavailable',
    });
  }
}

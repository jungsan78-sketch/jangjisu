import { detectMonthFromRows, fetchRowsByGid } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';

const SHEET_ID = '165CKJlUjtZW9NYzHRPZuHDxNKLETpgYt48cxrMKuUGc';
const SHEET_GID = '1059909393';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const CACHE_KEY = 'schedule:ddikku:current:v4';
const CACHE_TTL_SECONDS = 60 * 30;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePartText(value) {
  return normalizeText(value)
    .replace(/^\s*[23]부\s*/u, '')
    .replace(/^\s*[:：\-–—]\s*/u, '')
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

function isDateRow(row) {
  const numericCount = row.filter((cell) => /^\d{1,2}$/.test(normalizeText(cell))).length;
  return numericCount >= 4;
}

function extractDayColumns(row, daysInMonth) {
  const dayColumns = [];
  row.forEach((cell, columnIndex) => {
    const text = normalizeText(cell);
    if (!/^\d{1,2}$/.test(text)) return;
    const day = Number(text);
    if (day < 1 || day > daysInMonth) return;
    dayColumns.push({ day, columnIndex });
  });
  return dayColumns.sort((a, b) => a.columnIndex - b.columnIndex);
}

function extractPartsFromBlock(blockRows, startColumnIndex, endColumnIndexExclusive) {
  const collected = [];
  let hasOffDay = false;

  blockRows.forEach((row) => {
    for (let columnIndex = startColumnIndex; columnIndex < endColumnIndexExclusive; columnIndex += 1) {
      const cell = normalizeText(row[columnIndex]);
      if (!cell) continue;

      if (/휴방/u.test(cell)) {
        hasOffDay = true;
      }

      const labeledPart = cell.match(/^([23])부\s*(.*)$/u);
      if (labeledPart) {
        const normalized = normalizePartText(labeledPart[2]);
        if (normalized) collected.push(normalized);
        continue;
      }

      const previous = normalizeText(row[columnIndex - 1]);
      if (/^[23]부$/u.test(previous)) {
        const normalized = normalizePartText(cell);
        if (normalized) collected.push(normalized);
      }
    }
  });

  const uniqueParts = Array.from(new Set(collected.filter(Boolean)));
  if (uniqueParts.length > 0) {
    return uniqueParts.join('/');
  }
  if (hasOffDay) {
    return '휴방';
  }
  return '';
}

function parseDdikkuRows(rows, targetYear, targetMonth) {
  const items = buildEmptyMonthItems(targetYear, targetMonth);
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!isDateRow(row)) continue;

    const dayColumns = extractDayColumns(row, daysInMonth);
    if (dayColumns.length === 0) continue;

    const blockRows = [];
    let nextRowIndex = rowIndex + 1;
    while (nextRowIndex < rows.length && !isDateRow(rows[nextRowIndex])) {
      blockRows.push(rows[nextRowIndex]);
      nextRowIndex += 1;
    }

    dayColumns.forEach(({ day, columnIndex }, index) => {
      const nextColumnIndex = dayColumns[index + 1]?.columnIndex ?? row.length;
      const title = extractPartsFromBlock(blockRows, columnIndex, nextColumnIndex);
      const target = items[day - 1];
      if (!target) return;
      target.title = title;
      target.empty = !title;
    });
  }

  return items;
}

async function buildFreshScheduleResponse() {
  const { rows, fetchedUrl } = await fetchRowsByGid(SHEET_ID, SHEET_GID);
  const detected = detectMonthFromRows(rows, new Date());
  const items = parseDdikkuRows(rows, detected.year, detected.month);

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

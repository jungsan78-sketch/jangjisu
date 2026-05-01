import { detectMonthFromRows, fetchRowsByGid } from '../../lib/scheduleSheet';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo, makeMonthlyScheduleCacheKey, sameScheduleMonth } from '../../lib/scheduleMonth';

const SHEET_ID = '165CKJlUjtZW9NYzHRPZuHDxNKLETpgYt48cxrMKuUGc';
const SHEET_GID = '1553307664';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;
const CACHE_TTL_SECONDS = 60 * 60;
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const IGNORED_FALLBACK_TEXTS = new Set([
  '띠어트 (영공)',
  '띠어트(영공)',
  '꾸어르(후열소통)',
  '꾸어르 (후열소통)',
  '1부',
  '2부',
  '3부',
  '4부',
]);

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

function splitCellLines(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);
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

function isIgnoredFallbackText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return true;
  if (IGNORED_FALLBACK_TEXTS.has(normalized)) return true;
  if (/^[1234]부$/u.test(normalized)) return true;
  if (/^(월요일|화요일|수요일|목요일|금요일|토요일|일요일)$/u.test(normalized)) return true;
  return false;
}

function extractOffReason(line) {
  const normalized = normalizeText(line);
  if (!normalized) return '';
  const stripped = normalized
    .replace(/\b휴방\b/gu, ' ')
    .replace(/[＊*]/g, ' ')
    .replace(/[:：/|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped;
}

function extractPartsFromBlock(blockRows, startColumnIndex, endColumnIndexExclusive) {
  const collected = [];
  const fallbackTexts = [];
  const offReasonCandidates = [];
  let hasOffDay = false;

  blockRows.forEach((row) => {
    for (let columnIndex = startColumnIndex; columnIndex < endColumnIndexExclusive; columnIndex += 1) {
      const cell = normalizeText(row[columnIndex]);
      if (!cell) continue;

      const cellLines = splitCellLines(row[columnIndex]);
      cellLines.forEach((line) => {
        if (/휴방/u.test(line)) {
          hasOffDay = true;
          const reason = extractOffReason(line);
          if (reason) offReasonCandidates.push(reason);
        }
      });

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
        continue;
      }

      cellLines.forEach((line) => {
        if (/휴방/u.test(line)) return;
        if (!isIgnoredFallbackText(line)) {
          fallbackTexts.push(line);
          if (hasOffDay) offReasonCandidates.push(line);
        }
      });
    }
  });

  const uniqueParts = Array.from(new Set(collected.filter(Boolean)));
  const uniqueFallbackTexts = Array.from(new Set(fallbackTexts.filter(Boolean)));
  const uniqueOffReasons = Array.from(new Set(offReasonCandidates.filter(Boolean)));

  if (uniqueParts.length > 0) {
    return uniqueParts.join('/');
  }

  if (hasOffDay) {
    const reason = uniqueOffReasons.join('/');
    return reason ? `휴방/${reason}` : '휴방';
  }

  if (uniqueFallbackTexts.length > 0) {
    return uniqueFallbackTexts.join('/');
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

function emptyCurrentMonthPayload(currentMonth, fetchedUrl = '') {
  return {
    ok: false,
    source: 'google_sheet_gid',
    sourceUrl: SHEET_URL,
    monthLabel: currentMonth.monthLabel,
    items: buildEmptyMonthItems(currentMonth.year, currentMonth.month),
    fetchedUrl,
    fetchedAt: new Date().toISOString(),
    message: '띠꾸 일정 시트에서 현재 월 데이터를 찾지 못했습니다.',
  };
}

async function buildFreshScheduleResponse(currentMonth) {
  const { rows, fetchedUrl } = await fetchRowsByGid(SHEET_ID, SHEET_GID);
  const detected = detectMonthFromRows(rows, new Date());

  if (!sameScheduleMonth(detected, currentMonth)) {
    return emptyCurrentMonthPayload(currentMonth, fetchedUrl);
  }

  const items = parseDdikkuRows(rows, currentMonth.year, currentMonth.month);

  if (!items.some((item) => !item.empty && String(item.title || '').trim())) {
    return {
      ...emptyCurrentMonthPayload(currentMonth, fetchedUrl),
      items,
    };
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
  const cacheKey = makeMonthlyScheduleCacheKey('schedule:ddikku:v2', new Date());
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
      ok: false,
      sourceUrl: SHEET_URL,
      monthLabel: currentMonth.monthLabel,
      items: [],
      message: '띠꾸 일정 데이터를 불러오지 못했습니다.',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
    });
  }
}

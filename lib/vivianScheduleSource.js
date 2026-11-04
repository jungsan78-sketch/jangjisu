import { csvToRows, normalizeScheduleText } from './scheduleSheet';
import { PRISON_SCHEDULE_MONTH_GIDS } from '../data/prisonScheduleMonthGids';

export const VIVIAN_SHEET_ID = '1P9Ik6d-PFNDDkM8eiqneXagXTI13btjGqTfwM1GBT4Y';
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
// Verified November layout: month heading, weekday header, and five weeks.
// Excludes the settings above A4 and the free-form notes beginning at row 31.
const VERIFIED_CALENDARS = { '2026-11': { range: 'A4:N30', sheetName: 'Jan' } };

export function parseVivianScheduleRows(rows, year, month) {
  const headerIndex = rows.findIndex((row) => DAY_LABELS.every((label, index) => String(row[index * 2] || '').trim() === label));
  if (headerIndex < 0) throw new Error('비비안 달력의 요일 행을 찾지 못했습니다.');
  const heading = rows.slice(0, headerIndex).flat().map((cell) => String(cell).trim())
    .map((cell) => cell.match(/^(?:(20\d{2})년\s*)?(\d{1,2})월$/)).find(Boolean);
  if (!heading || Number(heading[2]) !== month || (heading[1] && Number(heading[1]) !== year)) {
    throw new Error('비비안 시트의 실제 월이 요청한 월과 다릅니다.');
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingDays = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const weekCount = Math.ceil((leadingDays + daysInMonth) / 7);
  const weekRows = [];
  let cursor = headerIndex + 1;
  for (let week = 0; week < weekCount; week += 1) {
    const expected = DAY_LABELS.map((_, column) => week * 7 + column - leadingDays + 1);
    const rowIndex = rows.findIndex((row, index) => index >= cursor && expected.every((day, column) => {
      const cell = String(row[column * 2] || '').trim();
      return day >= 1 && day <= daysInMonth ? cell === String(day) : cell === '';
    }) && DAY_LABELS.every((_, column) => !String(row[column * 2 + 1] || '').trim()));
    if (rowIndex < 0) throw new Error('비비안 달력의 날짜 배열이 불완전합니다.');
    weekRows.push({ rowIndex, expected });
    cursor = rowIndex + 1;
  }

  const titles = new Map();
  weekRows.forEach(({ rowIndex, expected }, week) => {
    const details = rows.slice(rowIndex + 1, weekRows[week + 1]?.rowIndex ?? rows.length);
    expected.forEach((day, column) => {
      if (day < 1 || day > daysInMonth) return;
      const texts = details.flatMap((row) => row.slice(column * 2, column * 2 + 2))
        .map(normalizeScheduleText).filter(Boolean);
      titles.set(day, [...new Set(texts)].join(' / '));
    });
  });
  return Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const title = titles.get(dayNumber) || '';
    return {
      year, month, dayNumber,
      day: DAY_LABELS[new Date(Date.UTC(year, month - 1, dayNumber)).getUTCDay()],
      date: `${month}월 ${dayNumber}일`, title, empty: !title,
    };
  });
}

export async function buildFreshVivianScheduleResponse(monthInfo) {
  const { year, month } = monthInfo;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const calendar = VERIFIED_CALENDARS[monthKey];
  const gid = PRISON_SCHEDULE_MONTH_GIDS.vivian?.[monthKey];
  // Never fall back to the default tab, or an empty English month-name template.
  if (!calendar || !gid) return { ok: false, member: '비비안', items: [], monthLabel: '' };
  const base = `https://docs.google.com/spreadsheets/d/${VIVIAN_SHEET_ID}`;
  const fetchedUrl = `${base}/export?format=csv&gid=${gid}&range=${encodeURIComponent(calendar.range)}`;
  const response = await fetch(fetchedUrl, {
    cache: 'no-store', signal: AbortSignal.timeout(10000),
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  if (!response.ok) throw new Error(`비비안 일정 조회 실패: ${response.status}`);
  const items = parseVivianScheduleRows(csvToRows(await response.text()), year, month);
  return {
    ok: true, member: '비비안', monthLabel: `${year}년 ${month}월`,
    sheetName: calendar.sheetName, sourceUrl: `${base}/edit?gid=${gid}#gid=${gid}`,
    fetchedUrl, items,
  };
}

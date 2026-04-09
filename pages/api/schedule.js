const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const SOURCE_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

function buildSheetCandidates() {
  const now = new Date();
  const points = [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    new Date(now.getFullYear(), now.getMonth() + 1, 1),
  ];
  const unique = new Set();

  points.forEach((date) => {
    const year2 = String(date.getFullYear()).slice(2);
    const year4 = String(date.getFullYear());
    const month = date.getMonth() + 1;
    [`${year2}년 ${month}월`, `${year4}년 ${month}월`, `${month}월`].forEach((name) => unique.add(name));
  });

  return Array.from(unique);
}

function parseGoogleVisualizationJSON(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/s);
  if (!match) throw new Error('구글 시트 응답 해석 실패');
  return JSON.parse(match[1]);
}

function getCellDisplay(cell) {
  if (!cell) return '';
  if (typeof cell.f === 'string' && cell.f.trim()) return cell.f.trim();
  if (cell.v === null || cell.v === undefined) return '';
  return String(cell.v).trim();
}

function extractGrid(table) {
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  return rows.map((row) => {
    const cells = Array.isArray(row?.c) ? row.c : [];
    return cells.map(getCellDisplay);
  });
}

function parseSheetName(sheetName, grid) {
  const directMatch = String(sheetName || '').match(/(?:(\d{2,4})년\s*)?(\d{1,2})월/);
  if (directMatch) {
    const rawYear = directMatch[1];
    return {
      year: rawYear ? (rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)) : new Date().getFullYear(),
      month: Number(directMatch[2]),
    };
  }

  for (const row of grid) {
    for (const cell of row) {
      const titleMatch = String(cell).match(/(\d{2,4})\s*년(?:도)?\s*(\d{1,2})\s*월/);
      if (titleMatch) {
        const rawYear = titleMatch[1];
        return {
          year: rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear),
          month: Number(titleMatch[2]),
        };
      }
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function findWeekdayRow(grid) {
  return grid.findIndex((row) => SOURCE_WEEKDAYS.every((day) => row.includes(day)));
}

function isWeekNumberRow(values) {
  return values.filter((value) => /^\d{1,2}$/.test(value)).length >= 4;
}

function extractDayEvents(grid, year, month) {
  const weekdayRowIndex = findWeekdayRow(grid);
  if (weekdayRowIndex === -1) return {};

  const weekdayRow = grid[weekdayRowIndex];
  const columnIndexes = SOURCE_WEEKDAYS.map((day) => weekdayRow.indexOf(day));
  if (columnIndexes.some((index) => index === -1)) return {};

  const dayEvents = {};
  const lastDay = new Date(year, month, 0).getDate();
  let expectedDay = 1;

  for (let rowIndex = weekdayRowIndex + 1; rowIndex < grid.length && expectedDay <= lastDay; rowIndex += 1) {
    const row = grid[rowIndex] || [];
    const values = columnIndexes.map((index) => String(row[index] || '').trim());
    if (!isWeekNumberRow(values)) continue;

    const noteLines = Array.from({ length: 7 }, () => []);
    let cursor = rowIndex + 1;

    while (cursor < grid.length) {
      const nextRow = grid[cursor] || [];
      const nextValues = columnIndexes.map((index) => String(nextRow[index] || '').trim());
      if (isWeekNumberRow(nextValues)) break;

      nextValues.forEach((value, column) => {
        if (!value || value === '\\') return;
        noteLines[column].push(value);
      });
      cursor += 1;
    }

    values.forEach((value, column) => {
      if (expectedDay > lastDay) return;
      const numberValue = Number(value);
      if (!Number.isInteger(numberValue)) return;
      if (numberValue === expectedDay) {
        dayEvents[expectedDay] = noteLines[column].join(' / ').trim();
        expectedDay += 1;
      }
    });

    rowIndex = cursor - 1;
  }

  return dayEvents;
}

function buildCalendarCells(year, month, dayEvents) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalSlots = firstDay + daysInMonth <= 35 ? 35 : 42;
  const today = new Date();

  return Array.from({ length: totalSlots }, (_, index) => {
    const dateNumber = index - firstDay + 1;
    const inCurrentMonth = dateNumber >= 1 && dateNumber <= daysInMonth;
    const eventText = inCurrentMonth ? String(dayEvents[dateNumber] || '').trim() : '';

    return {
      dayOfWeek: index % 7,
      date: inCurrentMonth ? dateNumber : null,
      inCurrentMonth,
      isToday:
        inCurrentMonth &&
        today.getFullYear() === year &&
        today.getMonth() + 1 === month &&
        today.getDate() === dateNumber,
      text: inCurrentMonth ? (eventText || '비어 있음') : '',
      hasEvent: Boolean(eventText),
    };
  });
}

async function fetchScheduleForSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  if (!response.ok) throw new Error('시트 로드 실패');

  const rawText = await response.text();
  const parsed = parseGoogleVisualizationJSON(rawText);
  const grid = extractGrid(parsed.table);
  const { year, month } = parseSheetName(sheetName, grid);
  const dayEvents = extractDayEvents(grid, year, month);

  return {
    ok: true,
    source: 'google_sheet_gviz',
    sourceUrl: SHEET_URL,
    sheetName,
    monthLabel: `${year}년 ${month}월`,
    monthStamp: `${year}.${String(month).padStart(2, '0')}`,
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    cells: buildCalendarCells(year, month, dayEvents),
    items: Object.entries(dayEvents).map(([day, title]) => ({ date: `${month}월 ${day}일`, title: title || '비어 있음' })),
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  const candidates = buildSheetCandidates();

  for (const sheetName of candidates) {
    try {
      const payload = await fetchScheduleForSheet(sheetName);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.status(200).json(payload);
    } catch (error) {}
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(200).json({
    ok: false,
    source: 'google_sheet_gviz',
    sourceUrl: SHEET_URL,
    monthLabel: '',
    monthStamp: '',
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    cells: [],
    items: [],
    fetchedAt: new Date().toISOString(),
  });
}

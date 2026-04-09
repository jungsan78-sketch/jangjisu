const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_GID = '315851366';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${SHEET_GID}#gid=${SHEET_GID}`;

function getKstNow() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function getSheetCandidates() {
  const now = getKstNow();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const previous = new Date(Date.UTC(year, month - 2, 1));

  return [
    `${String(year).slice(2)}년 ${month}월`,
    `${String(previous.getUTCFullYear()).slice(2)}년 ${previous.getUTCMonth() + 1}월`,
  ];
}

function buildGvizUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

async function fetchSheetTable(sheetName) {
  const response = await fetch(buildGvizUrl(sheetName), {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status}`);
  }

  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/s);
  if (!match) {
    throw new Error('Invalid GViz response');
  }

  const payload = JSON.parse(match[1]);
  return payload?.table || null;
}

function normalizeCell(cell) {
  if (!cell) return '';
  if (typeof cell.f === 'string' && cell.f.trim()) return cell.f.trim();
  if (cell.v === null || cell.v === undefined) return '';
  return String(cell.v).trim();
}

function tableToGrid(table) {
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  return rows.map((row) => {
    const cells = Array.isArray(row?.c) ? row.c : [];
    return cells.map((cell) => normalizeCell(cell));
  });
}

function findMonthMeta(grid, fallbackSheetName) {
  for (const row of grid) {
    const joined = row.join(' ').replace(/\s+/g, ' ').trim();
    const match = joined.match(/(20\d{2})\s*년도\s*(\d{1,2})\s*월/);
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]),
        monthLabel: `${match[1]}년 ${Number(match[2])}월`,
      };
    }
  }

  const fallbackMatch = String(fallbackSheetName).match(/(\d{2})년\s*(\d{1,2})월/);
  if (fallbackMatch) {
    const year = Number(`20${fallbackMatch[1]}`);
    const month = Number(fallbackMatch[2]);
    return { year, month, monthLabel: `${year}년 ${month}월` };
  }

  const now = getKstNow();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    monthLabel: `${now.getUTCFullYear()}년 ${now.getUTCMonth() + 1}월`,
  };
}

function isDateRow(row) {
  const numericCells = row
    .map((value) => String(value || '').trim())
    .filter((value) => /^\d{1,2}$/.test(value));

  return numericCells.length >= 5;
}

function collectColumnEvents(grid, startRowIndex, nextDateRowIndex, month) {
  const eventsByColumn = Array.from({ length: 7 }, () => []);

  for (let rowIndex = startRowIndex; rowIndex < nextDateRowIndex; rowIndex += 1) {
    const row = grid[rowIndex] || [];
    for (let columnIndex = 0; columnIndex < 7; columnIndex += 1) {
      const value = String(row[columnIndex] || '').replace(/\s+/g, ' ').trim();
      if (!value || value === '\\') continue;
      eventsByColumn[columnIndex].push(value);
    }
  }

  return eventsByColumn.map((parts) => parts.join(' / ').replace(/\s*\/\s*/g, ' / ').trim());
}

function parseItemsFromGrid(grid, meta) {
  const dateRowIndexes = [];
  for (let index = 0; index < grid.length; index += 1) {
    if (isDateRow(grid[index])) {
      dateRowIndexes.push(index);
    }
  }

  const weekdayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const items = [];

  for (let blockIndex = 0; blockIndex < dateRowIndexes.length; blockIndex += 1) {
    const dateRowIndex = dateRowIndexes[blockIndex];
    const nextDateRowIndex = dateRowIndexes[blockIndex + 1] ?? grid.length;
    const dateRow = grid[dateRowIndex] || [];
    const columnEvents = collectColumnEvents(grid, dateRowIndex + 1, nextDateRowIndex, meta.month);

    for (let columnIndex = 0; columnIndex < 7; columnIndex += 1) {
      const rawDate = String(dateRow[columnIndex] || '').trim();
      if (!/^\d{1,2}$/.test(rawDate)) continue;

      const day = Number(rawDate);
      const title = columnEvents[columnIndex] || '';

      if (!title) continue;

      const eventDate = new Date(meta.year, meta.month - 1, day);
      if (eventDate.getMonth() + 1 !== meta.month || eventDate.getDate() !== day) {
        continue;
      }

      items.push({
        year: meta.year,
        month: meta.month,
        dateNumber: day,
        date: `${meta.month}월 ${day}일`,
        day: weekdayNames[columnIndex],
        title,
      });
    }
  }

  return items.sort((a, b) => a.dateNumber - b.dateNumber);
}

async function loadSchedule() {
  const candidates = getSheetCandidates();
  let lastError = null;

  for (const sheetName of candidates) {
    try {
      const table = await fetchSheetTable(sheetName);
      const grid = tableToGrid(table);
      const meta = findMonthMeta(grid, sheetName);
      const items = parseItemsFromGrid(grid, meta);
      if (items.length > 0) {
        return {
          monthLabel: meta.monthLabel,
          year: meta.year,
          month: meta.month,
          items,
          sheetName,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  throw new Error('No schedule items found');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const schedule = await loadSchedule();

    return res.status(200).json({
      ok: true,
      source: 'google_sheet_gviz',
      sourceUrl: SHEET_URL,
      sheetName: schedule.sheetName,
      monthLabel: schedule.monthLabel,
      year: schedule.year,
      month: schedule.month,
      items: schedule.items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      source: 'google_sheet_gviz',
      sourceUrl: SHEET_URL,
      monthLabel: '',
      year: null,
      month: null,
      items: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchedAt: new Date().toISOString(),
    });
  }
}

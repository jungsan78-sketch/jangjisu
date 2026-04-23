const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function buildMonthCandidates(baseDate = new Date()) {
  const points = [
    new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
    new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1),
    new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1),
  ];

  return points.map((date) => ({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    shortYear: String(date.getFullYear()).slice(2),
    sheetName: `${String(date.getFullYear()).slice(2)}년 ${date.getMonth() + 1}월`,
    monthLabel: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
  }));
}

export function csvToRows(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some((cell) => String(cell).trim() !== '')) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => String(cell).trim() !== '')) {
      rows.push(row);
    }
  }

  return rows.map((cells) => cells.map((cell) => String(cell || '').replace(/\u00a0/g, ' ').trim()));
}

export function extractRowsFromGvizJson(text) {
  const match = text.match(/setResponse\((.*)\);?\s*$/s);
  if (!match) return [];

  const payload = JSON.parse(match[1]);
  const tableRows = payload?.table?.rows || [];

  return tableRows.map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return '';
      if (typeof cell.f === 'string' && cell.f.trim()) return cell.f.trim();
      if (cell.v == null) return '';
      return String(cell.v).trim();
    }),
  );
}

async function fetchRowsFromUrls(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        lastError = new Error(`${response.status} ${response.statusText}`);
        continue;
      }

      const text = await response.text();
      const rows = url.includes('out:json') ? extractRowsFromGvizJson(text) : csvToRows(text);
      if (rows.length > 0) {
        return { rows, fetchedUrl: url };
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('시트 데이터를 불러오지 못했습니다.');
}

export async function fetchRowsBySheetName(sheetId, sheetName) {
  const encodedSheet = encodeURIComponent(sheetName);
  return fetchRowsFromUrls([
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodedSheet}`,
  ]);
}

export async function fetchRowsByGid(sheetId, gid) {
  const encodedGid = encodeURIComponent(String(gid));
  return fetchRowsFromUrls([
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodedGid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${encodedGid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${encodedGid}`,
  ]);
}

export function normalizeScheduleText(value) {
  const normalized = String(value || '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*\\\s*/g, ' \\ ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!normalized) return '';

  const placeholderOnly = normalized
    .replace(/[\s/\\|ㆍ·•・‧⋅—–-]+/g, '')
    .trim();

  return placeholderOnly ? normalized : '';
}

export function isDateRow(row) {
  const numericCount = row.filter((cell) => /^\d{1,2}$/.test(String(cell).trim())).length;
  return numericCount >= 5;
}

export function parseScheduleRows(rows, targetYear, targetMonth) {
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const itemsMap = new Map();
  let lastIncludedDay = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!isDateRow(row)) continue;

    const activeDays = [];

    row.forEach((cell, columnIndex) => {
      const trimmed = String(cell || '').trim();
      if (!/^\d{1,2}$/.test(trimmed)) return;

      const day = Number(trimmed);
      if (day < 1 || day > daysInMonth) return;

      if (lastIncludedDay === 0) {
        if (day <= 7) {
          activeDays.push({ day, columnIndex });
          lastIncludedDay = day;
        }
        return;
      }

      if (day > lastIncludedDay) {
        activeDays.push({ day, columnIndex });
        lastIncludedDay = day;
      }
    });

    if (activeDays.length === 0) continue;

    let nextRowIndex = rowIndex + 1;
    const detailRows = [];
    while (nextRowIndex < rows.length && !isDateRow(rows[nextRowIndex])) {
      detailRows.push(rows[nextRowIndex]);
      nextRowIndex += 1;
    }

    activeDays.forEach(({ day, columnIndex }) => {
      const detailTexts = detailRows
        .map((detailRow) => normalizeScheduleText(detailRow[columnIndex] || ''))
        .filter(Boolean);

      const dateObject = new Date(targetYear, targetMonth - 1, day);
      itemsMap.set(day, {
        dayNumber: day,
        day: DAY_LABELS[dateObject.getDay()],
        date: `${targetMonth}월 ${day}일`,
        title: detailTexts.join(' / '),
        empty: detailTexts.length === 0,
      });
    });
  }

  return buildMonthItems(targetYear, targetMonth, itemsMap);
}

function buildMonthItems(targetYear, targetMonth, itemsMap) {
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const items = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const existing = itemsMap.get(day);
    if (existing) {
      items.push(existing);
      continue;
    }

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

function parseCellDate(value, fallbackYear) {
  const text = String(value || '').trim();
  if (!text) return null;

  const yearMonthDay = text.match(/(20\d{2})[.\-/ ]\s*(\d{1,2})[.\-/ ]\s*(\d{1,2})/);
  if (yearMonthDay) {
    return { year: Number(yearMonthDay[1]), month: Number(yearMonthDay[2]), day: Number(yearMonthDay[3]) };
  }

  const monthDay = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (monthDay) {
    return { year: fallbackYear, month: Number(monthDay[1]), day: Number(monthDay[2]) };
  }

  const slashMonthDay = text.match(/^(\d{1,2})\/(\d{1,2})(?:\b|\s)/);
  if (slashMonthDay) {
    return { year: fallbackYear, month: Number(slashMonthDay[1]), day: Number(slashMonthDay[2]) };
  }

  return null;
}

export function detectMonthFromRows(rows, fallbackDate = new Date()) {
  for (const row of rows) {
    for (const cell of row) {
      const full = String(cell || '').match(/(20\d{2})년\s*(\d{1,2})월/);
      if (full) {
        return { year: Number(full[1]), month: Number(full[2]), monthLabel: `${Number(full[1])}년 ${Number(full[2])}월` };
      }
    }
  }

  for (const row of rows) {
    for (const cell of row) {
      const cellDate = parseCellDate(cell, fallbackDate.getFullYear());
      if (cellDate) {
        return { year: cellDate.year, month: cellDate.month, monthLabel: `${cellDate.year}년 ${cellDate.month}월` };
      }
    }
  }

  return {
    year: fallbackDate.getFullYear(),
    month: fallbackDate.getMonth() + 1,
    monthLabel: `${fallbackDate.getFullYear()}년 ${fallbackDate.getMonth() + 1}월`,
  };
}

export function parseScheduleListRows(rows, targetYear, targetMonth) {
  const itemsMap = new Map();

  rows.forEach((row) => {
    let dateInfo = null;
    let dateIndex = -1;

    row.forEach((cell, index) => {
      if (dateInfo) return;
      const parsed = parseCellDate(cell, targetYear);
      if (parsed && parsed.month === targetMonth) {
        dateInfo = parsed;
        dateIndex = index;
      }
    });

    if (!dateInfo) return;

    const detailTexts = row
      .filter((cell, index) => index !== dateIndex)
      .map((cell) => normalizeScheduleText(cell))
      .filter(Boolean);

    if (!detailTexts.length) return;

    const dateObject = new Date(targetYear, targetMonth - 1, dateInfo.day);
    const existing = itemsMap.get(dateInfo.day);
    const nextTitle = existing?.title ? `${existing.title} / ${detailTexts.join(' / ')}` : detailTexts.join(' / ');

    itemsMap.set(dateInfo.day, {
      dayNumber: dateInfo.day,
      day: DAY_LABELS[dateObject.getDay()],
      date: `${targetMonth}월 ${dateInfo.day}일`,
      title: nextTitle,
      empty: false,
    });
  });

  return buildMonthItems(targetYear, targetMonth, itemsMap);
}

export function pickBestSchedule(itemsList = []) {
  return itemsList.reduce((best, current) => {
    const bestCount = (best || []).filter((item) => !item.empty && String(item.title || '').trim()).length;
    const currentCount = (current || []).filter((item) => !item.empty && String(item.title || '').trim()).length;
    return currentCount > bestCount ? current : best;
  }, []);
}

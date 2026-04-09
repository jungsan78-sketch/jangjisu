const SHEET_ID = '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const buildSheetCandidates = (baseDate = new Date()) => {
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
};

const csvToRows = (text) => {
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
};

const extractRowsFromGvizJson = (text) => {
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
};

const fetchSheetRows = async (sheetName) => {
  const encodedSheet = encodeURIComponent(sheetName);
  const urls = [
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodedSheet}`,
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
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
};

const isDateRow = (row) => {
  const numericCount = row.filter((cell) => /^\d{1,2}$/.test(String(cell).trim())).length;
  return numericCount >= 5;
};

const normalizeScheduleText = (value) =>
  String(value || '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const parseScheduleRows = (rows, targetYear, targetMonth) => {
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
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const candidates = buildSheetCandidates();

  for (const candidate of candidates) {
    try {
      const { rows, fetchedUrl } = await fetchSheetRows(candidate.sheetName);
      const items = parseScheduleRows(rows, candidate.year, candidate.month);

      if (items.some((item) => !item.empty)) {
        return res.status(200).json({
          ok: true,
          source: 'google_sheet_csv',
          sourceUrl: `${SHEET_URL}?sheet=${encodeURIComponent(candidate.sheetName)}`,
          monthLabel: candidate.monthLabel,
          sheetName: candidate.sheetName,
          fetchedUrl,
          items,
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      // 다음 후보 시트로 계속 시도
    }
  }

  return res.status(200).json({
    ok: false,
    sourceUrl: SHEET_URL,
    monthLabel: '',
    items: [],
    message: '일정 데이터를 불러오지 못했습니다.',
    fetchedAt: new Date().toISOString(),
  });
}

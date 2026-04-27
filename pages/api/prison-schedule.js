const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const SOURCES = [
  {
    key: '장지수',
    sheetId: '1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM',
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM/edit',
    mode: 'sheetNameCandidates',
  },
  {
    key: '유오늘',
    sheetId: '1OLJnia52yhNXvbTlt273EqO3kIggUy1e-uZso60eHwo',
    gid: '399310385',
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1OLJnia52yhNXvbTlt273EqO3kIggUy1e-uZso60eHwo/edit?gid=399310385#gid=399310385',
    mode: 'fixedGid',
  },
  {
    key: '구월이',
    sheetId: '1J0H1eHRB05ojAW3kqHrQBoMU68DjJV4SgRViwszyZBs',
    gid: '1645820954',
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1J0H1eHRB05ojAW3kqHrQBoMU68DjJV4SgRViwszyZBs/edit?gid=1645820954#gid=1645820954',
    mode: 'fixedGid',
  },
];

const buildSheetCandidates = (baseDate = new Date()) => {
  const date = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

  return [
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      sheetName: `${String(date.getFullYear()).slice(2)}년 ${date.getMonth() + 1}월`,
      monthLabel: `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
    },
  ];
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
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
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

const fetchRowsFromUrls = async (urls) => {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache', pragma: 'no-cache' } });
      if (!response.ok) {
        lastError = new Error(`${response.status} ${response.statusText}`);
        continue;
      }
      const text = await response.text();
      const rows = url.includes('out:json') ? extractRowsFromGvizJson(text) : csvToRows(text);
      if (rows.length > 0) return { rows, fetchedUrl: url };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('시트 데이터를 불러오지 못했습니다.');
};

const isDateRow = (row) => row.filter((cell) => /^\d{1,2}$/.test(String(cell).trim())).length >= 5;

const normalizeScheduleText = (value) => {
  const normalized = String(value || '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*\\\s*/g, ' \\ ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!normalized) return '';
  const placeholderOnly = normalized.replace(/[\s/\\|ㆍ·•・‧⋅—–-]+/g, '').trim();
  return placeholderOnly ? normalized : '';
};

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

    if (!activeDays.length) continue;

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

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const existing = itemsMap.get(day);
    if (existing) return existing;
    const dateObject = new Date(targetYear, targetMonth - 1, day);
    return {
      dayNumber: day,
      day: DAY_LABELS[dateObject.getDay()],
      date: `${targetMonth}월 ${day}일`,
      title: '',
      empty: true,
    };
  });
};

const fetchCandidateSchedule = async (source, candidate) => {
  const encodedSheet = encodeURIComponent(candidate.sheetName);
  const urls = [
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/export?format=csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:json&sheet=${encodedSheet}`,
  ];
  const { rows, fetchedUrl } = await fetchRowsFromUrls(urls);
  const items = parseScheduleRows(rows, candidate.year, candidate.month);
  return { monthLabel: candidate.monthLabel, sheetName: candidate.sheetName, items, fetchedUrl };
};

const fetchFixedGidSchedule = async (source, baseDate = new Date()) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth() + 1;
  const urls = [
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/export?format=csv&gid=${source.gid}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:csv&gid=${source.gid}`,
    `https://docs.google.com/spreadsheets/d/${source.sheetId}/gviz/tq?tqx=out:json&gid=${source.gid}`,
  ];
  const { rows, fetchedUrl } = await fetchRowsFromUrls(urls);
  const items = parseScheduleRows(rows, year, month);
  return { monthLabel: `${year}년 ${month}월`, sheetName: '', items, fetchedUrl };
};

const fetchSourceSchedule = async (source) => {
  if (source.mode === 'fixedGid') {
    const result = await fetchFixedGidSchedule(source);
    return { ok: result.items.some((item) => !item.empty), member: source.key, ...result };
  }

  const candidates = buildSheetCandidates();
  for (const candidate of candidates) {
    try {
      const result = await fetchCandidateSchedule(source, candidate);
      return { ok: result.items.some((item) => !item.empty), member: source.key, ...result };
    } catch {
      // 현재 월 후보 시트만 시도합니다. 다음 달 시트가 미리 생겨도 현재 월을 유지합니다.
    }
  }

  return { ok: false, member: source.key, monthLabel: '', sheetName: '', items: [], fetchedUrl: '' };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  const results = await Promise.allSettled(SOURCES.map(fetchSourceSchedule));
  const schedules = results
    .filter((result) => result.status === 'fulfilled' && result.value.ok)
    .map((result) => result.value);

  const monthLabel = schedules[0]?.monthLabel || `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`;
  const items = schedules.flatMap((schedule) =>
    (schedule.items || [])
      .filter((item) => !item.empty && String(item.title || '').trim())
      .map((item) => ({ ...item, member: schedule.member })),
  );

  return res.status(200).json({
    ok: schedules.length > 0,
    monthLabel,
    members: schedules.map((schedule) => schedule.member),
    schedules,
    items,
    sourceStatus: results.map((result, index) => ({
      member: SOURCES[index].key,
      ok: result.status === 'fulfilled' ? result.value.ok : false,
    })),
    fetchedAt: new Date().toISOString(),
  });
}

import { fetchRowsBySheetName } from './scheduleSheet';

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${String(value || '').replace(/"/g, '\\"')}"`);
  } catch {
    return String(value || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
}

export function buildMonthlySheetNames(monthInfo, pattern) {
  if (pattern === 'short-year-month') return [`${monthInfo.shortYear}년 ${monthInfo.month}월`];
  if (pattern === 'month-schedule') return [`${monthInfo.month}월 일정표`];
  return [`${monthInfo.month}월`];
}

export async function resolveSheetGid(sheetId, sheetNames) {
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, {
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      cache: 'no-store',
    });
    if (!response.ok) return '';
    const html = await response.text();
    const wanted = new Set(sheetNames.map((name) => String(name).trim()));
    const patterns = [
      /"sheetId"\s*:\s*(\d+)[\s\S]{0,500}?"title"\s*:\s*"((?:\\.|[^"\\])*)"/g,
      /"title"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]{0,500}?"sheetId"\s*:\s*(\d+)/g,
      /\[(\d+),"((?:\\.|[^"\\])*)",\d+,\d+/g,
    ];

    for (let patternIndex = 0; patternIndex < patterns.length; patternIndex += 1) {
      const pattern = patterns[patternIndex];
      let match;
      while ((match = pattern.exec(html))) {
        const firstIsGid = patternIndex !== 1;
        const gid = firstIsGid ? match[1] : match[2];
        const rawTitle = firstIsGid ? match[2] : match[1];
        const title = decodeJsonString(rawTitle).trim();
        if (wanted.has(title)) return String(gid);
      }
    }
  } catch {}
  return '';
}

export async function fetchMonthlySheet(sheetId, monthInfo, pattern) {
  const candidates = buildMonthlySheetNames(monthInfo, pattern);
  let lastError = null;

  for (const sheetName of candidates) {
    try {
      const result = await fetchRowsBySheetName(sheetId, sheetName);
      const gid = await resolveSheetGid(sheetId, [sheetName]);
      return {
        ...result,
        sheetName,
        gid,
        sourceUrl: gid
          ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid}#gid=${gid}`
          : `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('현재 월 시트 탭을 찾지 못했습니다.');
}

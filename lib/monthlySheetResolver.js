import { fetchRowsByGid, fetchRowsBySheetName } from './scheduleSheet';

const EXACT_MONTHLY_GIDS = {
  '1qu7DXG99c9WbR5g-t1HL2BU_bFlqhxwN45tscolZ_U0:2026-07': '1838232194',
  '165CKJlUjtZW9NYzHRPZuHDxNKLETpgYt48cxrMKuUGc:2026-07': '1878327757',
};

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
    const objectPatterns = [
      /\{[^{}]{0,800}?"sheetId"\s*:\s*(\d+)[^{}]{0,800}?"title"\s*:\s*"((?:\\.|[^"\\])*)"[^{}]{0,800}?\}/g,
      /\{[^{}]{0,800}?"title"\s*:\s*"((?:\\.|[^"\\])*)"[^{}]{0,800}?"sheetId"\s*:\s*(\d+)[^{}]{0,800}?\}/g,
    ];

    for (let patternIndex = 0; patternIndex < objectPatterns.length; patternIndex += 1) {
      const pattern = objectPatterns[patternIndex];
      let match;
      while ((match = pattern.exec(html))) {
        const gid = patternIndex === 0 ? match[1] : match[2];
        const rawTitle = patternIndex === 0 ? match[2] : match[1];
        const title = decodeJsonString(rawTitle).trim();
        if (wanted.has(title)) return String(gid);
      }
    }
  } catch {}

  return '';
}

export async function fetchMonthlySheet(sheetId, monthInfo, pattern) {
  const monthKey = `${monthInfo.year}-${String(monthInfo.month).padStart(2, '0')}`;
  const exactGid = EXACT_MONTHLY_GIDS[`${sheetId}:${monthKey}`] || '';
  const candidates = buildMonthlySheetNames(monthInfo, pattern);

  if (exactGid) {
    const result = await fetchRowsByGid(sheetId, exactGid);
    return {
      ...result,
      sheetName: candidates[0] || '',
      gid: exactGid,
      sourceUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${exactGid}#gid=${exactGid}`,
    };
  }

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

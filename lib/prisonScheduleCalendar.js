const PART_PREFIX = /^\s*(?:제?\s*)?\d+\s*부\s*[:：.\-]?\s*/i;

export function getCurrentKstMonth() {
  const shifted = new Date(Date.now() + (9 * 60 * 60 * 1000));
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  return { year, month, monthLabel: `${year}년 ${month}월` };
}

export function parseMonthLabel(value = '') {
  const match = String(value).match(/(\d{4})년\s*(\d{1,2})월/);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}

export function isSameMonth(a, b) {
  return Boolean(a && b && Number(a.year) === Number(b.year) && Number(a.month) === Number(b.month));
}

function normalizeTime(hourValue, minuteValue = '00', meridiem = '') {
  let hour = Number(hourValue);
  const minute = Number(minuteValue || 0);
  if (!Number.isFinite(hour) || hour < 0 || hour > 24 || !Number.isFinite(minute) || minute < 0 || minute > 59) return '';
  if (meridiem === '오후' && hour < 12) hour += 12;
  if (meridiem === '오전' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function extractTime(value = '') {
  const text = String(value).trim();
  const colon = text.match(/^\(?(오전|오후)?\s*(\d{1,2}):(\d{2})\)?\s*/);
  if (colon) return { time: normalizeTime(colon[2], colon[3], colon[1] || ''), rest: text.slice(colon[0].length).trim() };
  const korean = text.match(/^\(?(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?\)?\s*/);
  if (korean) return { time: normalizeTime(korean[2], korean[3] || '00', korean[1] || ''), rest: text.slice(korean[0].length).trim() };
  return { time: '', rest: text };
}

function splitOutsideParentheses(value = '') {
  const pieces = [];
  let depth = 0;
  let current = '';

  for (const character of String(value)) {
    if (character === '(' || character === '[') depth += 1;
    if ((character === ')' || character === ']') && depth > 0) depth -= 1;
    if (character === '/' && depth === 0) {
      pieces.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  pieces.push(current);
  return pieces;
}

export function splitScheduleTitle(value = '') {
  const pieces = String(value)
    .replace(/\r/g, '\n')
    .replace(/\s+(?=(?:제?\s*)?\d+\s*부\s*[:：.\-]?)/gi, '\n')
    .split(/\n+/)
    .flatMap(splitOutsideParentheses)
    .map((piece) => piece.replace(PART_PREFIX, '').replace(/^[\s·•ㆍ|]+/, '').trim())
    .filter(Boolean);

  const seen = new Set();
  return pieces.reduce((segments, piece) => {
    const { time, rest } = extractTime(piece);
    const title = rest.replace(/^[:：\-]\s*/, '').trim();
    if (!title) return segments;
    const key = `${time}|${title}`;
    if (seen.has(key)) return segments;
    seen.add(key);
    segments.push({ time, title });
    return segments;
  }, []);
}

export function buildMonthCells(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const leading = new Date(year, month - 1, 1).getDay();
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const day = index - leading + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
}


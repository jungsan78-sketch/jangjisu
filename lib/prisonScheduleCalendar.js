const PART_PREFIX = /^\s*(?:제?\s*)?\d+\s*부\s*[:：.\-]?\s*/i;

export function getCurrentKstMonth() {
  const shifted = new Date(Date.now() + (9 * 60 * 60 * 1000));
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  return { year, month, monthLabel: `${year}년 ${month}월` };
}

export function getRecentKstMonths(count = 3) {
  const current = getCurrentKstMonth();
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const date = new Date(Date.UTC(current.year, current.month - 1 - index, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    return { year, month, monthLabel: `${year}년 ${month}월`, monthKey: `${year}-${String(month).padStart(2, '0')}` };
  }).reverse();
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
  const korean = text.match(/^\(?(오전|오후)?\s*(\d{1,2})\s*시(?!간)(?:\s*(\d{1,2})\s*분)?\)?\s*/);
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

function splitJangjisuSchedule(value = '') {
  const normalized = String(value).replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const hasPartLabels = /(?:^|[\s/|·•ㆍ\-–—])(?:제?\s*)?\d+\s*부(?:\s*[:：.\-])?/i.test(normalized);
  if (hasPartLabels) {
    return normalized
      .replace(/(?:\s+|\/+\s*)(?=(?:제?\s*)?\d+\s*부\s*[:：.\-]?)/gi, '\n')
      .split(/\n+/)
      .map((piece) => piece.replace(PART_PREFIX, '').replace(/^[\s/·•ㆍ|:\-–—]+|[\s/·•ㆍ|:\-–—]+$/g, '').trim())
      .filter(Boolean);
  }

  const pieces = [];
  let remaining = normalized;
  while (remaining) {
    const boundary = remaining.match(/^([\s\S]*?\))\s*(?:[\/|·•ㆍ\-–—]+\s*)([\s\S]+)$/);
    if (!boundary) {
      pieces.push(remaining);
      break;
    }
    pieces.push(boundary[1].trim());
    remaining = boundary[2].trim();
  }
  return pieces.filter(Boolean);
}

export function splitScheduleTitle(value = '', options = {}) {
  const rawPieces = (options.jangjisu
    ? splitJangjisuSchedule(value)
    : String(value)
      .replace(/\r/g, '\n')
      .replace(/\s+(?=(?:제?\s*)?\d+\s*부\s*[:：.\-]?)/gi, '\n')
      .split(/\n+/)
      .flatMap(splitOutsideParentheses))
    .map((piece) => piece.replace(PART_PREFIX, '').replace(/^[\s·•ㆍ|]+/, '').trim())
    .filter(Boolean);

  const pieces = rawPieces.reduce((merged, piece) => {
    const collaborationNote = piece.match(/^(\(\s*w(?:ith)?\s*[\/.]?\s*[^()]+\))\s*([\s\S]*)$/i);
    if (collaborationNote && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${collaborationNote[1]}`.trim();
      const followingSchedule = collaborationNote[2]
        .replace(/^[\s:：\-–—·•ㆍ|]+|[\s:：\-–—·•ㆍ|]+$/g, '')
        .trim();
      if (followingSchedule) merged.push(followingSchedule);
      return merged;
    }

    const isParentheticalNote = /^(?:\([^()]*\)|\[[^\[\]]*\])$/.test(piece);
    if (isParentheticalNote && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${piece}`.trim();
      return merged;
    }
    merged.push(piece);
    return merged;
  }, []);

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

function getKstParts(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(baseDate).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function getKstNow(baseDate = new Date()) {
  const parts = getKstParts(baseDate);
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

export function getKstMonthInfo(baseDate = new Date()) {
  const { year, month } = getKstParts(baseDate);
  return {
    year,
    month,
    monthKey: `${year}-${String(month).padStart(2, '0')}`,
    shortYear: String(year).slice(2),
    sheetName: `${String(year).slice(2)}년 ${month}월`,
    monthLabel: `${year}년 ${month}월`,
  };
}

export function makeMonthlyScheduleCacheKey(prefix, baseDate = new Date()) {
  const current = getKstMonthInfo(baseDate);
  return `${prefix}:${current.monthKey}:v1`;
}

export function sameScheduleMonth(a, b) {
  return Boolean(a && b && Number(a.year) === Number(b.year) && Number(a.month) === Number(b.month));
}

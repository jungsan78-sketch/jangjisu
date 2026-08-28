function getKstParts(baseDate = new Date()) {
  const shifted = new Date(baseDate.getTime() + (9 * 60 * 60 * 1000));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
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

export function buildScheduleMonthInfo(year, month) {
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);
  if (!Number.isInteger(normalizedYear) || !Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) return null;
  return {
    year: normalizedYear,
    month: normalizedMonth,
    monthKey: `${normalizedYear}-${String(normalizedMonth).padStart(2, '0')}`,
    shortYear: String(normalizedYear).slice(2),
    sheetName: `${String(normalizedYear).slice(2)}년 ${normalizedMonth}월`,
    monthLabel: `${normalizedYear}년 ${normalizedMonth}월`,
  };
}

export function getAllowedScheduleMonth(query = {}, maxPreviousMonths = 2) {
  const current = getKstMonthInfo();
  if (query.year == null && query.month == null) return current;

  const requested = buildScheduleMonthInfo(query.year, query.month);
  if (!requested) return null;

  const currentIndex = current.year * 12 + current.month - 1;
  const requestedIndex = requested.year * 12 + requested.month - 1;
  const monthDistance = currentIndex - requestedIndex;
  return monthDistance >= 0 && monthDistance <= maxPreviousMonths ? requested : null;
}

export function makeMonthlyScheduleCacheKey(prefix, baseDate = new Date()) {
  const current = getKstMonthInfo(baseDate);
  return `${prefix}:${current.monthKey}:v1`;
}

export function sameScheduleMonth(a, b) {
  return Boolean(a && b && Number(a.year) === Number(b.year) && Number(a.month) === Number(b.month));
}

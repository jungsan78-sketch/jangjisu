export function getKstNow(baseDate = new Date()) {
  return new Date(baseDate.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

export function getKstMonthInfo(baseDate = new Date()) {
  const kst = getKstNow(baseDate);
  const year = kst.getFullYear();
  const month = kst.getMonth() + 1;
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

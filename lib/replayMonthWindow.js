const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function createReplayMonthInfo(year, month) {
  const normalized = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const normalizedYear = normalized.getUTCFullYear();
  const normalizedMonth = normalized.getUTCMonth() + 1;
  return {
    year: normalizedYear,
    month: normalizedMonth,
    monthKey: `${normalizedYear}-${pad(normalizedMonth)}`,
    monthLabel: `${normalizedYear}년 ${normalizedMonth}월`,
  };
}

export function getReplayMonthWindow(baseDate = new Date()) {
  const shifted = new Date(baseDate.getTime() + KST_OFFSET_MS);
  const current = createReplayMonthInfo(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1);
  const previous = createReplayMonthInfo(current.year, current.month - 1);
  return [
    { ...current, kind: 'current', buttonLabel: `이번 달 (${current.month}월)` },
    { ...previous, kind: 'previous', buttonLabel: `저번 달 (${previous.month}월)` },
  ];
}

export function resolveReplayMonth(requestedMonthKey, baseDate = new Date()) {
  const window = getReplayMonthWindow(baseDate);
  const requested = String(requestedMonthKey || '').trim();
  if (!requested) return window[0];
  if (!/^\d{4}-\d{2}$/.test(requested)) return null;
  return window.find((month) => month.monthKey === requested) || null;
}

export function getReplayMonthStorageTtl(monthInfo, baseDate = new Date()) {
  const expirationUtc = Date.UTC(monthInfo.year, monthInfo.month + 1, 1) - KST_OFFSET_MS;
  return Math.max(60 * 60, Math.ceil((expirationUtc - baseDate.getTime()) / 1000));
}

export function isReplayMonthCacheFresh(record, monthInfo, baseDate = new Date()) {
  const cachedAt = Number(record?.cachedAt || 0);
  if (!record?.payload || !cachedAt) return false;
  if (monthInfo.kind === 'current') return baseDate.getTime() - cachedAt < 60 * 60 * 1000;

  const shifted = new Date(baseDate.getTime() + KST_OFFSET_MS);
  if (shifted.getUTCDate() <= 2) return baseDate.getTime() - cachedAt < 60 * 60 * 1000;
  return true;
}

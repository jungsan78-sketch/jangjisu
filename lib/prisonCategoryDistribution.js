const TRACKIFY_API_BASE = 'https://www.trackify.kr/api/v1/p/soop';

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthEndExclusive(monthInfo) {
  const next = new Date(Date.UTC(monthInfo.year, monthInfo.month, 1));
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, 1);
}

export function getCategoryDistributionRange(monthInfo, now = new Date()) {
  const from = formatDate(monthInfo.year, monthInfo.month, 1);
  if (monthInfo.kind !== 'current') return { from, to: monthEndExclusive(monthInfo) };

  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1));
  return {
    from,
    to: formatDate(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate()),
  };
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeCategoryItem(item) {
  const category = String(item?.category || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const totalSec = safeNumber(item?.totalSec);
  if (!category || !totalSec) return null;
  return {
    cateNo: String(item?.cateNo || '').slice(0, 32),
    category,
    totalSec,
    broadcastCount: Math.floor(safeNumber(item?.broadcastCount)),
    share: Math.min(1, safeNumber(item?.share)),
  };
}

export async function fetchTrackifyCategoryDistribution({ memberId, monthInfo }) {
  const range = getCategoryDistributionRange(monthInfo);
  const url = new URL(`${TRACKIFY_API_BASE}/streamer/${encodeURIComponent(memberId)}/category-distribution`);
  url.searchParams.set('from', range.from);
  url.searchParams.set('to', range.to);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Jangjisu-Fan-Site/1.0',
    },
  });
  if (!response.ok) throw new Error(`Trackify category distribution failed: ${response.status}`);

  const data = await response.json();
  const items = Array.isArray(data?.items)
    ? data.items.map(normalizeCategoryItem).filter(Boolean).sort((a, b) => b.totalSec - a.totalSec)
    : [];
  return {
    memberId,
    monthKey: monthInfo.monthKey,
    monthLabel: monthInfo.monthLabel,
    totalSec: safeNumber(data?.totalSec),
    items,
    adultSec: safeNumber(data?.adultSec),
    adultShare: Math.min(1, safeNumber(data?.adultShare)),
    passwordSec: safeNumber(data?.passwordSec),
    passwordShare: Math.min(1, safeNumber(data?.passwordShare)),
    range,
    source: 'trackify',
  };
}


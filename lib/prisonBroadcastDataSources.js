const REQUEST_HEADERS = {
  accept: 'application/json, text/html, text/plain, */*',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
};
const SOURCE_TIMEOUT_MS = 5500;
const VIEWER_REVIEW_THRESHOLD = 1000;

function numberValue(value) {
  const number = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: REQUEST_HEADERS, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

export async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await mapper(items[index], index);
      } catch {
        results[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function fetchPoongTodayDay({ year, month, day, memberIds }) {
  const url = `https://static.poong.today/chart/get?ctype=day&ks=false&year=${year}&month=${month}&day=${day}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`poong.today ${response.status}`);
  const json = await response.json();
  const rows = Array.isArray(json) ? json : Array.isArray(json?.b) ? json.b : [];
  const allowed = new Set(memberIds);
  const values = {};
  rows.forEach((row) => {
    const id = String(row?.i || '').trim();
    if (!allowed.has(id)) return;
    values[id] = {
      donations: numberValue(row?.b),
      peakViewers: numberValue(row?.v),
      donationEvents: numberValue(row?.c),
    };
  });
  return { url, values };
}

function metricFromText(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}[^0-9]{0,100}([0-9][0-9,]*)`));
  return numberValue(match?.[1]);
}

function htmlToText(html) {
  const main = String(html || '').match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/i)?.[1] || html;
  return String(main || '')
    .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchPoonggoDay({ memberId, dateKey }) {
  const url = `https://poonggo.com/station/${encodeURIComponent(memberId)}?c=daily&date=${dateKey}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`poonggo ${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  const donations = metricFromText(text, '별풍선 합계');
  const peakViewers = metricFromText(text, '최고 시청자');
  const cumulativeViewers = metricFromText(text, '누적 시청자');
  if (!donations && !peakViewers && !text.includes('별풍선 합계')) throw new Error('poonggo metrics missing');
  return { url, donations, peakViewers, cumulativeViewers };
}

export async function fetchPoonggoMonth({ memberId, monthKey }) {
  const url = `https://poonggo.com/station/${encodeURIComponent(memberId)}?c=monthly&date=${monthKey}-01`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`poonggo month ${response.status}`);
  const text = htmlToText(await response.text());
  const cumulativeViewers = metricFromText(text, '누적 시청자');
  if (!text.includes('누적 시청자')) throw new Error('monthly viewer metrics missing');
  return { url, cumulativeViewers };
}

export function reconcileBroadcastDay(day) {
  const poongToday = day?.sources?.poongToday || null;
  const poonggo = day?.sources?.poonggo || null;
  const donations = Math.max(numberValue(poongToday?.donations), numberValue(poonggo?.donations));
  const peakViewers = Math.max(numberValue(poongToday?.peakViewers), numberValue(poonggo?.peakViewers));
  const cumulativeViewers = numberValue(poonggo?.cumulativeViewers);
  const viewerDifference = poongToday && poonggo
    ? Math.abs(numberValue(poongToday.peakViewers) - numberValue(poonggo.peakViewers))
    : 0;
  return {
    ...day,
    donations,
    peakViewers,
    cumulativeViewers,
    donationEvents: numberValue(poongToday?.donationEvents),
    verified: Boolean(poongToday && poonggo),
    needsReview: Boolean(poongToday && poonggo && viewerDifference >= VIEWER_REVIEW_THRESHOLD),
    viewerDifference,
  };
}

export function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

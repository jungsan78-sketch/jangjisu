const REQUEST_HEADERS = {
  accept: 'application/json, text/html, text/plain, */*',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
};
const SOURCE_TIMEOUT_MS = 5500;

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

function metricFromText(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}[^0-9]{0,100}([0-9][0-9,]*)`));
  return numberValue(match?.[1]);
}

function broadcastMinutesFromText(text) {
  const match = text.match(/방송시간[^0-9]{0,100}([0-9]+)시간\s*([0-9]+)분/);
  if (!match) return 0;
  return numberValue(match[1]) * 60 + numberValue(match[2]);
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
  const url = `https://poonggo.com/station/${encodeURIComponent(memberId)}/daily?date=${dateKey}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`poonggo ${response.status}`);
  if (!new URL(response.url || url).pathname.endsWith('/daily')) throw new Error('poonggo daily redirect mismatch');
  const html = await response.text();
  const text = htmlToText(html);
  const donations = metricFromText(text, '별풍선 합계');
  const peakViewers = metricFromText(text, '최고 시청자');
  const cumulativeViewers = metricFromText(text, '누적 시청자');
  const broadcastMinutes = broadcastMinutesFromText(text);
  if (!donations && !peakViewers && !text.includes('별풍선 합계')) throw new Error('poonggo metrics missing');
  return { url, donations, peakViewers, cumulativeViewers, broadcastMinutes };
}

export async function fetchPoonggoMonth({ memberId, monthKey }) {
  const url = `https://poonggo.com/station/${encodeURIComponent(memberId)}/monthly?date=${monthKey}-01`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`poonggo month ${response.status}`);
  if (!new URL(response.url || url).pathname.endsWith('/monthly')) throw new Error('poonggo monthly redirect mismatch');
  const text = htmlToText(await response.text());
  const donations = metricFromText(text, '별풍선 합계');
  const peakViewers = metricFromText(text, '최고 시청자');
  const cumulativeViewers = metricFromText(text, '누적 시청자');
  const broadcastMinutes = broadcastMinutesFromText(text);
  if (!text.includes('별풍선 합계') || !text.includes('누적 시청자')) throw new Error('monthly metrics missing');
  return { url, donations, peakViewers, cumulativeViewers, broadcastMinutes };
}

export function reconcileBroadcastDay(day) {
  const poonggo = day?.sources?.poonggo || null;
  return {
    ...day,
    donations: numberValue(poonggo?.donations),
    peakViewers: numberValue(poonggo?.peakViewers),
    cumulativeViewers: numberValue(poonggo?.cumulativeViewers),
    broadcastMinutes: numberValue(poonggo?.broadcastMinutes),
    donationEvents: 0,
    verified: Boolean(poonggo),
  };
}

export function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}


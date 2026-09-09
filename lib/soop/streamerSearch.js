const SEARCH_ENDPOINT = 'https://sch.sooplive.com/api.php';
const CHANNEL_ENDPOINT = 'https://api-channel.sooplive.co.kr/v1.1/channel';
const REQUEST_HEADERS = {
  accept: 'application/json',
  origin: 'https://www.sooplive.com',
  referer: 'https://www.sooplive.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

async function fetchJson(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS });
  if (!response.ok) throw new Error(`SOOP request failed: ${response.status}`);
  return response.json();
}

export function normalizeStreamerQuery(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 30);
}

export async function fetchStreamerSuggestions(query, limit = 5) {
  const normalized = normalizeStreamerQuery(query);
  if (!normalized) return [];
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('m', 'searchHistory');
  url.searchParams.set('service', 'list');
  url.searchParams.set('d', normalized);
  const payload = await fetchJson(url.toString());
  return (Array.isArray(payload?.suggest_bj) ? payload.suggest_bj : [])
    .slice(0, Math.max(1, Math.min(Number(limit) || 5, 5)))
    .map((item) => ({
      stationId: String(item?.user_id || '').trim(),
      nickname: String(item?.user_nick || '').trim(),
      profileImage: String(item?.station_logo || '').trim(),
      medal: Boolean(item?.medal),
      broadNo: String(item?.broad_no || '').trim(),
      viewerCount: Number(item?.broad_view_count || 0) || 0,
    }))
    .filter((item) => item.stationId && item.nickname);
}

export async function fetchStreamerFavoriteCount(stationId) {
  const safeId = String(stationId || '').trim();
  if (!/^[a-zA-Z0-9_-]{2,40}$/.test(safeId)) return null;
  const payload = await fetchJson(`${CHANNEL_ENDPOINT}/${encodeURIComponent(safeId)}/station`);
  const count = Number(payload?.upd?.fanCnt);
  return Number.isFinite(count) && count >= 0 ? count : null;
}


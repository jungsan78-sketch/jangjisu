import { readSnapshotCache, writeSnapshotCache } from '../../lib/cloudflareSnapshotCache';
import { fetchStreamerFavoriteCount, fetchStreamerSuggestions, normalizeStreamerQuery } from '../../lib/soop/streamerSearch';

const CACHE_VERSION = 'v1';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_FRESH_MS = CACHE_TTL_SECONDS * 1000;
const pendingSearches = new Map();
const pendingStations = new Map();

const isFresh = (record) => Boolean(record?.payload && Number(record.cachedAt) && Date.now() - Number(record.cachedAt) < CACHE_FRESH_MS);
const queryKey = (query) => `prison:soop-streamer-search:${CACHE_VERSION}:${encodeURIComponent(query.toLowerCase())}`;
const stationKey = (stationId) => `prison:soop-streamer-station:${CACHE_VERSION}:${stationId.toLowerCase()}`;

async function favoriteCountFor(stationId) {
  const key = stationKey(stationId);
  const cache = await readSnapshotCache(key);
  if (isFresh(cache.record)) return cache.record.payload.favoriteCount;
  if (pendingStations.has(key)) return pendingStations.get(key);
  const promise = (async () => {
    try {
      const favoriteCount = await fetchStreamerFavoriteCount(stationId);
      await writeSnapshotCache(cache, key, { payload: { favoriteCount }, cachedAt: Date.now() }, CACHE_TTL_SECONDS);
      return favoriteCount;
    } catch {
      return cache.record?.payload?.favoriteCount ?? null;
    }
  })();
  pendingStations.set(key, promise);
  try { return await promise; } finally { if (pendingStations.get(key) === promise) pendingStations.delete(key); }
}

async function refreshSearch(cache, key, query) {
  if (pendingSearches.has(key)) return pendingSearches.get(key);
  const promise = (async () => {
    const suggestions = await fetchStreamerSuggestions(query, 5);
    const results = await Promise.all(suggestions.map(async (item) => ({ ...item, favoriteCount: await favoriteCountFor(item.stationId) })));
    const exact = query.toLowerCase();
    results.sort((a, b) => {
      const aExact = a.nickname.toLowerCase() === exact || a.stationId.toLowerCase() === exact;
      const bExact = b.nickname.toLowerCase() === exact || b.stationId.toLowerCase() === exact;
      if (aExact !== bExact) return aExact ? -1 : 1;
      return Number(b.favoriteCount ?? -1) - Number(a.favoriteCount ?? -1) || Number(b.viewerCount || 0) - Number(a.viewerCount || 0);
    });
    const record = { payload: { query, results }, cachedAt: Date.now() };
    const storage = await writeSnapshotCache(cache, key, record, CACHE_TTL_SECONDS);
    return { record, storage };
  })();
  pendingSearches.set(key, promise);
  try { return await promise; } finally { if (pendingSearches.get(key) === promise) pendingSearches.delete(key); }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'GET 요청만 지원합니다.' });
  const query = normalizeStreamerQuery(req.query?.q);
  if (!query) return res.status(200).json({ ok: true, query: '', results: [], cache: 'skip' });
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  const key = queryKey(query);
  const cache = await readSnapshotCache(key);
  if (isFresh(cache.record)) return res.status(200).json({ ok: true, ...cache.record.payload, cache: 'hit', storage: cache.storage, cachedAt: cache.record.cachedAt });
  try {
    const result = await refreshSearch(cache, key, query);
    return res.status(200).json({ ok: true, ...result.record.payload, cache: cache.record?.payload ? 'refresh' : 'miss', storage: result.storage, cachedAt: result.record.cachedAt });
  } catch {
    if (cache.record?.payload) return res.status(200).json({ ok: true, ...cache.record.payload, cache: 'stale', storage: cache.storage, cachedAt: cache.record.cachedAt });
    return res.status(200).json({ ok: false, query, results: [], cache: 'unavailable', storage: cache.storage });
  }
}


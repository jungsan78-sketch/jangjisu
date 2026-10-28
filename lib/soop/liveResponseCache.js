import { readSnapshotCache, writeSnapshotCache } from '../cloudflareSnapshotCache';
import { filterPrisonMemberMap } from '../activePrisonMembers';
import { buildFallbackStatuses, fetchLiveStatusPayload } from './liveStatus';

export const SOOP_LIVE_RESPONSE_CACHE_KEY = 'soop:live-status:response:v6';
export const SOOP_LIVE_RESPONSE_CACHE_TTL_SECONDS = 300;
const STORAGE_SECONDS = 24 * 60 * 60;
const FAILURE_RETRY_MS = 30 * 1000;

function isResolved(status) {
  const state = String(status?.liveState || '');
  return typeof status?.isLive === 'boolean' && !/unknown|fallback/.test(state);
}

function filteredPayload(payload) {
  return { ...payload, statuses: filterPrisonMemberMap(payload?.statuses || {}) };
}

function previousStatuses(statuses = {}) {
  return Object.fromEntries(Object.entries(statuses).map(([name, status]) => [name, {
    ...status,
    liveState: 'unknown_previous',
    unstableOffline: Boolean(status.isLive),
  }]));
}

// Dependency injection keeps failure and concurrent-request tests off the SOOP API.
export function createLiveStatusCache({
  readCache = readSnapshotCache,
  writeCache = writeSnapshotCache,
  fetchLive = fetchLiveStatusPayload,
  fallback = buildFallbackStatuses,
  now = Date.now,
} = {}) {
  let memoryRecord = null;
  let refreshPromise = null;
  let retryAfter = 0;

  function usable(record) {
    const age = now() - Number(record?.cachedAt);
    return record?.payload?.statuses && Number(record.cachedAt) > 0
      && age >= 0 && age < STORAGE_SECONDS * 1000
      && Object.keys(filterPrisonMemberMap(record.payload.statuses)).length > 0;
  }

  function response(record, cache, storage, stale = false) {
    const payload = filteredPayload(record.payload);
    return {
      ...payload,
      ok: true,
      statuses: stale ? previousStatuses(payload.statuses) : payload.statuses,
      cache,
      cacheStorage: storage,
      cachedAt: new Date(record.cachedAt).toISOString(),
      ...(stale ? { warning: 'live-source-unavailable-using-previous-cache' } : {}),
    };
  }

  function unavailable() {
    return {
      ok: false,
      statuses: Object.fromEntries(Object.entries(filterPrisonMemberMap(fallback())).map(([name, status]) => [
        name, { ...status, liveState: 'unknown' },
      ])),
      source: 'fallback',
      fetchedAt: new Date(now()).toISOString(),
      cache: 'unavailable',
      cacheStorage: 'unknown',
      warning: 'live-source-unavailable',
    };
  }

  async function load() {
    let cache;
    try {
      cache = await readCache(SOOP_LIVE_RESPONSE_CACHE_KEY);
    } catch {
      cache = { record: null, storage: 'unknown' };
    }
    cache = cache || { record: null, storage: 'unknown' };
    let record = usable(cache.record) ? cache.record : null;
    let storage = cache.storage || 'unknown';
    if (usable(memoryRecord) && (!record || memoryRecord.cachedAt > record.cachedAt)) {
      record = memoryRecord;
      storage = 'memory';
    }
    if (record) {
      record = { ...record, payload: filteredPayload(record.payload) };
      memoryRecord = record;
    }
    if (record && now() - record.cachedAt < SOOP_LIVE_RESPONSE_CACHE_TTL_SECONDS * 1000
      && Object.values(record.payload.statuses).some(isResolved)) {
      return response(record, 'hit', storage);
    }
    if (now() < retryAfter) return record ? response(record, 'stale', storage, true) : unavailable();

    try {
      const live = filteredPayload(await fetchLive());
      if (['fallback', 'stable_previous_fallback'].includes(live.source)
        || !Object.values(live.statuses).some(isResolved)) throw new Error('No confirmed live statuses');
      const statuses = Object.fromEntries(Object.entries(live.statuses).map(([name, status]) => {
        const previous = record?.payload?.statuses?.[name];
        return [name, !isResolved(status) && previous
          ? { ...status, ...previous, liveState: 'unknown_previous', unstableOffline: Boolean(previous.isLive) }
          : status];
      }));
      const next = { payload: { ...live, statuses }, cachedAt: now() };
      let writtenStorage = 'unknown';
      try {
        writtenStorage = await writeCache(cache, SOOP_LIVE_RESPONSE_CACHE_KEY, next, STORAGE_SECONDS);
      } catch {}
      memoryRecord = next;
      retryAfter = 0;
      return response(next, record ? 'refresh' : 'miss', writtenStorage);
    } catch {
      retryAfter = now() + FAILURE_RETRY_MS;
      return record ? response(record, 'stale', storage, true) : unavailable();
    }
  }

  return async function getLiveStatusResponsePayload({ debug = false } = {}) {
    if (!refreshPromise) refreshPromise = load().finally(() => { refreshPromise = null; });
    const payload = await refreshPromise;
    if (debug) return payload;
    const { debug: diagnostics, ...publicPayload } = payload;
    return publicPayload;
  };
}

export const getLiveStatusResponsePayload = createLiveStatusCache();

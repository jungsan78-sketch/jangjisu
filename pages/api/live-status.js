import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';

const CACHE_KEY = 'soop:live-status:v1';
const CACHE_TTL_SECONDS = 60;

function extractStationId(stationUrl) {
  const match = String(stationUrl || '').match(/station\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function buildFallbackStatuses() {
  return [WARDEN, ...PRISON_MEMBERS].reduce((acc, member) => {
    const stationId = extractStationId(member.station);
    acc[member.nickname] = {
      nickname: member.nickname,
      stationId,
      stationUrl: member.station || '',
      liveUrl: member.station || '',
      isLive: null,
      title: '',
      fetchedAt: null,
    };
    return acc;
  }, {});
}

function normalizeEntry(key, value, fallbackStatuses) {
  const source = value && typeof value === 'object' ? value : { isLive: value };
  const stationId = String(source.stationId || source.userId || source.bjId || source.channelId || source.id || '').trim();
  const nickname = String(source.nickname || source.member || source.name || key || '').trim();
  const matchedNickname = fallbackStatuses[nickname] ? nickname : Object.keys(fallbackStatuses).find((memberName) => fallbackStatuses[memberName].stationId === stationId) || nickname;
  const base = fallbackStatuses[matchedNickname] || {
    nickname: matchedNickname,
    stationId,
    stationUrl: source.stationUrl || '',
    liveUrl: source.liveUrl || source.stationUrl || '',
    isLive: null,
    title: '',
    fetchedAt: null,
  };

  return {
    ...base,
    nickname: matchedNickname || base.nickname,
    stationId: stationId || base.stationId,
    stationUrl: source.stationUrl || base.stationUrl,
    liveUrl: source.liveUrl || source.streamUrl || source.url || base.liveUrl || base.stationUrl,
    isLive: typeof source.isLive === 'boolean' ? source.isLive : source.is_live === true || source.live === true || source.onAir === true,
    title: source.title || source.liveTitle || source.broadcastTitle || base.title || '',
    fetchedAt: source.fetchedAt || source.updatedAt || null,
  };
}

function normalizePayload(raw) {
  const fallbackStatuses = buildFallbackStatuses();
  const statuses = { ...fallbackStatuses };
  const collection = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.members)
      ? raw.members
      : Array.isArray(raw?.items)
        ? raw.items
        : null;

  if (collection) {
    collection.forEach((item, index) => {
      const normalized = normalizeEntry(String(index), item, fallbackStatuses);
      if (!normalized.nickname) return;
      statuses[normalized.nickname] = normalized;
    });
    return statuses;
  }

  const sourceObject = raw?.statuses && typeof raw.statuses === 'object' ? raw.statuses : raw;
  if (sourceObject && typeof sourceObject === 'object') {
    Object.entries(sourceObject).forEach(([key, value]) => {
      const normalized = normalizeEntry(key, value, fallbackStatuses);
      if (!normalized.nickname) return;
      statuses[normalized.nickname] = normalized;
    });
  }

  return statuses;
}

async function fetchLiveStatusPayload() {
  const collectorUrl = process.env.SOOP_COLLECTOR_URL;
  const envJson = process.env.SOOP_LIVE_STATUS_JSON;

  if (envJson) {
    return {
      statuses: normalizePayload(JSON.parse(envJson)),
      source: 'env_json',
      fetchedAt: new Date().toISOString(),
    };
  }

  if (collectorUrl) {
    const upstream = await fetch(`${collectorUrl.replace(/\/$/, '')}/live-status.json`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      throw new Error(`collector returned ${upstream.status}`);
    }
    const raw = await upstream.json();
    return {
      statuses: normalizePayload(raw),
      source: 'collector',
      fetchedAt: new Date().toISOString(),
    };
  }

  return {
    statuses: buildFallbackStatuses(),
    source: 'fallback',
    fetchedAt: new Date().toISOString(),
    warning: 'SOOP_LIVE_STATUS_JSON or SOOP_COLLECTOR_URL is not set',
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const cached = await getCachedJson(CACHE_KEY);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({
      ok: true,
      ...cached.payload,
      cache: 'hit',
      cachedAt: new Date(cached.cachedAt).toISOString(),
    });
  }

  try {
    const payload = await fetchLiveStatusPayload();
    await setCachedJson(CACHE_KEY, { payload, cachedAt: now }, CACHE_TTL_SECONDS);
    return res.status(200).json({
      ok: true,
      ...payload,
      cache: cached?.payload ? 'refresh' : 'miss',
      cachedAt: new Date(now).toISOString(),
    });
  } catch (error) {
    if (cached?.payload) {
      return res.status(200).json({
        ok: true,
        ...cached.payload,
        cache: 'stale',
        cachedAt: new Date(cached.cachedAt).toISOString(),
        error: error.message,
      });
    }

    return res.status(200).json({
      ok: false,
      statuses: buildFallbackStatuses(),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      cache: 'unavailable',
      error: error.message,
    });
  }
}

import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { fetchDirectLiveStatusMap } from './liveDirectStatus';

export const SOOP_LIVE_CACHE_KEY = 'soop:live-status:v4';
export const SOOP_LIVE_CACHE_TTL_SECONDS = 60;

const LIVE_GRACE_MS = 4 * 60 * 1000;
const REDIS_CACHE_TTL_SECONDS = 10 * 60;
const COLLECTOR_TIMEOUT_MS = 3000;
const memoryState = globalThis.__SOU_LIVE_STATUS_MEMORY__ || { statuses: {}, updatedAt: 0 };
globalThis.__SOU_LIVE_STATUS_MEMORY__ = memoryState;

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return { url: url.replace(/\/$/, ''), token };
}

async function redisCommand(args) {
  const { url, token } = getRedisConfig();
  if (!url || !token) return null;
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([args]),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return Array.isArray(data) ? data[0]?.result : null;
}

async function readStableState() {
  const cached = await redisCommand(['GET', SOOP_LIVE_CACHE_KEY]);
  if (cached) {
    try {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      if (parsed?.statuses) return parsed;
    } catch {}
  }
  return memoryState;
}

async function writeStableState(state) {
  memoryState.statuses = state.statuses || {};
  memoryState.updatedAt = state.updatedAt || Date.now();
  await redisCommand(['SET', SOOP_LIVE_CACHE_KEY, JSON.stringify(memoryState), 'EX', REDIS_CACHE_TTL_SECONDS]);
}

export function extractStationId(stationUrl) {
  const match = String(stationUrl || '').match(/station\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function buildMemberList() {
  return ALL_PRISON_MEMBERS.map((member) => ({
    ...member,
    stationId: extractStationId(member.station),
  }));
}

function normalizePlayUrl(stationId, broadNo) {
  return `https://play.sooplive.com/${stationId}/${broadNo || 'null'}`;
}

function normalizeThumbnail(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('//')) return `https:${text}`;
  if (text.startsWith('http')) return text;
  return text;
}

function buildLiveImageUrl(broadNo) {
  const value = String(broadNo || '').trim();
  return /^\d+$/.test(value) ? `https://liveimg.sooplive.com/${value}` : '';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = COLLECTOR_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function buildFallbackStatuses() {
  return buildMemberList().reduce((acc, member) => {
    acc[member.nickname] = {
      nickname: member.nickname,
      stationId: member.stationId,
      stationUrl: member.station || '',
      liveUrl: normalizePlayUrl(member.stationId || '', 'null'),
      isLive: false,
      liveState: 'fallback',
      title: '',
      fetchedAt: null,
      broadNo: '',
      viewerCount: 0,
      thumbnailUrl: '',
    };
    return acc;
  }, {});
}

function mergeDirectStatus(baseStatus, directStatus) {
  if (!directStatus) return baseStatus;
  const broadNo = String(directStatus.broadNo || '').trim();
  const isLive = Boolean(directStatus.isLive && broadNo);

  return {
    ...baseStatus,
    ...directStatus,
    isLive,
    liveState: isLive ? 'confirmed_live' : directStatus.liveState || 'confirmed_offline',
    broadNo,
    liveUrl: isLive ? normalizePlayUrl(baseStatus.stationId, broadNo) : normalizePlayUrl(baseStatus.stationId, 'null'),
    title: directStatus.title || '',
    viewerCount: Number(directStatus.viewerCount || 0),
    thumbnailUrl: normalizeThumbnail(directStatus.thumbnailUrl || '') || buildLiveImageUrl(broadNo),
    fetchedAt: directStatus.fetchedAt || new Date().toISOString(),
  };
}

function stabilizeStatuses(nextStatuses, previousState) {
  const now = Date.now();
  const previousStatuses = previousState?.statuses || {};
  const stabilized = {};

  Object.entries(nextStatuses || {}).forEach(([nickname, status]) => {
    const prev = previousStatuses[nickname];
    const wasLiveRecently = Boolean(prev?.isLive && prev?.lastSeenLiveAt && now - Number(prev.lastSeenLiveAt) <= LIVE_GRACE_MS);
    const isCurrentlyLive = Boolean(status?.isLive);
    const isUnknown = status?.liveState === 'unknown';

    if (isCurrentlyLive) {
      stabilized[nickname] = {
        ...prev,
        ...status,
        isLive: true,
        unstableOffline: false,
        lastSeenLiveAt: now,
        offlineSeenCount: 0,
      };
      return;
    }

    if (isUnknown && prev) {
      stabilized[nickname] = {
        ...status,
        ...prev,
        liveState: 'unknown_previous',
        unstableOffline: Boolean(prev?.isLive),
        fetchedAt: status?.fetchedAt || prev?.fetchedAt || new Date().toISOString(),
      };
      return;
    }

    if (wasLiveRecently) {
      stabilized[nickname] = {
        ...status,
        ...prev,
        isLive: true,
        unstableOffline: true,
        offlineSeenCount: Number(prev?.offlineSeenCount || 0) + 1,
        fetchedAt: status?.fetchedAt || prev?.fetchedAt || new Date().toISOString(),
      };
      return;
    }

    stabilized[nickname] = {
      ...prev,
      ...status,
      isLive: false,
      unstableOffline: false,
      offlineSeenCount: Number(prev?.offlineSeenCount || 0) + 1,
    };
  });

  return stabilized;
}

async function fetchLiveStatusesFast() {
  const memberList = buildMemberList();
  const statuses = buildFallbackStatuses();
  let directStatusResult = null;

  try {
    directStatusResult = await fetchDirectLiveStatusMap(memberList);
  } catch (error) {
    directStatusResult = { statusesByNickname: {}, available: false, warning: error.message };
  }

  memberList.forEach((member) => {
    statuses[member.nickname] = mergeDirectStatus(statuses[member.nickname], directStatusResult.statusesByNickname?.[member.nickname]);
  });

  return {
    statuses,
    source: 'soop_channel_broad_section_direct',
    fetchedAt: new Date().toISOString(),
    warning: directStatusResult?.warning || undefined,
    debug: {
      directStatus: {
        source: 'api-channel_home_section_broad',
        available: Boolean(directStatusResult?.available),
        requestedCount: directStatusResult?.requestedCount || memberList.length,
        fulfilledCount: directStatusResult?.fulfilledCount || 0,
        confirmedLiveCount: directStatusResult?.confirmedLiveCount || 0,
        confirmedOfflineCount: directStatusResult?.confirmedOfflineCount || 0,
        unknownCount: directStatusResult?.unknownCount || 0,
      },
      openApi: {
        enabled: false,
        reason: 'removed_from_default_path',
      },
      playFallback: false,
      stationIds: memberList.reduce((acc, member) => ({ ...acc, [member.nickname]: member.stationId }), {}),
    },
  };
}

function mergeFallbackLiveStatuses(raw, sourceName) {
  const fallbackStatuses = buildFallbackStatuses();
  Object.entries(raw?.statuses || raw || {}).forEach(([key, value]) => {
    const source = value && typeof value === 'object' ? value : { isLive: value };
    const nickname = String(source.nickname || source.member || source.name || key || '').trim();
    if (!nickname || !fallbackStatuses[nickname]) return;
    const broadNo = String(source.broadNo || source.broad_no || '').trim();
    fallbackStatuses[nickname] = {
      ...fallbackStatuses[nickname],
      isLive: typeof source.isLive === 'boolean' ? source.isLive : source.is_live === true || source.live === true || source.onAir === true,
      liveState: typeof source.isLive === 'boolean' ? (source.isLive ? 'confirmed_live' : 'confirmed_offline') : 'fallback',
      title: source.title || source.liveTitle || source.broadcastTitle || '',
      liveUrl: source.liveUrl || source.streamUrl || source.url || normalizePlayUrl(fallbackStatuses[nickname].stationId, broadNo || 'null'),
      fetchedAt: source.fetchedAt || source.updatedAt || null,
      broadNo,
      viewerCount: Number(source.viewerCount || source.total_view_cnt || 0),
      thumbnailUrl: normalizeThumbnail(source.thumbnailUrl || source.broad_thumb || '') || buildLiveImageUrl(broadNo),
    };
  });
  return { statuses: fallbackStatuses, source: sourceName, fetchedAt: new Date().toISOString() };
}

export async function fetchLiveStatusPayload() {
  try {
    const payload = await fetchLiveStatusesFast();
    const previousState = await readStableState();
    const stabilizedStatuses = stabilizeStatuses(payload.statuses, previousState);
    const nextState = { statuses: stabilizedStatuses, updatedAt: Date.now() };
    await writeStableState(nextState);
    return {
      ...payload,
      statuses: stabilizedStatuses,
      source: `${payload.source}_stable`,
      debug: {
        ...(payload.debug || {}),
        stable: {
          graceMs: LIVE_GRACE_MS,
          redis: Boolean(getRedisConfig().url && getRedisConfig().token),
        },
      },
    };
  } catch (error) {
    const collectorUrl = process.env.SOOP_COLLECTOR_URL;
    const envJson = process.env.SOOP_LIVE_STATUS_JSON;

    if (envJson) {
      return { ...mergeFallbackLiveStatuses(JSON.parse(envJson), 'env_json'), warning: `SOOP live direct fallback used: ${error.message}` };
    }

    if (collectorUrl) {
      const upstream = await fetchWithTimeout(`${collectorUrl.replace(/\/$/, '')}/live-status.json`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!upstream.ok) throw new Error(`collector returned ${upstream.status}`);
      const raw = await upstream.json();
      return { ...mergeFallbackLiveStatuses(raw, 'collector'), warning: `SOOP live direct fallback used: ${error.message}` };
    }

    const previousState = await readStableState();
    if (previousState?.statuses && Object.keys(previousState.statuses).length) {
      return {
        statuses: previousState.statuses,
        source: 'stable_previous_fallback',
        fetchedAt: new Date().toISOString(),
        warning: `SOOP live status unavailable, previous stable state used: ${error.message}`,
      };
    }

    return {
      statuses: buildFallbackStatuses(),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: `SOOP live status unavailable: ${error.message}`,
    };
  }
}

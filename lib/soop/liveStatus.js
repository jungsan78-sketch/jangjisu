import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';
import { fetchDirectLiveStatusMap } from './liveDirectStatus';

export const SOOP_LIVE_CACHE_KEY = 'soop:live-status:v3';
export const SOOP_LIVE_CACHE_TTL_SECONDS = 60;

const SOOP_BROAD_LIST_URL = 'https://openapi.sooplive.com/broad/list';
const BROAD_LIST_PAGE_LIMITS = {
  broad_start: 24,
  view_cnt: 16,
};
const BROAD_LIST_TIMEOUT_MS = 4500;
const PLAY_CRAWL_TIMEOUT_MS = 3500;
const LIVE_GRACE_MS = 4 * 60 * 1000;
const REDIS_CACHE_TTL_SECONDS = 10 * 60;
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
  return [WARDEN, ...PRISON_MEMBERS].map((member) => ({
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

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
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

function parseJsonp(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
  const start = raw.indexOf('(');
  const end = raw.lastIndexOf(')');
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start + 1, end));
  throw new Error('Unable to parse broad/list response');
}

function extractMetaContent(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function extractBroadNoFromSources(stationId, finalUrl, html) {
  const candidates = [
    String(finalUrl || ''),
    extractMetaContent(html, 'og:url'),
    extractMetaContent(html, 'twitter:url'),
    extractMetaContent(html, 'al:web:url'),
    ...(String(html || '').match(/https:\/\/play\.sooplive\.com\/[^"'\s<>]+/gi) || []),
    ...(String(html || '').match(/\/play\.sooplive\.com\/[^"'\s<>]+/gi) || []),
    ...(String(html || '').match(/play\.sooplive\.com\/[A-Za-z0-9_]+\/[A-Za-z0-9_]+/gi) || []),
  ];

  for (const candidate of candidates) {
    const match = String(candidate).match(new RegExp(`play\\.sooplive\\.com\\/${stationId}\\/([^/?#"'\\s<>]+)`, 'i'));
    if (!match?.[1]) continue;
    const broadNo = String(match[1]).trim();
    if (broadNo && broadNo !== 'null') return broadNo;
    if (broadNo === 'null') return 'null';
  }
  return 'null';
}

async function fetchPlayStatus(member) {
  const stationId = member.stationId;
  const url = `https://play.sooplive.com/${stationId}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
    },
    cache: 'no-store',
    redirect: 'follow',
  }, PLAY_CRAWL_TIMEOUT_MS);

  const html = await response.text();
  const finalUrl = response.url || url;
  const broadNo = extractBroadNoFromSources(stationId, finalUrl, html);
  const title = extractMetaContent(html, 'og:title') || extractMetaContent(html, 'twitter:title');
  const thumbnailUrl = extractMetaContent(html, 'og:image') || extractMetaContent(html, 'twitter:image');
  const isLive = broadNo !== 'null' && /^\d+$/.test(broadNo);

  return {
    nickname: member.nickname,
    stationId,
    stationUrl: member.station || '',
    liveUrl: normalizePlayUrl(stationId, broadNo),
    isLive,
    liveState: isLive ? 'confirmed_live' : 'unknown',
    broadNo: broadNo !== 'null' ? broadNo : '',
    title,
    thumbnailUrl: normalizeThumbnail(thumbnailUrl) || buildLiveImageUrl(broadNo),
    fetchedAt: new Date().toISOString(),
    viewerCount: 0,
  };
}

async function fetchBroadListPage(clientId, pageNo, orderType) {
  const params = new URLSearchParams({
    client_id: clientId,
    order_type: orderType,
    page_no: String(pageNo),
  });
  const response = await fetchWithTimeout(`${SOOP_BROAD_LIST_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json, */*' },
    cache: 'no-store',
  }, BROAD_LIST_TIMEOUT_MS);
  const text = await response.text();
  if (!response.ok) throw new Error(text || `broad/list returned ${response.status}`);
  return parseJsonp(text);
}

async function fetchBroadListMetadata(memberList) {
  const clientId = process.env.SOOP_CLIENT_ID;
  if (!clientId) return { itemsByUserId: {}, available: false, warning: 'SOOP_CLIENT_ID is not configured' };

  const targetIds = new Set(memberList.map((member) => member.stationId).filter(Boolean));
  const resultMap = {};
  const requests = [];

  Object.entries(BROAD_LIST_PAGE_LIMITS).forEach(([orderType, maxPages]) => {
    for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) requests.push({ orderType, pageNo });
  });

  const results = await Promise.allSettled(requests.map(({ orderType, pageNo }) => fetchBroadListPage(clientId, pageNo, orderType)));
  results.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    const broadItems = Array.isArray(result.value?.broad) ? result.value.broad : [];
    broadItems.forEach((item) => {
      const userId = String(item?.user_id || '').trim();
      if (!userId || !targetIds.has(userId) || resultMap[userId]) return;
      resultMap[userId] = item;
    });
  });

  const fulfilledCount = results.filter((result) => result.status === 'fulfilled').length;
  if (!fulfilledCount) throw new Error('all broad/list requests failed');
  return { itemsByUserId: resultMap, available: true, fulfilledCount, requestedCount: requests.length };
}

function mergeMetadata(baseStatus, broadItem) {
  if (!broadItem) return baseStatus;
  const broadNo = String(broadItem?.broad_no || baseStatus.broadNo || '').trim();
  const isLive = Boolean(baseStatus.isLive || broadNo);
  return {
    ...baseStatus,
    isLive,
    liveState: isLive ? (baseStatus.liveState || 'confirmed_live') : baseStatus.liveState,
    broadNo,
    liveUrl: normalizePlayUrl(baseStatus.stationId, broadNo || (baseStatus.isLive ? '' : 'null')),
    title: String(broadItem?.broad_title || '').trim() || baseStatus.title,
    viewerCount: Number(broadItem?.total_view_cnt || baseStatus.viewerCount || 0),
    thumbnailUrl: normalizeThumbnail(broadItem?.broad_thumb) || baseStatus.thumbnailUrl || buildLiveImageUrl(broadNo),
    fetchedAt: new Date().toISOString(),
  };
}

function mergeDirectStatus(baseStatus, directStatus) {
  if (!directStatus) return baseStatus;
  const isDirectLive = directStatus.liveState === 'confirmed_live';

  return {
    ...baseStatus,
    ...directStatus,
    title: baseStatus.title || directStatus.title || '',
    broadNo: baseStatus.broadNo || directStatus.broadNo || '',
    liveUrl: baseStatus.broadNo ? normalizePlayUrl(baseStatus.stationId, baseStatus.broadNo) : baseStatus.liveUrl || directStatus.liveUrl,
    viewerCount: Number(baseStatus.viewerCount || directStatus.viewerCount || 0),
    thumbnailUrl: baseStatus.thumbnailUrl || directStatus.thumbnailUrl || buildLiveImageUrl(baseStatus.broadNo),
    isLive: isDirectLive || Boolean(baseStatus.isLive),
    liveState: isDirectLive ? 'confirmed_live' : directStatus.liveState,
    fetchedAt: directStatus.fetchedAt || baseStatus.fetchedAt || new Date().toISOString(),
  };
}

async function fetchPlayStatuses(memberList, baseStatuses) {
  return Promise.all(memberList.map(async (member) => {
    try {
      return await fetchPlayStatus(member);
    } catch {
      return {
        ...baseStatuses[member.nickname],
        liveState: baseStatuses[member.nickname]?.liveState || 'unknown',
        fetchedAt: new Date().toISOString(),
      };
    }
  }));
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
  let broadListResult = null;

  try {
    directStatusResult = await fetchDirectLiveStatusMap(memberList);
  } catch (error) {
    directStatusResult = { statusesByNickname: {}, available: false, warning: error.message };
  }

  memberList.forEach((member) => {
    statuses[member.nickname] = mergeDirectStatus(statuses[member.nickname], directStatusResult.statusesByNickname?.[member.nickname]);
  });

  try {
    broadListResult = await fetchBroadListMetadata(memberList);
  } catch (error) {
    broadListResult = { itemsByUserId: {}, available: false, warning: error.message };
  }

  if (broadListResult?.available) {
    memberList.forEach((member) => {
      statuses[member.nickname] = mergeMetadata(statuses[member.nickname], broadListResult.itemsByUserId[member.stationId]);
    });
  }

  const missingMembers = memberList.filter((member) => {
    const status = statuses[member.nickname];
    return !status?.isLive && status?.liveState !== 'confirmed_offline';
  });

  const crawledStatuses = await fetchPlayStatuses(missingMembers, statuses);
  crawledStatuses.forEach((status) => {
    const broadItem = broadListResult?.itemsByUserId?.[status.stationId];
    statuses[status.nickname] = mergeMetadata(status, broadItem);
  });

  return {
    statuses,
    source: 'soop_direct_station_status_broad_list_play_fallback',
    fetchedAt: new Date().toISOString(),
    warning: [directStatusResult?.warning, broadListResult?.warning].filter(Boolean).join(' / ') || undefined,
    debug: {
      directStatus: {
        available: Boolean(directStatusResult?.available),
        requestedCount: directStatusResult?.requestedCount || memberList.length,
        fulfilledCount: directStatusResult?.fulfilledCount || 0,
        confirmedLiveCount: directStatusResult?.confirmedLiveCount || 0,
        confirmedOfflineCount: directStatusResult?.confirmedOfflineCount || 0,
        unknownCount: directStatusResult?.unknownCount || 0,
      },
      openApi: {
        matched: Object.keys(broadListResult?.itemsByUserId || {}).length,
        fulfilledCount: broadListResult?.fulfilledCount || 0,
        requestedCount: broadListResult?.requestedCount || 0,
      },
      playFallback: true,
      playFallbackCount: missingMembers.length,
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
      return { ...mergeFallbackLiveStatuses(JSON.parse(envJson), 'env_json'), warning: `SOOP live fast path fallback used: ${error.message}` };
    }

    if (collectorUrl) {
      const upstream = await fetchWithTimeout(`${collectorUrl.replace(/\/$/, '')}/live-status.json`, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      }, BROAD_LIST_TIMEOUT_MS);
      if (!upstream.ok) throw new Error(`collector returned ${upstream.status}`);
      const raw = await upstream.json();
      return { ...mergeFallbackLiveStatuses(raw, 'collector'), warning: `SOOP live fast path fallback used: ${error.message}` };
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

import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';

export const SOOP_LIVE_CACHE_KEY = 'soop:live-status:v2';
export const SOOP_LIVE_CACHE_TTL_SECONDS = 60;

const SOOP_BROAD_LIST_URL = 'https://openapi.sooplive.com/broad/list';
const BROAD_LIST_PAGE_LIMITS = {
  broad_start: 24,
  view_cnt: 16,
};
const BROAD_LIST_TIMEOUT_MS = 4500;
const PLAY_CRAWL_TIMEOUT_MS = 3500;

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

  return {
    nickname: member.nickname,
    stationId,
    stationUrl: member.station || '',
    liveUrl: normalizePlayUrl(stationId, broadNo),
    isLive: broadNo !== 'null' && /^\d+$/.test(broadNo),
    broadNo: broadNo !== 'null' ? broadNo : '',
    title,
    thumbnailUrl,
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
  return {
    ...baseStatus,
    isLive: Boolean(broadNo),
    broadNo,
    liveUrl: normalizePlayUrl(baseStatus.stationId, broadNo || 'null'),
    title: String(broadItem?.broad_title || '').trim() || baseStatus.title,
    viewerCount: Number(broadItem?.total_view_cnt || 0),
    thumbnailUrl: normalizeThumbnail(broadItem?.broad_thumb) || baseStatus.thumbnailUrl,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchPlayStatuses(memberList, baseStatuses) {
  return Promise.all(memberList.map(async (member) => {
    try {
      return await fetchPlayStatus(member);
    } catch {
      return { ...baseStatuses[member.nickname], fetchedAt: new Date().toISOString() };
    }
  }));
}

async function fetchLiveStatusesFast() {
  const memberList = buildMemberList();
  const statuses = buildFallbackStatuses();
  let broadListResult = null;

  try {
    broadListResult = await fetchBroadListMetadata(memberList);
  } catch (error) {
    broadListResult = { itemsByUserId: {}, available: false, warning: error.message };
  }

  if (broadListResult?.available) {
    memberList.forEach((member) => {
      statuses[member.nickname] = mergeMetadata(statuses[member.nickname], broadListResult.itemsByUserId[member.stationId]);
    });

    const missingMembers = memberList.filter((member) => !statuses[member.nickname]?.isLive);
    const crawledStatuses = await fetchPlayStatuses(missingMembers, statuses);
    crawledStatuses.forEach((status) => {
      const broadItem = broadListResult.itemsByUserId[status.stationId];
      statuses[status.nickname] = mergeMetadata(status, broadItem);
    });

    return {
      statuses,
      source: 'soop_openapi_broad_list_play_fallback',
      fetchedAt: new Date().toISOString(),
      debug: {
        openApi: {
          matched: Object.keys(broadListResult.itemsByUserId || {}).length,
          fulfilledCount: broadListResult.fulfilledCount || 0,
          requestedCount: broadListResult.requestedCount || 0,
        },
        playFallback: true,
        playFallbackCount: missingMembers.length,
        stationIds: memberList.reduce((acc, member) => ({ ...acc, [member.nickname]: member.stationId }), {}),
      },
    };
  }

  const crawledStatuses = await fetchPlayStatuses(memberList, statuses);
  crawledStatuses.forEach((status) => { statuses[status.nickname] = status; });
  return {
    statuses,
    source: 'soop_play_crawl',
    fetchedAt: new Date().toISOString(),
    warning: broadListResult?.warning ? `OpenAPI unavailable: ${broadListResult.warning}` : undefined,
    debug: {
      openApi: { matched: 0, fulfilledCount: 0, requestedCount: 0 },
      playFallback: true,
      playFallbackCount: memberList.length,
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
      title: source.title || source.liveTitle || source.broadcastTitle || '',
      liveUrl: source.liveUrl || source.streamUrl || source.url || normalizePlayUrl(fallbackStatuses[nickname].stationId, broadNo || 'null'),
      fetchedAt: source.fetchedAt || source.updatedAt || null,
      broadNo,
      viewerCount: Number(source.viewerCount || source.total_view_cnt || 0),
      thumbnailUrl: normalizeThumbnail(source.thumbnailUrl || source.broad_thumb || ''),
    };
  });
  return { statuses: fallbackStatuses, source: sourceName, fetchedAt: new Date().toISOString() };
}

export async function fetchLiveStatusPayload() {
  try {
    return await fetchLiveStatusesFast();
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

    return {
      statuses: buildFallbackStatuses(),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: `SOOP live status unavailable: ${error.message}`,
    };
  }
}

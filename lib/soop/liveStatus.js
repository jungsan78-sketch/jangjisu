import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';

export const SOOP_LIVE_CACHE_KEY = 'soop:live-status:v1';
export const SOOP_LIVE_CACHE_TTL_SECONDS = 60;
const SOOP_BROAD_LIST_URL = 'https://openapi.sooplive.com/broad/list';
const SOOP_BROAD_LIST_PAGE_LIMITS = {
  broad_start: 12,
  view_cnt: 8,
};

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
  if (raw.startsWith('{') || raw.startsWith('[')) {
    return JSON.parse(raw);
  }

  const start = raw.indexOf('(');
  const end = raw.lastIndexOf(')');
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start + 1, end));
  }

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
    ...String(html || '').match(/https:\/\/play\.sooplive\.com\/[^"'\s<>]+/gi) || [],
    ...String(html || '').match(/\/play\.sooplive\.com\/[^"'\s<>]+/gi) || [],
    ...String(html || '').match(/play\.sooplive\.com\/[A-Za-z0-9_]+\/[A-Za-z0-9_]+/gi) || [],
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
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
    },
    cache: 'no-store',
    redirect: 'follow',
  });

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

  const response = await fetch(`${SOOP_BROAD_LIST_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json, */*',
    },
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `broad/list returned ${response.status}`);
  }

  return parseJsonp(text);
}

async function fetchBroadListMetadata(memberList) {
  const clientId = process.env.SOOP_CLIENT_ID;
  if (!clientId) return {};

  const targetIds = new Set(memberList.map((member) => member.stationId).filter(Boolean));
  const resultMap = {};

  for (const [orderType, maxPages] of Object.entries(SOOP_BROAD_LIST_PAGE_LIMITS)) {
    for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
      const payload = await fetchBroadListPage(clientId, pageNo, orderType);
      const broadItems = Array.isArray(payload?.broad) ? payload.broad : [];

      broadItems.forEach((item) => {
        const userId = String(item?.user_id || '').trim();
        if (!userId || !targetIds.has(userId) || resultMap[userId]) return;
        resultMap[userId] = item;
      });

      if (Object.keys(resultMap).length >= targetIds.size) return resultMap;
    }
  }

  return resultMap;
}

function mergeMetadata(playStatus, broadItem) {
  if (!broadItem) return playStatus;

  const broadNo = String(broadItem?.broad_no || playStatus.broadNo || '').trim();
  return {
    ...playStatus,
    isLive: playStatus.isLive || Boolean(broadNo),
    broadNo,
    liveUrl: normalizePlayUrl(playStatus.stationId, broadNo || 'null'),
    title: String(broadItem?.broad_title || '').trim() || playStatus.title,
    viewerCount: Number(broadItem?.total_view_cnt || 0),
    thumbnailUrl: broadItem?.broad_thumb ? `https:${broadItem.broad_thumb}` : playStatus.thumbnailUrl,
  };
}

async function fetchLiveStatusesFromCrawl() {
  const memberList = buildMemberList();
  const statuses = buildFallbackStatuses();

  const crawledStatuses = await Promise.all(
    memberList.map(async (member) => {
      try {
        return await fetchPlayStatus(member);
      } catch {
        return {
          ...statuses[member.nickname],
          fetchedAt: new Date().toISOString(),
        };
      }
    }),
  );

  let broadListMap = {};
  try {
    broadListMap = await fetchBroadListMetadata(memberList);
  } catch {
    broadListMap = {};
  }

  crawledStatuses.forEach((status) => {
    statuses[status.nickname] = mergeMetadata(status, broadListMap[status.stationId]);
  });

  return {
    statuses,
    source: 'soop_play_crawl',
    fetchedAt: new Date().toISOString(),
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
      thumbnailUrl: source.thumbnailUrl || source.broad_thumb || '',
    };
  });
  return {
    statuses: fallbackStatuses,
    source: sourceName,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchLiveStatusPayload() {
  try {
    return await fetchLiveStatusesFromCrawl();
  } catch (error) {
    const collectorUrl = process.env.SOOP_COLLECTOR_URL;
    const envJson = process.env.SOOP_LIVE_STATUS_JSON;

    if (envJson) {
      return {
        ...mergeFallbackLiveStatuses(JSON.parse(envJson), 'env_json'),
        warning: `SOOP crawl fallback used: ${error.message}`,
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
        ...mergeFallbackLiveStatuses(raw, 'collector'),
        warning: `SOOP crawl fallback used: ${error.message}`,
      };
    }

    return {
      statuses: buildFallbackStatuses(),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: `SOOP crawl unavailable: ${error.message}`,
    };
  }
}

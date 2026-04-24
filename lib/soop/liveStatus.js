import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';

export const SOOP_LIVE_CACHE_KEY = 'soop:live-status:v1';
export const SOOP_LIVE_CACHE_TTL_SECONDS = 60;
const SOOP_BROAD_LIST_URL = 'https://openapi.sooplive.com/broad/list';
const SOOP_BROAD_LIST_PAGE_LIMIT = 5;

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

export function buildFallbackStatuses() {
  return buildMemberList().reduce((acc, member) => {
    acc[member.nickname] = {
      nickname: member.nickname,
      stationId: member.stationId,
      stationUrl: member.station || '',
      liveUrl: member.station || '',
      isLive: false,
      title: '',
      fetchedAt: null,
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

async function fetchBroadListPage(clientId, pageNo) {
  const params = new URLSearchParams({
    client_id: clientId,
    order_type: 'broad_start',
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

async function fetchLiveStatusesFromBroadList() {
  const clientId = process.env.SOOP_CLIENT_ID;
  if (!clientId) {
    throw new Error('SOOP_CLIENT_ID is not set');
  }

  const memberList = buildMemberList();
  const fallbackStatuses = buildFallbackStatuses();
  const targetIds = new Set(memberList.map((member) => member.stationId).filter(Boolean));
  const matchedIds = new Set();

  for (let pageNo = 1; pageNo <= SOOP_BROAD_LIST_PAGE_LIMIT; pageNo += 1) {
    const payload = await fetchBroadListPage(clientId, pageNo);
    const broadItems = Array.isArray(payload?.broad) ? payload.broad : [];

    broadItems.forEach((item) => {
      const userId = String(item?.user_id || '').trim();
      if (!userId || !targetIds.has(userId)) return;

      const member = memberList.find((entry) => entry.stationId === userId);
      if (!member) return;

      matchedIds.add(userId);
      fallbackStatuses[member.nickname] = {
        nickname: member.nickname,
        stationId: userId,
        stationUrl: member.station || '',
        liveUrl: `https://play.sooplive.com/${userId}/${item?.broad_no || ''}`,
        isLive: true,
        title: String(item?.broad_title || '').trim(),
        fetchedAt: new Date().toISOString(),
        broadNo: String(item?.broad_no || '').trim(),
        viewerCount: Number(item?.total_view_cnt || 0),
        thumbnailUrl: item?.broad_thumb ? `https:${item.broad_thumb}` : '',
      };
    });

    if (matchedIds.size === targetIds.size) {
      break;
    }
  }

  return {
    statuses: fallbackStatuses,
    source: 'soop_broad_list',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchLiveStatusPayload() {
  try {
    return await fetchLiveStatusesFromBroadList();
  } catch (error) {
    const collectorUrl = process.env.SOOP_COLLECTOR_URL;
    const envJson = process.env.SOOP_LIVE_STATUS_JSON;

    if (envJson) {
      const raw = JSON.parse(envJson);
      const fallbackStatuses = buildFallbackStatuses();
      Object.entries(raw?.statuses || raw || {}).forEach(([key, value]) => {
        const source = value && typeof value === 'object' ? value : { isLive: value };
        const nickname = String(source.nickname || source.member || source.name || key || '').trim();
        if (!nickname || !fallbackStatuses[nickname]) return;
        fallbackStatuses[nickname] = {
          ...fallbackStatuses[nickname],
          isLive: typeof source.isLive === 'boolean' ? source.isLive : source.is_live === true || source.live === true || source.onAir === true,
          title: source.title || source.liveTitle || source.broadcastTitle || '',
          liveUrl: source.liveUrl || source.streamUrl || source.url || fallbackStatuses[nickname].stationUrl,
          fetchedAt: source.fetchedAt || source.updatedAt || null,
        };
      });
      return {
        statuses: fallbackStatuses,
        source: 'env_json',
        fetchedAt: new Date().toISOString(),
        warning: `SOOP broad/list fallback used: ${error.message}`,
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
      const fallbackStatuses = buildFallbackStatuses();
      Object.entries(raw?.statuses || raw || {}).forEach(([key, value]) => {
        const source = value && typeof value === 'object' ? value : { isLive: value };
        const nickname = String(source.nickname || source.member || source.name || key || '').trim();
        if (!nickname || !fallbackStatuses[nickname]) return;
        fallbackStatuses[nickname] = {
          ...fallbackStatuses[nickname],
          isLive: typeof source.isLive === 'boolean' ? source.isLive : source.is_live === true || source.live === true || source.onAir === true,
          title: source.title || source.liveTitle || source.broadcastTitle || '',
          liveUrl: source.liveUrl || source.streamUrl || source.url || fallbackStatuses[nickname].stationUrl,
          fetchedAt: source.fetchedAt || source.updatedAt || null,
        };
      });
      return {
        statuses: fallbackStatuses,
        source: 'collector',
        fetchedAt: new Date().toISOString(),
        warning: `SOOP broad/list fallback used: ${error.message}`,
      };
    }

    return {
      statuses: buildFallbackStatuses(),
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
      warning: `SOOP broad/list unavailable: ${error.message}`,
    };
  }
}

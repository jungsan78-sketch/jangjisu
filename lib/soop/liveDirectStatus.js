const SOOP_STATION_STATUS_URLS = [
  'https://st.sooplive.com/api/get_station_status.php',
  'https://st.sooplive.co.kr/api/get_station_status.php',
];

const DIRECT_STATUS_TIMEOUT_MS = 3000;
const DIRECT_STATUS_CONCURRENCY = 4;

function createFetchedAt() {
  return new Date().toISOString();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DIRECT_STATUS_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonLike(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
  const start = raw.indexOf('(');
  const end = raw.lastIndexOf(')');
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start + 1, end));
  return JSON.parse(raw);
}

function hasLiveStart(value) {
  const text = String(value || '').trim();
  return Boolean(text && text !== '0000-00-00 00:00:00' && text.toLowerCase() !== 'null');
}

function toNumber(value) {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function makeUnknownStatus(member, reason) {
  return {
    nickname: member.nickname,
    stationId: member.stationId,
    stationUrl: member.station || '',
    liveUrl: `https://play.sooplive.com/${member.stationId || ''}/null`,
    isLive: false,
    liveState: 'unknown',
    directSource: 'station_status',
    directError: reason || 'unknown',
    stationNo: '',
    broadStart: '',
    fetchedAt: createFetchedAt(),
  };
}

function normalizeStationStatus(member, payload, sourceUrl) {
  const data = payload?.DATA || payload?.data || {};
  const resultCode = Number(payload?.RESULT ?? payload?.result ?? 0);
  const broadStart = String(data?.broad_start || data?.broadStart || '').trim();
  const stationNo = String(data?.station_no || data?.stationNo || '').trim();
  const userId = String(data?.user_id || data?.userId || member.stationId || '').trim();
  const userNick = String(data?.user_nick || data?.userNick || '').trim();
  const hasValidData = resultCode === 1 && Boolean(userId || stationNo || userNick);
  const isLive = hasLiveStart(broadStart);
  const liveState = isLive ? 'confirmed_live' : (hasValidData ? 'confirmed_offline' : 'unknown');

  return {
    nickname: member.nickname,
    stationId: member.stationId,
    stationUrl: member.station || '',
    liveUrl: isLive ? `https://play.sooplive.com/${member.stationId || ''}` : `https://play.sooplive.com/${member.stationId || ''}/null`,
    isLive,
    liveState,
    directSource: 'station_status',
    directUrl: sourceUrl,
    directResult: resultCode,
    stationNo,
    soopNickname: userNick,
    broadStart,
    fanCount: toNumber(data?.fan_cnt),
    totalVisitCount: toNumber(data?.total_visit_cnt),
    totalOkCount: toNumber(data?.total_ok_cnt),
    todayVisitCount: toNumber(data?.today_visit_cnt),
    todayOkCount: toNumber(data?.today_ok_cnt),
    totalSubCount: toNumber(data?.total_sub_cnt),
    totalBroadTime: toNumber(data?.total_broad_time),
    fetchedAt: createFetchedAt(),
  };
}

async function fetchMemberDirectStatus(member) {
  if (!member?.stationId) return makeUnknownStatus(member, 'missing stationId');

  let lastError = '';
  for (const baseUrl of SOOP_STATION_STATUS_URLS) {
    const url = `${baseUrl}?${new URLSearchParams({ szBjId: member.stationId }).toString()}`;
    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          Referer: `https://play.sooplive.com/${member.stationId}`,
          'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
        },
        cache: 'no-store',
      });
      const text = await response.text();
      if (!response.ok) {
        lastError = `station status returned ${response.status}`;
        continue;
      }
      const payload = parseJsonLike(text);
      return normalizeStationStatus(member, payload, url);
    } catch (error) {
      lastError = error?.message || 'station status request failed';
    }
  }

  return makeUnknownStatus(member, lastError);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;
  const workerCount = Math.min(concurrency, items.length || 1);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }));

  return results;
}

export async function fetchDirectLiveStatusMap(memberList) {
  const statuses = await mapWithConcurrency(memberList, DIRECT_STATUS_CONCURRENCY, fetchMemberDirectStatus);
  const statusesByNickname = {};

  statuses.forEach((status) => {
    if (!status?.nickname) return;
    statusesByNickname[status.nickname] = status;
  });

  const confirmedLiveCount = statuses.filter((status) => status?.liveState === 'confirmed_live').length;
  const confirmedOfflineCount = statuses.filter((status) => status?.liveState === 'confirmed_offline').length;
  const unknownCount = statuses.filter((status) => status?.liveState === 'unknown').length;

  return {
    statusesByNickname,
    available: confirmedLiveCount + confirmedOfflineCount > 0,
    requestedCount: memberList.length,
    fulfilledCount: statuses.length - unknownCount,
    confirmedLiveCount,
    confirmedOfflineCount,
    unknownCount,
  };
}

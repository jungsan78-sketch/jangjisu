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

function toNumber(value) {
  const number = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function normalizeThumbnail(value, broadNo) {
  const text = String(value || '').trim();
  if (text.startsWith('//')) return `https:${text}`;
  if (text.startsWith('http')) return text;
  return /^\d+$/.test(String(broadNo || '')) ? `https://liveimg.sooplive.com/${broadNo}` : '';
}

function buildBroadUrl(stationId) {
  return `https://api-channel.sooplive.com/v1.1/channel/${stationId}/home/section/broad`;
}

function makeUnknownStatus(member, reason) {
  return {
    nickname: member.nickname,
    stationId: member.stationId,
    stationUrl: member.station || '',
    liveUrl: `https://play.sooplive.com/${member.stationId || ''}/null`,
    isLive: false,
    liveState: 'unknown',
    directSource: 'channel_broad_section',
    directError: reason || 'unknown',
    broadStart: '',
    broadNo: '',
    fetchedAt: createFetchedAt(),
  };
}

function normalizeBroadPayload(member, payload, sourceUrl) {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};
  const broadNo = String(data?.broadNo || data?.broad_no || '').trim();
  const isLive = Boolean(broadNo);

  return {
    nickname: member.nickname,
    stationId: member.stationId,
    stationUrl: member.station || '',
    liveUrl: isLive ? `https://play.sooplive.com/${member.stationId}/${broadNo}` : `https://play.sooplive.com/${member.stationId || ''}/null`,
    isLive,
    liveState: isLive ? 'confirmed_live' : 'confirmed_offline',
    directSource: 'channel_broad_section',
    directUrl: sourceUrl,
    broadNo,
    title: String(data?.broadTitle || data?.broad_title || '').trim(),
    broadStart: String(data?.broadStart || data?.broad_start || '').trim(),
    viewerCount: toNumber(data?.currentSumViewer ?? data?.current_sum_viewer ?? data?.viewerCount),
    totalViewCount: toNumber(data?.totalViewCnt ?? data?.total_view_cnt),
    categoryName: String(data?.categoryName || data?.category_name || '').trim(),
    hashTags: Array.isArray(data?.hashTags) ? data.hashTags : [],
    thumbnailUrl: normalizeThumbnail(data?.thumbnailUrl || data?.broadThumb || data?.broad_thumb || data?.thumb, broadNo),
    fetchedAt: createFetchedAt(),
  };
}

async function fetchMemberDirectStatus(member) {
  if (!member?.stationId) return makeUnknownStatus(member, 'missing stationId');

  const url = buildBroadUrl(member.stationId);
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Referer: `https://www.sooplive.com/station/${member.stationId}`,
        'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
      },
      cache: 'no-store',
    });
    const text = await response.text();
    if (!response.ok) return makeUnknownStatus(member, `channel broad returned ${response.status}`);
    const payload = parseJsonLike(text);
    return normalizeBroadPayload(member, payload, url);
  } catch (error) {
    return makeUnknownStatus(member, error?.message || 'channel broad request failed');
  }
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

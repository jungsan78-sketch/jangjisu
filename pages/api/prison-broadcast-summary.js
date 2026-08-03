import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { readBroadcastSummaryCache, writeBroadcastSummaryCache } from '../../lib/prisonBroadcastSummaryCache';
import { getReplayMonthStorageTtl, isReplayMonthCacheFresh, resolveReplayMonth } from '../../lib/replayMonthWindow';

const CACHE_VERSION = 'v18-member-start-date';
const MEMBER_LIMIT = 16;
const PAGE_LIMIT = 3;
const PER_PAGE = 60;
const DETAIL_LIMIT = 32;
const DETAIL_CONCURRENCY = 8;
const LIST_TIMEOUT_MS = 6000;
const DETAIL_TIMEOUT_MS = 4000;
const REQUEST_HEADERS = {
  accept: 'application/json, text/plain, */*',
  origin: 'https://www.sooplive.com',
  referer: 'https://www.sooplive.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
};
const refreshPromises = new Map();

function getMemberId(member) {
  return String(member.station || '').split('/').filter(Boolean).pop() || '';
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function cacheKey(monthInfo, requestedMemberId) {
  return `prison:member-replays:${monthInfo.year}-${pad(monthInfo.month)}:${requestedMemberId}:${CACHE_VERSION}`;
}

function toDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{10}$/.test(raw)) {
    const date = new Date(Number(raw) * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (/^\d{13}$/.test(raw)) {
    const date = new Date(Number(raw));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const normalized = raw.replace(/\./g, '-').replace(/\s+/g, 'T');
  const withTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized.includes('T') ? normalized : `${normalized}T00:00:00`}+09:00`;
  const date = new Date(withTimezone);
  if (!Number.isNaN(date.getTime())) return date;
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function getKstParts(date) {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function isSameKstMonth(date, monthInfo) {
  if (!date) return false;
  const parts = getKstParts(date);
  return parts.year === monthInfo.year && parts.month === monthInfo.month;
}

function isReplayCandidateDate(date, monthInfo) {
  if (!date) return false;
  const monthStart = Date.UTC(monthInfo.year, monthInfo.month - 1, 1) - 9 * 60 * 60 * 1000;
  const nextMonthGrace = Date.UTC(monthInfo.year, monthInfo.month, 15) - 9 * 60 * 60 * 1000;
  const value = date.getTime();
  return value >= monthStart && value < nextMonthGrace;
}

function formatKstDateKey(date) {
  const parts = getKstParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function pickFirst(object, keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null && object?.[key] !== '') return object[key];
  }
  return '';
}

function findFirstByKey(node, keyPattern) {
  if (!node) return '';
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findFirstByKey(item, keyPattern);
      if (found !== '') return found;
    }
    return '';
  }
  if (typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (keyPattern.test(key) && value !== undefined && value !== null && value !== '') return value;
    }
    for (const value of Object.values(node)) {
      const found = findFirstByKey(value, keyPattern);
      if (found !== '') return found;
    }
  }
  return '';
}

function secondsFromDuration(value) {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value > 100000 ? Math.floor(value / 1000) : Math.floor(value);
  const text = String(value).trim();
  if (!text) return 0;

  if (/^\d+$/.test(text)) {
    const number = Number(text);
    return number > 100000 ? Math.floor(number / 1000) : number;
  }

  const koreanHour = text.match(/(\d+)\s*시간/);
  const koreanMinute = text.match(/(\d+)\s*분/);
  const koreanSecond = text.match(/(\d+)\s*초/);
  if (koreanHour || koreanMinute || koreanSecond) {
    return Number(koreanHour?.[1] || 0) * 3600 + Number(koreanMinute?.[1] || 0) * 60 + Number(koreanSecond?.[1] || 0);
  }

  const parts = text.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  if (!total) return '';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}시간${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  return `${minutes}분`;
}

function normalizeTitle(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/[\[\]【】]/g, '')
    .trim();
}

function stripDecorations(value) {
  return String(value || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, ' ')
    .replace(/[\uFE0E\uFE0F]/g, '')
    .replace(/[|｜]+/g, ' ');
}

function cleanDisplayTitle(value) {
  const normalized = normalizeTitle(value);
  const cleaned = stripDecorations(normalized)
    .replace(/뉴걸\s*[\/·|+-]?\s*장지수용소/g, '')
    .replace(/장지수용소/g, '')
    .replace(/뻐스\s*시간/g, '')
    .replace(/룰렛\s*\d+(?:\s*[\/.,]\s*\d+)*/g, '')
    .replace(/룰렛/g, '')
    .replace(/\d+\s*\/\s*\d+(?:\s*\/\s*\d+)*/g, '')
    .replace(/\d+\s*연차\s*\/\s*확정\s*[oOㅇ○]?/g, '')
    .replace(/\d+\s*연차/g, '')
    .replace(/확정\s*[oOㅇ○]/g, '')
    .replace(/\s*([+·])\s*/g, ' $1 ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[-+·/]\s*/g, '')
    .replace(/\s*[-+·/]\s*$/g, '')
    .trim();
  return cleaned || stripDecorations(normalized).trim() || '다시보기';
}

function scoreVodArray(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((score, item) => {
    if (!item || typeof item !== 'object') return score;
    const hasId = pickFirst(item, ['title_no', 'titleNo', 'n_title_no', 'nTitleNo', 'vod_no', 'vodNo', 'id', 'seq']) || findFirstByKey(item, /(title.?no|vod.?no|nTitleNo|seq|id)$/i);
    const hasTitle = pickFirst(item, ['title', 'subject', 'title_name', 'titleName', 'vod_title', 'vodTitle', 'contents']) || findFirstByKey(item, /(title|subject|contents)$/i);
    const hasDate = pickFirst(item, ['reg_date', 'regDate', 'reg_datetime', 'created_at', 'createdAt', 'start_date', 'startDate', 'broad_start', 'broadStart', 'write_date', 'writeDate']) || findFirstByKey(item, /(reg.?date|created.?at|start.?date|broad.?start|write.?date)$/i);
    return score + (hasId ? 4 : 0) + (hasTitle ? 2 : 0) + (hasDate ? 3 : 0);
  }, 0);
}

function collectArrays(node, arrays = []) {
  if (!node) return arrays;
  if (Array.isArray(node)) {
    arrays.push(node);
    node.forEach((item) => collectArrays(item, arrays));
    return arrays;
  }
  if (typeof node === 'object') Object.values(node).forEach((value) => collectArrays(value, arrays));
  return arrays;
}

function extractList(json) {
  const direct = [json?.data?.list, json?.data?.vods, json?.data?.items, json?.data?.contents, json?.data?.data, json?.data, json?.list, json?.items, json?.contents].filter(Array.isArray);
  return [...direct, ...collectArrays(json, [])].sort((a, b) => scoreVodArray(b) - scoreVodArray(a) || b.length - a.length)[0] || [];
}

function parseJsonMaybe(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const trimmed = String(text).trim();
  const first = trimmed.search(/[\[{]/);
  if (first >= 0) {
    try { return JSON.parse(trimmed.slice(first)); } catch {}
  }
  return null;
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || LIST_TIMEOUT_MS));
  const { timeoutMs, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(url, { ...fetchOptions, headers: { ...REQUEST_HEADERS, ...(fetchOptions.headers || {}) }, cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`request failed ${response.status}`);
  return response.text();
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  return parseJsonMaybe(text) || {};
}

function collectDurationValues(node, bucket = []) {
  if (!node || bucket.length > 500) return bucket;
  if (Array.isArray(node)) {
    node.forEach((item) => collectDurationValues(item, bucket));
    return bucket;
  }
  if (typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      if (/(duration|play.?time|running.?time|broad.?time|total.?time|file.?duration|vod.?duration|view.?time|seek.?time|video.?time|length)$/i.test(key)) {
        const seconds = secondsFromDuration(value);
        if (seconds > 0 && seconds < 7 * 24 * 3600) bucket.push(seconds);
      }
      collectDurationValues(value, bucket);
    });
  }
  return bucket;
}

function extractDurationFromObject(json) {
  const values = collectDurationValues(json, []);
  return values.length ? Math.max(...values) : 0;
}

function extractDurationFromText(text) {
  const source = String(text || '');
  const patterns = [
    /(?:vod-duration|vod_duration|duration|play_time|running_time|total_time|file_duration|broad_time|video_time|seek_time)[=:"'\s]+(\d{1,3}:\d{2}:\d{2})/i,
    /(?:vod-duration|vod_duration|duration|play_time|running_time|total_time|file_duration|broad_time|video_time|seek_time)[=:"'\s]+(\d{1,5}:\d{2})/i,
    /(?:vod-duration|vod_duration|duration|play_time|running_time|total_time|file_duration|broad_time|video_time|seek_time)[=:"'\s]+(\d{2,8})/i,
    /"(?:duration|playTime|play_time|runningTime|running_time|totalTime|total_time|fileDuration|file_duration)"\s*:\s*"?(\d{1,3}:\d{2}:\d{2}|\d{1,5}:\d{2}|\d{2,8})"?/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return secondsFromDuration(match[1]);
  }
  return 0;
}

function normalizeThumbnailUrl(value, depth = 0) {
  if (!value || depth > 4) return '';
  if (typeof value === 'string') {
    const url = value.trim().replace(/\\\//g, '/').replace(/&amp;/g, '&');
    const normalized = url.startsWith('//') ? `https:${url}` : url;
    if (!/^https?:\/\//i.test(normalized) || /\/LOGO\//i.test(normalized)) return '';
    return normalized;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = normalizeThumbnailUrl(item, depth + 1);
      if (url) return url;
    }
    return '';
  }
  if (typeof value === 'object') {
    const preferredKeys = ['url', 'src', 'imageUrl', 'image_url', 'thumbnailUrl', 'thumbnail_url', 'thumbUrl', 'thumb_url', 'path'];
    for (const key of preferredKeys) {
      const url = normalizeThumbnailUrl(value[key], depth + 1);
      if (url) return url;
    }
  }
  return '';
}

function extractThumbnailUrl(item) {
  const directKeys = [
    'thumbnailUrl', 'thumbnail_url', 'thumbnail', 'thumbUrl', 'thumb_url', 'thumb',
    'previewImage', 'preview_image', 'previewImg', 'preview_img', 'snapshot',
    'vodImage', 'vod_image', 'vodThumb', 'vod_thumb', 'imageUrl', 'image_url', 'image',
  ];
  for (const key of directKeys) {
    const url = normalizeThumbnailUrl(item?.[key]);
    if (url) return url;
  }
  const nested = findFirstByKey(item, /(thumbnail|thumb|preview.?image|preview.?img|snapshot|vod.?image|vod.?thumb|image.?url|img.?url)/i);
  return normalizeThumbnailUrl(nested);
}

function parseVodItem(item, member, monthInfo) {
  const endedAtValue = pickFirst(item, [
    'reg_date', 'regDate', 'reg_datetime', 'regDatetime', 'created_at', 'createdAt',
    'start_date', 'startDate', 'start_time', 'startTime', 'broad_start', 'broadStart',
    'broad_start_date', 'broadStartDate', 'broad_start_time', 'broadStartTime', 'write_date', 'writeDate',
  ]) || findFirstByKey(item, /(reg.?date|created.?at|start.?date|start.?time|broad.?start|write.?date)$/i);
  const endedAt = toDate(endedAtValue);
  if (!isReplayCandidateDate(endedAt, monthInfo)) return null;

  const titleNo = String(pickFirst(item, ['title_no', 'titleNo', 'n_title_no', 'nTitleNo', 'vod_no', 'vodNo', 'id', 'seq']) || findFirstByKey(item, /(title.?no|vod.?no|nTitleNo|seq)$/i));
  if (!titleNo) return null;

  const durationSeconds = secondsFromDuration(pickFirst(item, [
    'duration', 'duration_time', 'durationTime', 'play_time', 'playTime', 'playtime',
    'total_time', 'totalTime', 'total_file_duration', 'file_duration', 'fileDuration',
    'running_time', 'runningTime', 'broad_time', 'broadTime', 'view_time', 'viewTime', 'vod_duration', 'vodDuration',
  ]) || findFirstByKey(item, /(duration|play.?time|running.?time|broad.?time|total.?time|file.?duration|vod.?duration|view.?time)$/i));
  const originalTitle = normalizeTitle(pickFirst(item, ['title', 'subject', 'title_name', 'titleName', 'vod_title', 'vodTitle', 'contents', 'content']) || findFirstByKey(item, /(title|subject|contents)$/i)) || '다시보기';
  const title = cleanDisplayTitle(originalTitle);
  const bjId = getMemberId(member);
  const thumbnailUrl = extractThumbnailUrl(item);

  return {
    id: `${bjId}:${titleNo}`,
    titleNo,
    member: member.nickname,
    memberImage: member.image || '',
    bjId,
    dateKey: formatKstDateKey(endedAt),
    endedAt: endedAt.toISOString(),
    title,
    originalTitle,
    durationSeconds,
    durationText: formatDuration(durationSeconds),
    thumbnailUrl,
    url: `https://vod.sooplive.com/player/${titleNo}`,
  };
}

function assignBroadcastStart(vod, monthInfo) {
  const endedAt = toDate(vod.endedAt || vod.startedAt);
  if (!endedAt) return null;
  const durationSeconds = Math.max(0, Number(vod.durationSeconds || 0));
  const startedAt = durationSeconds ? new Date(endedAt.getTime() - durationSeconds * 1000) : endedAt;
  if (!isSameKstMonth(startedAt, monthInfo)) return null;
  return {
    ...vod,
    startedAt: startedAt.toISOString(),
    dateKey: formatKstDateKey(startedAt),
    startDateEstimated: !durationSeconds,
  };
}

function dedupeVods(vods) {
  const map = new Map();
  vods.forEach((vod) => {
    const key = vod.titleNo ? `${vod.bjId}:${vod.titleNo}` : `${vod.bjId}:${vod.dateKey}:${normalizeTitle(vod.title).toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || Number(vod.durationSeconds || 0) > Number(existing.durationSeconds || 0)) map.set(key, vod);
  });
  return Array.from(map.values()).sort((a, b) => String(a.endedAt || a.startedAt).localeCompare(String(b.endedAt || b.startedAt)));
}

async function fetchMemberVods(member, monthInfo) {
  const bjId = getMemberId(member);
  if (!bjId) return [];
  const collected = [];
  let requestSucceeded = false;

  for (let page = 1; page <= PAGE_LIMIT; page += 1) {
    const query = new URLSearchParams({ startDate: '', endDate: '', keyword: '', orderBy: 'reg_date', perPage: String(PER_PAGE), page: String(page), field: 'title,contents,user_nick,user_id' });
    const url = `https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(bjId)}/vod/review?${query.toString()}`;

    let list = [];
    try {
      const json = await fetchJson(url, { headers: { referer: 'https://www.sooplive.com/' } });
      requestSucceeded = true;
      list = extractList(json);
    } catch {
      return { success: requestSucceeded, vods: dedupeVods(collected) };
    }

    if (!list.length) break;
    const parsed = list.map((item) => parseVodItem(item, member, monthInfo)).filter(Boolean);
    collected.push(...parsed);
    if (list.length < PER_PAGE) break;
  }

  return { success: requestSucceeded, vods: dedupeVods(collected) };
}

async function fetchPlaylistDuration(vod) {
  try {
    const params = new URLSearchParams({ szDataType: 'PLAYLIST', nTitleNo: vod.titleNo, szBjId: vod.bjId, szFileType: 'REVIEW', platform: 'pc', nPlaylistIdx: '0', nLimit: '100', nVersion: '2', szDataSrcType: 'reload' });
    const text = await fetchText('https://stbbs.sooplive.com/api/get_vod_list.php', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', origin: 'https://vod.sooplive.com', referer: vod.url },
      body: params.toString(),
      timeoutMs: DETAIL_TIMEOUT_MS,
    });
    const json = parseJsonMaybe(text);
    return (json ? extractDurationFromObject(json) : 0) || extractDurationFromText(text);
  } catch {
    return 0;
  }
}

async function fetchVodDetail(vod) {
  let durationSeconds = Number(vod.durationSeconds || 0);

  try {
    const body = new URLSearchParams({ nTitleNo: vod.titleNo, nApiLevel: '11', nPlaylistIdx: '0' });
    const detailText = await fetchText('https://api.m.sooplive.com/station/video/a/view', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', origin: 'https://vod.sooplive.com', referer: vod.url },
      body: body.toString(),
      timeoutMs: DETAIL_TIMEOUT_MS,
    });
    const detailJson = parseJsonMaybe(detailText);
    if (detailJson) durationSeconds = durationSeconds || extractDurationFromObject(detailJson);
    durationSeconds = durationSeconds || extractDurationFromText(detailText);
  } catch {}

  durationSeconds = durationSeconds || await fetchPlaylistDuration(vod);

  if (!durationSeconds) {
    try {
      const playerText = await fetchText(vod.url, { headers: { origin: 'https://vod.sooplive.com', referer: `https://www.sooplive.com/station/${vod.bjId}/vod/review` }, timeoutMs: DETAIL_TIMEOUT_MS });
      durationSeconds = extractDurationFromText(playerText);
    } catch {}
  }

  return { ...vod, durationSeconds, durationText: formatDuration(durationSeconds) };
}

function fillEstimatedDurations(vods) {
  const byMember = new Map();
  vods.forEach((vod) => {
    const list = byMember.get(vod.bjId) || [];
    list.push(vod);
    byMember.set(vod.bjId, list);
  });

  byMember.forEach((list) => {
    list.sort((a, b) => new Date(a.endedAt || a.startedAt).getTime() - new Date(b.endedAt || b.startedAt).getTime());
    list.forEach((vod, index) => {
      if (vod.durationSeconds) return;
      const next = list[index + 1];
      if (!next) return;
      const gap = Math.floor((new Date(next.endedAt || next.startedAt).getTime() - new Date(vod.endedAt || vod.startedAt).getTime()) / 1000);
      if (gap >= 10 * 60 && gap <= 18 * 3600) {
        vod.durationSeconds = gap;
        vod.durationText = formatDuration(gap);
        vod.estimatedDuration = true;
      }
    });
  });

  return vods;
}

function buildCalendarItems(vods, monthInfo) {
  const daysInMonth = new Date(monthInfo.year, monthInfo.month, 0).getDate();
  const byDay = new Map();

  vods.forEach((vod) => {
    const day = Number(String(vod.dateKey).slice(-2));
    if (!day || day < 1 || day > daysInMonth) return;
    const list = byDay.get(day) || [];
    list.push(vod);
    byDay.set(day, list);
  });

  return Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const broadcasts = dedupeVods(byDay.get(dayNumber) || []);
    const totalSeconds = broadcasts.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0);
    return { dayNumber, broadcasts, totalSeconds, totalDurationText: formatDuration(totalSeconds) || '0분' };
  });
}

function buildMemberStats(vods) {
  const memberMap = new Map(ALL_PRISON_MEMBERS.map((member) => [member.nickname, member]));
  const statsMap = new Map();

  vods.forEach((vod) => {
    const existing = statsMap.get(vod.member) || { member: vod.member, memberImage: vod.memberImage || memberMap.get(vod.member)?.image || '', totalSeconds: 0, broadcastCount: 0 };
    existing.totalSeconds += Number(vod.durationSeconds || 0);
    existing.broadcastCount += 1;
    statsMap.set(vod.member, existing);
  });

  ALL_PRISON_MEMBERS.forEach((member) => {
    if (!statsMap.has(member.nickname)) statsMap.set(member.nickname, { member: member.nickname, memberImage: member.image || '', totalSeconds: 0, broadcastCount: 0 });
  });

  return Array.from(statsMap.values()).map((stat) => ({ ...stat, totalDurationText: formatDuration(stat.totalSeconds) || '0분' })).sort((a, b) => {
    if (a.member === '장지수') return -1;
    if (b.member === '장지수') return 1;
    return b.totalSeconds - a.totalSeconds || a.member.localeCompare(b.member, 'ko');
  });
}

async function buildPayload(monthInfo, requestedMemberId) {
  const members = ALL_PRISON_MEMBERS
    .filter((member) => getMemberId(member) === requestedMemberId)
    .slice(0, MEMBER_LIMIT);
  const settled = await Promise.allSettled(members.map((member) => fetchMemberVods(member, monthInfo)));
  const outcomes = settled.map((result) => (result.status === 'fulfilled' ? result.value : { success: false, vods: [] }));
  const successfulMembers = outcomes.filter((outcome) => outcome.success).length;
  if (!successfulMembers) throw new Error('all SOOP member requests failed');
  const listVods = dedupeVods(outcomes.flatMap((outcome) => outcome.vods || []));
  const detailTargets = [...listVods]
    .sort((a, b) => String(b.endedAt || '').localeCompare(String(a.endedAt || '')))
    .filter((vod) => !vod.durationSeconds)
    .slice(0, DETAIL_LIMIT);
  const detailed = [];
  for (let index = 0; index < detailTargets.length; index += DETAIL_CONCURRENCY) {
    const chunk = detailTargets.slice(index, index + DETAIL_CONCURRENCY);
    detailed.push(...await Promise.allSettled(chunk.map(fetchVodDetail)));
  }
  const detailedMap = new Map(detailed.filter((result) => result.status === 'fulfilled').map((result) => [result.value.id, result.value]));
  const vods = fillEstimatedDurations(listVods.map((vod) => detailedMap.get(vod.id) || vod))
    .map((vod) => assignBroadcastStart(vod, monthInfo))
    .filter(Boolean);

  return {
    ok: true,
    sourceType: 'review',
    monthLabel: monthInfo.monthLabel,
    items: buildCalendarItems(vods, monthInfo),
    memberStats: buildMemberStats(vods),
    totalCount: vods.length,
    sourceHealth: { successfulMembers, failedMembers: members.length - successfulMembers, totalMembers: members.length },
    fetchedAt: new Date().toISOString(),
  };
}

async function refreshPayload(key, monthInfo, requestedMemberId, cached, nowDate) {
  if (refreshPromises.has(key)) return refreshPromises.get(key);
  const refreshPromise = (async () => {
    const payload = await buildPayload(monthInfo, requestedMemberId);
    const cachedAt = Date.now();
    const storageTtl = getReplayMonthStorageTtl(monthInfo, nowDate);
    const storage = await writeBroadcastSummaryCache(cached, key, { payload, cachedAt }, storageTtl);
    return { payload, storage };
  })();
  refreshPromises.set(key, refreshPromise);
  try {
    return await refreshPromise;
  } finally {
    if (refreshPromises.get(key) === refreshPromise) refreshPromises.delete(key);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  const nowDate = new Date();
  const monthInfo = resolveReplayMonth(req.query?.month, nowDate);
  if (!monthInfo) {
    return res.status(400).json({
      ok: false,
      message: '이번 달과 저번 달 다시보기만 볼 수 있습니다.',
      cache: 'invalid-month',
    });
  }

  const requestedMemberId = String(req.query?.member || '').trim();
  const requestedMember = ALL_PRISON_MEMBERS.find((member) => getMemberId(member) === requestedMemberId);
  if (!requestedMember) {
    return res.status(400).json({ ok: false, message: '다시보기를 확인할 멤버를 찾지 못했습니다.' });
  }

  const key = cacheKey(monthInfo, requestedMemberId);
  const cached = await readBroadcastSummaryCache(key);
  const now = nowDate.getTime();

  if (isReplayMonthCacheFresh(cached.record, monthInfo, nowDate)) {
    return res.status(200).json({ ...cached.record.payload, monthKind: monthInfo.kind, cache: 'hit', cacheStorage: cached.storage });
  }

  try {
    const { payload, storage } = await refreshPayload(key, monthInfo, requestedMemberId, cached, nowDate);
    return res.status(200).json({ ...payload, monthKind: monthInfo.kind, cache: cached.record?.payload ? 'refresh' : 'miss', cacheStorage: storage });
  } catch {
    if (cached.record?.payload) return res.status(200).json({ ...cached.record.payload, monthKind: monthInfo.kind, cache: 'stale', cacheStorage: cached.storage });
    return res.status(200).json({ ok: false, sourceType: 'review', monthLabel: monthInfo.monthLabel, monthKind: monthInfo.kind, items: [], memberStats: buildMemberStats([]), totalCount: 0, message: 'SOOP 다시보기 기록을 불러오지 못했습니다.', cache: 'unavailable', cacheStorage: cached.storage });
  }
}


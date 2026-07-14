import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo } from '../../lib/scheduleMonth';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_VERSION = 'v9-f12-all-streamer-list';
const MEMBER_LIMIT = 16;
const PAGE_LIMIT = 8;
const PER_PAGE = 60;
const DETAIL_LIMIT = 220;
const REQUEST_HEADERS = {
  accept: 'application/json, text/plain, */*',
  origin: 'https://www.sooplive.com',
  referer: 'https://www.sooplive.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
};

function getMemberId(member) {
  return String(member.station || '').split('/').filter(Boolean).pop() || '';
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function cacheKey(monthInfo) {
  return `prison:broadcast-summary:${monthInfo.year}-${pad(monthInfo.month)}:${CACHE_VERSION}`;
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

function scoreVodArray(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((score, item) => {
    if (!item || typeof item !== 'object') return score;
    const hasId = pickFirst(item, ['title_no', 'titleNo', 'n_title_no', 'nTitleNo', 'vod_no', 'vodNo', 'id', 'seq']);
    const hasTitle = pickFirst(item, ['title', 'subject', 'title_name', 'titleName', 'vod_title', 'vodTitle', 'contents']);
    const hasDate = pickFirst(item, ['reg_date', 'regDate', 'reg_datetime', 'created_at', 'createdAt', 'start_date', 'startDate', 'broad_start', 'broadStart', 'write_date', 'writeDate']);
    return score + (hasId ? 3 : 0) + (hasTitle ? 2 : 0) + (hasDate ? 3 : 0);
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
  const direct = [
    json?.data?.list,
    json?.data?.vods,
    json?.data?.items,
    json?.data?.contents,
    json?.data?.data,
    json?.data,
    json?.list,
    json?.items,
    json?.contents,
  ].filter(Array.isArray);
  return [...direct, ...collectArrays(json, [])]
    .sort((a, b) => scoreVodArray(b) - scoreVodArray(a) || b.length - a.length)[0] || [];
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
  const response = await fetch(url, {
    ...options,
    headers: { ...REQUEST_HEADERS, ...(options.headers || {}) },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`request failed ${response.status}`);
  return response.text();
}

async function fetchJson(url, options = {}) {
  const text = await fetchText(url, options);
  return parseJsonMaybe(text) || {};
}

function collectDurationValues(node, bucket = []) {
  if (!node || bucket.length > 400) return bucket;
  if (Array.isArray(node)) {
    node.forEach((item) => collectDurationValues(item, bucket));
    return bucket;
  }
  if (typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      if (/(duration|play.?time|running.?time|broad.?time|total.?time|file.?duration|vod.?duration|view.?time)$/i.test(key)) {
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
    /(?:vod-duration|vod_duration|duration|play_time|running_time|total_time|file_duration|broad_time)[=:"'\s]+(\d{1,3}:\d{2}:\d{2})/i,
    /(?:vod-duration|vod_duration|duration|play_time|running_time|total_time|file_duration|broad_time)[=:"'\s]+(\d{1,5}:\d{2})/i,
    /(?:vod-duration|vod_duration|duration|play_time|running_time|total_time|file_duration|broad_time)[=:"'\s]+(\d{2,8})/i,
    /"duration"\s*:\s*"?(\d{1,3}:\d{2}:\d{2}|\d{1,5}:\d{2}|\d{2,8})"?/i,
    /"playTime"\s*:\s*"?(\d{1,3}:\d{2}:\d{2}|\d{1,5}:\d{2}|\d{2,8})"?/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return secondsFromDuration(match[1]);
  }
  return 0;
}

function parseVodItem(item, member, monthInfo) {
  const startedAtValue = pickFirst(item, [
    'reg_date', 'regDate', 'reg_datetime', 'regDatetime', 'created_at', 'createdAt',
    'start_date', 'startDate', 'start_time', 'startTime', 'broad_start', 'broadStart',
    'broad_start_date', 'broadStartDate', 'broad_start_time', 'broadStartTime', 'write_date', 'writeDate',
  ]);
  const startedAt = toDate(startedAtValue);
  if (!isSameKstMonth(startedAt, monthInfo)) return null;

  const titleNo = String(pickFirst(item, ['title_no', 'titleNo', 'n_title_no', 'nTitleNo', 'vod_no', 'vodNo', 'id', 'seq']));
  if (!titleNo) return null;

  const durationSeconds = secondsFromDuration(pickFirst(item, [
    'duration', 'duration_time', 'durationTime', 'play_time', 'playTime', 'playtime',
    'total_time', 'totalTime', 'total_file_duration', 'file_duration', 'fileDuration',
    'running_time', 'runningTime', 'broad_time', 'broadTime', 'view_time', 'viewTime', 'vod_duration', 'vodDuration',
  ]));
  const title = normalizeTitle(pickFirst(item, ['title', 'subject', 'title_name', 'titleName', 'vod_title', 'vodTitle', 'contents', 'content'])) || '다시보기';
  const bjId = getMemberId(member);

  return {
    id: `${bjId}:${titleNo}`,
    titleNo,
    member: member.nickname,
    memberImage: member.image || '',
    bjId,
    dateKey: formatKstDateKey(startedAt),
    startedAt: startedAt.toISOString(),
    title,
    durationSeconds,
    durationText: formatDuration(durationSeconds),
    url: `https://vod.sooplive.com/player/${titleNo}`,
  };
}

function dedupeVods(vods) {
  const map = new Map();
  vods.forEach((vod) => {
    const key = vod.titleNo ? `${vod.bjId}:${vod.titleNo}` : `${vod.bjId}:${vod.dateKey}:${normalizeTitle(vod.title).toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || Number(vod.durationSeconds || 0) > Number(existing.durationSeconds || 0)) map.set(key, vod);
  });
  return Array.from(map.values()).sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
}

async function fetchMemberVods(member, monthInfo) {
  const bjId = getMemberId(member);
  if (!bjId) return [];
  const collected = [];

  for (let page = 1; page <= PAGE_LIMIT; page += 1) {
    const query = new URLSearchParams({
      startDate: '',
      endDate: '',
      keyword: '',
      orderBy: 'reg_date',
      perPage: String(PER_PAGE),
      page: String(page),
      field: 'title,contents,user_nick,user_id',
    });
    const url = `https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(bjId)}/vod/all/streamer?${query.toString()}`;

    let list = [];
    try {
      const json = await fetchJson(url, { headers: { referer: 'https://www.sooplive.com/' } });
      list = extractList(json);
    } catch {
      break;
    }

    if (!list.length) break;
    const parsed = list.map((item) => parseVodItem(item, member, monthInfo)).filter(Boolean);
    collected.push(...parsed);
    if (list.length < PER_PAGE) break;
  }

  return dedupeVods(collected);
}

async function fetchVodDetail(vod) {
  let durationSeconds = Number(vod.durationSeconds || 0);

  try {
    const body = new URLSearchParams({ nTitleNo: vod.titleNo, nApiLevel: '11', nPlaylistIdx: '0' });
    const detailText = await fetchText('https://api.m.sooplive.com/station/video/a/view', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', origin: 'https://vod.sooplive.com', referer: vod.url },
      body: body.toString(),
    });
    const detailJson = parseJsonMaybe(detailText);
    if (detailJson) durationSeconds = durationSeconds || extractDurationFromObject(detailJson);
    durationSeconds = durationSeconds || extractDurationFromText(detailText);
  } catch {}

  if (!durationSeconds) {
    try {
      const playerText = await fetchText(vod.url, { headers: { origin: 'https://vod.sooplive.com', referer: `https://www.sooplive.com/station/${vod.bjId}/vod` } });
      durationSeconds = extractDurationFromText(playerText);
    } catch {}
  }

  return {
    ...vod,
    durationSeconds,
    durationText: formatDuration(durationSeconds),
  };
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
    const existing = statsMap.get(vod.member) || {
      member: vod.member,
      memberImage: vod.memberImage || memberMap.get(vod.member)?.image || '',
      totalSeconds: 0,
      broadcastCount: 0,
    };
    existing.totalSeconds += Number(vod.durationSeconds || 0);
    existing.broadcastCount += 1;
    statsMap.set(vod.member, existing);
  });

  ALL_PRISON_MEMBERS.forEach((member) => {
    if (!statsMap.has(member.nickname)) {
      statsMap.set(member.nickname, {
        member: member.nickname,
        memberImage: member.image || '',
        totalSeconds: 0,
        broadcastCount: 0,
      });
    }
  });

  return Array.from(statsMap.values())
    .map((stat) => ({ ...stat, totalDurationText: formatDuration(stat.totalSeconds) || '0분' }))
    .sort((a, b) => {
      if (a.member === '장지수') return -1;
      if (b.member === '장지수') return 1;
      return b.totalSeconds - a.totalSeconds || a.member.localeCompare(b.member, 'ko');
    });
}

async function buildPayload(monthInfo) {
  const members = ALL_PRISON_MEMBERS.slice(0, MEMBER_LIMIT);
  const settled = await Promise.allSettled(members.map((member) => fetchMemberVods(member, monthInfo)));
  const listVods = dedupeVods(settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])));
  const detailed = await Promise.allSettled(listVods.slice(0, DETAIL_LIMIT).map(fetchVodDetail));
  const detailedMap = new Map(detailed
    .filter((result) => result.status === 'fulfilled')
    .map((result) => [result.value.id, result.value]));
  const vods = listVods.map((vod) => detailedMap.get(vod.id) || vod);

  return {
    ok: true,
    sourceType: 'all-streamer',
    monthLabel: monthInfo.monthLabel,
    items: buildCalendarItems(vods, monthInfo),
    memberStats: buildMemberStats(vods),
    totalCount: vods.length,
    fetchedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const monthInfo = getKstMonthInfo();
  const key = cacheKey(monthInfo);
  const cached = await getCachedJson(key);
  const now = Date.now();

  if (cached?.payload && cached.cachedAt && now - cached.cachedAt < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json({ ...cached.payload, cache: 'hit' });
  }

  try {
    const payload = await buildPayload(monthInfo);
    await setCachedJson(key, { payload, cachedAt: now }, CACHE_TTL_SECONDS);
    return res.status(200).json({ ...payload, cache: cached?.payload ? 'refresh' : 'miss' });
  } catch {
    if (cached?.payload) return res.status(200).json({ ...cached.payload, cache: 'stale' });
    return res.status(200).json({
      ok: false,
      sourceType: 'all-streamer',
      monthLabel: monthInfo.monthLabel,
      items: [],
      memberStats: buildMemberStats([]),
      totalCount: 0,
      message: 'SOOP 다시보기 기록을 불러오지 못했습니다.',
      cache: 'unavailable',
    });
  }
}

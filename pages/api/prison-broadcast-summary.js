import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo } from '../../lib/scheduleMonth';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_VERSION = 'v2';
const MEMBER_LIMIT = 16;
const DETAIL_LIMIT = 80;
const REQUEST_HEADERS = {
  accept: 'application/json, text/plain, */*',
  origin: 'https://www.sooplive.com',
  referer: 'https://www.sooplive.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
};

function getMemberId(member) {
  return String(member.station || '').split('/').filter(Boolean).pop() || '';
}

function getReviewPageUrl(bjId) {
  return `https://www.sooplive.com/station/${encodeURIComponent(bjId)}/vod/review`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function monthKey(monthInfo) {
  return `${monthInfo.year}-${pad(monthInfo.month)}`;
}

function cacheKey(monthInfo) {
  return `prison:broadcast-summary:${monthKey(monthInfo)}:${CACHE_VERSION}`;
}

function toDate(value) {
  if (!value) return null;
  const text = String(value).replace(/\./g, '-').replace(' ', 'T');
  const date = new Date(text.includes('T') ? text : `${text}T00:00:00+09:00`);
  if (!Number.isNaN(date.getTime())) return date;
  const fallback = new Date(String(value));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isSameMonth(date, monthInfo) {
  return date && date.getFullYear() === monthInfo.year && date.getMonth() + 1 === monthInfo.month;
}

function pickFirst(object, keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null && object?.[key] !== '') return object[key];
  }
  return '';
}

function extractList(json) {
  const candidates = [
    json?.data?.list,
    json?.data?.vods,
    json?.data?.items,
    json?.data?.contents,
    json?.data,
    json?.list,
    json?.items,
  ];
  return candidates.find((item) => Array.isArray(item)) || [];
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
    .replace(/\s+/g, ' ')
    .replace(/[\[\]【】]/g, '')
    .trim();
}

function cleanTimelineTitle(value) {
  const text = normalizeTitle(value)
    .replace(/^\d{1,2}:\d{2}(:\d{2})?\s*/g, '')
    .replace(/^(다시보기|방송|생방송|라이브)\s*/g, '')
    .trim();
  if (!text) return '';
  if (/^\d+$/.test(text)) return '';
  if (text.length > 28) return text.slice(0, 28).trim();
  return text;
}

function collectStrings(node, bucket = []) {
  if (!node || bucket.length > 12) return bucket;
  if (typeof node === 'string') {
    const cleaned = cleanTimelineTitle(node);
    if (cleaned) bucket.push(cleaned);
    return bucket;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectStrings(item, bucket));
    return bucket;
  }
  if (typeof node === 'object') {
    const title = pickFirst(node, ['title', 'subject', 'szTitle', 'szSubject', 'file_title', 'playlist_title', 'chapter_title', 'segment_title']);
    if (title) {
      const cleaned = cleanTimelineTitle(title);
      if (cleaned) bucket.push(cleaned);
    }
    Object.entries(node).forEach(([key, value]) => {
      if (/title|subject|playlist|chapter|file/i.test(key)) collectStrings(value, bucket);
    });
  }
  return bucket;
}

function unique(values) {
  return Array.from(new Set(values.map(cleanTimelineTitle).filter(Boolean))).slice(0, 8);
}

function extractTimelineFromDetail(json, fallbackTitle) {
  const collected = collectStrings(json, []);
  const result = unique(collected);
  if (result.length > 0) return result;
  return unique(String(fallbackTitle || '').split(/\s*[>→▶|/]\s*/g));
}

function parseVodItem(item, member, monthInfo) {
  const startedAtValue = pickFirst(item, ['reg_date', 'regDate', 'created_at', 'createdAt', 'start_date', 'startDate', 'broad_start', 'broadStart', 'write_date']);
  const startedAt = toDate(startedAtValue);
  if (!isSameMonth(startedAt, monthInfo)) return null;

  const id = String(pickFirst(item, ['title_no', 'titleNo', 'n_title_no', 'nTitleNo', 'vod_no', 'vodNo', 'id']));
  if (!id) return null;

  const seconds = secondsFromDuration(pickFirst(item, ['duration', 'play_time', 'playTime', 'total_time', 'totalTime', 'file_duration', 'fileDuration', 'running_time', 'runningTime']));
  const title = normalizeTitle(pickFirst(item, ['title', 'subject', 'vod_title', 'vodTitle', 'contents'])) || '다시보기';
  const bjId = getMemberId(member);

  return {
    id: `${member.nickname}-${id}`,
    titleNo: id,
    member: member.nickname,
    bjId,
    dateKey: formatDateKey(startedAt),
    startedAt: startedAt.toISOString(),
    title,
    durationSeconds: seconds,
    durationText: formatDuration(seconds),
    timeline: unique(title.split(/\s*[>→▶|/]\s*/g)),
    url: `https://vod.sooplive.com/player/${id}`,
    reviewPageUrl: getReviewPageUrl(bjId),
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...REQUEST_HEADERS, ...(options.headers || {}) },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`request failed ${response.status}`);
  return response.json();
}

async function fetchMemberVods(member, monthInfo) {
  const bjId = getMemberId(member);
  if (!bjId) return [];

  const params = new URLSearchParams({
    startDate: '',
    endDate: '',
    keyword: '',
    orderBy: 'reg_date',
    perPage: '60',
    page: '1',
    field: 'title,contents,user_nick,user_id',
  });
  const url = `https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(bjId)}/vod/review?${params.toString()}`;
  const json = await fetchJson(url, {
    headers: { referer: getReviewPageUrl(bjId) },
  });
  const list = extractList(json);
  return list.map((item) => parseVodItem(item, member, monthInfo)).filter(Boolean);
}

async function fetchVodTimeline(vod) {
  try {
    const params = new URLSearchParams({
      szDataType: 'PLAYLIST',
      nTitleNo: vod.titleNo,
      szBjId: vod.bjId,
      szFileType: 'REVIEW',
      platform: 'pc',
      nPlaylistIdx: '0',
      nLimit: '20',
      nVersion: '2',
      szDataSrcType: 'reload',
    });
    const json = await fetchJson('https://stbbs.sooplive.com/api/get_vod_list.php', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        referer: getReviewPageUrl(vod.bjId),
      },
      body: params.toString(),
    });
    const timeline = extractTimelineFromDetail(json, vod.title);
    return { ...vod, timeline: timeline.length ? timeline : vod.timeline };
  } catch {
    return vod;
  }
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
    const broadcasts = (byDay.get(dayNumber) || []).sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
    return { dayNumber, broadcasts };
  });
}

async function buildPayload(monthInfo) {
  const members = ALL_PRISON_MEMBERS.slice(0, MEMBER_LIMIT);
  const settled = await Promise.allSettled(members.map((member) => fetchMemberVods(member, monthInfo)));
  const vods = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const uniqueVods = Array.from(new Map(vods.map((vod) => [`${vod.bjId}-${vod.titleNo}`, vod])).values())
    .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));

  const withTimeline = await Promise.all(uniqueVods.slice(0, DETAIL_LIMIT).map(fetchVodTimeline));
  const merged = uniqueVods.map((vod) => withTimeline.find((item) => item.id === vod.id) || vod);
  const items = buildCalendarItems(merged, monthInfo);

  return {
    ok: true,
    monthLabel: monthInfo.monthLabel,
    items,
    totalCount: merged.length,
    sourceType: 'review',
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
      monthLabel: monthInfo.monthLabel,
      items: [],
      totalCount: 0,
      message: 'SOOP 다시보기 기록을 불러오지 못했습니다.',
      cache: 'unavailable',
    });
  }
}

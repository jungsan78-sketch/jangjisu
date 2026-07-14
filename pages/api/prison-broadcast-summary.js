import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo } from '../../lib/scheduleMonth';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_VERSION = 'v7-monthly-playtime-calendar';
const MEMBER_LIMIT = 16;
const DETAIL_LIMIT = 220;
const PAGE_LIMIT = 12;
const PER_PAGE = 100;
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

function monthKey(monthInfo) {
  return `${monthInfo.year}-${pad(monthInfo.month)}`;
}

function cacheKey(monthInfo) {
  return `prison:broadcast-summary:${monthKey(monthInfo)}:${CACHE_VERSION}`;
}

function getMonthRange(monthInfo) {
  const lastDay = new Date(monthInfo.year, monthInfo.month, 0).getDate();
  return {
    startDate: `${monthInfo.year}-${pad(monthInfo.month)}-01`,
    endDate: `${monthInfo.year}-${pad(monthInfo.month)}-${pad(lastDay)}`,
  };
}

function toDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{10}$/.test(raw)) {
    const unix = new Date(Number(raw) * 1000);
    return Number.isNaN(unix.getTime()) ? null : unix;
  }
  if (/^\d{13}$/.test(raw)) {
    const unixMs = new Date(Number(raw));
    return Number.isNaN(unixMs.getTime()) ? null : unixMs;
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

function scoreVodArray(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((score, item) => {
    if (!item || typeof item !== 'object') return score;
    const hasId = pickFirst(item, ['title_no', 'titleNo', 'n_title_no', 'nTitleNo', 'vod_no', 'vodNo', 'id', 'seq']);
    const hasTitle = pickFirst(item, ['title', 'subject', 'title_name', 'titleName', 'vod_title', 'vodTitle', 'contents']);
    const hasDate = pickFirst(item, ['reg_date', 'regDate', 'created_at', 'createdAt', 'start_date', 'startDate', 'broad_start', 'broadStart', 'broad_start_date', 'broadStartDate', 'write_date', 'writeDate']);
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
  const directCandidates = [
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

  const recursiveCandidates = collectArrays(json, []);
  return [...directCandidates, ...recursiveCandidates]
    .sort((a, b) => scoreVodArray(b) - scoreVodArray(a) || b.length - a.length)[0] || [];
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

function cleanTitle(value) {
  const text = normalizeTitle(value)
    .replace(/^\d{1,2}:\d{2}(:\d{2})?\s*/g, '')
    .replace(/^(다시보기|방송|생방송|라이브|제목)\s*/g, '')
    .replace(/\s*[|▶→>]\s*$/g, '')
    .trim();
  if (!text) return '';
  if (/^\d+$/.test(text)) return '';
  if (/^(review|playlist|vod|title)$/i.test(text)) return '';
  return text.length > 50 ? `${text.slice(0, 50).trim()}…` : text;
}

function unique(values, limit = 10) {
  return Array.from(new Set(values.map(cleanTitle).filter(Boolean))).slice(0, limit);
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
        if (seconds > 0) bucket.push(seconds);
      }
      collectDurationValues(value, bucket);
    });
  }
  return bucket;
}

function extractDurationFromObject(json) {
  const values = collectDurationValues(json, []).filter((value) => value > 0 && value < 7 * 24 * 3600);
  if (!values.length) return 0;
  return Math.max(...values);
}

function extractCategoryFromObject(json) {
  const value = findFirstByKey(json, /(vod.?cate.?no|cate.?no|category.?no|category)$/i);
  return value ? String(value) : '';
}

function collectTitleCandidates(node, bucket = []) {
  if (!node || bucket.length > 80) return bucket;
  if (Array.isArray(node)) {
    node.forEach((item) => collectTitleCandidates(item, bucket));
    return bucket;
  }
  if (typeof node !== 'object') return bucket;

  const title = pickFirst(node, [
    'title', 'subject', 'szTitle', 'szSubject', 'file_title', 'fileTitle', 'playlist_title', 'playlistTitle',
    'chapter_title', 'chapterTitle', 'segment_title', 'segmentTitle', 'broad_title', 'broadTitle', 'station_title', 'stationTitle',
  ]);
  if (title) bucket.push(title);

  Object.entries(node).forEach(([key, value]) => {
    if (/list|playlist|chapter|segment|file|title|history|data|item/i.test(key)) collectTitleCandidates(value, bucket);
  });
  return bucket;
}

function extractTitlesFromDetail(json) {
  return unique(collectTitleCandidates(json, []), 12);
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

function extractTitlesFromText(text) {
  const source = String(text || '');
  const titles = [];
  const regexes = [
    /(?:playlist_title|file_title|broad_title|chapter_title|segment_title|szTitle|title)"?\s*[:=]\s*"([^"]{2,100})"/gi,
    /(?:playlist_title|file_title|broad_title|chapter_title|segment_title|szTitle|title)'?\s*[:=]\s*'([^']{2,100})'/gi,
  ];
  regexes.forEach((regex) => {
    let match;
    while ((match = regex.exec(source))) titles.push(match[1]);
  });
  return unique(titles, 12);
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

function parseVodItem(item, member, monthInfo) {
  const startedAtValue = pickFirst(item, [
    'reg_date', 'regDate', 'reg_datetime', 'regDatetime', 'created_at', 'createdAt',
    'start_date', 'startDate', 'start_time', 'startTime', 'broad_start', 'broadStart',
    'broad_start_date', 'broadStartDate', 'broad_start_time', 'broadStartTime', 'write_date', 'writeDate',
  ]);
  const startedAt = toDate(startedAtValue);
  if (!isSameMonth(startedAt, monthInfo)) return null;

  const id = String(pickFirst(item, ['title_no', 'titleNo', 'n_title_no', 'nTitleNo', 'vod_no', 'vodNo', 'id', 'seq']));
  if (!id) return null;

  const seconds = secondsFromDuration(pickFirst(item, [
    'duration', 'duration_time', 'durationTime', 'play_time', 'playTime', 'playtime',
    'total_time', 'totalTime', 'total_file_duration', 'file_duration', 'fileDuration',
    'running_time', 'runningTime', 'broad_time', 'broadTime', 'view_time', 'viewTime', 'vod_duration', 'vodDuration',
  ]));
  const title = normalizeTitle(pickFirst(item, ['title', 'subject', 'title_name', 'titleName', 'vod_title', 'vodTitle', 'contents', 'content'])) || '다시보기';
  const bjId = getMemberId(member);
  const categoryNo = String(pickFirst(item, ['nVodCateNo', 'vod_cate_no', 'vodCateNo', 'cate_no', 'cateNo', 'category_no', 'categoryNo', 'category']));

  return {
    id: `${member.nickname}-${id}`,
    titleNo: id,
    member: member.nickname,
    memberImage: member.image || '',
    bjId,
    categoryNo,
    dateKey: formatDateKey(startedAt),
    startedAt: startedAt.toISOString(),
    title,
    durationSeconds: seconds,
    durationText: formatDuration(seconds),
    url: `https://vod.sooplive.com/player/${id}`,
  };
}

async function fetchMemberVods(member, monthInfo) {
  const bjId = getMemberId(member);
  if (!bjId) return [];

  const { startDate, endDate } = getMonthRange(monthInfo);
  const collected = [];

  for (let page = 1; page <= PAGE_LIMIT; page += 1) {
    const query = new URLSearchParams({
      startDate,
      endDate,
      keyword: '',
      orderBy: 'reg_date',
      perPage: String(PER_PAGE),
      page: String(page),
    });

    const url = `https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(bjId)}/vod/review?${query.toString()}`;
    let list = [];
    try {
      const json = await fetchJson(url, { headers: { referer: `https://www.sooplive.com/station/${bjId}/vod/review` } });
      list = extractList(json);
    } catch {
      break;
    }

    if (!list.length) break;
    const parsed = list.map((item) => parseVodItem(item, member, monthInfo)).filter(Boolean);
    collected.push(...parsed);
    if (list.length < PER_PAGE) break;
  }

  return collected;
}

async function fetchVodDetail(vod) {
  let durationSeconds = Number(vod.durationSeconds || 0);
  let categoryNo = vod.categoryNo || '';
  let titleCandidates = [];

  try {
    const body = new URLSearchParams({ nTitleNo: vod.titleNo, nApiLevel: '11', nPlaylistIdx: '0' });
    const detailText = await fetchText('https://api.m.sooplive.com/station/video/a/view', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', origin: 'https://vod.sooplive.com', referer: vod.url },
      body: body.toString(),
    });
    const detailJson = parseJsonMaybe(detailText);
    if (detailJson) {
      durationSeconds = durationSeconds || extractDurationFromObject(detailJson);
      categoryNo = categoryNo || extractCategoryFromObject(detailJson);
      titleCandidates = titleCandidates.concat(extractTitlesFromDetail(detailJson));
    }
    durationSeconds = durationSeconds || extractDurationFromText(detailText);
    titleCandidates = titleCandidates.concat(extractTitlesFromText(detailText));
  } catch {}

  try {
    const playerText = await fetchText(vod.url, { headers: { origin: 'https://vod.sooplive.com', referer: `https://www.sooplive.com/station/${vod.bjId}/vod/review` } });
    durationSeconds = durationSeconds || extractDurationFromText(playerText);
    titleCandidates = titleCandidates.concat(extractTitlesFromText(playerText));
    const categoryMatch = playerText.match(/(?:nVodCateNo|category|cate_no)[=:"']+([0-9]{4,})/i);
    if (!categoryNo && categoryMatch?.[1]) categoryNo = categoryMatch[1];
  } catch {}

  try {
    const params = new URLSearchParams({
      szDataType: 'PLAYLIST',
      nTitleNo: vod.titleNo,
      szBjId: vod.bjId,
      szFileType: 'REVIEW',
      platform: 'pc',
      nVodCateNo: categoryNo || '00040017',
      nPlaylistIdx: '0',
      nLimit: '50',
      szMenuId: '',
      szKeyword: '',
      nVersion: '2',
      szDataSrcType: 'reload',
    });
    const playlistText = await fetchText('https://stbbs.sooplive.com/api/get_vod_list.php', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', origin: 'https://vod.sooplive.com', referer: vod.url },
      body: params.toString(),
    });
    const playlistJson = parseJsonMaybe(playlistText);
    if (playlistJson) {
      durationSeconds = durationSeconds || extractDurationFromObject(playlistJson);
      titleCandidates = titleCandidates.concat(extractTitlesFromDetail(playlistJson));
    }
    durationSeconds = durationSeconds || extractDurationFromText(playlistText);
    titleCandidates = titleCandidates.concat(extractTitlesFromText(playlistText));
  } catch {}

  const cleanedTitles = unique([vod.title, ...titleCandidates], 12)
    .filter((title) => title && !title.includes('https://') && !title.includes('static.sooplive'));
  const titleHistory = cleanedTitles.length ? cleanedTitles : [vod.title];

  return {
    ...vod,
    categoryNo,
    durationSeconds,
    durationText: formatDuration(durationSeconds),
    titleHistory,
    timeline: titleHistory,
  };
}

function dedupeVods(vods) {
  const map = new Map();
  vods.forEach((vod) => {
    const titleKey = normalizeTitle(vod.title).toLowerCase();
    const key = vod.titleNo
      ? `${vod.bjId}:${vod.titleNo}`
      : `${vod.bjId}:${vod.dateKey}:${titleKey}`;
    const existing = map.get(key);
    if (!existing || Number(vod.durationSeconds || 0) > Number(existing.durationSeconds || 0)) map.set(key, vod);
  });
  return Array.from(map.values()).sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
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
  const vods = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const uniqueVods = dedupeVods(vods);

  const detailed = await Promise.all(uniqueVods.slice(0, DETAIL_LIMIT).map(fetchVodDetail));
  const detailedMap = new Map(detailed.map((item) => [item.id, item]));
  const merged = uniqueVods.map((vod) => detailedMap.get(vod.id) || vod);
  const items = buildCalendarItems(merged, monthInfo);
  const memberStats = buildMemberStats(merged);

  return {
    ok: true,
    sourceType: 'review',
    monthLabel: monthInfo.monthLabel,
    items,
    memberStats,
    totalCount: merged.length,
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
      sourceType: 'review',
      monthLabel: monthInfo.monthLabel,
      items: [],
      memberStats: buildMemberStats([]),
      totalCount: 0,
      message: 'SOOP 다시보기 기록을 불러오지 못했습니다.',
      cache: 'unavailable',
    });
  }
}

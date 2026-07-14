import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { getCachedJson, setCachedJson } from '../../lib/upstashRedis';
import { getKstMonthInfo } from '../../lib/scheduleMonth';

const CACHE_TTL_SECONDS = 60 * 60;
const CACHE_VERSION = 'v5';
const MEMBER_LIMIT = 16;
const DETAIL_LIMIT = 140;
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
  if (/^(null|undefined|vod|review)$/i.test(text)) return '';
  if (text.length > 28) return text.slice(0, 28).trim();
  return text;
}

function unique(values, limit = 8) {
  return Array.from(new Set(values.map(cleanTimelineTitle).filter(Boolean))).slice(0, limit);
}

function timelineTitleFromObject(item) {
  return pickFirst(item, [
    'title', 'subject', 'szTitle', 'szSubject', 'file_title', 'fileTitle',
    'playlist_title', 'playlistTitle', 'chapter_title', 'chapterTitle',
    'segment_title', 'segmentTitle', 'broad_title', 'broadTitle', 'name',
  ]);
}

function scoreTimelineArray(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((score, item) => {
    if (!item || typeof item !== 'object') return score;
    const title = cleanTimelineTitle(timelineTitleFromObject(item));
    const hasIndex = pickFirst(item, ['nPlaylistIdx', 'playlistIdx', 'file_order', 'fileOrder', 'index', 'seq']);
    const duration = extractDurationSeconds(item, 0);
    return score + (title ? 4 : 0) + (hasIndex !== '' ? 1 : 0) + (duration > 0 ? 1 : 0);
  }, 0);
}

function extractTimelineFromDetail(json, fallbackTitle) {
  const arrays = collectArrays(json, [])
    .filter((items) => items.length > 0)
    .sort((a, b) => scoreTimelineArray(b) - scoreTimelineArray(a) || b.length - a.length);

  for (const items of arrays) {
    const titles = unique(items.map(timelineTitleFromObject), 10);
    if (titles.length >= 2) return titles;
  }

  const oneTitleArray = arrays.map((items) => unique(items.map(timelineTitleFromObject), 10)).find((titles) => titles.length > 0);
  if (oneTitleArray?.length) return oneTitleArray;

  return unique(String(fallbackTitle || '').split(/\s*[>→▶|/]\s*/g), 8);
}

function extractDurationSeconds(node, depth = 0) {
  if (!node || depth > 7) return 0;
  if (Array.isArray(node)) {
    const values = node.map((item) => extractDurationSeconds(item, depth + 1)).filter((value) => value > 0);
    const sum = values.reduce((total, value) => total + value, 0);
    const max = Math.max(0, ...values);
    if (sum >= 60 && sum <= 48 * 3600 && values.length >= 2) return sum;
    return max;
  }
  if (typeof node !== 'object') return 0;

  let best = 0;
  Object.entries(node).forEach(([key, value]) => {
    const keyText = String(key || '');
    if (/date|time_stamp|timestamp|start|end|reg/i.test(keyText)) {
      if (!/duration|play|running|broad_time|total_time|file_time/i.test(keyText)) return;
    }

    if (/duration|playtime|play_time|running|run_time|total_time|broad_time|file_duration|view_time|length|runtime/i.test(keyText)) {
      const seconds = secondsFromDuration(value);
      if (seconds > best && seconds < 48 * 3600) best = seconds;
    }

    if (typeof value === 'object') {
      const nested = extractDurationSeconds(value, depth + 1);
      if (nested > best && nested < 48 * 3600) best = nested;
    }
  });
  return best;
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
    'running_time', 'runningTime', 'broad_time', 'broadTime', 'view_time', 'viewTime',
  ]));
  const title = normalizeTitle(pickFirst(item, ['title', 'subject', 'title_name', 'titleName', 'vod_title', 'vodTitle', 'contents', 'content'])) || '다시보기';
  const bjId = getMemberId(member);

  return {
    id: `${member.nickname}-${id}`,
    titleNo: id,
    member: member.nickname,
    memberImage: member.image || '',
    bjId,
    dateKey: formatDateKey(startedAt),
    startedAt: startedAt.toISOString(),
    title,
    durationSeconds: seconds,
    durationText: formatDuration(seconds),
    timeline: unique(title.split(/\s*[>→▶|/]\s*/g)),
    url: `https://vod.sooplive.com/player/${id}`,
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

  const { startDate, endDate } = getMonthRange(monthInfo);
  const query = new URLSearchParams({
    startDate,
    endDate,
    keyword: '',
    orderBy: 'reg_date',
    perPage: '60',
    page: '1',
  });

  const url = `https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(bjId)}/vod/review?${query.toString()}`;
  const json = await fetchJson(url, { headers: { referer: `https://www.sooplive.com/station/${bjId}/vod/review` } });
  const list = extractList(json);
  return list.map((item) => parseVodItem(item, member, monthInfo)).filter(Boolean);
}

async function fetchMobileVodDetail(vod) {
  try {
    const query = new URLSearchParams({ nTitleNo: vod.titleNo, nApiLevel: '11', nPlaylistIdx: '0' });
    return await fetchJson(`https://api.m.sooplive.com/station/video/a/view?${query.toString()}`, {
      headers: { referer: `https://vod.sooplive.com/player/${vod.titleNo}` },
    });
  } catch {
    return null;
  }
}

async function fetchPlaylistVodDetail(vod) {
  try {
    const params = new URLSearchParams({
      szDataType: 'PLAYLIST',
      nTitleNo: vod.titleNo,
      szBjId: vod.bjId,
      szFileType: 'REVIEW',
      platform: 'pc',
      nPlaylistIdx: '0',
      nLimit: '50',
      nVersion: '2',
      szDataSrcType: 'reload',
    });
    return await fetchJson('https://stbbs.sooplive.com/api/get_vod_list.php', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', referer: `https://www.sooplive.com/station/${vod.bjId}/vod/review` },
      body: params.toString(),
    });
  } catch {
    return null;
  }
}

async function fetchVodTimeline(vod) {
  const [mobileDetail, playlistDetail] = await Promise.all([
    fetchMobileVodDetail(vod),
    fetchPlaylistVodDetail(vod),
  ]);

  const playlistTimeline = playlistDetail ? extractTimelineFromDetail(playlistDetail, '') : [];
  const mobileTimeline = mobileDetail ? extractTimelineFromDetail(mobileDetail, '') : [];
  const fallbackTimeline = unique(String(vod.title || '').split(/\s*[>→▶|/]\s*/g));
  const timeline = playlistTimeline.length ? playlistTimeline : mobileTimeline.length ? mobileTimeline : fallbackTimeline;

  const detailDuration = Math.max(
    extractDurationSeconds(playlistDetail),
    extractDurationSeconds(mobileDetail),
    Number(vod.durationSeconds || 0),
  );

  return {
    ...vod,
    durationSeconds: detailDuration,
    durationText: formatDuration(detailDuration),
    timeline: timeline.length ? timeline : vod.timeline,
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
    const broadcasts = (byDay.get(dayNumber) || []).sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
    const totalSeconds = broadcasts.reduce((sum, broadcast) => sum + Number(broadcast.durationSeconds || 0), 0);
    return { dayNumber, broadcasts, totalSeconds, totalDurationText: formatDuration(totalSeconds) || '' };
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
  const uniqueVods = Array.from(new Map(vods.map((vod) => [`${vod.bjId}-${vod.titleNo}`, vod])).values())
    .sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));

  const withDetail = await Promise.all(uniqueVods.slice(0, DETAIL_LIMIT).map(fetchVodTimeline));
  const merged = uniqueVods.map((vod) => withDetail.find((item) => item.id === vod.id) || vod);
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

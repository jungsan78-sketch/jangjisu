import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';
import { BOARD_PAGE_SIZE, fetchBoardPageJson, fetchHomePostJson } from './prisonNoticeSources';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RESULTS_PER_MEMBER = 8;

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStationId(stationUrl) {
  const match = String(stationUrl || '').match(/station\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function parseDateStringAsKst(text) {
  const match = String(text || '').match(
    /(20\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})(?:[ T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const date = new Date(Date.UTC(year, month - 1, day, hour - 9, minute, second));

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();

  if (/^\d+$/.test(text)) {
    const timestamp = Number(text);
    const date = new Date(text.length === 10 ? timestamp * 1000 : timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const kstDate = parseDateStringAsKst(text);
  if (kstDate) return kstDate;

  const fallback = new Date(text.replace(/\./g, '-').replace(/\//g, '-').replace(' ', 'T'));
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

function isRecent(isoDate) {
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  const now = Date.now();
  return Number.isFinite(time) && now - time <= ONE_WEEK_MS && time <= now + 5 * 60 * 1000;
}

function getFirstValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
}

function normalizeExternalUrl(value) {
  const url = String(value || '').trim().replace(/&amp;/gi, '&');
  if (url.startsWith('//')) return `https:${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  return '';
}

function isUsablePostImage(value) {
  const url = normalizeExternalUrl(value);
  if (!url) return false;
  return !/(ogqmarket|\/sticker\/|ogq[_-]?item|emoji|profile\.img)/i.test(url);
}

function extractThumbnailUrl(item) {
  const directUrl = normalizeExternalUrl(
    item?.fileUrl || item?.file_url || item?.thumbnailUrl || item?.thumbnail_url || item?.imageUrl || item?.image_url,
  );
  if (isUsablePostImage(directUrl)) return directUrl;

  const photos = Array.isArray(item?.photos)
    ? item.photos
    : Array.isArray(item?.content?.photos)
      ? item.content.photos
      : [];

  for (const photo of photos) {
    const url = normalizeExternalUrl(photo?.url || photo?.image_url || photo?.imageUrl || photo?.src);
    if (isUsablePostImage(url)) return url;
  }

  const htmlCandidates = [
    item?.content?.content,
    item?.contents?.content,
    typeof item?.content === 'string' ? item.content : '',
    typeof item?.contents === 'string' ? item.contents : '',
  ];

  for (const html of htmlCandidates) {
    const imageMatches = String(html || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const match of imageMatches) {
      const url = normalizeExternalUrl(match[1]);
      if (isUsablePostImage(url)) return url;
    }
  }

  return '';
}

function getCount(item, keys) {
  const count = item?.count || {};
  for (const key of keys) {
    const value = count?.[key] ?? item?.[key];
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return 0;
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload?.data,
    payload?.data?.list,
    payload?.data?.items,
    payload?.data?.posts,
    payload?.data?.board,
    payload?.result,
    payload?.result?.list,
    payload?.result?.items,
    payload?.list,
    payload?.items,
    payload?.posts,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function extractPostNo(item) {
  const direct = getFirstValue(item, [
    'title_no',
    'titleNo',
    'post_no',
    'postNo',
    'post_id',
    'postId',
    'bbs_no',
    'bbsNo',
    'board_no',
    'boardNo',
    'seq',
    'id',
  ]);

  if (/^\d+$/.test(String(direct))) return String(direct);

  const urlLike = getFirstValue(item, ['url', 'link', 'share_url', 'shareUrl', 'post_url', 'postUrl']);
  const urlMatch = String(urlLike).match(/\/post\/(\d+)/i);
  if (urlMatch) return urlMatch[1];

  const anyMatch = JSON.stringify(item || {}).match(/"(?:title_no|post_no|bbs_no|board_no|seq|id)"\s*:\s*"?(\d+)"?/i);
  return anyMatch ? anyMatch[1] : '';
}

function textFromUnknown(value, depth = 0) {
  if (value === null || value === undefined || depth > 5) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((entry) => textFromUnknown(entry, depth + 1)).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    const preferredKeys = [
      'plain_text',
      'plainText',
      'text',
      'html',
      'contents',
      'content',
      'body',
      'memo',
      'description',
      'message',
      'value',
      'data',
    ];

    for (const key of preferredKeys) {
      const extracted = textFromUnknown(value[key], depth + 1);
      if (stripTags(extracted)) return extracted;
    }

    return Object.entries(value)
      .filter(([key]) => !/^(id|seq|no|url|link|image|thumb|profile|user|nick|date|time|count|like|comment|board)$/i.test(key))
      .map(([, entry]) => textFromUnknown(entry, depth + 1))
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

function buildSummary(value, title) {
  const text = stripTags(textFromUnknown(value))
    .replace(/^\[object Object\]$/i, '')
    .replace(title, '')
    .trim();

  if (!text || /\[object Object\]/i.test(text)) return '';
  return text.slice(0, 220);
}

function normalizeNotice(item, member, index) {
  const postNo = extractPostNo(item);
  if (!postNo) return null;

  const userId = String(getFirstValue(item, ['user_id', 'userId', 'writer_id', 'writerId', 'bj_id', 'bjId'])).trim();
  if (userId && userId.toLowerCase() !== member.stationId.toLowerCase()) return null;

  const rawCreatedAt = getFirstValue(item, ['reg_date', 'regDate', 'created_at', 'createdAt', 'write_date', 'writeDate', 'date']);
  const createdAt = normalizeDate(rawCreatedAt);
  if (!isRecent(createdAt)) return null;

  const title = stripTags(getFirstValue(item, ['title', 'title_name', 'titleName', 'subject', 'name']));
  if (!title) return null;

  const contents = getFirstValue(item, ['contents', 'content', 'body', 'memo', 'description']);
  const summary = buildSummary(contents, title);
  const thumbnailUrl = extractThumbnailUrl(item);

  return {
    id: `${member.stationId}-${postNo}-${index}`,
    member: member.nickname,
    stationId: member.stationId,
    profileImage: member.image || '',
    title,
    url: `https://www.sooplive.com/station/${member.stationId}/post/${postNo}`,
    createdAt,
    rawCreatedAt: String(rawCreatedAt || ''),
    summary,
    thumbnailUrl,
    photoCount: Number(item?.photo_cnt || item?.photoCount || item?.imageCount || (thumbnailUrl ? 1 : 0)),
    readCount: getCount(item, ['read_cnt', 'readCnt']),
    likeCount: getCount(item, ['like_cnt', 'likeCnt']),
    commentCount: getCount(item, ['comment_cnt', 'commentCnt']),
  };
}

function collectMemberNotices(items, member) {
  const notices = [];
  const seen = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const notice = normalizeNotice(items[index], member, index);
    if (!notice || seen.has(notice.url)) continue;
    seen.add(notice.url);
    notices.push(notice);
  }

  return notices
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_RESULTS_PER_MEMBER);
}

async function fetchMemberBoard(member) {
  const items = [];
  let successfulSources = 0;
  let firstBoardPageSize = 0;

  try {
    const homePayload = await fetchHomePostJson(member.stationId);
    items.push(...extractItems(homePayload));
    successfulSources += 1;
  } catch {}

  try {
    const firstBoardPayload = await fetchBoardPageJson(member.stationId, 1);
    const firstBoardItems = extractItems(firstBoardPayload);
    firstBoardPageSize = firstBoardItems.length;
    items.push(...firstBoardItems);
    successfulSources += 1;
  } catch {}

  if (!successfulSources) {
    throw new Error(`member notice sources failed: ${member.stationId}`);
  }

  let notices = collectMemberNotices(items, member);
  if (notices.length < MAX_RESULTS_PER_MEMBER && firstBoardPageSize >= BOARD_PAGE_SIZE) {
    try {
      const secondBoardPayload = await fetchBoardPageJson(member.stationId, 2);
      items.push(...extractItems(secondBoardPayload));
      notices = collectMemberNotices(items, member);
    } catch {}
  }

  return notices;
}

export async function fetchRecentPrisonNotices() {
  const members = [WARDEN, ...PRISON_MEMBERS].map((member) => ({
    ...member,
    stationId: extractStationId(member.station),
  }));

  const results = await Promise.all(
    members.map(async (member) => {
      if (!member.stationId) return [];
      try {
        return await fetchMemberBoard(member);
      } catch {
        return [];
      }
    }),
  );

  return results
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

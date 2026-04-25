import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RESULTS_PER_MEMBER = 4;
const BOARD_PAGE_SIZE = 20;

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

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();

  if (/^\d+$/.test(text)) {
    const timestamp = Number(text);
    const date = new Date(text.length === 10 ? timestamp * 1000 : timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const normalized = text.replace(/\./g, '-').replace(/\//g, '-');
  const date = new Date(normalized.includes('T') ? normalized : normalized.replace(' ', 'T'));
  if (!Number.isNaN(date.getTime())) return date.toISOString();

  const match = text.match(/(20\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) return null;

  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    Number(match[6] || 0),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isRecent(isoDate) {
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  return Number.isFinite(time) && Date.now() - time <= ONE_WEEK_MS && Date.now() >= time;
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

function buildBoardUrl(stationId) {
  const params = new URLSearchParams({
    per_page: String(BOARD_PAGE_SIZE),
    start_date: '',
    end_date: '',
    field: 'title,contents,user_nick,user_id,hashtags',
    keyword: '',
    type: 'all',
    order_by: 'reg_date',
    board_number: '',
    page: '1',
  });

  return `https://chapi.sooplive.com/api/${stationId}/board/?${params.toString()}`;
}

async function fetchBoardJson(stationId) {
  const response = await fetch(buildBoardUrl(stationId), {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://www.sooplive.com',
      Referer: `https://www.sooplive.com/station/${stationId}/board`,
      'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`chapi board fetch failed: ${stationId} ${response.status}`);
  }

  return response.json();
}

function normalizeNotice(item, member, index) {
  const postNo = extractPostNo(item);
  if (!postNo) return null;

  const userId = String(getFirstValue(item, ['user_id', 'userId', 'writer_id', 'writerId', 'bj_id', 'bjId'])).trim();
  if (userId && userId.toLowerCase() !== member.stationId.toLowerCase()) return null;

  const createdAt = normalizeDate(getFirstValue(item, ['reg_date', 'regDate', 'created_at', 'createdAt', 'write_date', 'writeDate', 'date']));
  if (!isRecent(createdAt)) return null;

  const title = stripTags(getFirstValue(item, ['title', 'title_name', 'titleName', 'subject', 'name']));
  if (!title) return null;

  const contents = getFirstValue(item, ['contents', 'content', 'body', 'memo', 'description']);
  const summary = stripTags(contents).slice(0, 180);

  return {
    id: `${member.stationId}-${postNo}-${index}`,
    member: member.nickname,
    stationId: member.stationId,
    title,
    url: `https://www.sooplive.com/station/${member.stationId}/post/${postNo}`,
    createdAt,
    summary,
  };
}

async function fetchMemberBoard(member) {
  const payload = await fetchBoardJson(member.stationId);
  const items = extractItems(payload);
  const notices = [];

  for (let index = 0; index < items.length; index += 1) {
    const notice = normalizeNotice(items[index], member, index);
    if (notice) notices.push(notice);
    if (notices.length >= MAX_RESULTS_PER_MEMBER) break;
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

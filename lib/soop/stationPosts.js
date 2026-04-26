import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { extractStationId } from './liveStatus';

const STATUS_URLS = [
  'https://st.sooplive.com/api/get_station_status.php',
  'https://st.sooplive.co.kr/api/get_station_status.php',
];
const MAIN_DATA_URL = 'https://api.m.sooplive.co.kr/station/main/a/getmaindata';
const BOARD_PER_PAGE = 20;
const TIMEOUT_MS = 3500;
const CONCURRENCY = 4;

function timeoutFetch(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function parseJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
  const start = raw.indexOf('(');
  const end = raw.lastIndexOf(')');
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start + 1, end));
  return JSON.parse(raw);
}

function toNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parsePostTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\./g, '-').replace(/\s+/g, ' ');
  const parsed = Date.parse(normalized.includes('T') ? normalized : normalized.replace(' ', 'T'));
  if (Number.isFinite(parsed)) return parsed;
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?$/);
  if (compact) {
    const [, y, m, d, h, min, s = '00'] = compact;
    const time = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s)).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  return 0;
}

function walk(value, visitor) {
  if (!value) return;
  if (Array.isArray(value)) {
    visitor(value);
    value.forEach((item) => walk(item, visitor));
    return;
  }
  if (typeof value === 'object') Object.values(value).forEach((item) => walk(item, visitor));
}

async function getStationNo(stationId) {
  for (const base of STATUS_URLS) {
    try {
      const response = await timeoutFetch(`${base}?${new URLSearchParams({ szBjId: stationId })}`, {
        headers: { Accept: 'application/json, text/plain, */*', Referer: `https://www.sooplive.com/station/${stationId}` },
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const payload = parseJson(await response.text());
      const stationNo = String(payload?.DATA?.station_no || payload?.DATA?.stationNo || '').trim();
      if (stationNo) return stationNo;
    } catch {}
  }
  return '';
}

function normalizePost(item, stationId) {
  const title = String(item.title_name || item.titleName || item.title || item.subject || item.post_title || item.postTitle || item.bbs_title || item.bbsTitle || item.notice_title || item.noticeTitle || item.szTitle || '').trim();
  const postNo = String(item.title_no || item.titleNo || item.post_no || item.postNo || item.bbs_no || item.bbsNo || item.seq || item.no || '').trim();
  if (!title || title.length < 2) return null;
  if (/방송국|즐겨찾기|애청자|구독/.test(title) && !postNo) return null;

  const contentValue = typeof item.content === 'string' ? item.content : item.content?.summary;
  const createdAt = String(
    item.reg_date || item.regDate ||
    item.created_at || item.createdAt ||
    item.write_date || item.writeDate ||
    item.wdate || item.wDate ||
    item.date || item.created || item.regDt || item.reg_dt || ''
  ).trim();

  return {
    stationId,
    stationNo: String(item.station_no || item.stationNo || '').trim(),
    bbsNo: String(item.bbs_no || item.bbsNo || '').trim(),
    postNo,
    title,
    summary: String(contentValue || item.summary || item.text_content || item.textContent || '').trim(),
    boardName: String(item.display?.bbs_name || item.display?.bbsName || item.bbs_name || item.bbsName || '').trim(),
    writerId: String(item.user_id || item.userId || item.writer_id || item.writerId || '').trim(),
    writerNick: String(item.user_nick || item.userNick || item.writer_nick || item.writerNick || '').trim(),
    viewCount: toNumber(item.count?.read_cnt ?? item.count?.readCnt ?? item.view_cnt ?? item.viewCnt ?? item.read_cnt ?? item.readCnt ?? item.hit ?? item.total_view_cnt ?? item.totalViewCnt),
    okCount: toNumber(item.count?.like_cnt ?? item.count?.likeCnt ?? item.ok_cnt ?? item.okCnt ?? item.up_cnt ?? item.upCnt ?? item.like_cnt ?? item.likeCnt ?? item.recommend_cnt ?? item.recommendCnt ?? item.total_ok_cnt ?? item.totalOkCnt),
    commentCount: toNumber(item.count?.comment_cnt ?? item.count?.commentCnt ?? item.comment_cnt ?? item.commentCnt ?? item.memo_cnt ?? item.memoCnt ?? item.reply_cnt ?? item.replyCnt),
    createdAt,
    createdAtMs: parsePostTime(createdAt),
    url: postNo ? `https://www.sooplive.com/station/${stationId}/post/${postNo}` : `https://www.sooplive.com/station/${stationId}`,
  };
}

function collectPostsFromPayload(payload, stationId) {
  const candidates = [];
  const directLists = [payload?.posts, payload?.data, payload?.result?.posts, payload?.result?.data].filter(Array.isArray);

  directLists.forEach((list) => {
    list.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const post = normalizePost(item, stationId);
      if (post) candidates.push(post);
    });
  });

  walk(payload, (list) => {
    list.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const post = normalizePost(item, stationId);
      if (post) candidates.push(post);
    });
  });

  const unique = [];
  const seen = new Set();
  candidates.forEach((post, index) => {
    const key = `${post.stationId}:${post.postNo || post.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push({ ...post, sourceIndex: index });
  });

  return unique;
}

function pickLatestPost(posts, stationId) {
  const scoped = posts.filter((item) => item.writerId === stationId);
  const list = scoped.length ? scoped : posts;
  return [...list].sort((a, b) => {
    const timeDiff = Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
    if (timeDiff) return timeDiff;
    return Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
  })[0] || null;
}

function buildBoardCandidateUrls(stationId, stationNo = '') {
  const params = new URLSearchParams({ per_page: String(BOARD_PER_PAGE), page: '1' });
  const boardParams = new URLSearchParams({ per_page: String(BOARD_PER_PAGE), page: '1', station_no: stationNo });
  return [
    `https://api-channel.sooplive.com/v1.1/channel/${stationId}/board?${params.toString()}`,
    `https://api-channel.sooplive.com/v1.1/channel/${stationId}/board/?${params.toString()}`,
    `https://api-channel.sooplive.com/v1.1/channel/${stationId}/post?${params.toString()}`,
    `https://api-channel.sooplive.com/v1.1/channel/${stationId}/home/section/post`,
    stationNo ? `https://api.m.sooplive.co.kr/station/board/a/list?${boardParams.toString()}` : '',
  ].filter(Boolean);
}

async function fetchBoardPost(stationId, stationNo) {
  const urls = buildBoardCandidateUrls(stationId, stationNo);
  for (const url of urls) {
    try {
      const response = await timeoutFetch(url, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          Referer: `https://www.sooplive.com/station/${stationId}/board`,
        },
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const post = pickLatestPost(collectPostsFromPayload(parseJson(await response.text()), stationId), stationId);
      if (post?.writerId === stationId) return { ...post, source: 'soop_board_api' };
      if (post) return { ...post, source: 'soop_board_api_unfiltered' };
    } catch {}
  }
  return null;
}

async function fetchMainDataPost(stationId, stationNo) {
  if (!stationNo) return null;
  try {
    const response = await timeoutFetch(MAIN_DATA_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Referer: `https://www.sooplive.com/station/${stationId}`,
      },
      body: new URLSearchParams({ bj: stationId, station_no: stationNo }).toString(),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const post = pickLatestPost(collectPostsFromPayload(parseJson(await response.text()), stationId), stationId);
    return post ? { ...post, source: 'soop_main_data_fallback' } : null;
  } catch {
    return null;
  }
}

async function fetchMemberPost(member) {
  const stationId = extractStationId(member.station);
  if (!stationId) return null;
  const stationNo = await getStationNo(stationId);
  const boardPost = await fetchBoardPost(stationId, stationNo);
  if (boardPost?.writerId === stationId) return boardPost;
  const fallbackPost = await fetchMainDataPost(stationId, stationNo);
  if (fallbackPost?.writerId === stationId) return fallbackPost;
  return boardPost || fallbackPost || null;
}

async function mapLimit(items, mapper) {
  const results = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length || 1) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current]);
    }
  }));
  return results;
}

export async function fetchStationPostsPayload() {
  const posts = await mapLimit(ALL_PRISON_MEMBERS, fetchMemberPost);
  const normalized = {};
  posts.filter(Boolean).forEach((post) => { normalized[post.stationId] = post; });
  return {
    posts: normalized,
    fetchedAt: new Date().toISOString(),
    source: 'soop_board_api_all_members_latest',
    debug: {
      requestedCount: ALL_PRISON_MEMBERS.length,
      matchedCount: Object.keys(normalized).length,
      perPage: BOARD_PER_PAGE,
      ownPostCount: Object.values(normalized).filter((post) => post.writerId === post.stationId).length,
    },
  };
}

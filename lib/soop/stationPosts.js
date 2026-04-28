import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { extractStationId } from './liveStatus';

const CHAPI_BOARD_PAGE_LIMIT = 2;
const TIMEOUT_MS = 4500;
const CONCURRENCY = 2;
const STATION_POSTS_RUNTIME_MARKER = 'test2-station-posts-lib-20260428-11';
const KNOWN_STATION_NO = {
  iamquaddurup: '20404342',
  doodong: '27784150',
  lomioeov: '27478654',
  ximong: '27629338',
  youoneul: '31233092',
  ayanesena: '26374503',
  sunza1122: '28636980',
  k1baaa: '29415688',
  bxroong: '29503930',
  isq1158: '7389579',
  mini1212: '14798197',
  ddikku0714: '26169161',
};

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

function decodeText(value = '') {
  return String(value)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function firstString(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function getFirstValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function extractPostNo(item) {
  const direct = getFirstValue(item, [
    'title_no', 'titleNo', 'post_no', 'postNo', 'post_id', 'postId',
    'bbs_no', 'bbsNo', 'board_no', 'boardNo', 'seq', 'no', 'id',
    'article_no', 'articleNo', 'notice_no', 'noticeNo',
  ]);
  if (/^\d+$/.test(String(direct))) return String(direct);

  const urlLike = getFirstValue(item, ['url', 'link', 'share_url', 'shareUrl', 'post_url', 'postUrl']);
  const urlMatch = String(urlLike).match(/\/post\/(\d+)/i);
  if (urlMatch) return urlMatch[1];

  const anyMatch = JSON.stringify(item || {}).match(/"(?:title_no|titleNo|post_no|postNo|bbs_no|bbsNo|board_no|boardNo|seq|id)"\s*:\s*"?(\d+)"?/i);
  return anyMatch ? anyMatch[1] : '';
}

function textFromUnknown(value, depth = 0) {
  if (value === null || value === undefined || depth > 5) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((entry) => textFromUnknown(entry, depth + 1)).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    const preferredKeys = ['plain_text', 'plainText', 'summary', 'text', 'contents', 'content', 'html', 'body', 'memo', 'description', 'message', 'value', 'data'];
    for (const key of preferredKeys) {
      const extracted = textFromUnknown(value[key], depth + 1);
      if (decodeText(extracted)) return extracted;
    }
    return Object.entries(value)
      .filter(([key]) => !/^(id|seq|no|url|link|image|thumb|profile|user|nick|date|time|count|like|comment|board|station)$/i.test(key))
      .map(([, entry]) => textFromUnknown(entry, depth + 1))
      .filter(Boolean)
      .join(' ');
  }
  return '';
}

function firstText(...values) {
  for (const value of values) {
    const text = decodeText(textFromUnknown(value));
    if (text && !/^\[object Object\]$/i.test(text)) return text;
  }
  return '';
}

function parsePostTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) {
    const timestamp = Number(raw);
    const time = raw.length === 10 ? timestamp * 1000 : timestamp;
    return Number.isFinite(time) ? time : 0;
  }
  const normalized = raw.replace(/\./g, '-').replace(/\//g, '-').replace(/\s+/g, ' ');
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const kstMatch = normalized.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (kstMatch) {
    const [, y, m, d, h = '0', min = '0', s = '0'] = kstMatch;
    const time = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h) - 9, Number(min), Number(s));
    return Number.isFinite(time) ? time : 0;
  }
  const parsed = Date.parse(normalized.includes('T') ? normalized : normalized.replace(' ', 'T'));
  if (Number.isFinite(parsed)) return parsed;
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

function getStationNo(stationId) {
  return KNOWN_STATION_NO[stationId] || '';
}

function normalizePost(item, stationId, forcedSource = '') {
  const title = firstString(item.titleName, item.title_name, item.title, item.subject, item.postTitle, item.post_title, item.bbsTitle, item.bbs_title, item.noticeTitle, item.notice_title, item.szTitle, item.display?.title, item.display?.subject, item.board?.title, item.board?.subject, item.article?.title, item.article?.subject, item.name);
  const postNo = extractPostNo(item);
  if (!title || title.length < 2) return null;
  if (/방송국|즐겨찾기|애청자|구독/.test(title) && !postNo) return null;

  const createdAt = firstString(item.regDate, item.reg_date, item.createdAt, item.created_at, item.writeDate, item.write_date, item.wDate, item.wdate, item.date, item.created, item.regDt, item.reg_dt, item.display?.createdAt, item.display?.created_at, item.article?.createdAt, item.article?.created_at);
  const summary = firstText(item.contents, item.content, item.summary, item.textContent, item.text_content, item.memo, item.preview, item.body, item.description, item.article?.summary, item.article?.content).replace(decodeText(title), '').trim().slice(0, 220);

  return {
    stationId,
    stationNo: firstString(item.stationNo, item.station_no, item.member?.stationId, item.member?.station_id, item.station?.stationNo, item.station?.station_no),
    bbsNo: firstString(item.bbsNo, item.bbs_no, item.boardNo, item.board_no),
    postNo,
    title: decodeText(title),
    summary: /\[object Object\]/i.test(summary) ? '' : summary,
    boardName: firstString(item.display?.bbsName, item.display?.bbs_name, item.bbsName, item.bbs_name, item.boardName, item.board_name),
    writerId: firstString(item.userId, item.user_id, item.writerId, item.writer_id, item.bjId, item.bj_id, item.member?.userId, item.member?.user_id, item.user?.id, item.user?.user_id, item.writer?.id, item.writer?.user_id),
    writerStationId: firstString(item.member?.stationId, item.member?.station_id, item.user?.stationId, item.user?.station_id, item.writer?.stationId, item.writer?.station_id),
    writerStationNo: firstString(item.writerStationNo, item.writer_station_no, item.user?.stationNo, item.user?.station_no, item.writer?.stationNo, item.writer?.station_no),
    writerNick: firstString(item.userNick, item.user_nick, item.writerNick, item.writer_nick, item.workerNick, item.worker_nick, item.member?.nick, item.member?.nickname, item.user?.nick, item.user?.nickname, item.writer?.nick, item.writer?.nickname),
    viewCount: toNumber(item.readCnt ?? item.read_cnt ?? item.count?.readCnt ?? item.count?.read_cnt ?? item.viewCnt ?? item.view_cnt ?? item.hit ?? item.totalViewCnt ?? item.total_view_cnt),
    okCount: toNumber(item.likeCnt ?? item.like_cnt ?? item.okCnt ?? item.ok_cnt ?? item.upCnt ?? item.up_cnt ?? item.count?.likeCnt ?? item.count?.like_cnt ?? item.recommendCnt ?? item.recommend_cnt),
    commentCount: toNumber(item.commentCnt ?? item.comment_cnt ?? item.count?.commentCnt ?? item.count?.comment_cnt ?? item.memoCnt ?? item.memo_cnt ?? item.replyCnt ?? item.reply_cnt),
    createdAt,
    createdAtMs: parsePostTime(createdAt),
    source: forcedSource || '',
    url: postNo ? `https://www.sooplive.com/station/${stationId}/post/${postNo}` : `https://www.sooplive.com/station/${stationId}`,
  };
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
    payload?.DATA,
    payload?.DATA?.list,
    payload?.DATA?.items,
    payload?.DATA?.posts,
    payload?.board?.list,
    payload?.notice?.list,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function collectPostsFromPayload(payload, stationId) {
  const candidates = [];
  const directList = extractItems(payload);
  directList.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const post = normalizePost(item, stationId);
    if (post) candidates.push(post);
  });

  if (candidates.length === 0) {
    walk(payload, (list) => list.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const post = normalizePost(item, stationId);
      if (post) candidates.push(post);
    }));
  }

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

function isOwnPost(post, stationId) {
  const writerId = String(post?.writerId || '').trim().toLowerCase();
  const writerStationId = String(post?.writerStationId || '').trim().toLowerCase();
  const writerStationNo = String(post?.writerStationNo || '').trim();
  const stationNo = String(post?.stationNo || '').trim();
  const knownStationNo = String(KNOWN_STATION_NO[stationId] || '').trim();
  const lowerStationId = String(stationId || '').toLowerCase();
  if (writerId && writerId === lowerStationId) return true;
  if (writerStationId && writerStationId === lowerStationId) return true;
  if (writerStationNo && knownStationNo && writerStationNo === knownStationNo) return true;
  if (!writerId && !writerStationId && stationNo && knownStationNo && stationNo === knownStationNo) return true;
  return false;
}

function pickLatestPost(posts, stationId) {
  return posts.filter((item) => isOwnPost(item, stationId)).sort((a, b) => {
    const timeDiff = Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
    if (timeDiff) return timeDiff;
    return Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
  })[0] || null;
}

function makeRequestDebug(extra = {}) {
  return { attempted: true, status: 0, ok: false, candidateCount: 0, ownCandidateCount: 0, firstTitle: '', firstWriterId: '', selectedTitle: '', selectedWriterId: '', selectedSource: '', selectedPostNo: '', firstPostNo: '', error: '', ...extra };
}

async function fetchPostEndpoint(stationId, url, source, refererPath = '') {
  const debug = makeRequestDebug({ url, source });
  try {
    const response = await timeoutFetch(url, {
      headers: { Accept: 'application/json, text/plain, */*', Origin: 'https://www.sooplive.com', Referer: `https://www.sooplive.com/station/${stationId}${refererPath}`, 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });
    debug.status = response.status;
    debug.ok = response.ok;
    debug.contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    debug.byteLength = text.length;
    if (!response.ok) return { posts: [], post: null, debug };

    const posts = collectPostsFromPayload(parseJson(text), stationId).map((post) => ({ ...post, source }));
    const selected = pickLatestPost(posts, stationId);
    debug.candidateCount = posts.length;
    debug.ownCandidateCount = posts.filter((post) => isOwnPost(post, stationId)).length;
    debug.firstTitle = posts[0]?.title || '';
    debug.firstPostNo = posts[0]?.postNo || '';
    debug.firstWriterId = posts[0]?.writerId || '';
    debug.selectedTitle = selected?.title || '';
    debug.selectedPostNo = selected?.postNo || '';
    debug.selectedWriterId = selected?.writerId || '';
    debug.selectedSource = selected ? source : '';
    return { posts, post: selected ? { ...selected, writerId: selected.writerId || stationId, source } : null, debug };
  } catch (error) {
    debug.error = error?.message || String(error);
    return { posts: [], post: null, debug };
  }
}

function buildChapiBoardUrl(stationId, page = 1) {
  const params = new URLSearchParams({
    per_page: '20',
    start_date: '',
    end_date: '',
    field: 'title,contents,user_nick,user_id,hashtags',
    keyword: '',
    type: 'all',
    order_by: 'reg_date',
    board_number: '',
    page: String(page),
  });
  return `https://chapi.sooplive.com/api/${stationId}/board/?${params.toString()}`;
}

function buildPostRequests(stationId) {
  const requests = [{ url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/home/section/post`, source: 'soop_home_section_post', refererPath: '', debugKey: 'homeSection' }];
  for (let page = 1; page <= CHAPI_BOARD_PAGE_LIMIT; page += 1) {
    requests.push({ url: buildChapiBoardUrl(stationId, page), source: `soop_chapi_board:p${page}`, refererPath: '/board', debugKey: `chapiBoardP${page}` });
  }
  return requests;
}

async function fetchBoardPost(stationId) {
  const attempts = [];
  const collectedPosts = [];
  for (const request of buildPostRequests(stationId)) {
    const result = await fetchPostEndpoint(stationId, request.url, request.source, request.refererPath);
    attempts.push({ key: request.debugKey, value: result.debug });
    collectedPosts.push(...result.posts);
  }
  const selected = pickLatestPost(collectedPosts, stationId);
  return { post: selected ? { ...selected, writerId: selected.writerId || stationId, source: selected.source || 'soop_chapi_latest_strict_own_post' } : null, requestDebug: { key: 'requestAttempts', value: attempts } };
}

function buildPostDebug(member, stationId, stationNo, requestDebug, selectedPost) {
  const debug = {
    nickname: member.nickname,
    stationId,
    stationNo: stationNo || KNOWN_STATION_NO[stationId] || '',
    hasStationNo: Boolean(stationNo || KNOWN_STATION_NO[stationId]),
    stationNoSource: KNOWN_STATION_NO[stationId] ? 'known_fallback' : 'missing',
    stationPostsRuntimeMarker: STATION_POSTS_RUNTIME_MARKER,
    board: selectedPost ? { source: selectedPost.source, postNo: selectedPost.postNo || '', writerId: selectedPost.writerId || '', writerMatchesStation: isOwnPost(selectedPost, stationId), title: selectedPost.title || '', createdAt: selectedPost.createdAt || '' } : null,
    selected: selectedPost ? { source: selectedPost.source, postNo: selectedPost.postNo || '', writerId: selectedPost.writerId || '', writerMatchesStation: isOwnPost(selectedPost, stationId), title: selectedPost.title || '', createdAt: selectedPost.createdAt || '' } : null,
    reason: selectedPost ? 'matched_latest_strict_own_post_across_home_and_chapi_endpoints' : (stationNo || KNOWN_STATION_NO[stationId]) ? 'no_strict_own_post_from_home_and_chapi_endpoints' : 'station_no_not_found',
  };
  if (requestDebug?.key) debug[requestDebug.key] = requestDebug.value;
  return debug;
}

async function fetchMemberPost(member) {
  const stationId = extractStationId(member.station);
  if (!stationId) return { post: null, debug: { nickname: member.nickname, stationId: '', stationNo: '', hasStationNo: false, stationNoSource: 'missing', stationPostsRuntimeMarker: STATION_POSTS_RUNTIME_MARKER, selected: null, reason: 'station_id_not_found' } };
  const stationNo = getStationNo(stationId);
  const { post, requestDebug } = await fetchBoardPost(stationId);
  return { post, debug: buildPostDebug(member, stationId, stationNo, requestDebug, post) };
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

export async function fetchStationPostsPayload(options = {}) {
  const entries = await mapLimit(ALL_PRISON_MEMBERS, fetchMemberPost);
  const normalized = {};
  entries.map((entry) => entry?.post).filter(Boolean).forEach((post) => { normalized[post.stationId] = post; });

  const perMember = entries.map((entry) => entry?.debug).filter(Boolean);
  const missing = ALL_PRISON_MEMBERS.map((member) => extractStationId(member.station)).filter(Boolean).filter((stationId) => !normalized[stationId]);
  return {
    posts: normalized,
    fetchedAt: new Date().toISOString(),
    source: 'soop_home_and_chapi_latest_strict_own_posts_only',
    debug: {
      stationPostsRuntimeMarker: STATION_POSTS_RUNTIME_MARKER,
      subrequestStrategy: 'strict_own_post_collect_home_and_first_chapi_list_pick_latest_without_404_board_or_warden_sync',
      requestedCount: ALL_PRISON_MEMBERS.length,
      matchedCount: Object.keys(normalized).length,
      missingCount: missing.length,
      missing,
      chapiPageLimit: CHAPI_BOARD_PAGE_LIMIT,
      removedRequests: ['api_channel_board_p1_p2_p3_404', 'warden_notice_sync_duplicate_chapi_requests'],
      ownPostCount: Object.values(normalized).filter((post) => isOwnPost(post, post.stationId)).length,
      ...(options.debug ? { perMember } : {}),
    },
  };
}

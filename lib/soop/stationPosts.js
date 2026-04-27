import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { extractStationId } from './liveStatus';

const BOARD_PER_PAGE = 30;
const TIMEOUT_MS = 4500;
const CONCURRENCY = 2;
const STATION_POSTS_RUNTIME_MARKER = 'test2-station-posts-lib-20260427-2';
const HOME_SECTION_FIRST_IDS = new Set(['bxroong', 'isq1158', 'mini1212', 'ddikku0714']);
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
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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

function getStationNo(stationId) {
  return KNOWN_STATION_NO[stationId] || '';
}

function normalizePost(item, stationId) {
  const title = firstString(
    item.titleName,
    item.title_name,
    item.title,
    item.subject,
    item.postTitle,
    item.post_title,
    item.bbsTitle,
    item.bbs_title,
    item.noticeTitle,
    item.notice_title,
    item.szTitle,
    item.display?.title,
    item.display?.subject,
    item.board?.title,
    item.board?.subject,
    item.article?.title,
    item.article?.subject
  );
  const postNo = firstString(
    item.titleNo,
    item.title_no,
    item.postNo,
    item.post_no,
    item.bbsNo,
    item.bbs_no,
    item.seq,
    item.no,
    item.articleNo,
    item.article_no,
    item.noticeNo,
    item.notice_no,
    item.id
  );
  if (!title || title.length < 2) return null;
  if (/방송국|즐겨찾기|애청자|구독/.test(title) && !postNo) return null;

  const contentValue = typeof item.content === 'string' ? item.content : item.content?.summary;
  const createdAt = firstString(
    item.regDate,
    item.reg_date,
    item.createdAt,
    item.created_at,
    item.writeDate,
    item.write_date,
    item.wDate,
    item.wdate,
    item.date,
    item.created,
    item.regDt,
    item.reg_dt,
    item.display?.createdAt,
    item.display?.created_at,
    item.article?.createdAt,
    item.article?.created_at
  );

  return {
    stationId,
    stationNo: firstString(item.stationNo, item.station_no, KNOWN_STATION_NO[stationId]),
    bbsNo: firstString(item.bbsNo, item.bbs_no, item.boardNo, item.board_no),
    postNo,
    title: decodeText(title),
    summary: decodeText(firstString(contentValue, item.summary, item.textContent, item.text_content, item.memo, item.preview, item.article?.summary, item.article?.content)),
    boardName: firstString(item.display?.bbsName, item.display?.bbs_name, item.bbsName, item.bbs_name, item.boardName, item.board_name),
    writerId: firstString(item.userId, item.user_id, item.writerId, item.writer_id, item.bjId, item.bj_id, item.user?.id, item.user?.user_id, item.writer?.id, item.writer?.user_id),
    writerNick: firstString(item.userNick, item.user_nick, item.writerNick, item.writer_nick, item.workerNick, item.worker_nick, item.user?.nick, item.user?.nickname, item.writer?.nick, item.writer?.nickname),
    viewCount: toNumber(item.readCnt ?? item.read_cnt ?? item.count?.readCnt ?? item.count?.read_cnt ?? item.viewCnt ?? item.view_cnt ?? item.hit ?? item.totalViewCnt ?? item.total_view_cnt),
    okCount: toNumber(item.likeCnt ?? item.like_cnt ?? item.okCnt ?? item.ok_cnt ?? item.upCnt ?? item.up_cnt ?? item.count?.likeCnt ?? item.count?.like_cnt ?? item.recommendCnt ?? item.recommend_cnt),
    commentCount: toNumber(item.commentCnt ?? item.comment_cnt ?? item.count?.commentCnt ?? item.count?.comment_cnt ?? item.memoCnt ?? item.memo_cnt ?? item.replyCnt ?? item.reply_cnt),
    createdAt,
    createdAtMs: parsePostTime(createdAt),
    url: postNo ? `https://www.sooplive.com/station/${stationId}/post/${postNo}` : `https://www.sooplive.com/station/${stationId}`,
  };
}

function collectPostsFromPayload(payload, stationId) {
  const candidates = [];
  const directLists = [
    payload?.posts,
    payload?.data,
    payload?.DATA,
    payload?.list,
    payload?.result?.posts,
    payload?.result?.data,
    payload?.result?.list,
    payload?.data?.list,
    payload?.DATA?.list,
    payload?.data?.posts,
    payload?.DATA?.posts,
    payload?.board?.list,
    payload?.notice?.list,
  ].filter(Array.isArray);

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
  const scoped = posts.filter((item) => !item.writerId || item.writerId === stationId);
  const list = scoped.length ? scoped : posts;
  return [...list].sort((a, b) => {
    const timeDiff = Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
    if (timeDiff) return timeDiff;
    return Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0);
  })[0] || null;
}

function makeRequestDebug(extra = {}) {
  return {
    attempted: true,
    status: 0,
    ok: false,
    candidateCount: 0,
    ownCandidateCount: 0,
    firstTitle: '',
    firstWriterId: '',
    selectedTitle: '',
    selectedWriterId: '',
    selectedSource: '',
    error: '',
    ...extra,
  };
}

async function fetchPostEndpoint(stationId, url, source, refererPath = '') {
  const debug = makeRequestDebug({ url, source });
  try {
    const response = await timeoutFetch(url, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        Referer: `https://www.sooplive.com/station/${stationId}${refererPath}`,
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    });
    debug.status = response.status;
    debug.ok = response.ok;
    debug.contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    debug.byteLength = text.length;
    if (!response.ok) return { post: null, debug };

    const posts = collectPostsFromPayload(parseJson(text), stationId);
    const selected = pickLatestPost(posts, stationId);
    debug.candidateCount = posts.length;
    debug.ownCandidateCount = posts.filter((post) => post.writerId === stationId).length;
    debug.firstTitle = posts[0]?.title || '';
    debug.firstWriterId = posts[0]?.writerId || '';
    debug.selectedTitle = selected?.title || '';
    debug.selectedWriterId = selected?.writerId || '';
    debug.selectedSource = selected ? source : '';

    return {
      post: selected ? { ...selected, writerId: selected.writerId || stationId, source } : null,
      debug,
    };
  } catch (error) {
    debug.error = error?.message || String(error);
    return { post: null, debug };
  }
}

function buildPrimaryUrl(stationId) {
  if (HOME_SECTION_FIRST_IDS.has(stationId)) {
    return {
      url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/home/section/post`,
      source: 'soop_home_section_post',
      refererPath: '',
      debugKey: 'homeSection',
    };
  }
  const params = new URLSearchParams({ per_page: String(BOARD_PER_PAGE), page: '1' });
  return {
    url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/board?${params.toString()}`,
    source: 'soop_board_api:api-channel.sooplive.com',
    refererPath: '/board',
    debugKey: 'boardRequest',
  };
}

async function fetchBoardPost(stationId) {
  const primary = buildPrimaryUrl(stationId);
  const result = await fetchPostEndpoint(stationId, primary.url, primary.source, primary.refererPath);
  return {
    post: result.post,
    requestDebug: { key: primary.debugKey, value: result.debug },
  };
}

function buildPostDebug(member, stationId, stationNo, requestDebug, selectedPost) {
  const debug = {
    nickname: member.nickname,
    stationId,
    stationNo: stationNo || KNOWN_STATION_NO[stationId] || '',
    hasStationNo: Boolean(stationNo || KNOWN_STATION_NO[stationId]),
    stationNoSource: KNOWN_STATION_NO[stationId] ? 'known_fallback' : 'missing',
    stationPostsRuntimeMarker: STATION_POSTS_RUNTIME_MARKER,
    homeSection: null,
    boardRequest: null,
    board: selectedPost ? {
      source: selectedPost.source,
      writerId: selectedPost.writerId || '',
      writerMatchesStation: selectedPost.writerId === stationId,
      title: selectedPost.title || '',
      createdAt: selectedPost.createdAt || '',
    } : null,
    fallback: null,
    selected: selectedPost ? {
      source: selectedPost.source,
      writerId: selectedPost.writerId || '',
      writerMatchesStation: selectedPost.writerId === stationId,
      title: selectedPost.title || '',
      createdAt: selectedPost.createdAt || '',
    } : null,
    reason: selectedPost ? 'matched' : (stationNo || KNOWN_STATION_NO[stationId]) ? 'no_post_from_primary_endpoint' : 'station_no_not_found',
  };

  if (requestDebug?.key) debug[requestDebug.key] = requestDebug.value;
  return debug;
}

async function fetchMemberPost(member) {
  const stationId = extractStationId(member.station);
  if (!stationId) {
    return {
      post: null,
      debug: { nickname: member.nickname, stationId: '', stationNo: '', hasStationNo: false, stationNoSource: 'missing', stationPostsRuntimeMarker: STATION_POSTS_RUNTIME_MARKER, homeSection: null, boardRequest: null, board: null, fallback: null, selected: null, reason: 'station_id_not_found' },
    };
  }

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
  const missing = perMember.filter((item) => !item.selected).map((item) => item.stationId || item.nickname);
  return {
    posts: normalized,
    fetchedAt: new Date().toISOString(),
    source: 'soop_primary_post_endpoint_all_members_latest',
    debug: {
      stationPostsRuntimeMarker: STATION_POSTS_RUNTIME_MARKER,
      subrequestStrategy: 'known_station_no_primary_endpoint_only',
      requestedCount: ALL_PRISON_MEMBERS.length,
      matchedCount: Object.keys(normalized).length,
      missingCount: missing.length,
      missing,
      perPage: BOARD_PER_PAGE,
      ownPostCount: Object.values(normalized).filter((post) => post.writerId === post.stationId).length,
      ...(options.debug ? { perMember } : {}),
    },
  };
}

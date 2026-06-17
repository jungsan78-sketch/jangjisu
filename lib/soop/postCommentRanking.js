const DEFAULT_TIMEOUT_MS = 4500;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

function timeoutFetch(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function toNumber(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function decodeText(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSoopStationPostUrl(value) {
  const text = String(value || '').trim();
  const match = text.match(/sooplive\.com\/station\/([^/?#]+)\/post\/(\d+)/i);
  if (!match) return null;
  return { stationId: match[1], postNo: match[2], url: `https://www.sooplive.com/station/${match[1]}/post/${match[2]}` };
}

function looksLikeComment(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const hasWriter = Boolean(firstText(
    item.user_nick,
    item.userNick,
    item.writer_nick,
    item.writerNick,
    item.nick,
    item.nickname,
    item.member?.nick,
    item.member?.nickname,
    item.user?.nick,
    item.user?.nickname,
  ));
  const hasContent = Boolean(firstText(
    item.contents,
    item.content,
    item.comment,
    item.memo,
    item.reply,
    item.message,
    item.text,
  ));
  const hasCommentId = Boolean(firstText(item.comment_no, item.commentNo, item.memo_no, item.memoNo, item.reply_no, item.replyNo));
  return hasWriter && (hasContent || hasCommentId);
}

function collectCommentObjects(value, output = [], depth = 0) {
  if (!value || depth > 7) return output;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectCommentObjects(entry, output, depth + 1));
    return output;
  }
  if (typeof value !== 'object') return output;
  if (looksLikeComment(value)) output.push(value);
  Object.values(value).forEach((entry) => collectCommentObjects(entry, output, depth + 1));
  return output;
}

function normalizeComment(item, index) {
  const userId = firstText(
    item.user_id,
    item.userId,
    item.writer_id,
    item.writerId,
    item.member_id,
    item.memberId,
    item.member?.user_id,
    item.member?.userId,
    item.user?.id,
    item.user?.user_id,
  );
  const nickname = firstText(
    item.user_nick,
    item.userNick,
    item.writer_nick,
    item.writerNick,
    item.nick,
    item.nickname,
    item.member?.nick,
    item.member?.nickname,
    item.user?.nick,
    item.user?.nickname,
    userId,
    `댓글 작성자 ${index + 1}`,
  );
  const upCount = toNumber(
    item.up_cnt ??
    item.upCnt ??
    item.like_cnt ??
    item.likeCnt ??
    item.ok_cnt ??
    item.okCnt ??
    item.recommend_cnt ??
    item.recommendCnt ??
    item.count?.up_cnt ??
    item.count?.upCnt ??
    item.count?.like_cnt ??
    item.count?.likeCnt,
  );
  const profileImage = firstText(
    item.profile_image,
    item.profileImage,
    item.user_profile,
    item.userProfile,
    item.member?.profile_image,
    item.member?.profileImage,
    item.user?.profile_image,
    item.user?.profileImage,
  );
  const content = decodeText(firstText(item.contents, item.content, item.comment, item.memo, item.reply, item.message, item.text));
  const createdAt = firstText(item.reg_date, item.regDate, item.created_at, item.createdAt, item.write_date, item.writeDate);
  const commentNo = firstText(item.comment_no, item.commentNo, item.memo_no, item.memoNo, item.reply_no, item.replyNo, item.id, index);

  return { userId, nickname, upCount, profileImage, content, createdAt, commentNo: String(commentNo) };
}

function uniqueComments(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.commentNo}:${item.userId || item.nickname}:${item.content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildEndpointCandidates(stationId, postNo, page = 1) {
  const query = `page=${page}&per_page=${PAGE_SIZE}`;
  return [
    { key: 'comment-singular', url: `https://chapi.sooplive.com/api/${stationId}/board/${postNo}/comment/?${query}` },
    { key: 'comments-plural', url: `https://chapi.sooplive.com/api/${stationId}/board/${postNo}/comments/?${query}` },
    { key: 'memo', url: `https://chapi.sooplive.com/api/${stationId}/board/${postNo}/memo/?${query}` },
    { key: 'comment-query', url: `https://chapi.sooplive.com/api/${stationId}/board/comment/?title_no=${postNo}&${query}` },
  ];
}

async function requestCandidate(candidate, referer) {
  const response = await timeoutFetch(candidate.url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://www.sooplive.com',
      Referer: referer,
      'User-Agent': 'Mozilla/5.0',
    },
    cache: 'no-store',
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  const rawItems = payload ? collectCommentObjects(payload) : [];
  const comments = uniqueComments(rawItems.map(normalizeComment));
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    byteLength: text.length,
    comments,
    payload,
  };
}

async function discoverCommentEndpoint(stationId, postNo, referer) {
  const attempts = [];
  for (const candidate of buildEndpointCandidates(stationId, postNo, 1)) {
    try {
      const result = await requestCandidate(candidate, referer);
      attempts.push({ key: candidate.key, url: candidate.url, status: result.status, ok: result.ok, commentCount: result.comments.length, byteLength: result.byteLength });
      if (result.ok && result.comments.length > 0) return { candidate, firstResult: result, attempts };
    } catch (error) {
      attempts.push({ key: candidate.key, url: candidate.url, status: 0, ok: false, commentCount: 0, error: error?.message || String(error) });
    }
  }
  return { candidate: null, firstResult: null, attempts };
}

function withPage(candidate, page) {
  const url = new URL(candidate.url);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(PAGE_SIZE));
  return { ...candidate, url: url.toString() };
}

function buildRanking(comments) {
  const users = new Map();
  comments.forEach((comment) => {
    const key = String(comment.userId || comment.nickname).toLowerCase();
    const current = users.get(key) || {
      userId: comment.userId,
      nickname: comment.nickname,
      profileImage: comment.profileImage,
      upCount: 0,
      commentCount: 0,
      latestComment: '',
      latestAt: '',
    };
    current.upCount += Number(comment.upCount || 0);
    current.commentCount += 1;
    if (!current.profileImage && comment.profileImage) current.profileImage = comment.profileImage;
    if (comment.content) current.latestComment = comment.content;
    if (comment.createdAt) current.latestAt = comment.createdAt;
    users.set(key, current);
  });

  return Array.from(users.values())
    .sort((a, b) => b.upCount - a.upCount || b.commentCount - a.commentCount || a.nickname.localeCompare(b.nickname, 'ko'))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function fetchSoopPostUpRanking(postUrl, options = {}) {
  const parsed = parseSoopStationPostUrl(postUrl);
  if (!parsed) throw new Error('올바른 SOOP 방송국 게시글 주소가 아닙니다.');

  const discovery = await discoverCommentEndpoint(parsed.stationId, parsed.postNo, parsed.url);
  if (!discovery.candidate || !discovery.firstResult) {
    const error = new Error('SOOP 댓글 API 경로를 확인하지 못했습니다.');
    error.attempts = discovery.attempts;
    throw error;
  }

  const allComments = [...discovery.firstResult.comments];
  for (let page = 2; page <= MAX_PAGES; page += 1) {
    try {
      const result = await requestCandidate(withPage(discovery.candidate, page), parsed.url);
      if (!result.ok || result.comments.length === 0) break;
      allComments.push(...result.comments);
      if (result.comments.length < PAGE_SIZE) break;
    } catch {
      break;
    }
  }

  const comments = uniqueComments(allComments);
  const ranking = buildRanking(comments);
  return {
    post: parsed,
    ranking,
    commentCount: comments.length,
    participantCount: ranking.length,
    totalUpCount: ranking.reduce((sum, item) => sum + Number(item.upCount || 0), 0),
    source: discovery.candidate.key,
    fetchedAt: new Date().toISOString(),
    ...(options.debug ? { debug: { attempts: discovery.attempts, sample: comments.slice(0, 3) } } : {}),
  };
}

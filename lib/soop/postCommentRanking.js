const DEFAULT_TIMEOUT_MS = 4500;
const MAX_PAGES = 50;

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
  return {
    stationId: match[1],
    postNo: match[2],
    url: `https://www.sooplive.com/station/${match[1]}/post/${match[2]}`,
  };
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
  const hasCommentId = Boolean(firstText(
    item.comment_no,
    item.commentNo,
    item.comment_id,
    item.commentId,
    item.memo_no,
    item.memoNo,
    item.reply_no,
    item.replyNo,
    item.id,
  ));
  return hasWriter && (hasContent || hasCommentId);
}

function collectCommentObjects(value, output = [], depth = 0) {
  if (!value || depth > 8) return output;
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
    item.up_cnt ?? item.upCnt ?? item.like_cnt ?? item.likeCnt ?? item.ok_cnt ?? item.okCnt ??
    item.recommend_cnt ?? item.recommendCnt ?? item.like_count ?? item.likeCount ??
    item.count?.up_cnt ?? item.count?.upCnt ?? item.count?.like_cnt ?? item.count?.likeCnt,
  );
  const profileImage = firstText(
    item.profile_image,
    item.profileImage,
    item.user_profile,
    item.userProfile,
    item.profile_url,
    item.profileUrl,
    item.member?.profile_image,
    item.member?.profileImage,
    item.user?.profile_image,
    item.user?.profileImage,
  );
  const content = decodeText(firstText(item.contents, item.content, item.comment, item.memo, item.reply, item.message, item.text));
  const createdAt = firstText(item.reg_date, item.regDate, item.created_at, item.createdAt, item.write_date, item.writeDate);
  const commentNo = firstText(
    item.comment_no,
    item.commentNo,
    item.comment_id,
    item.commentId,
    item.memo_no,
    item.memoNo,
    item.reply_no,
    item.replyNo,
    item.id,
    index,
  );

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

function buildOfficialCommentUrl(stationId, postNo, page = 1) {
  const params = new URLSearchParams({
    page: String(page),
    orderBy: 'reg_date',
    cCommentNo: '0',
  });
  return `https://api-channel.sooplive.com/v1.1/channel/${stationId}/post/${postNo}/comment?${params.toString()}`;
}

async function requestCommentPage(stationId, postNo, page, referer) {
  const url = buildOfficialCommentUrl(stationId, postNo, page);
  const response = await timeoutFetch(url, {
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
    url,
    ok: response.ok,
    status: response.status,
    byteLength: text.length,
    comments,
  };
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

  const attempts = [];
  let allComments = [];
  let previousUniqueCount = 0;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let result;
    try {
      result = await requestCommentPage(parsed.stationId, parsed.postNo, page, parsed.url);
    } catch (error) {
      attempts.push({ page, status: 0, ok: false, error: error?.message || String(error) });
      if (page === 1) {
        const wrapped = new Error('SOOP 댓글 API 요청에 실패했습니다.');
        wrapped.attempts = attempts;
        throw wrapped;
      }
      break;
    }

    attempts.push({
      page,
      url: result.url,
      status: result.status,
      ok: result.ok,
      commentCount: result.comments.length,
      byteLength: result.byteLength,
    });

    if (!result.ok) {
      if (page === 1) {
        const error = new Error(`SOOP 댓글 API가 ${result.status} 상태를 반환했습니다.`);
        error.attempts = attempts;
        throw error;
      }
      break;
    }

    if (result.comments.length === 0) break;

    allComments = uniqueComments([...allComments, ...result.comments]);
    if (allComments.length === previousUniqueCount) break;
    previousUniqueCount = allComments.length;
  }

  const ranking = buildRanking(allComments);
  return {
    post: parsed,
    ranking,
    commentCount: allComments.length,
    participantCount: ranking.length,
    totalUpCount: ranking.reduce((sum, item) => sum + Number(item.upCount || 0), 0),
    source: 'soop_api_channel_comment_all_pages',
    fetchedAt: new Date().toISOString(),
    ...(options.debug ? { debug: { attempts, fetchedPages: attempts.length, sample: allComments.slice(0, 3) } } : {}),
  };
}

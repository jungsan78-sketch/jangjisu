import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { extractStationId } from './liveStatus';

const STATUS_URLS = [
  'https://st.sooplive.com/api/get_station_status.php',
  'https://st.sooplive.co.kr/api/get_station_status.php',
];
const MAIN_DATA_URL = 'https://api.m.sooplive.co.kr/station/main/a/getmaindata';
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

async function getStationNo(stationId) {
  for (const base of STATUS_URLS) {
    try {
      const response = await timeoutFetch(`${base}?${new URLSearchParams({ szBjId: stationId })}`, {
        headers: { Accept: 'application/json, text/plain, */*', Referer: `https://www.sooplive.com/station/${stationId}` },
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const payload = parseJson(await response.text());
      const stationNo = String(payload?.DATA?.station_no || '').trim();
      if (stationNo) return stationNo;
    } catch {}
  }
  return '';
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

function normalizePost(item, stationId) {
  const title = String(item.title_name || item.title || item.subject || item.post_title || item.bbs_title || item.notice_title || item.szTitle || '').trim();
  const postNo = String(item.title_no || item.post_no || item.bbs_no || item.seq || item.no || '').trim();
  if (!title || title.length < 2) return null;
  if (/방송국|즐겨찾기|애청자|구독/.test(title) && !postNo) return null;

  return {
    stationId,
    postNo,
    title,
    summary: String(item.content?.summary || item.summary || item.text_content || '').trim(),
    boardName: String(item.display?.bbs_name || item.bbs_name || '').trim(),
    writerId: String(item.user_id || item.userId || '').trim(),
    writerNick: String(item.user_nick || item.userNick || '').trim(),
    viewCount: toNumber(item.count?.read_cnt ?? item.count?.readCnt ?? item.view_cnt ?? item.read_cnt ?? item.readCnt ?? item.hit ?? item.total_view_cnt),
    okCount: toNumber(item.count?.like_cnt ?? item.count?.likeCnt ?? item.ok_cnt ?? item.up_cnt ?? item.like_cnt ?? item.likeCnt ?? item.recommend_cnt ?? item.total_ok_cnt),
    commentCount: toNumber(item.count?.comment_cnt ?? item.count?.commentCnt ?? item.comment_cnt ?? item.commentCnt ?? item.memo_cnt ?? item.reply_cnt),
    createdAt: String(item.reg_date || item.created_at || item.write_date || item.date || '').trim(),
    url: postNo ? `https://www.sooplive.com/station/${stationId}/post/${postNo}` : `https://www.sooplive.com/station/${stationId}`,
  };
}

function pickPostFromPayload(payload, stationId) {
  const candidates = [];
  walk(payload, (list) => {
    list.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const post = normalizePost(item, stationId);
      if (post) candidates.push(post);
    });
  });

  const ownPost = candidates.find((item) => item.writerId === stationId);
  return ownPost || candidates.find((item) => item.postNo) || candidates[0] || null;
}

async function fetchMemberPost(member) {
  const stationId = extractStationId(member.station);
  if (!stationId) return null;
  const stationNo = await getStationNo(stationId);
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
    return pickPostFromPayload(parseJson(await response.text()), stationId);
  } catch {
    return null;
  }
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
  return { posts: normalized, fetchedAt: new Date().toISOString(), source: 'soop_station_main_data_all_members' };
}

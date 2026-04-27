const TARGETS = [
  { nickname: '코로미', stationId: 'bxroong', stationNo: '29503930' },
  { nickname: '구월이', stationId: 'isq1158', stationNo: '7389579' },
  { nickname: '린링', stationId: 'mini1212', stationNo: '14798197' },
  { nickname: '띠꾸', stationId: 'ddikku0714', stationNo: '26169161' },
];

const TIMEOUT_MS = 6000;
const BOARD_PER_PAGE = 30;

function timeoutFetch(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function safeJson(text) {
  try {
    const raw = String(text || '').trim();
    if (!raw) return null;
    if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
    const start = raw.indexOf('(');
    const end = raw.lastIndexOf(')');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start + 1, end));
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

function walk(value, visitor) {
  if (!value) return;
  if (Array.isArray(value)) {
    visitor(value);
    value.forEach((item) => walk(item, visitor));
    return;
  }
  if (typeof value === 'object') Object.values(value).forEach((item) => walk(item, visitor));
}

function collectJsonPostCandidates(payload) {
  const candidates = [];
  walk(payload, (list) => {
    list.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const title = item.title_name || item.titleName || item.title || item.subject || item.post_title || item.postTitle || item.bbs_title || item.bbsTitle || item.notice_title || item.noticeTitle || item.display?.title || item.article?.title || '';
      const postNo = item.title_no || item.titleNo || item.post_no || item.postNo || item.bbs_no || item.bbsNo || item.article_no || item.articleNo || item.notice_no || item.noticeNo || item.seq || item.no || item.id || '';
      const writerId = item.user_id || item.userId || item.writer_id || item.writerId || item.user?.id || item.writer?.id || '';
      if (title || postNo || writerId) {
        candidates.push({
          title: decodeText(title),
          postNo: String(postNo || '').trim(),
          writerId: String(writerId || '').trim(),
          rawKeys: Object.keys(item).slice(0, 20),
        });
      }
    });
  });
  return candidates.slice(0, 8);
}

function collectHtmlPostCandidates(text, stationId) {
  const candidates = [];
  const seen = new Set();
  const html = String(text || '');
  const postLinkRegex = new RegExp(`(?:station/${stationId}/post/|/${stationId}/post/|bj.afreecatv.com/${stationId}/post/)(\\d+)`, 'gi');
  let match;
  while ((match = postLinkRegex.exec(html))) {
    const postNo = match[1];
    if (!postNo || seen.has(postNo)) continue;
    seen.add(postNo);
    const chunk = decodeText(html.slice(Math.max(0, match.index - 600), Math.min(html.length, match.index + 900)));
    const titleMatch = chunk.match(/(?:title_name|titleName|title|subject|og:title)["'=:\s]+([^"'<>|]{2,120})/i)
      || chunk.match(/>([^<>]{2,80})<\/a>/i);
    candidates.push({ postNo, title: decodeText(titleMatch?.[1] || ''), snippet: chunk.slice(0, 220) });
  }
  return candidates.slice(0, 8);
}

function buildUrls(target) {
  const stationId = target.stationId;
  const stationNo = target.stationNo;
  const params = new URLSearchParams({ per_page: String(BOARD_PER_PAGE), page: '1' });
  const oldParams = new URLSearchParams({ per_page: String(BOARD_PER_PAGE), page: '1', station_no: stationNo, bj: stationId });
  const mobileParams = new URLSearchParams({ szBjId: stationId, nStationNo: stationNo, nPageNo: '1', nPageSize: String(BOARD_PER_PAGE) });
  return [
    { type: 'json', label: 'api-channel board', url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/board?${params}` },
    { type: 'json', label: 'api-channel post', url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/post?${params}` },
    { type: 'json', label: 'api-channel posts', url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/posts?${params}` },
    { type: 'json', label: 'api-channel notice', url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/notice?${params}` },
    { type: 'json', label: 'api-channel home post', url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/home/section/post` },
    { type: 'json', label: 'api-channel home board', url: `https://api-channel.sooplive.com/v1.1/channel/${stationId}/home/section/board` },
    { type: 'json', label: 'bjapi soop board', url: `https://bjapi.sooplive.co.kr/api/${stationId}/station/board?${params}` },
    { type: 'json', label: 'bjapi soop posts', url: `https://bjapi.sooplive.co.kr/api/${stationId}/station/posts?${params}` },
    { type: 'json', label: 'bjapi afreeca board', url: `https://bjapi.afreecatv.com/api/${stationId}/station/board?${params}` },
    { type: 'json', label: 'mobile board old', url: `https://api.m.sooplive.co.kr/station/board/a/list?${oldParams}` },
    { type: 'json', label: 'mobile board station', url: `https://api.m.sooplive.co.kr/station/board/a/list?${mobileParams}` },
    { type: 'html', label: 'soop station', url: `https://www.sooplive.com/station/${stationId}` },
    { type: 'html', label: 'soop board', url: `https://www.sooplive.com/station/${stationId}/board` },
    { type: 'html', label: 'afreeca posts', url: `https://bj.afreecatv.com/${stationId}/posts` },
    { type: 'html', label: 'afreeca board', url: `https://bj.afreecatv.com/${stationId}/board` },
  ];
}

async function inspectUrl(target, candidate) {
  const startedAt = Date.now();
  try {
    const response = await timeoutFetch(candidate.url, {
      headers: {
        Accept: candidate.type === 'html' ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' : 'application/json, text/plain, */*',
        Referer: `https://www.sooplive.com/station/${target.stationId}`,
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    });
    const text = await response.text();
    const json = candidate.type === 'json' ? safeJson(text) : null;
    const posts = json ? collectJsonPostCandidates(json) : collectHtmlPostCandidates(text, target.stationId);
    return {
      label: candidate.label,
      url: candidate.url,
      type: candidate.type,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type') || '',
      byteLength: text.length,
      durationMs: Date.now() - startedAt,
      postCandidateCount: posts.length,
      samples: posts,
      textPreview: posts.length ? undefined : decodeText(text).slice(0, 180),
    };
  } catch (error) {
    return {
      label: candidate.label,
      url: candidate.url,
      type: candidate.type,
      status: 0,
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error?.message || String(error),
    };
  }
}

async function inspectTarget(target) {
  const urls = buildUrls(target);
  const results = [];
  for (const candidate of urls) {
    results.push(await inspectUrl(target, candidate));
  }
  return {
    ...target,
    foundCount: results.reduce((sum, item) => sum + Number(item.postCandidateCount || 0), 0),
    results,
  };
}

export default async function handler(req, res) {
  const only = String(req.query?.id || '').trim();
  const targets = only ? TARGETS.filter((target) => target.stationId === only) : TARGETS;
  const inspected = [];
  for (const target of targets) {
    inspected.push(await inspectTarget(target));
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    source: 'targeted_soop_station_post_debug',
    fetchedAt: new Date().toISOString(),
    targets: inspected,
  });
}

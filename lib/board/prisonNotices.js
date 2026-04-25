import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LINKS_PER_MEMBER = 12;
const MAX_RESULTS_PER_MEMBER = 4;

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

function toAbsoluteUrl(href) {
  const value = String(href || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `https://www.sooplive.com${value}`;
  return `https://www.sooplive.com/${value.replace(/^\/+/, '')}`;
}

function extractStationId(stationUrl) {
  const match = String(stationUrl || '').match(/station\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function parseDateFromText(text) {
  const value = String(text || '');
  const full = value.match(/(20\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
  if (full) {
    const date = new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const short = value.match(/(^|\D)(\d{1,2})[.\-/]\s*(\d{1,2})(\D|$)/);
  if (short) {
    const now = new Date();
    const date = new Date(now.getFullYear(), Number(short[2]) - 1, Number(short[3]));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function isRecent(isoDate) {
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  return Number.isFinite(time) && Date.now() - time <= ONE_WEEK_MS;
}

function fetchHtml(url) {
  return fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
    },
    cache: 'no-store',
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`fetch failed: ${response.status}`);
    }
    return response.text();
  });
}

function extractBoardPostLinks(html, member) {
  const stationId = member.stationId;
  const links = [];
  const seen = new Set();
  const patterns = [
    new RegExp(`href=["']([^"']*\/station\/${stationId}\/post\/\d+[^"']*)["']`, 'gi'),
    new RegExp(`https?:\\/\\/www\\.sooplive\\.com\\/station\\/${stationId}\\/post\\/\\d+`, 'gi'),
    new RegExp(`\\/station\\/${stationId}\\/post\\/\\d+`, 'gi'),
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const raw = match[1] || match[0];
      const url = toAbsoluteUrl(raw);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      links.push(url);
      if (links.length >= MAX_LINKS_PER_MEMBER) return links;
    }
  }

  return links.slice(0, MAX_LINKS_PER_MEMBER);
}

function extractTitleFromPost(html) {
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<h2[^>]*>([\s\S]*?)<\/h2>/i,
  ];

  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    const value = stripTags(match?.[1] || '');
    if (value) return value;
  }

  return '';
}

function extractCreatedAtFromPost(html) {
  return parseDateFromText(stripTags(html));
}

function authorMatchesPost(html, member) {
  const text = stripTags(html);
  return new RegExp(member.nickname, 'i').test(text) || new RegExp(`\b${member.stationId}\b`, 'i').test(text);
}

function extractSummaryFromPost(html, title) {
  const text = stripTags(html).replace(title, '').trim();
  return text.slice(0, 160);
}

async function inspectPost(url, member, index) {
  const html = await fetchHtml(url);
  const title = extractTitleFromPost(html);
  const createdAt = extractCreatedAtFromPost(html);
  const authorMatched = authorMatchesPost(html, member);

  if (!title || !authorMatched || !isRecent(createdAt)) {
    return null;
  }

  return {
    id: `${member.stationId}-${index}`,
    member: member.nickname,
    stationId: member.stationId,
    title,
    url,
    createdAt,
    summary: extractSummaryFromPost(html, title),
  };
}

async function fetchMemberBoard(member) {
  const boardHtml = await fetchHtml(`https://www.sooplive.com/station/${member.stationId}/board`);
  const links = extractBoardPostLinks(boardHtml, member);
  const results = [];

  for (let index = 0; index < links.length; index += 1) {
    try {
      const item = await inspectPost(links[index], member, index);
      if (item) results.push(item);
      if (results.length >= MAX_RESULTS_PER_MEMBER) break;
    } catch {
      // ignore single post failures
    }
  }

  return results;
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

import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAbsoluteUrl(href) {
  const value = String(href || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `https://www.sooplive.com${value}`;
  return `https://www.sooplive.com/${value.replace(/^\/+/, '')}`;
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

function extractStationId(stationUrl) {
  const match = String(stationUrl || '').match(/station\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function buildSummary(title, context) {
  const clean = stripTags(context).replace(title, '').trim();
  return clean.slice(0, 140);
}

function extractCandidates(html, member) {
  const pattern = new RegExp(`<a[^>]+href=["']([^"']*\/station\/${member.stationId}\/post\/\d+[^"']*)["'][^>]*>([\\s\\S]*?)<\/a>`, 'gi');
  const items = [];
  const seen = new Set();
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = toAbsoluteUrl(match[1]);
    if (!url || seen.has(url)) continue;

    const title = stripTags(match[2]);
    if (!title || title.length < 2) continue;

    const context = html.slice(Math.max(0, match.index - 500), Math.min(html.length, match.index + match[0].length + 1600));
    const authorMatched = new RegExp(member.nickname, 'i').test(context) || new RegExp(member.stationId, 'i').test(context);
    if (!authorMatched) continue;

    const createdAt = parseDateFromText(stripTags(context));
    if (!isRecent(createdAt)) continue;

    seen.add(url);
    items.push({
      id: `${member.stationId}-${items.length}`,
      member: member.nickname,
      stationId: member.stationId,
      title,
      url,
      createdAt,
      summary: buildSummary(title, context),
    });
  }
  return items;
}

async function fetchMemberBoard(member) {
  const response = await fetch(`https://www.sooplive.com/station/${member.stationId}/board`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`board fetch failed: ${response.status}`);
  const html = await response.text();
  return extractCandidates(html, member);
}

export async function fetchRecentPrisonNotices() {
  const members = [WARDEN, ...PRISON_MEMBERS].map((member) => ({ ...member, stationId: extractStationId(member.station) }));
  const results = await Promise.all(members.map(async (member) => {
    try {
      return await fetchMemberBoard(member);
    } catch {
      return [];
    }
  }));
  return results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

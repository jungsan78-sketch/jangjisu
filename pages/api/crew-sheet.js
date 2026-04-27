const SHEET_SOURCES = [
  {
    id: '1-mACl-yykHphsqiSUNPkoC1GHydOYmWX-xHqdRz7DVM',
    gid: '344917607',
    category: 'soop',
    categoryLabel: '숲 종겜 크루',
  },
  {
    id: '1zwIJjl2UTkPREkI37in9e0PAwX9xwFtEU3-ECAYYaeU',
    gid: '0',
    category: 'gamcom',
    categoryLabel: '감컴 종겜 크루',
  },
];

const CREW_SHEET_CACHE_SECONDS = 24 * 60 * 60;
const CREW_SHEET_STALE_SECONDS = 12 * 60 * 60;

const MANUAL_STATION_OVERRIDES = {
  부르: 'https://www.sooplive.com/station/bureu2002',
  모요: 'https://www.sooplive.com/station/duvl123',
  츄르: 'https://www.sooplive.com/station/chur1004',
  나솜: 'https://www.sooplive.co.kr/station/qzaads1',
  온유일: 'https://www.sooplive.com/station/oneon1y',
  큐티섹시: 'https://www.sooplive.com/station/nnojoke486',
};

const MANUAL_CREW_ADDITIONS = {
  강씨세가: [{ nickname: '모요', stationUrl: MANUAL_STATION_OVERRIDES.모요 }],
  조적단: [{ nickname: '츄르', stationUrl: MANUAL_STATION_OVERRIDES.츄르 }],
  ZZAM지트: [{ nickname: '나솜', stationUrl: MANUAL_STATION_OVERRIDES.나솜 }],
  로스타시티: [{ nickname: '온유일', stationUrl: MANUAL_STATION_OVERRIDES.온유일 }],
  버블란: [{ nickname: '큐티섹시', stationUrl: MANUAL_STATION_OVERRIDES.큐티섹시 }],
};

const BLOCKED_MEMBER_NAMES = new Set(['제보하기', '인원모집', '공주구함']);
const PLACEHOLDER_NAME_PATTERN = /(구함|모집|제보|문의|추가|예정|미정|공석|대기|준비중|업데이트|수정|점검|공지|일정)/;

const KNOWN_CREW_COUNTS = {
  사자회: 14,
  조적단: 9,
  오락실: 13,
  강씨세가: 9,
  천타버스: 12,
  ZZAM지트: 13,
  버컴퍼니: 8,
  지력사무소: 13,
  꾸한성: 16,
  버블란: 12,
  고래상사: 16,
  홍신소: 15,
  가무소: 16,
  로스타시티: 3,
  버인협회: 11,
};

const KNOWN_CREW_NAMES = Object.keys(KNOWN_CREW_COUNTS).sort((a, b) => b.length - a.length);

function decodeHtml(value = '') {
  return String(value).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}
function stripTags(value = '') { return decodeHtml(String(value).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function sanitizeName(value = '') { return String(value).replace(/[👑🦁⭐★☆✅✔️☑️🏆🥇🥈🥉🔥💎🎖️]/g, '').replace(/\s+/g, ' ').trim(); }
function normalizeName(value = '') { return sanitizeName(value).replace(/[\s\u200b]+/g, '').trim(); }
function normalizeUrl(raw = '') { const decoded = decodeHtml(raw || ''); if (!decoded) return ''; try { const url = new URL(decoded, 'https://docs.google.com'); const q = url.searchParams.get('q') || url.searchParams.get('url'); return q ? decodeURIComponent(q) : url.toString(); } catch { return decoded; } }
function pickBestUrl(candidates = []) { const links = candidates.map(normalizeUrl).filter(Boolean); return links.find((url) => /sooplive\.(com|co\.kr)/i.test(url)) || ''; }
function getHref(cellHtml = '') { const candidates = []; const patterns = [/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi, /data-sheets-hyperlink=["']([^"']+)["']/gi, /data-href=["']([^"']+)["']/gi, /data-url=["']([^"']+)["']/gi, /\b(?:https?:)?\/\/[^\s"'<>]+/gi]; patterns.forEach((pattern) => { [...String(cellHtml || '').matchAll(pattern)].forEach((match) => candidates.push(match[1] || match[0])); }); return pickBestUrl(candidates); }
function getColspan(cellTag = '') { const match = cellTag.match(/colspan=["']?(\d+)/i); return match ? Math.max(1, Number(match[1])) : 1; }
function parseRows(html = '') { const rows = []; const rowMatches = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]; rowMatches.forEach((rowMatch) => { const cells = []; let col = 0; const cellMatches = [...rowMatch[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/(td|th)>/gi)]; cellMatches.forEach((cellMatch) => { const tagAttrs = cellMatch[2] || ''; const cellHtml = cellMatch[3] || ''; const colspan = getColspan(tagAttrs); const text = sanitizeName(stripTags(cellHtml)); const href = getHref(`${cellHtml} ${tagAttrs}`); cells.push({ col, colspan, text, href, html: cellHtml }); col += colspan; }); if (cells.length) rows.push(cells); }); return rows; }
function parseCrewHeader(text = '') { const raw = String(text || '').trim(); const direct = raw.match(/(.+?)\s*\((\d+)\)/); if (direct) { const cleanName = normalizeName(direct[1]); const knownName = KNOWN_CREW_NAMES.find((name) => cleanName === normalizeName(name) || cleanName.includes(normalizeName(name))); return { name: knownName || sanitizeName(direct[1]), count: Number(direct[2]) }; } const compact = normalizeName(raw); const knownName = KNOWN_CREW_NAMES.find((name) => compact === normalizeName(name) || compact.includes(normalizeName(name))); if (!knownName) return null; return { name: knownName, count: KNOWN_CREW_COUNTS[knownName] }; }
function isCrewHeader(text = '') { return Boolean(parseCrewHeader(text)); }
function extractStationId(url = '') { const clean = String(url || '').trim(); if (!clean) return ''; const patterns = [/sooplive\.(?:com|co\.kr)\/station\/([^/?#]+)/i, /play\.sooplive\.(?:com|co\.kr)\/([^/?#]+)/i, /ch\.sooplive\.(?:com|co\.kr)\/([^/?#]+)/i]; for (const pattern of patterns) { const match = clean.match(pattern); if (match?.[1]) return decodeURIComponent(match[1]).toLowerCase(); } return ''; }
function buildProfileImages(stationUrl = '') { const id = extractStationId(stationUrl); if (!id) return []; const prefix = id.slice(0, 2).toLowerCase(); return [`https://stimg.sooplive.com/LOGO/${prefix}/${id}/${id}.jpg`, `https://stimg.sooplive.com/LOGO/${prefix}/${id}/m/${id}.webp`, `https://stimg.sooplive.com/LOGO/${prefix}/${id}/${id}.webp`, `https://stimg.sooplive.com/LOGO/${prefix}/${id}/m/${id}.jpg`]; }
function isStatusCell(text = '') { const value = String(text || '').trim(); return /수정/.test(value) || /점검/.test(value) || /^\d{1,2}\s*\/\s*\d{1,2}/.test(value) || /마크|엔더런|배틀|골프|내전|공지|일정/.test(value); }
function isUsableMember(cell) { const text = sanitizeName(cell?.text || ''); if (!text) return false; if (isCrewHeader(text)) return false; if (isStatusCell(text)) return false; if (BLOCKED_MEMBER_NAMES.has(text)) return false; if (PLACEHOLDER_NAME_PATTERN.test(text)) return false; if (/^\d+$/.test(text)) return false; if (/^(new|NEW)$/i.test(text)) return false; if (text.length > 30) return false; return true; }
function makeMember(nickname, stationUrl = '') { const profileImages = buildProfileImages(stationUrl); return { nickname: sanitizeName(nickname), stationUrl, extraUrl: '', profileImage: profileImages[0] || '', profileImages }; }
function addMember(crew, cell) { const nickname = sanitizeName(cell.text); if (!nickname || crew.members.some((member) => normalizeName(member.nickname) === normalizeName(nickname))) return; const stationUrl = cell.href && /sooplive\.(com|co\.kr)/i.test(cell.href) ? cell.href : MANUAL_STATION_OVERRIDES[nickname] || ''; crew.members.push(makeMember(nickname, stationUrl)); }
function countStationLinks(crews = []) { return crews.reduce((sum, crew) => sum + (crew.members || []).filter((member) => member.stationUrl).length, 0); }
function countMembers(crews = []) { return crews.reduce((sum, crew) => sum + (crew.members || []).length, 0); }
function makeRangesFromHeaders(headers) { return headers.map(({ cell, header }, index) => { const next = headers[index + 1]?.cell?.col; const start = cell.col; const expectedEnd = start + Math.max(cell.colspan - 1, Math.max(0, header.count - 1)); const end = next !== undefined ? next - 1 : expectedEnd; const crew = { name: header.name, count: KNOWN_CREW_COUNTS[header.name] || header.count, members: [] }; return { start, end, crew }; }); }
function parseCrewsFromHtml(html = '') { const rows = parseRows(html); const crews = []; let activeRanges = []; let emptyMemberRows = 0; rows.forEach((cells) => { const headers = cells.map((cell) => ({ cell, header: parseCrewHeader(cell.text) })).filter((item) => item.header); if (headers.length) { activeRanges = makeRangesFromHeaders(headers); activeRanges.forEach((range) => crews.push(range.crew)); emptyMemberRows = 0; return; } if (!activeRanges.length) return; let addedInRow = 0; cells.forEach((cell) => { if (!isUsableMember(cell)) return; const range = activeRanges.find((item) => cell.col >= item.start && cell.col <= item.end); if (!range) return; if (range.crew.members.length >= Math.max(1, range.crew.count)) return; const before = range.crew.members.length; addMember(range.crew, cell); if (range.crew.members.length > before) addedInRow += 1; }); if (addedInRow === 0) { emptyMemberRows += 1; if (emptyMemberRows >= 2) activeRanges = []; } else { emptyMemberRows = 0; if (activeRanges.every((range) => range.crew.members.length >= Math.max(1, range.crew.count))) activeRanges = []; } }); return crews.map((crew, index) => ({ ...crew, accentIndex: index })).filter((crew) => crew.name && crew.members.length); }
function extractLinkMapFromHtml(html = '') { const linkMap = new Map(); parseRows(html).forEach((cells) => { cells.forEach((cell) => { if (!isUsableMember(cell)) return; if (!cell.href || !/sooplive\.(com|co\.kr)/i.test(cell.href)) return; const cleanName = sanitizeName(cell.text); if (!linkMap.has(cleanName)) linkMap.set(cleanName, cell.href); }); }); Object.entries(MANUAL_STATION_OVERRIDES).forEach(([name, url]) => linkMap.set(sanitizeName(name), url)); return linkMap; }
function mergeLinkMaps(maps = []) { const merged = new Map(); maps.forEach((map) => { map.forEach((url, name) => { const cleanName = sanitizeName(name); if (cleanName && !merged.has(cleanName)) merged.set(cleanName, url); }); }); Object.entries(MANUAL_STATION_OVERRIDES).forEach(([name, url]) => merged.set(sanitizeName(name), url)); return merged; }
function applyManualAdditions(crews = []) { const map = new Map(crews.map((crew) => [crew.name, crew])); Object.entries(MANUAL_CREW_ADDITIONS).forEach(([crewName, members]) => { const crew = map.get(crewName); if (!crew) return; members.forEach((member) => { const nickname = sanitizeName(member.nickname); if (!nickname || crew.members.some((item) => normalizeName(item.nickname) === normalizeName(nickname))) return; crew.members.push(makeMember(nickname, member.stationUrl)); }); crew.count = Math.max(KNOWN_CREW_COUNTS[crewName] || crew.count || 0, crew.members.length); }); return crews; }
function enrichCrewLinks(crews = [], linkMap = new Map(), source) { return applyManualAdditions(crews).map((crew, crewIndex) => { const members = (crew.members || []).map((member) => { const cleanName = sanitizeName(member.nickname); const stationUrl = member.stationUrl || MANUAL_STATION_OVERRIDES[cleanName] || linkMap.get(cleanName) || ''; const profileImages = stationUrl ? buildProfileImages(stationUrl) : []; return { ...member, nickname: cleanName, stationUrl, profileImage: profileImages[0] || '', profileImages }; }).filter((member) => member.stationUrl && !BLOCKED_MEMBER_NAMES.has(member.nickname) && !PLACEHOLDER_NAME_PATTERN.test(member.nickname)).map((member, memberIndex) => ({ ...member, role: memberIndex === 0 ? 'leader' : 'member' })); return { ...crew, count: KNOWN_CREW_COUNTS[crew.name] || Math.max(crew.count || 0, members.length), category: source.category, categoryLabel: source.categoryLabel, members, leader: members[0] || null, accentIndex: crewIndex }; }).filter((crew) => crew.members.length); }
async function fetchText(url) { const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8' } }); if (!res.ok) throw new Error(`Sheet html failed: ${res.status}`); return res.text(); }
async function fetchSheetCrews(source) { const urls = [`https://docs.google.com/spreadsheets/d/${source.id}/htmlview?gid=${source.gid}&single=true&widget=false&headers=false`, `https://docs.google.com/spreadsheets/d/${source.id}/gviz/tq?tqx=out:html&gid=${source.gid}`]; const parsed = []; const linkMaps = []; for (const url of urls) { try { const html = await fetchText(url); const crews = parseCrewsFromHtml(html); const linkMap = extractLinkMapFromHtml(html); parsed.push({ crews, stationLinks: countStationLinks(crews), memberCount: countMembers(crews), url }); linkMaps.push(linkMap); } catch {} } if (!parsed.length) return { crews: [], stationLinks: 0, memberCount: 0, url: '' }; const mergedLinks = mergeLinkMaps(linkMaps); parsed.sort((a, b) => b.crews.length - a.crews.length || b.memberCount - a.memberCount || b.stationLinks - a.stationLinks); return { ...parsed[0], crews: enrichCrewLinks(parsed[0].crews, mergedLinks, source) }; }
function makeCategoryStats(crews = []) { return SHEET_SOURCES.reduce((acc, source) => { const filtered = crews.filter((crew) => crew.category === source.category); acc[source.category] = { label: source.categoryLabel, crewCount: filtered.length, memberCount: countMembers(filtered) }; return acc; }, {}); }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', `public, s-maxage=${CREW_SHEET_CACHE_SECONDS}, stale-while-revalidate=${CREW_SHEET_STALE_SECONDS}`);
  try {
    const results = await Promise.allSettled(SHEET_SOURCES.map(fetchSheetCrews));
    const chunks = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
    const crews = chunks.flatMap((chunk) => chunk.crews || []);
    return res.status(200).json({ crews, categories: SHEET_SOURCES.map(({ category, categoryLabel }) => ({ key: category, label: categoryLabel })), categoryStats: makeCategoryStats(crews), source: crews.length ? 'google-sheet-html' : 'empty', linkCount: countStationLinks(crews), sourceStatus: results.map((result, index) => ({ category: SHEET_SOURCES[index].category, ok: result.status === 'fulfilled', crewCount: result.status === 'fulfilled' ? result.value.crews.length : 0 })), updatedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(200).json({ crews: [], categories: [], categoryStats: {}, source: 'fallback', error: true, message: error?.message || 'unknown' });
  }
}

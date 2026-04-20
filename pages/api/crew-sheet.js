const SHEET_SOURCES = [
  {
    id: '1-mACl-yykHphsqiSUNPkoC1GHydOYmWX-xHqdRz7DVM',
    gid: '344917607',
  },
];

const KNOWN_CREW_COUNTS = {
  사자회: 14,
  조적단: 8,
  오락실: 13,
  천타버스: 12,
  ZZAM지트: 12,
  버컴퍼니: 9,
  지력사무소: 13,
  꾸한성: 16,
  버블란: 11,
  고래상사: 16,
  홍신소: 15,
  가무소: 16,
  로스타시티: 2,
  버인협회: 11,
};

const KNOWN_CREW_NAMES = Object.keys(KNOWN_CREW_COUNTS).sort((a, b) => b.length - a.length);

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeUrl(raw = '') {
  const decoded = decodeHtml(raw || '');
  if (!decoded) return '';
  try {
    const url = new URL(decoded, 'https://docs.google.com');
    const q = url.searchParams.get('q') || url.searchParams.get('url');
    return q ? decodeURIComponent(q) : url.toString();
  } catch {
    return decoded;
  }
}

function pickBestUrl(candidates = []) {
  const links = candidates.map(normalizeUrl).filter(Boolean);
  return links.find((url) => /sooplive\.(com|co\.kr)/i.test(url)) || links.find((url) => /^https?:\/\//i.test(url)) || '';
}

function getHref(cellHtml = '') {
  const candidates = [];
  const patterns = [
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi,
    /data-sheets-hyperlink=["']([^"']+)["']/gi,
    /data-href=["']([^"']+)["']/gi,
    /data-url=["']([^"']+)["']/gi,
    /\b(?:https?:)?\/\/[^\s"'<>]+/gi,
  ];
  patterns.forEach((pattern) => {
    [...String(cellHtml || '').matchAll(pattern)].forEach((match) => candidates.push(match[1] || match[0]));
  });
  return pickBestUrl(candidates);
}

function getColspan(cellTag = '') {
  const match = cellTag.match(/colspan=["']?(\d+)/i);
  return match ? Math.max(1, Number(match[1])) : 1;
}

function parseRows(html = '') {
  const rows = [];
  const rowMatches = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  rowMatches.forEach((rowMatch) => {
    const cells = [];
    let col = 0;
    const cellMatches = [...rowMatch[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/(td|th)>/gi)];
    cellMatches.forEach((cellMatch) => {
      const tagAttrs = cellMatch[2] || '';
      const cellHtml = cellMatch[3] || '';
      const colspan = getColspan(tagAttrs);
      const text = stripTags(cellHtml);
      const href = getHref(`${cellHtml} ${tagAttrs}`);
      cells.push({ col, colspan, text, href, html: cellHtml });
      col += colspan;
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

function normalizeCrewName(text = '') {
  return String(text).replace(/[\s\u200b]+/g, '').replace(/[🦁⭐★☆✅✔️☑️]/g, '').trim();
}

function parseCrewHeader(text = '') {
  const raw = String(text || '').trim();
  const direct = raw.match(/(.+?)\s*\((\d+)\)/);
  if (direct) {
    const cleanName = normalizeCrewName(direct[1]);
    const knownName = KNOWN_CREW_NAMES.find((name) => normalizeCrewName(name) === cleanName || cleanName.includes(normalizeCrewName(name)));
    return { name: knownName || direct[1].trim(), count: Number(direct[2]) };
  }

  const compact = normalizeCrewName(raw);
  const knownName = KNOWN_CREW_NAMES.find((name) => compact === normalizeCrewName(name) || compact.includes(normalizeCrewName(name)));
  if (!knownName) return null;
  return { name: knownName, count: KNOWN_CREW_COUNTS[knownName] };
}

function isCrewHeader(text = '') {
  return Boolean(parseCrewHeader(text));
}

function extractStationId(url = '') {
  const clean = String(url || '').trim();
  if (!clean) return '';
  const patterns = [
    /sooplive\.(?:com|co\.kr)\/station\/([^/?#]+)/i,
    /play\.sooplive\.(?:com|co\.kr)\/([^/?#]+)/i,
    /ch\.sooplive\.(?:com|co\.kr)\/([^/?#]+)/i,
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]).toLowerCase();
  }
  return '';
}

function buildProfileImages(stationUrl = '') {
  const id = extractStationId(stationUrl);
  if (!id) return [];
  const prefix = id.slice(0, 2).toLowerCase();
  return [
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/${id}.jpg`,
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/m/${id}.webp`,
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/${id}.webp`,
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/m/${id}.jpg`,
  ];
}

function isUsableMember(cell) {
  if (!cell?.text) return false;
  if (isCrewHeader(cell.text)) return false;
  if (/^\d+$/.test(cell.text)) return false;
  if (/^(new|NEW)$/i.test(cell.text)) return false;
  if (/^(수정\s*중|점검\s*중)$/i.test(cell.text)) return false;
  if (cell.text.length > 30) return false;
  return true;
}

function addMember(crew, cell) {
  const nickname = cell.text.trim();
  if (!nickname || crew.members.some((member) => member.nickname === nickname)) return;
  const stationUrl = cell.href && /sooplive\.(com|co\.kr)/i.test(cell.href) ? cell.href : '';
  const extraUrl = cell.href && !stationUrl ? cell.href : '';
  const profileImages = buildProfileImages(stationUrl);
  crew.members.push({
    nickname,
    stationUrl,
    extraUrl,
    profileImage: profileImages[0] || '',
    profileImages,
  });
}

function countStationLinks(crews = []) {
  return crews.reduce((sum, crew) => sum + (crew.members || []).filter((member) => member.stationUrl).length, 0);
}

function makeRangesFromHeaders(headers) {
  return headers.map(({ cell, header }, index) => {
    const next = headers[index + 1]?.cell?.col;
    const start = cell.col;
    const expectedEnd = start + Math.max(cell.colspan - 1, Math.max(0, header.count - 1));
    const end = next !== undefined ? next - 1 : expectedEnd;
    const crew = { name: header.name, count: header.count, members: [] };
    return { start, end, crew };
  });
}

function parseCrewsFromHtml(html = '') {
  const rows = parseRows(html);
  const crews = [];
  let activeRanges = [];
  let emptyMemberRows = 0;

  rows.forEach((cells) => {
    const headers = cells.map((cell) => ({ cell, header: parseCrewHeader(cell.text) })).filter((item) => item.header);
    if (headers.length) {
      activeRanges = makeRangesFromHeaders(headers);
      activeRanges.forEach((range) => crews.push(range.crew));
      emptyMemberRows = 0;
      return;
    }

    if (!activeRanges.length) return;
    let addedInRow = 0;
    cells.forEach((cell) => {
      if (!isUsableMember(cell)) return;
      const range = activeRanges.find((item) => cell.col >= item.start && cell.col <= item.end);
      if (!range) return;
      if (range.crew.members.length >= Math.max(1, range.crew.count)) return;
      const before = range.crew.members.length;
      addMember(range.crew, cell);
      if (range.crew.members.length > before) addedInRow += 1;
    });

    if (addedInRow === 0) {
      emptyMemberRows += 1;
      if (emptyMemberRows >= 2) activeRanges = [];
    } else {
      emptyMemberRows = 0;
      if (activeRanges.every((range) => range.crew.members.length >= Math.max(1, range.crew.count))) activeRanges = [];
    }
  });

  return crews
    .map((crew, index) => {
      const members = crew.members.slice(0, crew.count).map((member, memberIndex) => ({ ...member, role: memberIndex === 0 ? 'leader' : 'member' }));
      return {
        ...crew,
        leader: members[0] || null,
        members,
        accentIndex: index,
      };
    })
    .filter((crew) => crew.name && crew.members.length);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Sheet html failed: ${res.status}`);
  return res.text();
}

async function fetchSheetCrews(source) {
  const urls = [
    `https://docs.google.com/spreadsheets/d/${source.id}/htmlview?gid=${source.gid}&single=true&widget=false&headers=false`,
    `https://docs.google.com/spreadsheets/d/${source.id}/gviz/tq?tqx=out:html&gid=${source.gid}`,
  ];

  const parsed = [];
  for (const url of urls) {
    try {
      const crews = parseCrewsFromHtml(await fetchText(url));
      parsed.push({ crews, stationLinks: countStationLinks(crews), url });
    } catch {}
  }
  parsed.sort((a, b) => b.stationLinks - a.stationLinks || b.crews.length - a.crews.length);
  if (!parsed.length) throw new Error('No readable sheet html');
  return parsed[0];
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  try {
    const chunks = await Promise.all(SHEET_SOURCES.map(fetchSheetCrews));
    const crews = chunks.flatMap((chunk) => chunk.crews);
    return res.status(200).json({
      crews,
      source: 'google-sheet-html',
      linkCount: countStationLinks(crews),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({ crews: [], source: 'fallback', error: true, message: error?.message || 'unknown' });
  }
}

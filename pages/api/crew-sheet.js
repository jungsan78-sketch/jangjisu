const SHEET_SOURCES = [
  {
    id: '1-mACl-yykHphsqiSUNPkoC1GHydOYmWX-xHqdRz7DVM',
    gid: '344917607',
  },
];

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

function getHref(cellHtml = '') {
  const linkMatch = cellHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return linkMatch ? normalizeUrl(linkMatch[1]) : '';
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
      const href = getHref(cellHtml);
      cells.push({ col, colspan, text, href, html: cellHtml });
      col += colspan;
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

function parseCrewHeader(text = '') {
  const match = String(text).trim().match(/^(.+?)\s*\((\d+)\)$/);
  if (!match) return null;
  return { name: match[1].trim(), count: Number(match[2]) };
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

function buildProfileImage(stationUrl = '') {
  const id = extractStationId(stationUrl);
  if (!id) return '';
  const prefix = id.slice(0, 2).toLowerCase();
  return `https://stimg.sooplive.com/LOGO/${prefix}/${id}/${id}.jpg`;
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
  crew.members.push({
    nickname,
    stationUrl,
    extraUrl,
    profileImage: buildProfileImage(stationUrl),
  });
}

function parseCrewsFromHtml(html = '') {
  const rows = parseRows(html);
  const crews = [];
  let activeRanges = [];

  rows.forEach((cells) => {
    const headers = cells.map((cell) => ({ cell, header: parseCrewHeader(cell.text) })).filter((item) => item.header);
    if (headers.length) {
      activeRanges = headers.map(({ cell, header }, index) => {
        const next = headers[index + 1]?.cell?.col;
        const start = cell.col;
        const end = next !== undefined ? next - 1 : start + Math.max(cell.colspan - 1, Math.max(0, header.count - 1));
        const crew = { name: header.name, count: header.count, members: [] };
        crews.push(crew);
        return { start, end, crew };
      });
      return;
    }

    if (!activeRanges.length) return;
    cells.forEach((cell) => {
      if (!isUsableMember(cell)) return;
      const range = activeRanges.find((item) => cell.col >= item.start && cell.col <= item.end);
      if (!range) return;
      if (range.crew.members.length >= Math.max(1, range.crew.count)) return;
      addMember(range.crew, cell);
    });
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

async function fetchSheetHtml({ id, gid }) {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:html&gid=${gid}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Sheet html failed: ${res.status}`);
  return res.text();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
  try {
    const chunks = await Promise.all(SHEET_SOURCES.map(async (source) => parseCrewsFromHtml(await fetchSheetHtml(source))));
    const crews = chunks.flat();
    return res.status(200).json({ crews, source: 'google-sheet-html', updatedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(200).json({ crews: [], source: 'fallback', error: true, message: error?.message || 'unknown' });
  }
}

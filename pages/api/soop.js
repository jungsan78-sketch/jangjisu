
import * as cheerio from 'cheerio';

const CHANNEL_ID = 'iamquaddurup';
const CHANNEL_URL = `https://www.sooplive.com/station/${CHANNEL_ID}`;
const VOD_URL = `${CHANNEL_URL}/vod`;
const BOARD_URL = `${CHANNEL_URL}/board`;
const FANCAFE_URL = 'https://cafe.naver.com/quaddurupfancafe';

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim();
}

function uniqueBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickFirst(...values) {
  return values.find((v) => v && String(v).trim());
}

function makeAbsolute(url = '', base = CHANNEL_URL) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `https://www.sooplive.com${url}`;
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

async function getHtml(url) {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${url} (${res.status})`);
  }

  return res.text();
}

function detectLiveStatus(html) {
  const text = cleanText(html);
  const positivePatterns = [
    /ON\s*AIR/i,
    /LIVE\s*NOW/i,
    /생방송/i,
    /방송\s*중/i,
    /라이브/i,
  ];

  const negativePatterns = [
    /방송\s*중이\s*아닙니다/i,
    /OFFLINE/i,
    /오프라인/i,
  ];

  const isPositive = positivePatterns.some((pattern) => pattern.test(text));
  const isNegative = negativePatterns.some((pattern) => pattern.test(text));

  if (isPositive && !isNegative) return true;
  if (!isPositive && isNegative) return false;

  // fallback: look for likely live page links
  if (/\/player\//i.test(html) || /liveUrl/i.test(html)) return true;

  return null;
}

function extractLiveTitle(html) {
  const candidates = [
    html.match(/"broadcastTitle"\s*:\s*"([^"]+)"/i)?.[1],
    html.match(/"title"\s*:\s*"([^"]+)"/i)?.[1],
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1],
  ];

  return cleanText(pickFirst(...candidates) || '');
}

function parseVodItems(html) {
  const $ = cheerio.load(html);
  const items = [];

  $('[href*="/vod/"]').each((_, el) => {
    const card = $(el).closest('article, li, .vod_item, .item_box, .box, .card').first();
    const scope = card.length ? card : $(el);

    const href = makeAbsolute($(el).attr('href') || '');
    const thumb = makeAbsolute(
      pickFirst(
        scope.find('img').first().attr('src'),
        scope.find('img').first().attr('data-src'),
        $(el).find('img').first().attr('src'),
        $(el).find('img').first().attr('data-src')
      ) || ''
    );

    const title = cleanText(
      pickFirst(
        scope.find('[class*="title"]').first().text(),
        scope.find('strong').first().text(),
        scope.find('h3, h4').first().text(),
        $(el).attr('title'),
        $(el).text()
      ) || ''
    );

    const metaText = cleanText(scope.text());
    const duration = metaText.match(/\b\d{1,2}:\d{2}:\d{2}\b/)?.[0] || metaText.match(/\b\d{1,2}:\d{2}\b/)?.[0] || '';
    const date = metaText.match(/\b20\d{2}[.\-]\d{2}[.\-]\d{2}\b/)?.[0] || '';
    const views = metaText.match(/\b[\d,.]+\b/)?.[0] || '';

    if (href && title && title.length > 3) {
      items.push({
        title,
        url: href,
        thumbnail: thumb,
        duration,
        date,
        views,
      });
    }
  });

  return uniqueBy(items, (item) => item.url).slice(0, 6);
}

function parseBoardItems(html) {
  const $ = cheerio.load(html);
  const items = [];

  $('[href*="/post/"]').each((_, el) => {
    const card = $(el).closest('article, li, .post_item, .item_box, .box, .card').first();
    const scope = card.length ? card : $(el);

    const href = makeAbsolute($(el).attr('href') || '');
    const title = cleanText(
      pickFirst(
        scope.find('[class*="title"]').first().text(),
        scope.find('strong').first().text(),
        scope.find('h3, h4').first().text(),
        $(el).attr('title'),
        $(el).text()
      ) || ''
    );

    const summary = cleanText(
      pickFirst(
        scope.find('[class*="desc"]').first().text(),
        scope.find('p').first().text()
      ) || ''
    );

    const thumb = makeAbsolute(
      pickFirst(
        scope.find('img').first().attr('src'),
        scope.find('img').first().attr('data-src')
      ) || ''
    );

    const metaText = cleanText(scope.text());
    const date =
      metaText.match(/\b20\d{2}[.\-]\d{2}[.\-]\d{2}\b/)?.[0] ||
      metaText.match(/\b\d+\s*(분|시간|일)\s*전\b/)?.[0] ||
      '';

    if (href && title && title.length > 2) {
      items.push({
        title,
        url: href,
        summary,
        thumbnail: thumb,
        date,
      });
    }
  });

  return uniqueBy(items, (item) => item.url).slice(0, 6);
}

export default async function handler(req, res) {
  try {
    const [channelHtml, vodHtml, boardHtml] = await Promise.all([
      getHtml(CHANNEL_URL),
      getHtml(VOD_URL),
      getHtml(BOARD_URL),
    ]);

    const liveTitle = extractLiveTitle(channelHtml);
    const isLive = detectLiveStatus(channelHtml);

    const vods = parseVodItems(vodHtml);
    const notices = parseBoardItems(boardHtml);

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

    return res.status(200).json({
      ok: true,
      channel: {
        id: CHANNEL_ID,
        name: '장지수',
        soopUrl: CHANNEL_URL,
        fanCafeUrl: FANCAFE_URL,
        isLive,
        liveTitle: liveTitle || '장지수 방송국',
      },
      vods,
      notices,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      channel: {
        id: CHANNEL_ID,
        name: '장지수',
        soopUrl: CHANNEL_URL,
        fanCafeUrl: FANCAFE_URL,
        isLive: null,
        liveTitle: '장지수 방송국',
      },
      vods: [],
      notices: [],
      fetchedAt: new Date().toISOString(),
      error: error.message,
    });
  }
}

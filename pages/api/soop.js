
import * as cheerio from 'cheerio';

const CHANNEL_ID = 'iamquaddurup';
const CHANNEL_URL = `https://www.sooplive.com/station/${CHANNEL_ID}`;
const VOD_URL = `${CHANNEL_URL}/vod`;
const BOARD_URL = `${CHANNEL_URL}/board`;
const FANCAFE_URL = 'https://cafe.naver.com/quaddurupfancafe';

const PINNED_POSTS = [
  {
    type: '공지',
    url: 'https://www.sooplive.com/station/iamquaddurup/board/97620291',
  },
  {
    type: '뱀이봤',
    url: 'https://www.sooplive.com/station/iamquaddurup/board/110535921',
  },
];

const DEFAULT_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function cleanText(value = '') {
  return String(value).replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim();
}

function pickFirst(...values) {
  return values.find((v) => cleanText(v));
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

function makeAbsolute(url = '', base = CHANNEL_URL) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `https://www.sooplive.com${url}`;
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

async function getHtml(url) {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return await res.text();
}

function extractMeta(html, key) {
  const regexes = {
    title: [
      /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i,
      /<meta[^>]+name="twitter:title"[^>]+content="([^"]+)"/i,
      /<title>([^<]+)<\/title>/i,
    ],
    image: [
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
      /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"/i,
    ],
    description: [
      /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i,
      /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
      /<meta[^>]+name="twitter:description"[^>]+content="([^"]+)"/i,
    ],
  };
  const match = (regexes[key] || []).map((r) => html.match(r)?.[1]).find(Boolean);
  return cleanText(match || '');
}

function detectLiveStatus(html) {
  const text = cleanText(html);
  const positivePatterns = [/ON\s*AIR/i, /LIVE\s*NOW/i, /생방송/i, /방송\s*중/i, /라이브/i];
  const negativePatterns = [/방송\s*중이\s*아닙니다/i, /OFFLINE/i, /오프라인/i];

  const isPositive = positivePatterns.some((pattern) => pattern.test(text));
  const isNegative = negativePatterns.some((pattern) => pattern.test(text));

  if (isPositive && !isNegative) return true;
  if (!isPositive && isNegative) return false;
  if (/\/player\//i.test(html) || /liveUrl/i.test(html)) return true;
  return null;
}

function extractLiveTitle(html) {
  const candidates = [
    html.match(/"broadcastTitle"\s*:\s*"([^"]+)"/i)?.[1],
    html.match(/"title"\s*:\s*"([^"]+)"/i)?.[1],
    extractMeta(html, 'title'),
  ];
  return cleanText(pickFirst(...candidates) || '');
}

function collectVodUrlsFromHtml(html) {
  const urls = new Set();
  const patterns = [
    /https:\/\/www\.sooplive\.com\/player\/(\d+)/gi,
    /https:\/\/vod\.sooplive\.co\.kr\/player\/(\d+)/gi,
    /\/player\/(\d+)/gi,
    /\/vod\/(\d+)/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1];
      urls.add(`https://vod.sooplive.co.kr/player/${id}`);
    }
  });

  const $ = cheerio.load(html);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const abs = makeAbsolute(href, VOD_URL);
    if (/\/player\/\d+/i.test(abs) || /\/vod\/\d+/i.test(abs)) {
      const id = abs.match(/(\d+)(?!.*\d)/)?.[1];
      if (id) urls.add(`https://vod.sooplive.co.kr/player/${id}`);
    }
  });

  return Array.from(urls).slice(0, 8);
}

async function enrichVod(url) {
  try {
    const html = await getHtml(url);
    return {
      title: extractMeta(html, 'title') || '장지수 다시보기',
      url,
      thumbnail: makeAbsolute(extractMeta(html, 'image') || ''),
      description: extractMeta(html, 'description') || '',
      duration:
        html.match(/\b\d{1,2}:\d{2}:\d{2}\b/)?.[0] ||
        html.match(/\b\d{1,2}:\d{2}\b/)?.[0] ||
        '',
      date:
        html.match(/\b20\d{2}[.\-]\d{2}[.\-]\d{2}\b/)?.[0] ||
        html.match(/\b\d{4}\.\d{2}\.\d{2}\b/)?.[0] ||
        '',
      views:
        html.match(/조회\s*수?\s*([\d,]+)/i)?.[1] ||
        html.match(/views?\s*([\d,]+)/i)?.[1] ||
        '',
    };
  } catch {
    return null;
  }
}

async function getVodItems() {
  const html = await getHtml(VOD_URL);
  const directUrls = collectVodUrlsFromHtml(html);
  const enriched = (await Promise.all(directUrls.map(enrichVod))).filter(Boolean);

  if (enriched.length) return uniqueBy(enriched, (item) => item.url).slice(0, 4);

  const $ = cheerio.load(html);
  const items = [];
  $('[href*="/player/"], [href*="/vod/"]').each((_, el) => {
    const href = makeAbsolute($(el).attr('href') || '', VOD_URL);
    const card = $(el).closest('article, li, .vod_item, .item_box, .box, .card').first();
    const scope = card.length ? card : $(el);
    const title = cleanText(
      pickFirst(
        scope.find('[class*="title"]').first().text(),
        scope.find('strong').first().text(),
        scope.find('h3, h4').first().text(),
        $(el).attr('title'),
      ) || ''
    );
    const thumbnail = makeAbsolute(
      pickFirst(
        scope.find('img').first().attr('src'),
        scope.find('img').first().attr('data-src'),
      ) || ''
    );
    if (href && title) {
      items.push({
        title,
        url: href,
        thumbnail,
        duration: '',
        date: '',
        views: '',
      });
    }
  });

  return uniqueBy(items, (item) => item.url).slice(0, 4);
}

function parsePostPage(html, url, type) {
  const $ = cheerio.load(html);
  const title = cleanText(
    pickFirst(
      extractMeta(html, 'title')?.replace(/\s*-\s*SOOP.*$/i, ''),
      $('h1').first().text(),
      $('[class*="title"]').first().text(),
      $('strong').first().text()
    ) || ''
  );

  const summary = cleanText(
    pickFirst(
      extractMeta(html, 'description'),
      $('[class*="content"]').first().text(),
      $('article').first().text(),
      $('main').text()
    ) || ''
  );

  const date =
    cleanText(
      pickFirst(
        $('time').first().text(),
        $('[class*="date"]').first().text(),
        $('[class*="time"]').first().text()
      ) || ''
    ) ||
    html.match(/\b20\d{2}[.\-]\d{2}[.\-]\d{2}\b/)?.[0] ||
    '';

  return {
    type,
    title: title || `${type} 게시글`,
    url,
    summary: summary.slice(0, 180),
    thumbnail: makeAbsolute(extractMeta(html, 'image') || ''),
    date,
  };
}

async function getPinnedPosts() {
  const results = await Promise.all(
    PINNED_POSTS.map(async (item) => {
      try {
        const html = await getHtml(item.url);
        return parsePostPage(html, item.url, item.type);
      } catch {
        return {
          type: item.type,
          title: `${item.type} 게시글`,
          url: item.url,
          summary: '',
          thumbnail: '',
          date: '',
        };
      }
    })
  );
  return results;
}

function parseBoardList(html) {
  const $ = cheerio.load(html);
  const items = [];
  $('[href*="/board/"]').each((_, el) => {
    const href = makeAbsolute($(el).attr('href') || '', BOARD_URL);
    if (/\/board\/\d+/i.test(href)) {
      const card = $(el).closest('article, li, .post_item, .item_box, .box, .card').first();
      const scope = card.length ? card : $(el);
      const title = cleanText(
        pickFirst(
          scope.find('[class*="title"]').first().text(),
          scope.find('strong').first().text(),
          scope.find('h3, h4').first().text(),
          $(el).attr('title')
        ) || ''
      );
      if (title) {
        items.push({
          type: '게시판',
          title,
          url: href,
          summary: cleanText(
            pickFirst(
              scope.find('[class*="desc"]').first().text(),
              scope.find('p').first().text()
            ) || ''
          ),
          thumbnail: makeAbsolute(
            pickFirst(
              scope.find('img').first().attr('src'),
              scope.find('img').first().attr('data-src')
            ) || ''
          ),
          date:
            cleanText(
              pickFirst(
                scope.find('time').first().text(),
                scope.find('[class*="date"]').first().text()
              ) || ''
            ) || '',
        });
      }
    }
  });
  return uniqueBy(items, (item) => item.url).slice(0, 6);
}

export default async function handler(req, res) {
  try {
    const [channelHtml, vods, pinnedPosts, boardHtml] = await Promise.all([
      getHtml(CHANNEL_URL),
      getVodItems(),
      getPinnedPosts(),
      getHtml(BOARD_URL).catch(() => ''),
    ]);

    const boardList = boardHtml ? parseBoardList(boardHtml) : [];
    const notices = uniqueBy([...pinnedPosts, ...boardList], (item) => item.url).slice(0, 6);

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

    return res.status(200).json({
      ok: true,
      channel: {
        id: CHANNEL_ID,
        name: '장지수',
        soopUrl: CHANNEL_URL,
        vodUrl: VOD_URL,
        boardUrl: BOARD_URL,
        fanCafeUrl: FANCAFE_URL,
        isLive: detectLiveStatus(channelHtml),
        liveTitle: extractLiveTitle(channelHtml) || '장지수 방송국',
      },
      vods,
      notices,
      pinnedPosts,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      channel: {
        id: CHANNEL_ID,
        name: '장지수',
        soopUrl: CHANNEL_URL,
        vodUrl: VOD_URL,
        boardUrl: BOARD_URL,
        fanCafeUrl: FANCAFE_URL,
        isLive: null,
        liveTitle: '장지수 방송국',
      },
      vods: [],
      notices: [],
      pinnedPosts: [],
      fetchedAt: new Date().toISOString(),
      error: error.message,
    });
  }
}

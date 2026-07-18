const BOARD_PAGE_SIZE = 20;

function buildBoardUrl(stationId, page = 1) {
  const params = new URLSearchParams({
    per_page: String(BOARD_PAGE_SIZE),
    start_date: '',
    end_date: '',
    field: 'title,contents,user_nick,user_id,hashtags',
    keyword: '',
    type: 'all',
    order_by: 'reg_date',
    board_number: '',
    page: String(page),
  });

  return `https://chapi.sooplive.com/api/${stationId}/board/?${params.toString()}`;
}

function buildHomePostUrl(stationId) {
  return `https://api-channel.sooplive.com/v1.1/channel/${stationId}/home/section/post`;
}

async function fetchSourceJson(stationId, url, refererPath = '') {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Origin: 'https://www.sooplive.com',
      Referer: `https://www.sooplive.com/station/${stationId}${refererPath}`,
      'User-Agent': 'Mozilla/5.0 (compatible; JangJiSouBot/1.0; +https://www.jangjisou.xyz)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`SOOP notice source fetch failed: ${stationId} ${response.status}`);
  }

  return response.json();
}

export function fetchHomePostJson(stationId) {
  return fetchSourceJson(stationId, buildHomePostUrl(stationId));
}

export function fetchBoardPageJson(stationId, page = 1) {
  return fetchSourceJson(stationId, buildBoardUrl(stationId, page), '/board');
}

export { BOARD_PAGE_SIZE };

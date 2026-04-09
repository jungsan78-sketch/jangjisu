export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const CSV_URL =
      'https://docs.google.com/spreadsheets/d/1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM/export?format=csv&gid=315851366';

    const response = await fetch(CSV_URL, { cache: 'no-store' });
    const csv = await response.text();

    if (!response.ok || !csv) {
      throw new Error('Failed to load Google Sheet CSV');
    }

    const rows = csv
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    // 기대 컬럼: date, day, title 또는 첫 3열 사용
    const dataRows = rows.slice(1);

    const items = dataRows
      .map((row) => {
        const cols = row
          .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map((v) => v.replace(/^"|"$/g, '').trim());

        return {
          date: cols[0] || '',
          day: cols[1] || '',
          title: cols[2] || '',
        };
      })
      .filter((item) => item.date && item.title);

    return res.status(200).json({
      ok: true,
      monthLabel: '일정',
      items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      monthLabel: '일정',
      items: [],
      error: error.message,
    });
  }
}

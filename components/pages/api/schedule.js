
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const SHEET_URL = process.env.GOOGLE_SHEET_CSV_URL;

    if (!SHEET_URL) {
      return res.json({ ok:false, error:"GOOGLE_SHEET_CSV_URL not set" });
    }

    const csv = await fetch(SHEET_URL).then(r=>r.text());

    const rows = csv.split('\n').slice(1);

    const items = rows.map(row=>{
      const cols = row.split(',');
      return {
        date: cols[0] || '',
        day: cols[1] || '',
        title: cols[2] || ''
      }
    }).filter(v=>v.date && v.title);

    return res.json({
      ok:true,
      monthLabel:"일정",
      items
    });

  } catch(e) {
    return res.json({ ok:false, error:e.message });
  }
}

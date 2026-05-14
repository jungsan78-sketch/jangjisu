import { fetchSnkrdunkProductDetail } from '../../lib/pokemon/snkrdunk';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');

  const id = String(req.query.id || '').trim();
  if (!id) {
    return res.status(400).json({ ok: false, error: 'id query is required' });
  }

  try {
    const payload = await fetchSnkrdunkProductDetail(id);
    return res.status(200).json({
      ok: true,
      ...payload,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      error: error.message || 'Failed to fetch SNKRDUNK product detail',
      path: error.path || '',
      fetchedAt: new Date().toISOString(),
    });
  }
}

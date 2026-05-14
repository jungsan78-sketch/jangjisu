import { searchSnkrdunkProducts } from '../../lib/pokemon/snkrdunk';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const q = String(req.query.q || '').trim();
  const limit = Math.min(Number(req.query.limit || 12) || 12, 20);

  if (!q) {
    return res.status(400).json({ ok: false, products: [], error: 'q query is required' });
  }

  try {
    const payload = await searchSnkrdunkProducts(q, limit);
    return res.status(200).json({
      ok: true,
      ...payload,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      ok: false,
      products: [],
      error: error.message || 'Failed to search SNKRDUNK products',
      fetchedAt: new Date().toISOString(),
    });
  }
}

import { fetchSoopPostUpRanking } from '../../lib/soop/postCommentRanking';

const TEST_POST_URL = 'https://www.sooplive.com/station/iamquaddurup/post/198923295';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=120');

  const debug = String(req.query.debug || '') === '1';

  try {
    const payload = await fetchSoopPostUpRanking(TEST_POST_URL, { debug });
    return res.status(200).json({ ok: true, ...payload });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error?.message || 'SOOP 댓글 UP 순위를 불러오지 못했습니다.',
      postUrl: TEST_POST_URL,
      fetchedAt: new Date().toISOString(),
      ...(debug ? { debug: { attempts: error?.attempts || [] } } : {}),
    });
  }
}

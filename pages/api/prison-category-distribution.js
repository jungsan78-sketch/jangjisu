import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { readSnapshotCache, writeSnapshotCache } from '../../lib/cloudflareSnapshotCache';
import { fetchTrackifyCategoryDistribution } from '../../lib/prisonCategoryDistribution';
import { getReplayMonthStorageTtl, isReplayMonthCacheFresh, resolveReplayMonth } from '../../lib/replayMonthWindow';

const CACHE_VERSION = 'v1';
const refreshPromises = new Map();
const allowedMemberIds = new Set(ALL_PRISON_MEMBERS.map((member) => (
  String(member.station || '').split('/').filter(Boolean).pop() || ''
)).filter(Boolean));

function cacheKey(monthInfo, memberId) {
  return `prison:category-distribution:${monthInfo.monthKey}:${memberId}:${CACHE_VERSION}`;
}

async function refreshCategoryDistribution(cache, key, monthInfo, memberId) {
  if (refreshPromises.has(key)) return refreshPromises.get(key);
  const promise = (async () => {
    const payload = await fetchTrackifyCategoryDistribution({ memberId, monthInfo });
    const record = { payload, cachedAt: Date.now() };
    const storage = await writeSnapshotCache(cache, key, record, getReplayMonthStorageTtl(monthInfo));
    return { record, storage };
  })();
  refreshPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    if (refreshPromises.get(key) === promise) refreshPromises.delete(key);
  }
}

export default async function handler(req, res) {
  const memberId = String(req.query?.member || '').trim();
  const monthInfo = resolveReplayMonth(req.query?.month);
  if (!allowedMemberIds.has(memberId)) {
    return res.status(400).json({ ok: false, message: '카테고리 분포를 조회할 멤버를 찾지 못했습니다.' });
  }
  if (!monthInfo) {
    return res.status(404).json({ ok: false, message: '현재 달과 저번 달 데이터만 조회할 수 있습니다.' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  const key = cacheKey(monthInfo, memberId);
  const cache = await readSnapshotCache(key);
  if (isReplayMonthCacheFresh(cache.record, monthInfo)) {
    return res.status(200).json({ ok: true, stale: false, storage: cache.storage, cachedAt: cache.record.cachedAt, ...cache.record.payload });
  }

  try {
    const result = await refreshCategoryDistribution(cache, key, monthInfo, memberId);
    return res.status(200).json({ ok: true, stale: false, storage: result.storage, cachedAt: result.record.cachedAt, ...result.record.payload });
  } catch {
    if (cache.record?.payload) {
      return res.status(200).json({ ok: true, stale: true, storage: cache.storage, cachedAt: cache.record.cachedAt, ...cache.record.payload });
    }
    return res.status(502).json({ ok: false, message: '카테고리 분포를 불러오지 못했습니다.' });
  }
}


import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { readBroadcastDataCache, writeBroadcastDataCache } from '../../lib/prisonBroadcastDataCache';
import {
  fetchPoonggoDay,
  fetchPoonggoMonth,
  formatDateKey,
  mapWithConcurrency,
  reconcileBroadcastDay,
} from '../../lib/prisonBroadcastDataSources';
import { getReplayMonthStorageTtl, getReplayMonthWindow, resolveReplayMonth } from '../../lib/replayMonthWindow';

const CACHE_VERSION = 'v4';
const CURRENT_CACHE_MS = 30 * 60 * 1000;
const VERIFY_CACHE_MS = 30 * 60 * 1000;
const monthLoadPromises = new Map();
const memberVerifyPromises = new Map();

function memberId(member) {
  return String(member.station || '').split('/').filter(Boolean).pop() || '';
}

export const BROADCAST_DATA_MEMBERS = ALL_PRISON_MEMBERS.map((member) => ({
  id: memberId(member),
  nickname: member.nickname,
  image: member.image,
})).filter((member) => member.id);

function cacheKey(monthInfo) {
  return `prison:broadcast-data:${monthInfo.monthKey}:${CACHE_VERSION}`;
}

function isFresh(record, monthInfo, now = new Date()) {
  if (!record?.payload || !record?.cachedAt) return false;
  if (monthInfo.kind === 'current') return now.getTime() - Number(record.cachedAt) < CURRENT_CACHE_MS;
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  if (kst.getUTCDate() <= 2) return now.getTime() - Number(record.cachedAt) < 60 * 60 * 1000;
  return true;
}

function daysToCollect(monthInfo, now = new Date()) {
  const daysInMonth = new Date(Date.UTC(monthInfo.year, monthInfo.month, 0)).getUTCDate();
  if (monthInfo.kind !== 'current') return Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return Array.from({ length: Math.min(daysInMonth, kst.getUTCDate()) }, (_, index) => index + 1);
}

function previousMember(previousPayload, id) {
  return previousPayload?.members?.find((item) => item.id === id) || null;
}

async function collectPoonggoMonth(monthInfo, previousPayload) {
  const days = daysToCollect(monthInfo);
  const summaries = await mapWithConcurrency(BROADCAST_DATA_MEMBERS, 4, (member) => fetchPoonggoMonth({
    memberId: member.id,
    monthKey: monthInfo.monthKey,
  }));
  if (!summaries.some(Boolean) && !previousPayload?.members?.length) {
    throw new Error('월간 데이터를 불러오지 못했습니다.');
  }

  const refreshedAt = Date.now();
  const monthlyAtByMember = { ...previousPayload?.monthlyAtByMember };
  const members = BROADCAST_DATA_MEMBERS.map((member, memberIndex) => {
    const previous = previousMember(previousPayload, member.id);
    const summary = summaries[memberIndex];
    if (summary) monthlyAtByMember[member.id] = refreshedAt;
    const previousDays = new Map((previous?.days || []).map((day) => [day.dateKey, day]));
    return {
      ...member,
      monthlyDonations: Number(summary?.donations ?? previous?.monthlyDonations ?? 0),
      monthlyPeakViewers: Number(summary?.peakViewers ?? previous?.monthlyPeakViewers ?? 0),
      monthlyCumulativeViewers: Number(summary?.cumulativeViewers ?? previous?.monthlyCumulativeViewers ?? 0),
      monthlyBroadcastMinutes: Number(summary?.broadcastMinutes ?? previous?.monthlyBroadcastMinutes ?? 0),
      days: days.map((day) => {
        const dateKey = formatDateKey(monthInfo.year, monthInfo.month, day);
        return previousDays.get(dateKey) || reconcileBroadcastDay({ day, dateKey, sources: {} });
      }),
    };
  });

  return {
    monthKey: monthInfo.monthKey,
    monthLabel: monthInfo.monthLabel,
    members,
    verifiedAtByMember: previousPayload?.verifiedAtByMember || {},
    monthlyAtByMember,
  };
}

function withRankings(payload) {
  const rankings = (payload?.members || []).map((member) => ({
    id: member.id,
    nickname: member.nickname,
    image: member.image,
    donations: Number(member.monthlyDonations || 0),
    peakViewers: Number(member.monthlyPeakViewers || 0),
    cumulativeViewers: Number(member.monthlyCumulativeViewers || 0),
    broadcastMinutes: Number(member.monthlyBroadcastMinutes || 0),
    monthlyReady: Boolean(member.monthlyReady),
    cumulativeReady: Boolean(member.monthlyReady),
  }));
  return {
    ...payload,
    rankings: {
      donations: [...rankings].sort((a, b) => b.donations - a.donations || b.peakViewers - a.peakViewers),
      peakViewers: [...rankings].sort((a, b) => b.peakViewers - a.peakViewers || b.donations - a.donations),
      cumulativeViewers: [...rankings].sort((a, b) => Number(b.cumulativeReady) - Number(a.cumulativeReady) || b.cumulativeViewers - a.cumulativeViewers || b.peakViewers - a.peakViewers),
      broadcastMinutes: [...rankings].sort((a, b) => Number(b.monthlyReady) - Number(a.monthlyReady) || b.broadcastMinutes - a.broadcastMinutes || b.peakViewers - a.peakViewers),
    },
    availableMonths: getReplayMonthWindow().map((month) => ({
      monthKey: month.monthKey,
      monthLabel: month.monthLabel,
      buttonLabel: month.buttonLabel,
      kind: month.kind,
    })),
  };
}

function publicPayload(payload) {
  return {
    monthKey: payload.monthKey,
    monthLabel: payload.monthLabel,
    members: (payload.members || []).map((member) => ({
      id: member.id,
      nickname: member.nickname,
      image: member.image,
      monthlyReady: Boolean(payload.monthlyAtByMember?.[member.id]),
      cumulativeReady: Boolean(payload.monthlyAtByMember?.[member.id]),
      monthlyDonations: Number(member.monthlyDonations || 0),
      monthlyPeakViewers: Number(member.monthlyPeakViewers || 0),
      monthlyCumulativeViewers: Number(member.monthlyCumulativeViewers || 0),
      monthlyBroadcastMinutes: Number(member.monthlyBroadcastMinutes || 0),
      days: (member.days || []).map((day) => ({
        day: day.day,
        dateKey: day.dateKey,
        donations: day.donations,
        peakViewers: day.peakViewers,
        cumulativeViewers: day.cumulativeViewers,
        broadcastMinutes: day.broadcastMinutes,
        donationEvents: day.donationEvents,
      })),
    })),
  };
}

async function loadMonthUncoalesced(monthInfo) {
  const key = cacheKey(monthInfo);
  const cache = await readBroadcastDataCache(key);
  if (isFresh(cache.record, monthInfo)) {
    return { cache, key, record: cache.record, storage: cache.storage, stale: false };
  }

  try {
    const payload = await collectPoonggoMonth(monthInfo, cache.record?.payload);
    const record = { cachedAt: Date.now(), payload };
    const storage = await writeBroadcastDataCache(cache, key, record, getReplayMonthStorageTtl(monthInfo));
    return { cache, key, record, storage, stale: false };
  } catch (error) {
    if (cache.record?.payload) return { cache, key, record: cache.record, storage: cache.storage, stale: true };
    throw error;
  }
}

async function loadMonth(monthInfo) {
  const key = cacheKey(monthInfo);
  if (monthLoadPromises.has(key)) return monthLoadPromises.get(key);
  const promise = loadMonthUncoalesced(monthInfo);
  monthLoadPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    if (monthLoadPromises.get(key) === promise) monthLoadPromises.delete(key);
  }
}

function verificationFresh(payload, id, monthInfo) {
  const verifiedAt = Number(payload?.verifiedAtByMember?.[id] || 0);
  if (!verifiedAt) return false;
  if (monthInfo.kind === 'previous') return true;
  return Date.now() - verifiedAt < VERIFY_CACHE_MS;
}

function monthlyFresh(payload, id, monthInfo) {
  const cumulativeAt = Number(payload?.monthlyAtByMember?.[id] || 0);
  if (!cumulativeAt) return false;
  if (monthInfo.kind === 'previous') return true;
  return Date.now() - cumulativeAt < VERIFY_CACHE_MS;
}

async function verifyMemberMonthUncoalesced(monthState, monthInfo, id, force = false) {
  const payload = monthState.record.payload;
  const verifyDaily = force || !verificationFresh(payload, id, monthInfo);
  const verifyMonthly = force || !monthlyFresh(payload, id, monthInfo);
  if (!verifyDaily && !verifyMonthly) return monthState;
  const target = payload.members.find((member) => member.id === id);
  if (!target) return monthState;

  const targetDays = target.days;
  const results = verifyDaily
    ? await mapWithConcurrency(targetDays, 6, (day) => fetchPoonggoDay({ memberId: id, dateKey: day.dateKey }))
    : targetDays.map(() => null);
  const monthlyResult = verifyMonthly
    ? await fetchPoonggoMonth({ memberId: id, monthKey: monthInfo.monthKey }).catch(() => null)
    : null;
  const resultMap = new Map(targetDays.map((day, index) => [day.dateKey, results[index]]));
  const successfulResults = results.filter(Boolean).length;
  const members = payload.members.map((member) => {
    if (member.id !== id) return member;
    return {
      ...member,
      monthlyDonations: monthlyResult?.donations ?? member.monthlyDonations ?? 0,
      monthlyPeakViewers: monthlyResult?.peakViewers ?? member.monthlyPeakViewers ?? 0,
      monthlyCumulativeViewers: monthlyResult?.cumulativeViewers ?? member.monthlyCumulativeViewers ?? 0,
      monthlyBroadcastMinutes: monthlyResult?.broadcastMinutes ?? member.monthlyBroadcastMinutes ?? 0,
      days: member.days.map((day) => {
        const poonggo = resultMap.get(day.dateKey);
        if (!poonggo) return day;
        return reconcileBroadcastDay({
          ...day,
          sources: {
            ...day.sources,
            poonggo: {
              donations: poonggo.donations,
              peakViewers: poonggo.peakViewers,
              cumulativeViewers: poonggo.cumulativeViewers,
              broadcastMinutes: poonggo.broadcastMinutes,
            },
          },
        });
      }),
    };
  });
  const nextPayload = {
    ...payload,
    members,
    verifiedAtByMember: verifyDaily && successfulResults === targetDays.length
      ? { ...payload.verifiedAtByMember, [id]: Date.now() }
      : { ...payload.verifiedAtByMember },
    monthlyAtByMember: monthlyResult
      ? { ...payload.monthlyAtByMember, [id]: Date.now() }
      : { ...payload.monthlyAtByMember },
  };
  const record = { cachedAt: monthState.record.cachedAt, verifiedAt: Date.now(), payload: nextPayload };
  const storage = await writeBroadcastDataCache(monthState.cache, monthState.key, record, getReplayMonthStorageTtl(monthInfo));
  return { ...monthState, record, storage, stale: monthState.stale };
}

async function verifyMemberMonth(monthState, monthInfo, id, force = false) {
  const key = `${monthInfo.monthKey}:${id}`;
  if (memberVerifyPromises.has(key)) return memberVerifyPromises.get(key);
  const promise = verifyMemberMonthUncoalesced(monthState, monthInfo, id, force);
  memberVerifyPromises.set(key, promise);
  try {
    return await promise;
  } finally {
    if (memberVerifyPromises.get(key) === promise) memberVerifyPromises.delete(key);
  }
}

export async function refreshBroadcastDataMember(monthInfo, id, force = true) {
  let monthState = await loadMonth(monthInfo);
  monthState = await verifyMemberMonth(monthState, monthInfo, id, force);
  return {
    storage: monthState.storage,
    stale: monthState.stale,
    cachedAt: monthState.record.cachedAt,
    ready: Boolean(monthState.record.payload?.verifiedAtByMember?.[id]),
  };
}

export default async function handler(req, res) {
  const monthInfo = resolveReplayMonth(req.query.month);
  if (!monthInfo) return res.status(404).json({ ok: false, message: '현재 달과 저번 달 데이터만 조회할 수 있습니다.' });

  const requestedMember = String(req.query.member || '').trim();
  const verify = String(req.query.verify || '') === '1';
  if (verify && !BROADCAST_DATA_MEMBERS.some((member) => member.id === requestedMember)) {
    return res.status(400).json({ ok: false, message: '검증할 멤버를 찾지 못했습니다.' });
  }

  try {
    let monthState = await loadMonth(monthInfo);
    if (verify && requestedMember) monthState = await verifyMemberMonth(monthState, monthInfo, requestedMember);
    res.setHeader('Cache-Control', verify ? 'no-store' : 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({
      ok: true,
      stale: monthState.stale,
      storage: monthState.storage,
      cachedAt: monthState.record.cachedAt,
      ...withRankings(publicPayload(monthState.record.payload)),
    });
  } catch {
    return res.status(502).json({ ok: false, message: '방송 데이터를 불러오지 못했습니다. 잠시 후 다시 확인해주세요.' });
  }
}


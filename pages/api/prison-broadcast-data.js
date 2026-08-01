import { ALL_PRISON_MEMBERS } from '../../data/prisonMembers';
import { readBroadcastDataCache, writeBroadcastDataCache } from '../../lib/prisonBroadcastDataCache';
import {
  fetchPoonggoDay,
  fetchPoongTodayDay,
  formatDateKey,
  mapWithConcurrency,
  reconcileBroadcastDay,
} from '../../lib/prisonBroadcastDataSources';
import { getReplayMonthStorageTtl, getReplayMonthWindow, resolveReplayMonth } from '../../lib/replayMonthWindow';

const CACHE_VERSION = 'v1';
const CURRENT_CACHE_MS = 30 * 60 * 1000;
const VERIFY_CACHE_MS = 30 * 60 * 1000;

function memberId(member) {
  return String(member.station || '').split('/').filter(Boolean).pop() || '';
}

const MEMBERS = ALL_PRISON_MEMBERS.map((member) => ({
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

function previousPoonggo(previousPayload, id, dateKey) {
  const member = previousPayload?.members?.find((item) => item.id === id);
  return member?.days?.find((day) => day.dateKey === dateKey)?.sources?.poonggo || null;
}

async function collectPoongTodayMonth(monthInfo, previousPayload) {
  const ids = MEMBERS.map((member) => member.id);
  const days = daysToCollect(monthInfo);
  const responses = await mapWithConcurrency(days, 6, (day) => fetchPoongTodayDay({
    year: monthInfo.year,
    month: monthInfo.month,
    day,
    memberIds: ids,
  }));
  const successful = responses.filter(Boolean).length;
  if (!successful) throw new Error('날짜별 데이터를 불러오지 못했습니다.');

  const members = MEMBERS.map((member) => ({
    ...member,
    days: days.map((day, index) => {
      const dateKey = formatDateKey(monthInfo.year, monthInfo.month, day);
      const poongToday = responses[index]?.values?.[member.id] || { donations: 0, peakViewers: 0, donationEvents: 0 };
      const poonggo = previousPoonggo(previousPayload, member.id, dateKey);
      return reconcileBroadcastDay({
        day,
        dateKey,
        sources: { poongToday, ...(poonggo ? { poonggo } : {}) },
      });
    }),
  }));

  return {
    monthKey: monthInfo.monthKey,
    monthLabel: monthInfo.monthLabel,
    members,
    verifiedAtByMember: previousPayload?.verifiedAtByMember || {},
    sourceStatus: { poongToday: 'ok', poonggo: previousPayload?.sourceStatus?.poonggo || 'on-demand' },
  };
}

function withRankings(payload) {
  const rankings = (payload?.members || []).map((member) => ({
    id: member.id,
    nickname: member.nickname,
    image: member.image,
    donations: member.days.reduce((sum, day) => sum + Number(day.donations || 0), 0),
    peakViewers: member.days.reduce((max, day) => Math.max(max, Number(day.peakViewers || 0)), 0),
  }));
  return {
    ...payload,
    rankings: {
      donations: [...rankings].sort((a, b) => b.donations - a.donations || b.peakViewers - a.peakViewers),
      peakViewers: [...rankings].sort((a, b) => b.peakViewers - a.peakViewers || b.donations - a.donations),
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
      days: (member.days || []).map((day) => ({
        day: day.day,
        dateKey: day.dateKey,
        donations: day.donations,
        peakViewers: day.peakViewers,
        donationEvents: day.donationEvents,
      })),
    })),
  };
}

async function loadMonth(monthInfo) {
  const key = cacheKey(monthInfo);
  const cache = await readBroadcastDataCache(key);
  if (isFresh(cache.record, monthInfo)) {
    return { cache, key, record: cache.record, storage: cache.storage, stale: false };
  }

  try {
    const payload = await collectPoongTodayMonth(monthInfo, cache.record?.payload);
    const record = { cachedAt: Date.now(), payload };
    const storage = await writeBroadcastDataCache(cache, key, record, getReplayMonthStorageTtl(monthInfo));
    return { cache, key, record, storage, stale: false };
  } catch (error) {
    if (cache.record?.payload) return { cache, key, record: cache.record, storage: cache.storage, stale: true };
    throw error;
  }
}

function verificationFresh(payload, id, monthInfo) {
  const verifiedAt = Number(payload?.verifiedAtByMember?.[id] || 0);
  if (!verifiedAt) return false;
  if (monthInfo.kind === 'previous') return true;
  return Date.now() - verifiedAt < VERIFY_CACHE_MS;
}

async function verifyMemberMonth(monthState, monthInfo, id) {
  const payload = monthState.record.payload;
  if (verificationFresh(payload, id, monthInfo)) return monthState;
  const target = payload.members.find((member) => member.id === id);
  if (!target) return monthState;

  const activeDays = target.days.filter((day) => day.donations > 0 || day.peakViewers > 0);
  const results = await mapWithConcurrency(activeDays, 6, (day) => fetchPoonggoDay({ memberId: id, dateKey: day.dateKey }));
  const resultMap = new Map(activeDays.map((day, index) => [day.dateKey, results[index]]));
  const members = payload.members.map((member) => {
    if (member.id !== id) return member;
    return {
      ...member,
      days: member.days.map((day) => {
        const poonggo = resultMap.get(day.dateKey);
        if (!poonggo) return day;
        return reconcileBroadcastDay({
          ...day,
          sources: {
            ...day.sources,
            poonggo: { donations: poonggo.donations, peakViewers: poonggo.peakViewers },
          },
        });
      }),
    };
  });
  const nextPayload = {
    ...payload,
    members,
    verifiedAtByMember: { ...payload.verifiedAtByMember, [id]: Date.now() },
    sourceStatus: { ...payload.sourceStatus, poonggo: results.some(Boolean) ? 'ok' : 'unavailable' },
  };
  const record = { cachedAt: monthState.record.cachedAt, verifiedAt: Date.now(), payload: nextPayload };
  const storage = await writeBroadcastDataCache(monthState.cache, monthState.key, record, getReplayMonthStorageTtl(monthInfo));
  return { ...monthState, record, storage, stale: monthState.stale };
}

export default async function handler(req, res) {
  const monthInfo = resolveReplayMonth(req.query.month);
  if (!monthInfo) return res.status(404).json({ ok: false, message: '현재 달과 저번 달 데이터만 조회할 수 있습니다.' });

  const requestedMember = String(req.query.member || '').trim();
  const verify = String(req.query.verify || '') === '1';
  if (verify && !MEMBERS.some((member) => member.id === requestedMember)) {
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

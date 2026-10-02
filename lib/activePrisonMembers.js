import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';

const names = new Set(ALL_PRISON_MEMBERS.map((member) => member.nickname));
const ids = new Set(ALL_PRISON_MEMBERS.map((member) => member.station.split('/').filter(Boolean).pop()));

export function isActivePrisonMember(value) {
  if (typeof value === 'string') return names.has(value) || ids.has(value);
  if (!value) return false;
  return [value.member, value.nickname, value.stationId, value.id].some((key) => names.has(key) || ids.has(key));
}

export function filterPrisonMemberMap(map = {}) {
  return Object.fromEntries(Object.entries(map).filter(([key]) => isActivePrisonMember(key)));
}

export function filterPrisonYoutubePayload(payload = {}) {
  const filtered = {
    ...payload,
    videos: (payload.videos || []).filter(isActivePrisonMember),
    shorts: (payload.shorts || []).filter(isActivePrisonMember),
  };
  if (payload.memberRecent) {
    filtered.memberRecent = {
      videos: filterPrisonMemberMap(payload.memberRecent.videos),
      shorts: filterPrisonMemberMap(payload.memberRecent.shorts),
    };
  }
  return filtered;
}

export function filterPrisonSchedulePayload(payload = {}) {
  return {
    ...payload,
    schedules: (payload.schedules || []).filter(isActivePrisonMember),
    items: (payload.items || []).filter(isActivePrisonMember),
    members: (payload.members || []).filter(isActivePrisonMember),
    sourceStatus: (payload.sourceStatus || []).filter(isActivePrisonMember),
  };
}

export function filterPrisonHallPayload(payload = {}) {
  return {
    ...payload,
    slots: Object.fromEntries(Object.entries(payload.slots || {}).map(([key, video]) => [
      key, video && isActivePrisonMember(video) ? video : null,
    ])),
  };
}

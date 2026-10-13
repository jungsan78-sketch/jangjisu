export const PRISON_DEPARTURE_NOTICE = {
  nickname: '냥냥두둥',
  image: 'https://stimg.sooplive.com/LOGO/do/doodong/doodong.jpg',
  heading: '냥냥두둥 출소',
  message: '그동안 고생 너무 많았고 쾌유를 빕니다!',
  startsAt: '2026-10-13T06:50:00Z',
  expiresAt: '2026-10-14T06:50:00Z',
};

export function isDepartureNoticeActive(notice, now = Date.now()) {
  const start = Date.parse(notice.startsAt);
  const end = Date.parse(notice.expiresAt);
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
}

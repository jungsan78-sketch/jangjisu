export const PRISON_DEPARTURE_NOTICE = {
  nickname: '린링',
  image: 'https://stimg.sooplive.com/LOGO/mi/mini1212/mini1212.jpg',
  heading: '린링 출소',
  message: '그동안 고생하셨습니다',
  startsAt: '2026-10-02T06:42:00Z',
  expiresAt: '2026-10-03T06:42:00Z',
};

export function isDepartureNoticeActive(notice, now = Date.now()) {
  const start = Date.parse(notice.startsAt);
  const end = Date.parse(notice.expiresAt);
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
}

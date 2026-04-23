export function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}일 전`;
  if (diffMs < month) return `${Math.floor(diffMs / week)}주 전`;
  if (diffMs < year) return `${Math.floor(diffMs / month)}개월 전`;
  return `${Math.floor(diffMs / year)}년 전`;
}

function isRecentUpload(item) {
  const time = new Date(item?.publishedAt || '').getTime();
  return Number.isFinite(time) && Date.now() - time < 24 * 60 * 60 * 1000;
}

export function hasRecentUpload(items = []) {
  return items.some(isRecentUpload);
}

export function shareYoutubeState(scope, payload) {
  if (typeof window === 'undefined') return;
  window.__SOU_YOUTUBE_STATE__ = { ...(window.__SOU_YOUTUBE_STATE__ || {}), [scope]: payload };
  window.dispatchEvent(new CustomEvent('sou-youtube-loaded', { detail: { scope } }));
}

export function SectionTitle({ title, logo }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/18 bg-amber-200/10 text-lg text-amber-100">{logo}</span>
      <h3 className="text-[28px] font-black tracking-tight text-white sm:text-[34px]">{title}</h3>
    </div>
  );
}

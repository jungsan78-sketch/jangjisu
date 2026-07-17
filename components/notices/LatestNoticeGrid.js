function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return '방금 전';
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}시간 전`;
  return `${Math.floor(diffMs / day)}일 전`;
}

function NoticeImage({ item }) {
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-[#24262a]">
      <div className="absolute inset-0 flex items-center justify-center text-[30px] font-black text-white/[0.10]">▤</div>
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/24 via-transparent to-white/[0.025]" />
    </div>
  );
}

export function LatestNoticeCard({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-[18px] bg-[#15171b] shadow-[0_16px_46px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(255,255,255,0.045)] transition duration-300 hover:-translate-y-1 hover:bg-[#191c21] hover:shadow-[0_24px_62px_rgba(0,0,0,0.34),0_0_0_1px_rgba(255,255,255,0.075)]"
    >
      <NoticeImage item={item} />
      <div className="flex min-h-[154px] flex-col px-4 pb-4 pt-4 sm:px-[18px]">
        <div className="line-clamp-2 text-[16px] font-black leading-[1.45] tracking-[-0.025em] text-white sm:text-[17px]">{item.title}</div>
        <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-white/52 sm:text-[13px]">
          {item.summary || '게시글 내용을 확인해보세요.'}
        </p>
        <div className="mt-auto flex min-w-0 items-center gap-2 pt-4 text-[11px] font-bold text-white/45 sm:text-[12px]">
          <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white/[0.08]">
            {item.profileImage ? <img src={item.profileImage} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : null}
          </div>
          <span className="max-w-[45%] truncate text-white/65">{item.member || '장지수'}</span>
          <span className="text-white/20">·</span>
          <span className="truncate">{formatRelativeTime(item.createdAt)}</span>
        </div>
      </div>
    </a>
  );
}

export default function LatestNoticeGrid({ notices, loaded, emptyMessage = '최근 게시글이 없습니다.' }) {
  if (!loaded) {
    return <div className="rounded-[18px] bg-white/[0.035] p-6 text-sm font-semibold text-white/60">최신 소식을 불러오는 중입니다.</div>;
  }

  if (!notices.length) {
    return <div className="rounded-[18px] bg-white/[0.035] p-6 text-sm font-semibold text-white/60">{emptyMessage}</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {notices.map((item) => <LatestNoticeCard key={item.id} item={item} />)}
    </div>
  );
}

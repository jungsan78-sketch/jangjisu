import LatestNoticeCard from './LatestNoticeCard';

export { default as LatestNoticeCard } from './LatestNoticeCard';

export default function LatestNoticeGrid({ notices, loaded, emptyMessage = '최근 게시글이 없습니다.' }) {
  if (!loaded) {
    return <div className="rounded-[18px] bg-white/[0.035] p-6 text-sm font-semibold text-white/60">최신 소식을 불러오는 중입니다.</div>;
  }
  if (!notices.length) {
    return <div className="rounded-[18px] bg-white/[0.035] p-6 text-sm font-semibold text-white/60">{emptyMessage}</div>;
  }
  return (
    <div className="sou-latest-notice-grid">
      {notices.map((item) => <LatestNoticeCard key={item.id} item={item} />)}
      <style jsx>{`
        .sou-latest-notice-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .sou-latest-notice-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
}

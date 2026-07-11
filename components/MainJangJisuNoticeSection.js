import { useEffect, useState } from 'react';

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

function NoticeAuthor({ item, large = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`${large ? 'h-12 w-12 rounded-[18px]' : 'h-10 w-10 rounded-2xl'} shrink-0 overflow-hidden border border-cyan-100/18 bg-cyan-100/12 p-[2px] shadow-[0_0_18px_rgba(103,232,249,0.16),inset_0_1px_0_rgba(255,255,255,0.10)]`}>
        {item.profileImage ? (
          <img
            src={item.profileImage}
            alt=""
            className="h-full w-full rounded-[inherit] object-cover [image-rendering:auto]"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className={`${large ? 'text-[17px]' : 'text-[15px]'} truncate font-black leading-tight text-white/95`}>{item.member || '장지수'}</div>
      </div>
    </div>
  );
}

function OpenNoticeLink({ large = false }) {
  return (
    <div className={`relative mt-auto flex items-center justify-between ${large ? 'pt-8' : 'pt-5'}`}>
      <span className={`${large ? 'rounded-full bg-white/[0.07] px-4 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'text-xs'} font-black text-blue-100/90 transition group-hover:text-white`}>글 열기</span>
      <span className={`${large ? 'h-10 w-10 text-base' : 'h-8 w-8 text-sm'} flex items-center justify-center rounded-full border border-blue-100/18 bg-blue-100/10 text-blue-50 transition group-hover:translate-x-1 group-hover:border-blue-100/38 group-hover:bg-blue-100/16`}>↗</span>
    </div>
  );
}

function FeaturedNoticeCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="group relative flex min-h-[270px] overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_18%_0%,rgba(96,165,250,0.20),transparent_34%),radial-gradient(circle_at_100%_18%,rgba(34,211,238,0.10),transparent_34%),linear-gradient(145deg,rgba(23,38,59,0.96),rgba(7,14,25,0.98))] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_34px_110px_rgba(0,0,0,0.38),0_0_46px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-200/[0.045] blur-sm transition group-hover:bg-cyan-200/[0.075]" />
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-200/24 to-transparent" />
      <div className="relative flex w-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <NoticeAuthor item={item} large />
          <span className="shrink-0 rounded-full border border-white/10 bg-black/24 px-3 py-1.5 text-[12px] font-black text-white/70">{formatRelativeTime(item.createdAt)}</span>
        </div>

        <div className="mt-7 max-w-4xl text-[27px] font-black leading-tight tracking-[-0.035em] text-white sm:text-[32px]">{item.title}</div>
        <p className="mt-4 line-clamp-3 max-w-4xl text-[15px] font-semibold leading-7 text-white/66">
          {item.summary || '본문 요약을 불러오는 중입니다.'}
        </p>
        <OpenNoticeLink large />
      </div>
    </a>
  );
}

function NoticeCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="group relative flex min-h-[170px] overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.10),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.046),rgba(255,255,255,0.016))] p-5 shadow-[0_18px_56px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-300 hover:-translate-y-1 hover:bg-white/[0.052] hover:shadow-[0_26px_80px_rgba(0,0,0,0.24),0_0_34px_rgba(56,189,248,0.06),inset_0_1px_0_rgba(255,255,255,0.065)]">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-blue-200/[0.025] transition group-hover:bg-blue-200/[0.050]" />
      <div className="relative flex w-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <NoticeAuthor item={item} />
          <span className="shrink-0 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-black text-white/62">{formatRelativeTime(item.createdAt)}</span>
        </div>

        <div className="mt-4 line-clamp-1 text-[19px] font-black leading-7 tracking-[-0.02em] text-white">{item.title}</div>
        <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-[22px] text-white/62">
          {item.summary || '본문 요약을 불러오는 중입니다.'}
        </p>
        <OpenNoticeLink />
      </div>
    </a>
  );
}

export default function MainJangJisuNoticeSection() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadNotices = async () => {
      try {
        const res = await fetch('/api/jangjisu-notices');
        const json = await res.json();
        if (!mounted) return;
        setNotices(Array.isArray(json.notices) ? json.notices : []);
      } catch {
        if (mounted) setNotices([]);
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    loadNotices();
    const timer = setInterval(loadNotices, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const featuredNotice = notices[0];
  const secondaryNotices = notices.slice(1, 3);

  return (
    <section id="notice" className="relative mx-auto mt-8 max-w-7xl bg-transparent px-6 py-7 text-white shadow-none lg:px-8 lg:py-9">
      <div className="mb-7 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200/18 bg-blue-500/10 text-lg text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">📢</span>
          <div>
            <h3 className="text-[30px] font-black tracking-tight text-white sm:text-[36px]">공지사항</h3>
            <p className="mt-1 text-sm font-semibold text-white/45">방송국에 직접 올라온 최근 글만 보여줍니다.</p>
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className="rounded-[24px] bg-white/[0.035] p-6 text-sm font-semibold text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">공지를 불러오는 중입니다.</div>
      ) : notices.length ? (
        <div className="grid gap-5">
          <FeaturedNoticeCard item={featuredNotice} />
          {secondaryNotices.map((item) => <NoticeCard key={item.id} item={item} />)}
        </div>
      ) : (
        <div className="rounded-[24px] bg-white/[0.035] p-6 text-sm font-semibold text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">최근 1주일 기준으로 수집된 공지가 없습니다.</div>
      )}
    </section>
  );
}

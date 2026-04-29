import { useMemo, useRef } from 'react';
import { getPrisonMemberBadges } from '../../data/prisonBadges';
import { MemberBadges } from './MemberBadges';

function stationIdFromUrl(url = '') {
  return String(url).match(/station\/([^/?#]+)/i)?.[1] || '';
}

function formatRelativePostTime(value) {
  if (!value) return '';
  const raw = String(value).replace(/\./g, '-').replace(/\s+/g, ' ').trim();
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}일 전`;
  if (diffMs < month) return `${Math.floor(diffMs / week)}주 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function getPostTimeValue(post) {
  const value = post?.createdAt || post?.publishedAt || post?.date || '';
  const raw = String(value).replace(/\./g, '-').replace(/\s+/g, ' ').trim();
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getFixedRank(nickname) {
  if (nickname === '장지수') return 1;
  if (nickname === '린링') return 2;
  if (getPrisonMemberBadges(nickname).includes('shortsKing')) return 3;
  return 99;
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const aRank = getFixedRank(a.member.nickname);
    const bRank = getFixedRank(b.member.nickname);
    if (aRank !== bRank) return aRank - bRank;
    return getPostTimeValue(b.post) - getPostTimeValue(a.post);
  });
}

export default function RecentMemberPostsGrid({ members, posts }) {
  const scrollerRef = useRef(null);
  const items = useMemo(() => sortItems(members.map((member) => {
    const stationId = stationIdFromUrl(member.station);
    return { member, post: posts?.[stationId] || null };
  })), [members, posts]);

  if (!items.length) return null;

  function scrollPosts(direction) {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = Math.max(260, Math.floor(node.clientWidth * 0.78));
    node.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  return (
    <section className="mb-10 w-full max-w-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[22px] font-black tracking-[-0.04em] text-white sm:text-[26px]">최근 멤버글</h3>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="최근 멤버글 왼쪽으로 이동" onClick={() => scrollPosts(-1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.055] text-sm font-black text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.10] hover:text-white">‹</button>
          <button type="button" aria-label="최근 멤버글 오른쪽으로 이동" onClick={() => scrollPosts(1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.055] text-sm font-black text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.10] hover:text-white">›</button>
          <span className="rounded-full bg-white/[0.045] px-3 py-1.5 text-[11px] font-black text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">30분마다 갱신</span>
        </div>
      </div>
      <div ref={scrollerRef} className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] xl:gap-4 [&::-webkit-scrollbar]:hidden">
        {items.map(({ member, post }) => {
          const hasPost = Boolean(post?.title);
          return (
            <a key={`${member.nickname}-${post?.url || post?.title || 'empty'}`} href={post?.url || member.station} target="_blank" rel="noreferrer" className={`group min-h-[118px] w-[188px] shrink-0 snap-start overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_36px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:bg-white/[0.07] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_46px_rgba(0,0,0,0.30)] sm:w-[200px] xl:w-[190px] 2xl:w-[200px] ${hasPost ? '' : 'opacity-70'}`}>
              <div className="flex items-center gap-3">
                <img src={member.image} alt={`${member.nickname} 프로필`} className="h-9 w-9 rounded-full bg-slate-900 object-cover shadow-[0_0_18px_rgba(103,232,249,0.10)]" loading="lazy" />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-black text-white">{member.nickname}</span>
                    <MemberBadges nickname={member.nickname} mini />
                  </div>
                  <div className="text-[11px] font-bold text-white/42">{hasPost ? formatRelativePostTime(post.createdAt || post.publishedAt || post.date) : '확인중'}</div>
                </div>
              </div>
              <div className="mt-3 line-clamp-2 text-[15px] font-black leading-6 text-white group-hover:text-cyan-50">{hasPost ? post.title : '최근 글 확인중'}</div>
              {post?.summary ? <div className="mt-1.5 line-clamp-1 text-xs font-semibold text-white/44">{post.summary}</div> : null}
            </a>
          );
        })}
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';
import ShortsHallOfFame from './prison/ShortsHallOfFame';

const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const POSTS_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function stationIdFromUrl(url = '') {
  return String(url).match(/station\/([^/?#]+)/i)?.[1] || '';
}

function formatFetchedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
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

function statusRank(status) {
  if (status?.isLive) return 0;
  if (String(status?.liveState || '').includes('unknown')) return 1;
  return 2;
}

function viewerCount(status) {
  const value = Number(status?.viewerCount || 0);
  return Number.isFinite(value) ? value : 0;
}

function formatViewerBadge(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '0';
  if (number >= 10000) {
    const man = number / 10000;
    return `${Number.isInteger(man) ? man.toFixed(0) : man.toFixed(1)}만`;
  }
  if (number >= 1000) {
    const chun = number / 1000;
    return `${Number.isInteger(chun) ? chun.toFixed(0) : chun.toFixed(1)}천`;
  }
  return String(Math.floor(number));
}

function sortMembers(members, statuses) {
  return [...members].sort((a, b) => {
    const aStatus = statuses[a.nickname];
    const bStatus = statuses[b.nickname];
    const rankDiff = statusRank(aStatus) - statusRank(bStatus);
    if (rankDiff) return rankDiff;
    if (aStatus?.isLive && bStatus?.isLive) {
      const viewerDiff = viewerCount(bStatus) - viewerCount(aStatus);
      if (viewerDiff) return viewerDiff;
    }
    if (a.nickname === '장지수') return -1;
    if (b.nickname === '장지수') return 1;
    if (a.nickname === '린링') return -1;
    if (b.nickname === '린링') return 1;
    return 0;
  });
}

function getPostTimeValue(post) {
  const value = post?.createdAt || post?.publishedAt || post?.date || '';
  const raw = String(value).replace(/\./g, '-').replace(/\s+/g, ' ').trim();
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function PlatformLink({ href, type, label }) {
  const disabled = !href;
  const srcMap = { soop: '/soop-logo.svg', youtube: '/youtube-logo.svg', cafe: '/naver-cafe-logo.svg' };
  const className = `inline-flex h-10 w-11 items-center justify-center rounded-2xl bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_12px_22px_rgba(0,0,0,0.18)] transition ${disabled ? 'pointer-events-none grayscale opacity-30' : 'hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_15px_28px_rgba(0,0,0,0.24)]'}`;
  const icon = <img src={srcMap[type]} alt={label} className="max-h-7 max-w-8 object-contain" />;
  if (disabled) return <span className={className} title={`${label} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={className}>{icon}</a>;
}

function RoleBadge({ type, mini = false }) {
  const label = type === 'warden' ? '수장' : '반장';
  const className = type === 'warden'
    ? 'border-amber-200/35 bg-[linear-gradient(135deg,rgba(251,191,36,0.36),rgba(120,53,15,0.34))] text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.32),inset_0_1px_0_rgba(255,255,255,0.26)]'
    : 'border-cyan-200/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.34),rgba(30,64,175,0.32))] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.30),inset_0_1px_0_rgba(255,255,255,0.24)]';
  return <span className={`shrink-0 rounded-full border ${mini ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'} font-black ${className}`}>{label}</span>;
}

function RecentPostsRail({ members, posts }) {
  const railRef = useRef(null);
  const items = useMemo(() => members
    .map((member) => {
      const stationId = stationIdFromUrl(member.station);
      const post = posts?.[stationId];
      return post ? { member, post } : null;
    })
    .filter(Boolean)
    .sort((a, b) => getPostTimeValue(b.post) - getPostTimeValue(a.post))
    .slice(0, 12), [members, posts]);

  if (!items.length) return null;

  const scrollPosts = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector('[data-sou-post-card="true"]');
    const amount = card ? card.getBoundingClientRect().width + 16 : Math.max(280, rail.clientWidth * 0.75);
    rail.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section className="mb-10 w-full max-w-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[22px] font-black tracking-[-0.04em] text-white sm:text-[26px]">최근 멤버글</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/[0.045] px-3 py-1.5 text-[11px] font-black text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">30분마다 갱신</span>
          <button type="button" aria-label="이전 멤버글" onClick={() => scrollPosts(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-lg font-black text-white/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_10px_22px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-cyan-100/28 hover:bg-cyan-300/[0.11] hover:text-white hover:shadow-[0_0_22px_rgba(103,232,249,0.16)]">‹</button>
          <button type="button" aria-label="다음 멤버글" onClick={() => scrollPosts(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-lg font-black text-white/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_10px_22px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 hover:border-cyan-100/28 hover:bg-cyan-300/[0.11] hover:text-white hover:shadow-[0_0_22px_rgba(103,232,249,0.16)]">›</button>
        </div>
      </div>
      <div ref={railRef} className="scrollbar-hide flex w-full snap-x gap-3 overflow-x-hidden overflow-y-visible scroll-smooth pb-2 xl:gap-4">
        {items.map(({ member, post }) => (
          <a data-sou-post-card="true" key={`${member.nickname}-${post.url || post.title}`} href={post.url || member.station} target="_blank" rel="noreferrer" className="group min-h-[118px] w-[260px] shrink-0 snap-start overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_36px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:bg-white/[0.07] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_46px_rgba(0,0,0,0.30)] sm:w-[286px] 2xl:w-[320px]">
            <div className="flex items-center gap-3">
              <img src={member.image} alt={`${member.nickname} 프로필`} className="h-9 w-9 rounded-full bg-slate-900 object-cover shadow-[0_0_18px_rgba(103,232,249,0.10)]" loading="lazy" />
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-white">{member.nickname}</div>
                <div className="text-[11px] font-bold text-white/42">{formatRelativePostTime(post.createdAt || post.publishedAt || post.date)}</div>
              </div>
            </div>
            <div className="mt-3 line-clamp-2 text-[15px] font-black leading-6 text-white group-hover:text-cyan-50">{post.title}</div>
            {post.summary ? <div className="mt-1.5 line-clamp-1 text-xs font-semibold text-white/44">{post.summary}</div> : null}
          </a>
        ))}
      </div>
    </section>
  );
}

function MemberCard({ member, status }) {
  const isLive = Boolean(status?.isLive);
  const isUnknown = String(status?.liveState || '').includes('unknown');
  const mediaHref = isLive && status?.liveUrl ? status.liveUrl : member.station;
  const mediaImage = status?.thumbnailUrl || '';
  const title = status?.title || (isLive ? '방송 중' : isUnknown ? '방송 상태 확인중' : '방송 꺼짐');
  const stateLabel = isLive ? formatViewerBadge(status?.viewerCount) : isUnknown ? '확인중' : 'OFF';
  const dotClass = isLive ? 'bg-[#ff163d] shadow-[0_0_0_4px_rgba(255,22,61,0.16),0_0_22px_rgba(255,22,61,0.92)]' : isUnknown ? 'bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.55)]' : 'bg-slate-400';
  const tags = Array.isArray(member.tags) ? member.tags : [];
  const roleType = member.nickname === '장지수' ? 'warden' : member.nickname === '린링' ? 'captain' : '';

  return (
    <article className="group relative min-w-0">
      <a href={mediaHref || member.station} target="_blank" rel="noreferrer" className="relative block aspect-video overflow-hidden rounded-[24px] bg-black shadow-[0_18px_38px_rgba(0,0,0,0.28)]">
        {isLive && mediaImage ? (
          <>
            <img src={mediaImage} alt={`${member.nickname} 방송 이미지`} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/8 via-transparent to-black/42" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.42),transparent_56%),linear-gradient(180deg,#111827,#05070c)]" />
        )}
        <div className={`absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-black backdrop-blur-md ${isLive ? 'bg-black/62 text-white shadow-[0_10px_24px_rgba(0,0,0,0.35)]' : 'bg-black/60 text-white/82'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />{stateLabel}
        </div>
      </a>

      <div className="mt-3 flex gap-3">
        <img src={member.image} alt={`${member.nickname} 프로필`} className="h-11 w-11 shrink-0 rounded-full bg-slate-900 object-cover shadow-[0_10px_24px_rgba(0,0,0,0.28),0_0_16px_rgba(103,232,249,0.10)]" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="truncate text-[16px] font-black tracking-[-0.04em] text-white">{member.nickname}</h4>
            {roleType ? <RoleBadge type={roleType} /> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[15px] font-extrabold leading-6 text-white/86">{title}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/54 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">{tag}</span>)}</div>
          <div className="mt-3 flex gap-2"><PlatformLink href={member.station} type="soop" label={`${member.nickname} SOOP 방송국`} /><PlatformLink href={member.youtube} type="youtube" label={`${member.nickname} YouTube`} /><PlatformLink href={member.cafe} type="cafe" label={`${member.nickname} 팬카페`} /></div>
        </div>
      </div>
    </article>
  );
}

function LiveGridSkeleton({ failed = false }) {
  const skeletonItems = Array.from({ length: 8 }, (_, index) => index);
  return <div className="grid w-full max-w-none grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" aria-busy={!failed}>{skeletonItems.map((item) => <div key={item} className="min-h-[260px]"><div className="aspect-video rounded-[24px] bg-white/[0.035]" /><div className="mt-3 flex gap-3"><div className="h-11 w-11 rounded-full bg-white/[0.055]" /><div className="flex-1"><div className="h-5 w-28 rounded-full bg-white/[0.055]" /><div className="mt-3 h-4 w-full rounded-full bg-white/[0.04]" /><div className="mt-2 h-4 w-2/3 rounded-full bg-white/[0.035]" /></div></div></div>)}{failed ? <div className="col-span-full rounded-[22px] bg-amber-300/8 px-5 py-4 text-sm font-black text-amber-100/80">라이브/게시글 상태를 확인하는 중입니다.</div> : null}</div>;
}

export function PrisonMemberLiveGridContent() {
  const [livePayload, setLivePayload] = useState(null);
  const [postsPayload, setPostsPayload] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadLive() {
      try {
        const res = await fetch('/api/live-status');
        const json = res.ok ? await res.json() : null;
        if (!mounted) return;
        setLivePayload(json || null);
        setLoadFailed((prev) => prev && !json);
        setLoaded(true);
      } catch {
        if (!mounted) return;
        setLoadFailed(true);
        setLoaded(true);
      }
    }
    loadLive();
    const timer = setInterval(loadLive, LIVE_REFRESH_INTERVAL_MS);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadPosts() {
      try {
        const res = await fetch('/api/soop-station-posts');
        const json = res.ok ? await res.json() : null;
        if (!mounted) return;
        setPostsPayload(json || null);
        setLoadFailed((prev) => prev && !json);
        setLoaded(true);
      } catch {
        if (!mounted) return;
        setLoadFailed(true);
        setLoaded(true);
      }
    }
    loadPosts();
    const timer = setInterval(loadPosts, POSTS_REFRESH_INTERVAL_MS);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const statuses = livePayload?.statuses || {};
  const posts = postsPayload?.posts || {};
  const hasResolvedData = Boolean(livePayload?.statuses || postsPayload?.posts);
  const sortedMembers = useMemo(() => sortMembers(ALL_PRISON_MEMBERS, statuses), [statuses]);
  const liveCount = sortedMembers.filter((member) => statuses[member.nickname]?.isLive).length;
  const fetchedAt = formatFetchedAt(livePayload?.fetchedAt);

  return <section data-sou-react-live-grid="true" className="sou-member-live-section mt-6 w-full max-w-none"><ShortsHallOfFame /><RecentPostsRail members={ALL_PRISON_MEMBERS} posts={posts} /><div className="mb-6 flex w-full max-w-none flex-col justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-end"><div><h3 className="text-[24px] font-black tracking-[-0.04em] text-white sm:text-[28px]">수용소 멤버 LIVE</h3></div><div className="rounded-full bg-white/[0.055] px-4 py-2 text-xs font-black text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{hasResolvedData ? `ON ${liveCount}명 · ${fetchedAt || '방금'} 갱신` : '라이브/게시글 불러오는 중'}</div></div>{hasResolvedData ? <div className="grid w-full max-w-none grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{sortedMembers.map((member) => <MemberCard key={member.nickname} member={member} status={statuses[member.nickname]} />)}</div> : <LiveGridSkeleton failed={loaded && loadFailed} />}</section>;
}

export default function PrisonMemberLiveGrid() {
  const [mountNode, setMountNode] = useState(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.pathname.startsWith('/jangjisu-prison')) return undefined;
    if (document.querySelector('[data-sou-react-live-grid="true"]')) return undefined;
    const original = document.getElementById('members');
    if (!original || document.getElementById('sou-react-member-live-grid-root')) return undefined;
    const root = document.createElement('div');
    root.id = 'sou-react-member-live-grid-root';
    original.parentNode.insertBefore(root, original);
    original.style.setProperty('display', 'none', 'important');
    setMountNode(root);
    return () => { original.style.removeProperty('display'); root.remove(); };
  }, []);
  if (!mountNode) return null;
  return createPortal(<PrisonMemberLiveGridContent />, mountNode);
}

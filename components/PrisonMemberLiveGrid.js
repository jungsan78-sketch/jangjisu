import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';
import ShortsHallOfFame from './prison/ShortsHallOfFame';
import RecentMemberPostsGrid from './prison/RecentMemberPostsGrid';
import { MemberBadges } from './prison/MemberBadges';

const LIVE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const POSTS_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

function formatFetchedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
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

function PlatformLink({ href, type, label }) {
  const disabled = !href;
  const srcMap = { soop: '/soop-logo.svg', youtube: '/youtube-logo.svg', cafe: '/naver-cafe-logo.svg' };
  const className = `inline-flex h-10 w-11 items-center justify-center rounded-2xl bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_12px_22px_rgba(0,0,0,0.18)] transition ${disabled ? 'pointer-events-none grayscale opacity-30' : 'hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_15px_28px_rgba(0,0,0,0.24)]'}`;
  const icon = <img src={srcMap[type]} alt={label} className="max-h-7 max-w-8 object-contain" />;
  if (disabled) return <span className={className} title={`${label} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={className}>{icon}</a>;
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
            <MemberBadges nickname={member.nickname} />
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

  return <section data-sou-react-live-grid="true" className="sou-member-live-section mt-6 w-full max-w-none"><ShortsHallOfFame /><RecentMemberPostsGrid members={ALL_PRISON_MEMBERS} posts={posts} /><div className="mb-6 flex w-full max-w-none flex-col justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-end"><div><h3 className="text-[24px] font-black tracking-[-0.04em] text-white sm:text-[28px]">수용소 멤버 LIVE</h3></div><div className="rounded-full bg-white/[0.055] px-4 py-2 text-xs font-black text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{hasResolvedData ? `ON ${liveCount}명 · ${fetchedAt || '방금'} 갱신` : '라이브/게시글 불러오는 중'}</div></div>{hasResolvedData ? <div className="grid w-full max-w-none grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{sortedMembers.map((member) => <MemberCard key={member.nickname} member={member} status={statuses[member.nickname]} />)}</div> : <LiveGridSkeleton failed={loaded && loadFailed} />}</section>;
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

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';

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

function PlatformLink({ href, type, label }) {
  const disabled = !href;
  const srcMap = { soop: '/soop-logo.svg', youtube: '/youtube-logo.svg', cafe: '/naver-cafe-logo.svg' };
  const className = `inline-flex h-10 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] transition ${disabled ? 'pointer-events-none grayscale opacity-30' : 'hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/10'}`;
  const icon = <img src={srcMap[type]} alt={label} className="max-h-7 max-w-8 object-contain" />;
  if (disabled) return <span className={className} title={`${label} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={className}>{icon}</a>;
}

function RoleBadge({ type }) {
  const label = type === 'warden' ? '수장' : '반장';
  const className = type === 'warden'
    ? 'border-amber-200/60 bg-[linear-gradient(135deg,rgba(251,191,36,0.36),rgba(120,53,15,0.48))] text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.26),inset_0_1px_0_rgba(255,255,255,0.22)]'
    : 'border-cyan-200/58 bg-[linear-gradient(135deg,rgba(34,211,238,0.32),rgba(30,64,175,0.48))] text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.22)]';
  return <span className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-black tracking-[0.18em] ${className}`}>{label}</span>;
}

function MemberCard({ member, status, post }) {
  const isLive = Boolean(status?.isLive);
  const isUnknown = String(status?.liveState || '').includes('unknown');
  const mediaHref = isLive && status?.liveUrl ? status.liveUrl : member.station;
  const mediaImage = status?.thumbnailUrl || '';
  const title = status?.title || (isLive ? '방송 중' : isUnknown ? '방송 상태 확인중' : '방송 꺼짐');
  const stateLabel = isLive ? formatViewerBadge(status?.viewerCount) : isUnknown ? '확인중' : 'OFF';
  const stateClass = isLive ? 'border-rose-400/48 shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_22px_46px_rgba(127,29,29,0.24)]' : isUnknown ? 'border-amber-200/24' : 'border-white/10';
  const dotClass = isLive ? 'bg-[#ff163d] shadow-[0_0_0_4px_rgba(255,22,61,0.16),0_0_22px_rgba(255,22,61,0.92)]' : isUnknown ? 'bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.55)]' : 'bg-slate-400';
  const tags = Array.isArray(member.tags) ? member.tags : [];
  const postTime = formatRelativePostTime(post?.createdAt);
  const roleType = member.nickname === '장지수' ? 'warden' : member.nickname === '린링' ? 'captain' : '';

  return (
    <article className={`group relative overflow-hidden rounded-[26px] border ${stateClass} bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.022))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_36px_rgba(0,0,0,0.18)]`}>
      <a href={mediaHref || member.station} target="_blank" rel="noreferrer" className="relative block h-36 overflow-hidden bg-black">
        {isLive && mediaImage ? <><img src={mediaImage} alt={`${member.nickname} 방송 이미지`} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" /></> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.42),transparent_56%),linear-gradient(180deg,#02040a,#000)]" />}
      </a>
      <div className={`absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-black backdrop-blur-md ${isLive ? 'border-rose-200/40 bg-rose-950/80 text-rose-50 shadow-[0_10px_26px_rgba(127,29,29,0.35)]' : 'border-white/14 bg-black/72 text-white/82'}`}><span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />{stateLabel}</div>
      <div className="p-4 pt-5">
        <div className="flex items-center gap-4"><img src={member.image} alt={`${member.nickname} 프로필`} className="h-[72px] w-[72px] shrink-0 rounded-full border-[3px] border-[#05070c] bg-slate-900 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.32)]" loading="lazy" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h4 className="truncate text-[21px] font-black tracking-[-0.04em] text-white">{member.nickname}</h4>{roleType ? <RoleBadge type={roleType} /> : null}</div><p className="mt-2 line-clamp-2 min-h-[40px] text-[13px] font-extrabold leading-5 text-white/72">{title}</p></div></div>
        <div className="mt-4 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full border border-white/8 bg-white/[0.045] px-2 py-1 text-[11px] font-black text-white/62">{tag}</span>)}</div>
        <div className="mt-3 flex gap-2"><PlatformLink href={member.station} type="soop" label={`${member.nickname} SOOP 방송국`} /><PlatformLink href={member.youtube} type="youtube" label={`${member.nickname} YouTube`} /><PlatformLink href={member.cafe} type="cafe" label={`${member.nickname} 팬카페`} /></div>
        <div className="mt-4 border-t border-white/8 pt-3"><div className="text-[11px] font-black tracking-[0.18em] text-cyan-100 drop-shadow-[0_0_12px_rgba(103,232,249,0.18)]">최근 공지사항</div>{post ? <><a href={post.url} target="_blank" rel="noreferrer" className="mt-2 block line-clamp-2 text-[15px] font-black leading-6 text-white hover:text-cyan-50 hover:underline">{post.title}</a>{post.summary ? <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-300/72">{post.summary}</p> : null}{postTime ? <div className="mt-2 text-[11px] font-extrabold text-white/42">{postTime}</div> : null}</> : <div className="mt-1.5 text-[13px] font-black leading-5 text-white/58">최근 공지사항 확인중</div>}</div>
      </div>
    </article>
  );
}

function LiveGridSkeleton({ failed = false }) {
  const skeletonItems = Array.from({ length: 8 }, (_, index) => index);
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy={!failed}>{skeletonItems.map((item) => <div key={item} className="min-h-[360px] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_36px_rgba(0,0,0,0.16)]"><div className="h-36 bg-white/[0.035]" /><div className="p-4 pt-5"><div className="flex items-center gap-4"><div className="h-[72px] w-[72px] rounded-full bg-white/[0.055]" /><div className="flex-1"><div className="h-5 w-28 rounded-full bg-white/[0.055]" /><div className="mt-3 h-4 w-full rounded-full bg-white/[0.04]" /><div className="mt-2 h-4 w-2/3 rounded-full bg-white/[0.035]" /></div></div><div className="mt-5 flex gap-2"><div className="h-10 w-11 rounded-2xl bg-white/[0.045]" /><div className="h-10 w-11 rounded-2xl bg-white/[0.045]" /><div className="h-10 w-11 rounded-2xl bg-white/[0.045]" /></div><div className="mt-5 h-px bg-white/8" /><div className="mt-4 h-4 w-24 rounded-full bg-white/[0.04]" /><div className="mt-3 h-4 w-full rounded-full bg-white/[0.035]" /><div className="mt-2 h-4 w-3/4 rounded-full bg-white/[0.03]" /></div></div>)}{failed ? <div className="col-span-full rounded-[22px] border border-amber-200/20 bg-amber-300/8 px-5 py-4 text-sm font-black text-amber-100/80">라이브/게시글 상태를 확인하는 중입니다.</div> : null}</div>;
}

function PrisonMemberLiveGridContent() {
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

  return <section data-sou-react-live-grid="true" className="sou-member-live-section mt-8 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] lg:p-8"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h3 className="group w-fit bg-[linear-gradient(90deg,#ffffff_0%,#fde68a_30%,#67e8f9_68%,#ffffff_100%)] bg-[length:220%_100%] bg-clip-text text-[30px] font-black tracking-[-0.05em] text-transparent drop-shadow-[0_0_26px_rgba(103,232,249,0.16)] transition-all duration-300 hover:scale-[1.015] hover:drop-shadow-[0_0_34px_rgba(251,191,36,0.20)] sm:text-[38px]">수용소 멤버 라이브</h3></div><div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-white/62">{hasResolvedData ? `ON ${liveCount}명 · ${fetchedAt || '방금'} 갱신` : '라이브/게시글 불러오는 중'}</div></div>{hasResolvedData ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{sortedMembers.map((member) => { const stationId = stationIdFromUrl(member.station); return <MemberCard key={member.nickname} member={member} status={statuses[member.nickname]} post={posts[stationId]} />; })}</div> : <LiveGridSkeleton failed={loaded && loadFailed} />}</section>;
}

export default function PrisonMemberLiveGrid() {
  const [mountNode, setMountNode] = useState(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.pathname.startsWith('/jangjisu-prison')) return undefined;
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

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';

function stationIdFromUrl(url = '') {
  return String(url).match(/station\/([^/?#]+)/i)?.[1] || '';
}

function formatCount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '0';
  if (number >= 10000) return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}만`;
  return number.toLocaleString('ko-KR');
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

function sortMembers(members, statuses) {
  return [...members].sort((a, b) => {
    const rankDiff = statusRank(statuses[a.nickname]) - statusRank(statuses[b.nickname]);
    if (rankDiff) return rankDiff;
    if (a.nickname === '장지수') return -1;
    if (b.nickname === '장지수') return 1;
    return 0;
  });
}

function PlatformLink({ href, type, label }) {
  const disabled = !href;
  const srcMap = {
    soop: '/soop-logo.svg',
    youtube: '/youtube-logo.svg',
    cafe: '/naver-cafe-logo.svg',
  };
  const className = `inline-flex h-10 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] transition ${disabled ? 'pointer-events-none grayscale opacity-30' : 'hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/10'}`;
  const icon = <img src={srcMap[type]} alt={label} className="max-h-7 max-w-8 object-contain" />;
  if (disabled) return <span className={className} title={`${label} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={className}>{icon}</a>;
}

function MemberCard({ member, status, post }) {
  const isLive = Boolean(status?.isLive);
  const isUnknown = String(status?.liveState || '').includes('unknown');
  const mediaHref = isLive && status?.liveUrl ? status.liveUrl : member.station;
  const mediaImage = status?.thumbnailUrl || member.image;
  const title = status?.title || (isLive ? '방송 중' : isUnknown ? '방송 상태 확인중' : '방송 꺼짐');
  const stateLabel = isLive ? formatCount(status?.viewerCount) : isUnknown ? '확인중' : 'OFF';
  const stateClass = isLive ? 'border-rose-300/35 shadow-[0_0_0_1px_rgba(251,113,133,0.10),0_20px_42px_rgba(127,29,29,0.20)]' : isUnknown ? 'border-amber-200/24' : 'border-white/10';
  const dotClass = isLive ? 'bg-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.75)]' : isUnknown ? 'bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.55)]' : 'bg-slate-400';
  const tags = Array.isArray(member.tags) ? member.tags : [];
  const postTime = formatRelativePostTime(post?.createdAt);

  return (
    <article className={`group relative overflow-hidden rounded-[26px] border ${stateClass} bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.022))] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_36px_rgba(0,0,0,0.18)]`}>
      <a href={mediaHref || member.station} target="_blank" rel="noreferrer" className="relative block h-36 overflow-hidden bg-slate-950/80">
        <img src={mediaImage} alt={`${member.nickname} 방송 이미지`} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />
      </a>
      <img src={member.image} alt={`${member.nickname} 프로필`} className="absolute left-4 top-[96px] z-10 h-[70px] w-[70px] rounded-full border-[3px] border-[#05070c] bg-slate-900 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.32)]" loading="lazy" />
      <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/72 px-2.5 py-1.5 text-[11px] font-black text-white/82 backdrop-blur-md">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        {stateLabel}
      </div>
      <div className="p-4 pt-10">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[19px] font-black tracking-[-0.03em] text-white">{member.nickname}</h4>
          {member.nickname === '장지수' ? <span className="rounded-full border border-amber-200/24 bg-amber-300/10 px-2 py-1 text-[10px] font-black tracking-[0.12em] text-amber-100">수장</span> : null}
        </div>
        <p className="mt-2 line-clamp-2 min-h-[40px] text-[13px] font-extrabold leading-5 text-white/70">{title}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => <span key={tag} className="rounded-full border border-white/8 bg-white/[0.045] px-2 py-1 text-[11px] font-black text-white/62">{tag}</span>)}
        </div>
        <div className="mt-3 flex gap-2">
          <PlatformLink href={member.station} type="soop" label={`${member.nickname} SOOP 방송국`} />
          <PlatformLink href={member.youtube} type="youtube" label={`${member.nickname} YouTube`} />
          <PlatformLink href={member.cafe} type="cafe" label={`${member.nickname} 팬카페`} />
        </div>
        <div className="mt-4 border-t border-white/8 pt-3">
          <div className="text-[10px] font-black tracking-[0.18em] text-cyan-200/70">최근 공지사항</div>
          {post ? (
            <>
              <a href={post.url} target="_blank" rel="noreferrer" className="mt-1.5 block line-clamp-2 text-[13px] font-black leading-5 text-white/88 hover:text-white hover:underline">{post.title}</a>
              {post.summary ? <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-5 text-white/46">{post.summary}</p> : null}
              {postTime ? <div className="mt-2 text-[11px] font-extrabold text-white/42">{postTime}</div> : null}
            </>
          ) : (
            <div className="mt-1.5 text-[13px] font-black leading-5 text-white/58">최근 공지사항 확인중</div>
          )}
        </div>
      </div>
    </article>
  );
}

function PrisonMemberLiveGridContent() {
  const [livePayload, setLivePayload] = useState(null);
  const [postsPayload, setPostsPayload] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [liveRes, postsRes] = await Promise.all([
          fetch('/api/live-status'),
          fetch('/api/soop-station-posts'),
        ]);
        const [liveJson, postsJson] = await Promise.all([
          liveRes.ok ? liveRes.json() : Promise.resolve(null),
          postsRes.ok ? postsRes.json() : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setLivePayload(liveJson || null);
        setPostsPayload(postsJson || null);
        setLoaded(true);
      } catch {
        if (!mounted) return;
        setLoaded(true);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const statuses = livePayload?.statuses || {};
  const posts = postsPayload?.posts || {};
  const sortedMembers = useMemo(() => sortMembers(ALL_PRISON_MEMBERS, statuses), [statuses]);
  const liveCount = sortedMembers.filter((member) => statuses[member.nickname]?.isLive).length;
  const fetchedAt = formatFetchedAt(livePayload?.fetchedAt);

  return (
    <section data-sou-react-live-grid="true" className="sou-member-live-section mt-8 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] lg:p-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h3 className="group w-fit bg-[linear-gradient(90deg,#ffffff_0%,#fde68a_30%,#67e8f9_68%,#ffffff_100%)] bg-[length:220%_100%] bg-clip-text text-[30px] font-black tracking-[-0.05em] text-transparent drop-shadow-[0_0_26px_rgba(103,232,249,0.16)] transition-all duration-300 hover:scale-[1.015] hover:drop-shadow-[0_0_34px_rgba(251,191,36,0.20)] sm:text-[38px]">
            수용소 멤버 라이브
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black text-white/62">
          {loaded ? `ON ${liveCount}명 · ${fetchedAt || '방금'} 갱신` : '라이브/게시글 불러오는 중'}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedMembers.map((member) => {
          const stationId = stationIdFromUrl(member.station);
          return <MemberCard key={member.nickname} member={member} status={statuses[member.nickname]} post={posts[stationId]} />;
        })}
      </div>
    </section>
  );
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

    return () => {
      original.style.removeProperty('display');
      root.remove();
    };
  }, []);

  if (!mountNode) return null;
  return createPortal(<PrisonMemberLiveGridContent />, mountNode);
}

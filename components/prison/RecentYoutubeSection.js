import { useEffect, useState } from 'react';
import { formatRelativeTime, hasRecentUpload, SectionTitle, shareYoutubeState } from './prisonShared';
import { startVisibleInterval } from '../../lib/visibleInterval';
import { PRISON_MEMBERS } from '../../data/prisonMembers';

const YOUTUBE_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MEMBER_IMAGE_BY_NAME = new Map(PRISON_MEMBERS.map((member) => [member.nickname, member.image]));

function VideoCard({ video, vertical = false }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[20px] bg-[#0c1018] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_18px_34px_rgba(0,0,0,0.20)] transition hover:-translate-y-1 hover:bg-[#101723] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_48px_rgba(0,0,0,0.28)] sm:rounded-[26px]">
      <div className={`relative overflow-hidden bg-[#121826] ${vertical ? 'aspect-[9/14]' : 'aspect-video'}`}>
        {video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" /> : <div className="flex h-full w-full items-center justify-center text-4xl">▶</div>}
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-16px)] flex-wrap items-center gap-1.5 sm:left-3 sm:top-3 sm:max-w-[calc(100%-24px)] sm:gap-2">
          <span className="rounded-full bg-[#ff4e45] px-2 py-1 text-[10px] font-bold text-white shadow-[0_8px_18px_rgba(0,0,0,0.22)] sm:px-3 sm:text-[11px]">▶ YouTube</span>
          <span className="rounded-full bg-black/75 px-2 py-1 text-[10px] font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[12px]">{video.member}</span>
        </div>
        {video.durationText ? <div className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur sm:bottom-3 sm:right-3 sm:px-3 sm:text-xs">{video.durationText}</div> : null}
      </div>
      <div className="p-3 sm:p-4"><div className="flex items-center justify-between gap-2 text-[10px] text-white/45 sm:gap-3 sm:text-xs"><span>{formatRelativeTime(video.publishedAt) || video.publishedAtText || ''}</span><span>{video.viewsText ? `조회 ${video.viewsText}` : ''}</span></div><h4 className="mt-2 line-clamp-2 min-h-[42px] text-[13px] font-semibold leading-5 text-white sm:mt-3 sm:min-h-[52px] sm:text-[15px] sm:leading-6">{video.title}</h4></div>
    </a>
  );
}

function YoutubeTabButton({ label, isActive, onClick, hasNew }) {
  return <button onClick={onClick} className={`relative inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold transition-all duration-300 sm:px-5 sm:text-sm ${isActive ? 'bg-red-500/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_15px_rgba(255,0,0,0.32)]' : 'bg-white/5 text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/10 hover:text-white'}`}><span>{label}</span>{hasNew ? <span className="pointer-events-none absolute -right-2 -top-2 text-[10px] leading-none drop-shadow-[0_0_10px_rgba(255,95,95,0.32)] select-none sm:-right-3 sm:-top-3 sm:text-[11px]"><span className="inline-block -rotate-[10deg] font-black tracking-[0.06em] text-[#ff8f88]">new</span></span> : null}</button>;
}

function MemberFilterButton({ label, image, isActive, onClick }) {
  return <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[11px] font-bold transition sm:gap-2 sm:py-2 sm:pl-2.5 sm:pr-4 sm:text-xs ${isActive ? 'bg-white text-[#111827] shadow-[0_8px_22px_rgba(255,255,255,0.12)]' : 'bg-white/[0.055] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/10 hover:text-white'}`}>{image ? <img src={image} alt="" className="h-5 w-5 rounded-full bg-slate-800 object-cover sm:h-6 sm:w-6" loading="lazy" /> : null}<span>{label}</span></button>;
}

function YoutubePanel({ title, subtitle, items, vertical = false }) {
  return <div className="animate-[youtubeTabIn_280ms_cubic-bezier(0.22,1,0.36,1)]"><div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5 sm:gap-3"><div className="text-[20px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[28px]">{title}</div><span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:text-[11px]">{subtitle}</span></div><div className={vertical ? 'grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}>{(items || []).map((video) => <VideoCard key={video.id} video={video} vertical={vertical} />)}</div></div>;
}

export default function RecentYoutubeSection() {
  const [activeTab, setActiveTab] = useState('shorts');
  const [memberFilter, setMemberFilter] = useState('all');
  const [data, setData] = useState({ videos: [], shorts: [], memberRecent: { videos: {}, shorts: {} }, loaded: false, missingKey: false });
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/prison-youtube-cached?view=latest&members=20260907');
        const json = await res.json();
        if (mounted) {
          const nextData = { videos: json.videos || [], shorts: json.shorts || [], memberRecent: json.memberRecent || { videos: {}, shorts: {} }, loaded: true, missingKey: Boolean(json.missingKey) };
          setData(nextData);
          shareYoutubeState('prison', nextData);
        }
      } catch {
        if (mounted) setData({ videos: [], shorts: [], memberRecent: { videos: {}, shorts: {} }, loaded: true, missingKey: false });
      }
    };
    load();
    const stopPolling = startVisibleInterval(load, YOUTUBE_REFRESH_INTERVAL_MS);
    return () => { mounted = false; stopPolling(); };
  }, []);
  const hasNewVideos = hasRecentUpload(data.videos);
  const hasNewShorts = hasRecentUpload(data.shorts);
  const defaultItems = activeTab === 'shorts' ? data.shorts : data.videos;
  const recentByMember = data.memberRecent?.[activeTab] || {};
  const memberOptions = defaultItems.map((item) => item.member).filter(Boolean);
  const visibleItems = memberFilter === 'all' ? defaultItems : (recentByMember[memberFilter] || []);
  const subtitle = memberFilter === 'all' ? '멤버당 최근 영상 1개 · 최근 30일 기준' : `${memberFilter} 최근 영상 최대 5개 · 최근 30일 기준`;
  const selectTab = (tab) => { setActiveTab(tab); setMemberFilter('all'); };
  return <section id="recent-youtube" className="mt-6 w-full max-w-none rounded-[28px] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.22)] sm:mt-8 sm:rounded-[32px] sm:p-6 lg:p-8"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><SectionTitle title="YOUTUBE" logo="▶" /><span className="w-fit rounded-full bg-white/[0.055] px-3 py-1.5 text-[11px] font-black text-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">6시간마다 갱신</span></div><div className="mb-4 flex flex-wrap gap-2 sm:gap-3"><YoutubeTabButton label="쇼츠" isActive={activeTab === 'shorts'} onClick={() => selectTab('shorts')} hasNew={hasNewShorts} /><YoutubeTabButton label="영상" isActive={activeTab === 'videos'} onClick={() => selectTab('videos')} hasNew={hasNewVideos} /></div>{data.loaded && !data.missingKey ? <div className="mb-5 flex max-w-full gap-2 overflow-x-auto pb-1 sm:mb-6 sm:flex-wrap sm:overflow-visible"><MemberFilterButton label="전체" isActive={memberFilter === 'all'} onClick={() => setMemberFilter('all')} />{memberOptions.map((member) => <MemberFilterButton key={member} label={member} image={MEMBER_IMAGE_BY_NAME.get(member) || ''} isActive={memberFilter === member} onClick={() => setMemberFilter(member)} />)}</div> : null}{data.missingKey ? <div className="rounded-[20px] bg-amber-300/8 p-4 text-sm font-bold leading-6 text-amber-50/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[24px] sm:p-5 sm:leading-7">YouTube API 키가 아직 연결되지 않았습니다.</div> : !data.loaded ? <div className="rounded-[20px] bg-[#0b0f17] p-5 text-sm font-semibold text-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[24px] sm:p-6">유튜브 영상을 불러오는 중입니다.</div> : activeTab === 'shorts' ? <div key={`shorts-panel-${memberFilter}`}><YoutubePanel title="쇼츠" subtitle={subtitle} items={visibleItems} vertical /></div> : <div key={`videos-panel-${memberFilter}`}><YoutubePanel title="영상" subtitle={subtitle} items={visibleItems} /></div>}</section>;
}


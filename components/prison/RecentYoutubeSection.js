import { useEffect, useState } from 'react';
import { formatRelativeTime, hasRecentUpload, SectionTitle, shareYoutubeState } from './prisonShared';

function VideoCard({ video, vertical = false }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1018] transition hover:-translate-y-1 hover:border-white/20">
      <div className={`relative overflow-hidden bg-[#121826] ${vertical ? 'aspect-[9/14]' : 'aspect-video'}`}>
        {video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" /> : <div className="flex h-full w-full items-center justify-center text-4xl">▶</div>}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#ff4e45] px-3 py-1 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(0,0,0,0.22)]">▶ YouTube</span>
          <span className="rounded-full border border-white/15 bg-black/75 px-3 py-1.5 text-[12px] font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-md">{video.member}</span>
        </div>
        {video.durationText ? <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{video.durationText}</div> : null}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-white/45">
          <span>{formatRelativeTime(video.publishedAt) || video.publishedAtText || ''}</span>
          <span>{video.viewsText ? `조회 ${video.viewsText}` : ''}</span>
        </div>
        <h4 className="mt-3 line-clamp-2 min-h-[52px] text-[15px] font-semibold leading-6 text-white">{video.title}</h4>
      </div>
    </a>
  );
}

function YoutubeTabButton({ label, isActive, onClick, hasNew }) {
  return <button onClick={onClick} className={`relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${isActive ? 'border border-red-400/40 bg-red-500/20 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)]' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}><span>{label}</span>{hasNew ? <span className="pointer-events-none absolute -right-3 -top-3 text-[11px] leading-none drop-shadow-[0_0_10px_rgba(255,95,95,0.32)] select-none"><span className="inline-block -rotate-[10deg] font-black tracking-[0.06em] text-[#ff8f88]">new</span></span> : null}</button>;
}

function YoutubePanel({ title, items, vertical = false }) {
  return <div className="animate-[youtubeTabIn_280ms_cubic-bezier(0.22,1,0.36,1)]"><div className="mb-5 flex items-center justify-between gap-3"><div className="text-[24px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[28px]">{title}</div></div><div className={vertical ? 'grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4' : 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'}>{(items || []).map((video) => <VideoCard key={video.id} video={video} vertical={vertical} />)}</div></div>;
}

export default function RecentYoutubeSection() {
  const [activeTab, setActiveTab] = useState('shorts');
  const [data, setData] = useState({ videos: [], shorts: [], loaded: false, missingKey: false });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/prison-youtube');
        const json = await res.json();
        if (mounted) {
          const nextData = { videos: json.videos || [], shorts: json.shorts || [], loaded: true, missingKey: Boolean(json.missingKey) };
          setData(nextData);
          shareYoutubeState('prison', nextData);
        }
      } catch {
        if (mounted) setData({ videos: [], shorts: [], loaded: true, missingKey: false });
      }
    };

    load();
    const timer = setInterval(load, 15 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const hasNewVideos = hasRecentUpload(data.videos);
  const hasNewShorts = hasRecentUpload(data.shorts);

  return (
    <section id="recent-youtube" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
      <SectionTitle title="YOUTUBE" logo="▶" />
      <div className="mb-6 flex flex-wrap gap-3">
        <YoutubeTabButton label="쇼츠" isActive={activeTab === 'shorts'} onClick={() => setActiveTab('shorts')} hasNew={hasNewShorts} />
        <YoutubeTabButton label="영상" isActive={activeTab === 'videos'} onClick={() => setActiveTab('videos')} hasNew={hasNewVideos} />
      </div>
      {data.missingKey ? <div className="rounded-[24px] border border-amber-200/16 bg-amber-300/8 p-5 text-sm font-bold leading-7 text-amber-50/82">YouTube API 키가 아직 연결되지 않았습니다. Vercel 환경변수에 <span className="text-white">YOUTUBE_API_KEY</span>를 넣으면 자동으로 영상이 채워집니다.</div> : !data.loaded ? <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-sm font-semibold text-white/65">유튜브 영상을 불러오는 중입니다.</div> : activeTab === 'shorts' ? <div key="shorts-panel"><YoutubePanel title="쇼츠" items={data.shorts} vertical /></div> : <div key="videos-panel"><YoutubePanel title="영상" items={data.videos} /></div>}
    </section>
  );
}

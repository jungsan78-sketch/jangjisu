import { useEffect, useMemo, useState } from 'react';
import { PRISON_MEMBERS, SCHEDULE_MEMBERS, WARDEN } from '../../data/prisonMembers';
import { PRISON_SCHEDULE_SOURCES } from '../../data/prisonScheduleSources';

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000, hour = 60 * minute, day = 24 * hour, week = 7 * day, month = 30 * day, year = 365 * day;
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}일 전`;
  if (diffMs < month) return `${Math.floor(diffMs / week)}주 전`;
  if (diffMs < year) return `${Math.floor(diffMs / month)}개월 전`;
  return `${Math.floor(diffMs / year)}년 전`;
}

function isRecentUpload(item) {
  const time = new Date(item?.publishedAt || '').getTime();
  return Number.isFinite(time) && Date.now() - time < 24 * 60 * 60 * 1000;
}

function hasRecentUpload(items = []) {
  return items.some(isRecentUpload);
}

function shareYoutubeState(scope, payload) {
  if (typeof window === 'undefined') return;
  window.__SOU_YOUTUBE_STATE__ = { ...(window.__SOU_YOUTUBE_STATE__ || {}), [scope]: payload };
  window.dispatchEvent(new CustomEvent('sou-youtube-loaded', { detail: { scope } }));
}

function NavChip({ href, label, tone = 'neutral', icon = '', external = false }) {
  const toneClass = tone === 'green'
    ? 'border-[#03C75A]/30 bg-[#03C75A]/15 text-[#8df0b6] hover:bg-[#03C75A]/22'
    : tone === 'blue'
      ? 'border-[#3b82f6]/30 bg-[#3b82f6]/15 text-[#b8d8ff] hover:bg-[#3b82f6]/22'
      : tone === 'red'
        ? 'border-[#ff4e45]/30 bg-[#ff4e45]/15 text-[#ffb2ae] hover:bg-[#ff4e45]/22'
        : tone === 'prison'
          ? 'border-amber-200/26 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(148,163,184,0.08))] text-amber-100 hover:bg-amber-300/16 hover:shadow-[0_0_30px_rgba(245,158,11,0.16)]'
          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10';
  return <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_0_24px_rgba(255,255,255,0.08)] ${toneClass}`}>{icon ? <span>{icon}</span> : null}<span>{label}</span></a>;
}

function SectionTitle({ title, logo }) {
  return <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/18 bg-amber-200/10 text-lg text-amber-100">{logo}</span><h3 className="text-[28px] font-black tracking-tight text-white sm:text-[34px]">{title}</h3></div>;
}

function parseMonthFromLabel(label) {
  const m = String(label || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!m) {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

function buildCalendarCells(schedule) {
  const { year, month } = parseMonthFromLabel(schedule.monthLabel);
  const days = new Date(year, month, 0).getDate();
  const lead = new Date(year, month - 1, 1).getDay();
  const total = Math.ceil((lead + days) / 7) * 7;
  const map = new Map((schedule.items || []).map((item) => [Number(item.dayNumber), item]));
  return Array.from({ length: total }, (_, i) => {
    const day = i - lead + 1;
    if (day < 1 || day > days) return null;
    return map.get(day) || { dayNumber: day, title: '', empty: true };
  });
}

function CalendarPreview() {
  const [selectedMember, setSelectedMember] = useState('전체보기');
  const [scheduleState, setScheduleState] = useState(() => Object.fromEntries(PRISON_SCHEDULE_SOURCES.map((source) => [source.key, { monthLabel: '', items: [], loaded: false }])));

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const results = await Promise.allSettled(
        PRISON_SCHEDULE_SOURCES.map((source) => fetch(source.endpoint).then((res) => res.json()))
      );
      if (!mounted) return;
      const nextState = {};
      PRISON_SCHEDULE_SOURCES.forEach((source, index) => {
        const result = results[index];
        nextState[source.key] = {
          monthLabel: result.status === 'fulfilled' ? result.value.monthLabel || '' : '',
          items: result.status === 'fulfilled' && Array.isArray(result.value.items) ? result.value.items : [],
          loaded: true,
        };
      });
      setScheduleState(nextState);
    };

    load();
    const timer = setInterval(load, 60000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const scheduleEntries = useMemo(() => PRISON_SCHEDULE_SOURCES.map((source) => ({ ...source, ...(scheduleState[source.key] || { monthLabel: '', items: [], loaded: false }) })), [scheduleState]);
  const calendarSchedule = useMemo(() => {
    const monthLabel = scheduleEntries.find((entry) => entry.monthLabel)?.monthLabel || '';
    const itemMap = new Map();
    scheduleEntries.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        if (!item?.dayNumber) return;
        if (!itemMap.has(item.dayNumber)) itemMap.set(item.dayNumber, item);
      });
    });
    return { monthLabel, items: Array.from(itemMap.values()) };
  }, [scheduleEntries]);

  const cells = useMemo(() => buildCalendarCells(calendarSchedule), [calendarSchedule]);
  const { year, month } = useMemo(() => parseMonthFromLabel(calendarSchedule.monthLabel), [calendarSchedule.monthLabel]);
  const today = new Date();
  const schedules = useMemo(() => scheduleEntries.flatMap((entry) => (entry.items || []).filter((item) => !item.empty && String(item.title || '').trim()).map((item) => ({ day: item.dayNumber, member: entry.member, title: item.title }))), [scheduleEntries]);
  const visible = selectedMember === '전체보기' ? schedules : schedules.filter((item) => item.member === selectedMember);
  const byDay = useMemo(() => {
    const map = new Map();
    visible.forEach((item) => {
      const list = map.get(item.day) || [];
      list.push(item);
      map.set(item.day, list);
    });
    return map;
  }, [visible]);
  const isLoaded = scheduleEntries.every((entry) => entry.loaded);

  return <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8"><div className="rounded-[30px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-7"><div className="mb-6 flex items-center justify-between gap-4"><div className="text-[28px] font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[34px]">{month}월 달력</div><div className="text-xs font-black tracking-[0.45em] text-white/35 sm:text-sm">{year}</div></div><div className="mb-5 flex flex-wrap gap-2 rounded-[24px] border border-white/8 bg-[#05101d] p-3"><button onClick={() => setSelectedMember('전체보기')} className={`rounded-full border px-5 py-2.5 text-[15px] font-black transition ${selectedMember === '전체보기' ? 'border-amber-200/32 bg-amber-300/12 text-white shadow-[0_0_18px_rgba(245,158,11,0.10)]' : 'border-white/10 bg-white/[0.06] text-white/72 hover:bg-white/10'}`}>전체보기</button>{SCHEDULE_MEMBERS.map((m) => <button key={m.nickname} onClick={() => setSelectedMember(m.nickname)} className={`rounded-full border px-5 py-2.5 text-[15px] font-black transition ${selectedMember === m.nickname ? 'border-amber-200/32 bg-amber-300/12 text-white shadow-[0_0_18px_rgba(245,158,11,0.10)]' : 'border-white/10 bg-white/[0.06] text-white/72 hover:bg-white/10'}`}>{m.nickname}</button>)}</div><div className="rounded-[28px] border border-white/10 bg-[#05101d] p-4 sm:p-5"><div className="mb-4 grid grid-cols-7 gap-3 text-center text-[15px] font-black text-white/58">{['일','월','화','수','목','금','토'].map((d,i)=><div key={d} className={i===0?'text-[#ff8e8e]':i===6?'text-[#89b4ff]':''}>{d}</div>)}</div><div className="grid grid-cols-7 gap-3">{cells.map((cell, i) => { if (!cell) return <div key={`e-${i}`} className={`${selectedMember === '전체보기' ? 'min-h-[160px]' : 'min-h-[132px]'} rounded-[22px] border border-white/5 bg-white/[0.02]`} />; const day = Number(cell.dayNumber); const list = byDay.get(day) || []; const isToday = today.getMonth()+1===month && today.getDate()===day; const hasItem = list.length > 0; const offDay = list.some((item) => String(item.title || '').includes('휴방')); return <div key={day} className={`group relative overflow-hidden ${selectedMember === '전체보기' ? 'min-h-[160px]' : 'min-h-[132px]'} rounded-[22px] border p-3.5 transition-all duration-300 hover:-translate-y-1 ${isToday ? 'border-cyan-300/50 bg-[linear-gradient(180deg,rgba(7,27,46,0.98),rgba(5,12,24,0.98))] shadow-[0_0_0_1px_rgba(103,232,249,0.18),0_0_22px_rgba(34,211,238,0.12)]' : offDay ? 'border-orange-300/20 bg-[linear-gradient(180deg,rgba(34,20,7,0.82),rgba(8,14,25,0.98))] hover:border-orange-200/30 hover:shadow-[0_14px_30px_rgba(251,146,60,0.10)]' : hasItem ? 'border-white/10 bg-[linear-gradient(180deg,rgba(11,23,38,0.96),rgba(7,17,31,0.98))] hover:border-cyan-300/20 hover:shadow-[0_14px_30px_rgba(56,189,248,0.08)]' : 'border-white/8 bg-[#07111f] hover:border-white/12 hover:bg-[#091729]'}`}><div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" /><div className="relative flex items-start justify-between gap-2"><div className={`text-[17px] font-black ${day === 5 || day === 12 || day === 19 || day === 26 ? 'text-[#ff8e8e]' : day === 4 || day === 11 || day === 18 ? 'text-[#89b4ff]' : 'text-white/95'}`}>{day}</div>{isToday ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-2 py-0.5 text-[10px] font-black tracking-[0.18em] text-cyan-100">TODAY</span> : hasItem ? <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${offDay ? 'bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.55)]' : 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.45)]'}`} /> : null}</div><div className="relative mt-4 space-y-2">{list.map((item)=>{ const off=String(item.title||'').includes('휴방'); return <div key={`${item.day}-${item.member}-${item.title}`} className={`text-[13px] font-black leading-6 break-keep ${off?'text-rose-100':'text-white/92'}`}>{off ? <><span>{item.member}</span><span className="ml-1">휴방</span></> : <><span className="text-cyan-100">{item.member}</span><span className="px-1.5 text-white/42">-</span><span>{item.title}</span></>}</div>;})}</div></div>;})}</div>{!isLoaded ? <div className="mt-4 text-sm font-bold text-white/55">멤버 일정표 데이터를 불러오는 중입니다.</div> : null}{isLoaded && visible.length === 0 ? <div className="mt-4 text-sm font-bold text-white/55">선택한 메뉴의 일정 데이터가 아직 비어 있습니다.</div> : null}</div></div></section>;
}

function NoticeSection() {
  return <section id="notice" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8"><SectionTitle title="공지" logo="📢" /><div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-white/65">점검중</div></section>;
}

function PlatformButton({ href, type }) {
  const srcMap = { youtube: '/youtube-logo.svg', cafe: '/naver-cafe-logo.svg', soop: '/soop-logo.svg' };
  const labelMap = { youtube: 'YouTube 채널', cafe: 'NAVER 팬카페', soop: 'SOOP 방송국' };
  const tone = type === 'youtube' ? 'border-red-300/20 bg-red-500/10 hover:border-red-200/42' : type === 'cafe' ? 'border-emerald-300/20 bg-emerald-400/10 hover:border-emerald-200/42' : 'border-cyan-200/20 bg-cyan-300/10 hover:border-cyan-100/42';
  const cls = `inline-flex h-12 w-14 items-center justify-center rounded-2xl border bg-black/18 px-2 transition duration-300 ${href ? 'hover:-translate-y-0.5 hover:scale-[1.04]' : 'pointer-events-none grayscale opacity-30'} ${tone}`;
  const icon = <img src={srcMap[type]} alt={labelMap[type]} className={`${type === 'soop' ? '-translate-x-0.5' : ''} max-h-8 max-w-[42px] object-contain`} />;
  if (!href) return <span className={cls} title={`${labelMap[type]} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={labelMap[type]} title={labelMap[type]} className={cls}>{icon}</a>;
}

function ProfileCard({ member, large = false }) {
  return <div className={`group rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.065] ${large?'mx-auto max-w-[360px]':''}`}><img src={member.image} alt={member.nickname} className={`${large?'h-28 w-28':'h-20 w-20'} mx-auto rounded-full border border-white/10 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.22)]`} /><div className={`${large?'text-xl':'text-sm'} mt-4 font-black text-white`}>{member.nickname}</div><div className="mt-4 flex items-center justify-center gap-2"><PlatformButton href={member.station} type="soop" /><PlatformButton href={member.youtube} type="youtube" /><PlatformButton href={member.cafe} type="cafe" /></div></div>;
}

function MemberBoardPreview() {
  return <section id="members" className="mt-8 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] lg:p-8"><SectionTitle title="장지수용소 멤버표" logo="🪪" /><div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_30%),linear-gradient(180deg,rgba(13,17,25,0.98),rgba(5,7,11,0.99))] p-5 shadow-[0_22px_55px_rgba(0,0,0,0.34)] sm:p-7"><div className="mb-5 flex items-center justify-between gap-4"><div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">교도소장</div><div className="rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs font-black tracking-[0.22em] text-amber-50">WARDEN</div></div><ProfileCard member={WARDEN} large /><div className="mt-8 border-t border-white/10 pt-7"><div className="mb-5 flex items-center justify-between gap-4"><div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">수감생</div><div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black tracking-[0.22em] text-white/78">{PRISON_MEMBERS.length}명</div></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{PRISON_MEMBERS.map((m)=><ProfileCard key={m.nickname} member={m} />)}</div></div></div></section>;
}

function VideoCard({ video, vertical = false }) {
  return <a href={video.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1018] transition hover:-translate-y-1 hover:border-white/20"><div className={`relative overflow-hidden bg-[#121826] ${vertical ? 'aspect-[9/14]' : 'aspect-video'}`}>{video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" /> : <div className="flex h-full w-full items-center justify-center text-4xl">▶</div>}<div className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2"><span className="rounded-full bg-[#ff4e45] px-3 py-1 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(0,0,0,0.22)]">▶ YouTube</span><span className="rounded-full border border-white/15 bg-black/75 px-3 py-1.5 text-[12px] font-black text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] backdrop-blur-md">{video.member}</span></div>{video.durationText ? <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{video.durationText}</div> : null}</div><div className="p-4"><div className="flex items-center justify-between gap-3 text-xs text-white/45"><span>{formatRelativeTime(video.publishedAt) || video.publishedAtText || ''}</span><span>{video.viewsText ? `조회 ${video.viewsText}` : ''}</span></div><h4 className="mt-3 line-clamp-2 min-h-[52px] text-[15px] font-semibold leading-6 text-white">{video.title}</h4></div></a>;
}

function YoutubeTabButton({ label, isActive, onClick, hasNew }) {
  return <button onClick={onClick} className={`relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${isActive ? 'border border-red-400/40 bg-red-500/20 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)]' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}><span>{label}</span>{hasNew ? <span className="pointer-events-none absolute -right-3 -top-3 text-[11px] leading-none drop-shadow-[0_0_10px_rgba(255,95,95,0.32)] select-none"><span className="inline-block -rotate-[10deg] font-black tracking-[0.06em] text-[#ff8f88]">new</span></span> : null}</button>;
}

function YoutubePanel({ title, items, vertical = false }) {
  return <div className="animate-[youtubeTabIn_220ms_ease-out]"><div className="mb-5 flex items-center justify-between gap-3"><div className="text-[24px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[28px]">{title}</div></div><div className={vertical ? 'grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4' : 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'}>{(items || []).map((video) => <VideoCard key={video.id} video={video} vertical={vertical} />)}</div></div>;
}

function RecentYoutubeSection() {
  const [activeTab,setActiveTab]=useState('shorts');
  const [data,setData]=useState({videos:[],shorts:[],loaded:false,missingKey:false});
  useEffect(()=>{
    let mounted=true;
    const load=async()=>{
      try{
        const res=await fetch('/api/prison-youtube');
        const json=await res.json();
        if(mounted){
          const nextData = {videos:json.videos||[],shorts:json.shorts||[],loaded:true,missingKey:Boolean(json.missingKey)};
          setData(nextData);
          shareYoutubeState('prison', nextData);
        }
      }catch{
        if(mounted)setData({videos:[],shorts:[],loaded:true,missingKey:false});
      }
    };
    load();
    const timer=setInterval(load,15*60*1000);
    return()=>{mounted=false; clearInterval(timer);};
  },[]);
  const hasNewVideos = hasRecentUpload(data.videos);
  const hasNewShorts = hasRecentUpload(data.shorts);
  return <section id="recent-youtube" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8"><SectionTitle title="YOUTUBE" logo="▶" /><div className="mb-6 flex flex-wrap gap-3"><YoutubeTabButton label="쇼츠" isActive={activeTab === 'shorts'} onClick={() => setActiveTab('shorts')} hasNew={hasNewShorts} /><YoutubeTabButton label="영상" isActive={activeTab === 'videos'} onClick={() => setActiveTab('videos')} hasNew={hasNewVideos} /></div>{data.missingKey ? <div className="rounded-[24px] border border-amber-200/16 bg-amber-300/8 p-5 text-sm font-bold leading-7 text-amber-50/82">YouTube API 키가 아직 연결되지 않았습니다. Vercel 환경변수에 <span className="text-white">YOUTUBE_API_KEY</span>를 넣으면 자동으로 영상이 채워집니다.</div> : !data.loaded ? <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-sm font-semibold text-white/65">유튜브 영상을 불러오는 중입니다.</div> : activeTab === 'shorts' ? <YoutubePanel title="쇼츠" items={data.shorts} vertical /> : <YoutubePanel title="영상" items={data.videos} />}</section>;
}

export default function PrisonPageContent() {
  return <><style jsx global>{`html { scroll-behavior: smooth; } @keyframes youtubeTabIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }`}</style><div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-slate-500/10 blur-3xl" /><div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-amber-500/8 blur-3xl" /><div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" /></div><header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-5 py-4 lg:px-8"><a href="/" className="block h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.07] hover:border-white/25"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a><nav className="flex flex-col items-end gap-2"><div className="flex flex-wrap items-center justify-end gap-3"><NavChip href="#schedule" label="일정" tone="blue" icon="⛓️" /><NavChip href="#notice" label="공지" tone="blue" icon="📢" /><NavChip href="#recent-youtube" label="YOUTUBE" tone="red" icon="▶" /><NavChip href="/utility" label="유틸리티" tone="blue" icon="🛠️" /><NavChip href="/jangjisu-prison/crews" label="종겜 크루 목록" tone="green" icon="👥" /></div><div className="flex w-full justify-end"><NavChip href="/" label="SOU 메인" tone="prison" icon="↩" /></div></nav></div></header><main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8"><section className="overflow-hidden rounded-[36px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.36)]" aria-label="장지수용소 대문"><div className="relative overflow-hidden"><img src="/jangjisu-prison-hero.png" alt="장지수용소" className="block h-auto w-full object-contain" /><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,0.18),transparent_16%,transparent_84%,rgba(5,7,12,0.18)),linear-gradient(180deg,rgba(0,0,0,0.015),transparent_52%,rgba(5,7,12,0.14))]" /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#05070c]/45 to-transparent" /></div></section><MemberBoardPreview /><CalendarPreview /><NoticeSection /><RecentYoutubeSection /></main></>;
}

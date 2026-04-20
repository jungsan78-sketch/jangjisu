import { useEffect, useState } from 'react';

function SectionTitle({ eyebrow, title, actionHref, actionLabel, logo }) {
  const displayTitle = title || eyebrow;
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {logo ? <span className="text-lg leading-none text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">{logo}</span> : null}
          <h3 className="text-[28px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[32px]">{displayTitle}</h3>
        </div>
      </div>
      {actionHref && actionLabel ? <a href={actionHref} target="_blank" rel="noreferrer" className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">{actionLabel}</a> : null}
    </div>
  );
}

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
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
  window.__SOU_YOUTUBE_STATE__ = {
    ...(window.__SOU_YOUTUBE_STATE__ || {}),
    [scope]: payload,
  };
  window.dispatchEvent(new CustomEvent('sou-youtube-loaded', { detail: { scope } }));
}

function NavChip({ href, label, tone = 'neutral', external = false, icon = '', onClick = null, className = '' }) {
  const toneClass = tone === 'green' ? 'border-[#03C75A]/30 bg-[#03C75A]/15 text-[#8df0b6] hover:bg-[#03C75A]/22' : tone === 'blue' ? 'border-[#3b82f6]/30 bg-[#3b82f6]/15 text-[#b8d8ff] hover:bg-[#3b82f6]/22' : tone === 'red' ? 'border-[#ff4e45]/30 bg-[#ff4e45]/15 text-[#ffb2ae] hover:bg-[#ff4e45]/22' : tone === 'prison' ? 'border-amber-200/26 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(148,163,184,0.08))] text-amber-100 hover:bg-amber-300/16 hover:shadow-[0_0_30px_rgba(245,158,11,0.16)]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10';
  return (
    <a href={href} onClick={onClick || undefined} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_0_24px_rgba(255,255,255,0.08)] ${toneClass} ${className}`}>
      {icon ? <span>{icon}</span> : null}
      <span>{label}</span>
    </a>
  );
}

function VideoCard({ video, vertical = false }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1018] transition hover:-translate-y-1 hover:border-white/20">
      <div className={`relative overflow-hidden bg-[#121826] ${vertical ? 'aspect-[9/14]' : 'aspect-video'}`}>
        {video.thumbnail ? <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" /> : <div className="flex h-full w-full items-center justify-center text-4xl">▶</div>}
        <div className="absolute left-3 top-3 flex items-center gap-2"><span className="rounded-full bg-[#ff4e45] px-3 py-1 text-[11px] font-bold text-white">▶ YouTube</span></div>
        {video.durationText ? <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{video.durationText}</div> : null}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-white/45"><span>{formatRelativeTime(video.publishedAt) || video.publishedAtText || ''}</span><span>{video.viewsText ? `조회 ${video.viewsText}` : ''}</span></div>
        <h4 className="mt-3 line-clamp-2 min-h-[52px] text-[15px] font-semibold leading-6 text-white">{video.title}</h4>
      </div>
    </a>
  );
}

function YoutubeTabButton({ label, isActive, onClick, hasNew }) {
  return (
    <button onClick={onClick} className={`relative inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${isActive ? 'border border-red-400/40 bg-red-500/20 text-white shadow-[0_0_15px_rgba(255,0,0,0.4)]' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}>
      <span>{label}</span>
      {hasNew ? <span className="pointer-events-none absolute -right-3 -top-3 text-[11px] leading-none drop-shadow-[0_0_10px_rgba(255,95,95,0.32)] select-none"><span className="inline-block -rotate-[10deg] font-black tracking-[0.06em] text-[#ff8f88]">new</span></span> : null}
    </button>
  );
}

function YoutubePanel({ title, items, vertical = false, moreHref, moreLabel }) {
  return (
    <div className="animate-[youtubeTabIn_220ms_ease-out]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="text-[24px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[28px]">{title}</div>
        {moreHref ? <a href={moreHref} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">{moreLabel}</a> : null}
      </div>
      <div className={vertical ? 'grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4' : 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'}>{(items || []).map((video) => <VideoCard key={video.id} video={video} vertical={vertical} />)}</div>
    </div>
  );
}

function isTodaySchedule(item) {
  const now = new Date();
  const text = String(item.date || '');
  const monthMatch = text.match(/(\d+)월/);
  const dayMatch = text.match(/(\d+)일/);
  if (!monthMatch || !dayMatch) return false;
  return now.getMonth() + 1 === Number(monthMatch[1]) && now.getDate() === Number(dayMatch[1]);
}

function isOffDay(item) {
  return String(item.title || '').includes('휴방');
}

function ScheduleItem({ item }) {
  const isToday = isTodaySchedule(item);
  const offDay = isOffDay(item);
  const wrapperClass = isToday ? 'border-cyan-300/35 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(11,15,23,0.95))] shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_18px_40px_rgba(14,165,233,0.12)]' : 'border-white/10 bg-[#0b0f17] hover:border-white/20';
  const badgeClass = offDay ? 'border-orange-300/25 bg-orange-400/15 text-orange-100' : isToday ? 'border-cyan-300/25 bg-cyan-300/15 text-cyan-100' : 'border-white/10 bg-white/5 text-white/55';
  return <div className={`rounded-[24px] border p-5 transition ${wrapperClass}`}><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold text-white">{item.date}</div><div className={`rounded-full border px-3 py-1 text-xs ${badgeClass}`}>{offDay ? '휴방' : isToday ? '오늘 일정' : item.day}</div></div><div className="mt-4 text-lg font-semibold leading-7 text-white">{item.title}</div>{isToday ? <div className="mt-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">TODAY</div> : null}</div>;
}

function buildCalendarWeeks(monthLabel, items) {
  const now = new Date();
  const match = String(monthLabel || '').match(/(\d{4})년\s*(\d{1,2})월/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingEmpty = firstDay.getDay();
  const totalCells = Math.ceil((leadingEmpty + daysInMonth) / 7) * 7;
  const itemMap = new Map((items || []).map((item) => [Number(item.dayNumber), item]));
  const cells = [];
  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - leadingEmpty + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) { cells.push(null); continue; }
    const dateObject = new Date(year, month - 1, dayNumber);
    cells.push(itemMap.get(dayNumber) || { dayNumber, date: `${month}월 ${dayNumber}일`, day: ['일', '월', '화', '수', '목', '금', '토'][dateObject.getDay()], title: '', empty: true });
  }
  return { year, month, weeks: Array.from({ length: totalCells / 7 }, (_, weekIndex) => cells.slice(weekIndex * 7, weekIndex * 7 + 7)) };
}

function CalendarDayCell({ item, weekdayIndex, month }) {
  if (!item) return <div className="min-h-[108px] rounded-[22px] border border-white/5 bg-white/[0.02]" />;
  const isSunday = weekdayIndex === 0;
  const isSaturday = weekdayIndex === 6;
  const isToday = (() => { const now = new Date(); return now.getMonth() + 1 === month && now.getDate() === item.dayNumber; })();
  const hasTitle = Boolean(String(item.title || '').trim());
  const offDay = isOffDay(item);
  return <div className={`group relative min-h-[108px] overflow-hidden rounded-[22px] border p-4 transition-all duration-300 ${isToday ? 'border-cyan-300/50 bg-[linear-gradient(180deg,rgba(7,27,46,0.98),rgba(5,12,24,0.98))] shadow-[0_0_0_1px_rgba(103,232,249,0.18),0_0_22px_rgba(34,211,238,0.12)] hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(103,232,249,0.24),0_16px_36px_rgba(34,211,238,0.14)]' : offDay ? 'border-orange-300/20 bg-[linear-gradient(180deg,rgba(34,20,7,0.82),rgba(8,14,25,0.98))] hover:-translate-y-1 hover:border-orange-200/30 hover:shadow-[0_14px_30px_rgba(251,146,60,0.10)]' : hasTitle ? 'border-white/10 bg-[linear-gradient(180deg,rgba(11,23,38,0.96),rgba(7,17,31,0.98))] hover:-translate-y-1 hover:border-cyan-300/20 hover:shadow-[0_14px_30px_rgba(56,189,248,0.08)]' : 'border-white/8 bg-[#07111f] hover:border-white/12 hover:bg-[#091729]'}`}><div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" /><div className="relative flex items-start justify-between gap-3"><div className={`text-[15px] font-extrabold ${isSunday ? 'text-[#ff8e8e]' : isSaturday ? 'text-[#89b4ff]' : 'text-white'}`}>{item.dayNumber}</div>{isToday ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-2 py-1 text-[10px] font-extrabold tracking-[0.18em] text-cyan-100">TODAY</span> : hasTitle ? <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${offDay ? 'bg-orange-300 shadow-[0_0_12px_rgba(253,186,116,0.55)]' : 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.45)]'}`} /> : null}</div>{hasTitle ? <div className="relative mt-4 text-sm font-semibold leading-6 text-white/92 whitespace-pre-line break-keep">{item.title}</div> : null}</div>;
}

function ScheduleCalendarSection({ schedule }) {
  const hasItems = Array.isArray(schedule.items) && schedule.items.length > 0;
  const { year, month, weeks } = buildCalendarWeeks(schedule.monthLabel, schedule.items);
  const monthTitle = schedule.monthLabel ? `${month}월 달력` : '이번 달 달력';
  const yearText = schedule.monthLabel ? String(year) : '';
  const weekdayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
  const todayItems = (schedule.items || []).filter((item) => isTodaySchedule(item) && String(item.title || '').trim());
  return <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8"><SectionTitle eyebrow={schedule.monthLabel || '이번 일정'} title="장지수 일정" actionHref={schedule.sourceUrl || '#'} actionLabel={schedule.sourceUrl ? '시트 보기' : '일정 보기'} logo="🔵" />{!schedule.loaded || !hasItems ? <div className="rounded-[24px] border border-white/10 bg-[#07111f] px-6 py-10 text-sm font-semibold text-white/65">일정 데이터를 불러오는 중이거나 시트 구조를 확인하는 중입니다.</div> : <><div className="sm:hidden"><div className="rounded-[30px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]"><div className="mb-5 flex items-center justify-between gap-4"><div className="text-[22px] font-extrabold tracking-tight text-white">오늘 일정</div><div className="text-xs font-bold tracking-[0.28em] text-white/55">{yearText}</div></div>{todayItems.length > 0 ? <div className="space-y-4">{todayItems.map((item) => <ScheduleItem key={`${item.date}-${item.title}`} item={item} />)}</div> : <div className="rounded-[24px] border border-white/10 bg-[#05101d] px-5 py-8 text-sm font-semibold text-white/65">오늘 등록된 일정이 없습니다.</div>}</div></div><div className="hidden sm:block rounded-[30px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-7"><div className="mb-5 flex items-center justify-between gap-4"><div className="text-[24px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[30px]">{monthTitle}</div><div className="text-xs font-bold tracking-[0.45em] text-white/40 sm:text-sm">{yearText}</div></div><div className="rounded-[28px] border border-white/10 bg-[#05101d] p-4 sm:p-5"><div className="mb-4 grid grid-cols-7 gap-3 text-center text-sm font-extrabold text-white/60">{weekdayHeaders.map((label, index) => <div key={label} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{label}</div>)}</div><div className="space-y-3">{weeks.map((week, weekIndex) => <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-3">{week.map((item, weekdayIndex) => <CalendarDayCell key={item ? `${item.date}-${item.title}` : `empty-${weekIndex}-${weekdayIndex}`} item={item} weekdayIndex={weekdayIndex} month={month} />)}</div>)}</div></div></div></>}</section>;
}

export default function JangJisuFanSite() {
  const [data, setData] = useState({ channel: { soopUrl: 'https://www.sooplive.com/station/iamquaddurup', fanCafeUrl: 'https://cafe.naver.com/quaddurupfancafe' } });
  const [youtube, setYoutube] = useState({ shorts: [], videos: [], full: [], channels: { latest: { url: 'https://www.youtube.com/@jisoujang', videosUrl: 'https://www.youtube.com/@jisoujang/videos', shortsUrl: 'https://www.youtube.com/@jisoujang/shorts' }, full: { url: 'https://www.youtube.com/@jisoujang_full', videosUrl: 'https://www.youtube.com/@jisoujang_full/videos' } } });
  const [schedule, setSchedule] = useState({ monthLabel: '', items: [], sourceUrl: '', loaded: false });
  const [activeTab, setActiveTab] = useState('videos');
  const [youtubeDebug, setYoutubeDebug] = useState(null);
  const [isYoutubeDebugMode, setIsYoutubeDebugMode] = useState(false);
  const [prisonTransition, setPrisonTransition] = useState(false);

  useEffect(() => {
    let mounted = true;
    const debugEnabled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
    setIsYoutubeDebugMode(debugEnabled);
    const loadSoop = async () => { try { const res = await fetch('/api/soop'); const json = await res.json(); if (!mounted) return; setData((prev) => ({ ...prev, channel: { ...prev.channel, ...(json.channel || {}) } })); } catch {} };
    const loadYoutube = async () => { try { const res = await fetch(debugEnabled ? '/api/youtube?debug=1' : '/api/youtube'); const json = await res.json(); if (!mounted) return; const nextYoutube = { shorts: Array.isArray(json.shorts) ? json.shorts : [], videos: Array.isArray(json.videos) ? json.videos : [], full: Array.isArray(json.full) ? json.full : [], channels: { latest: { url: json.channels?.latest?.url || 'https://www.youtube.com/@jisoujang', videosUrl: json.channels?.latest?.videosUrl || 'https://www.youtube.com/@jisoujang/videos', shortsUrl: json.channels?.latest?.shortsUrl || 'https://www.youtube.com/@jisoujang/shorts' }, full: { url: json.channels?.full?.url || 'https://www.youtube.com/@jisoujang_full', videosUrl: json.channels?.full?.videosUrl || 'https://www.youtube.com/@jisoujang_full/videos' } } }; setYoutube(nextYoutube); shareYoutubeState('main', nextYoutube); setYoutubeDebug(json.debug || null); } catch {} };
    const loadSchedule = async () => { try { const res = await fetch('/api/schedule'); const json = await res.json(); if (!mounted) return; setSchedule({ monthLabel: json.monthLabel || '', items: Array.isArray(json.items) ? json.items : [], sourceUrl: json.sourceUrl || '', loaded: true }); } catch {} };
    loadSoop(); loadYoutube(); loadSchedule(); const scheduleTimer = setInterval(loadSchedule, 60 * 1000); return () => { mounted = false; clearInterval(scheduleTimer); };
  }, []);

  const hasNewVideos = hasRecentUpload(youtube.videos);
  const hasNewShorts = hasRecentUpload(youtube.shorts);
  const hasNewFull = hasRecentUpload(youtube.full);
  const handlePrisonModeClick = (event) => {
    event.preventDefault();
    setPrisonTransition(true);
    window.setTimeout(() => { window.location.href = '/jangjisu-prison'; }, 760);
  };

  return <div className="min-h-screen bg-[#05070c] text-white"><style jsx global>{`html { scroll-behavior: smooth; } @keyframes heroFloat { 0% { transform: translate3d(0, 0, 0) scale(1.02); } 50% { transform: translate3d(0, -8px, 0) scale(1.05); } 100% { transform: translate3d(0, 0, 0) scale(1.02); } } @keyframes shimmerText { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } } @keyframes youtubeTabIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } } @keyframes prisonGateClose { 0% { opacity: 0; transform: scaleX(0.04); } 45% { opacity: 1; transform: scaleX(1); } 100% { opacity: 1; transform: scaleX(1); } } @keyframes prisonTextIn { 0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.6em; } 100% { opacity: 1; transform: translateY(0); letter-spacing: 0.32em; } }`}</style>{prisonTransition ? <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#030508]/92 backdrop-blur-md"><div className="absolute inset-y-0 left-1/2 w-[2px] bg-amber-200/20 shadow-[0_0_35px_rgba(245,158,11,0.30)]" /><div className="absolute inset-y-0 left-[38%] w-[10px] origin-center animate-[prisonGateClose_760ms_ease-in-out_forwards] rounded-full bg-slate-200/18 shadow-[0_0_30px_rgba(148,163,184,0.18)]" /><div className="absolute inset-y-0 left-[46%] w-[10px] origin-center animate-[prisonGateClose_760ms_ease-in-out_forwards] rounded-full bg-slate-200/18 shadow-[0_0_30px_rgba(148,163,184,0.18)]" /><div className="absolute inset-y-0 left-[54%] w-[10px] origin-center animate-[prisonGateClose_760ms_ease-in-out_forwards] rounded-full bg-slate-200/18 shadow-[0_0_30px_rgba(148,163,184,0.18)]" /><div className="absolute inset-y-0 left-[62%] w-[10px] origin-center animate-[prisonGateClose_760ms_ease-in-out_forwards] rounded-full bg-slate-200/18 shadow-[0_0_30px_rgba(148,163,184,0.18)]" /><div className="relative rounded-[28px] border border-amber-200/20 bg-black/45 px-8 py-6 text-center shadow-[0_22px_80px_rgba(0,0,0,0.55)]"><div className="text-xs font-black text-amber-100/80 animate-[prisonTextIn_460ms_ease-out_forwards]">PRISON MODE</div><div className="mt-3 text-3xl font-black tracking-[0.18em] text-white">장지수용소 진입중</div></div></div> : null}<div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" /><div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" /><div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" /></div><header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-5 py-4 lg:px-8"><a href="#" className="block h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-white/25 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a><nav className="flex flex-col items-end gap-2"><div className="flex flex-wrap items-center justify-end gap-3"><NavChip href="#schedule" label="일정" tone="blue" icon="🔵" /><NavChip href="#notice" label="공지" tone="blue" icon="🔵" /><NavChip href="#youtube" label="YOUTUBE" tone="red" icon="▶" /><NavChip href="/utility" label="유틸리티" tone="blue" icon="🛠️" /><NavChip href={data.channel.fanCafeUrl} label="팬카페" tone="green" external icon="N" /></div><div className="flex w-full justify-end"><NavChip href="/jangjisu-prison" onClick={handlePrisonModeClick} label="장지수용소 모드" tone="prison" icon="🏛️" className="px-5" /></div></nav></div></header><main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8"><section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30"><div className="relative min-h-[460px] overflow-hidden lg:min-h-[560px]"><video className="absolute inset-0 h-full w-full object-cover opacity-60" src="/hero.mp4" autoPlay muted loop playsInline style={{ animation: 'heroFloat 18s ease-in-out infinite' }} /><div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(44,149,255,0.32),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.18),_transparent_20%),linear-gradient(180deg,_rgba(3,7,18,0.40)_0%,_rgba(3,7,18,0.62)_45%,_rgba(2,6,12,0.88)_100%)]" /><div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-[#05070c]" /><div className="absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.18),transparent_70%)] blur-2xl" /><div className="relative z-10 flex min-h-[460px] flex-col items-center justify-center px-6 text-center lg:min-h-[560px]"><div className="select-none bg-[linear-gradient(90deg,#ffffff_0%,#dbeafe_25%,#ffffff_50%,#bae6fd_75%,#ffffff_100%)] bg-[length:200%_200%] bg-clip-text text-[72px] font-black uppercase leading-[0.92] tracking-[0.24em] text-transparent sm:text-[96px] md:text-[128px] lg:text-[176px]" style={{ textShadow: '0 0 18px rgba(255,255,255,0.08), 0 10px 35px rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.06)', animation: 'shimmerText 10s linear infinite' }}>SOU</div><div className="absolute bottom-6 right-6 flex flex-wrap items-center justify-end gap-3 sm:bottom-8 sm:right-8"><a href={data.channel.soopUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#3b82f6]/35 bg-[#3b82f6]/15 px-4 py-2 text-sm font-semibold text-[#d5e8ff] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-[#60a5fa]/45 hover:bg-[#3b82f6]/24 hover:shadow-[0_0_24px_rgba(59,130,246,0.24)]">🔵 SOOP 방송국</a><a href={youtube.channels.latest.url} target="_blank" rel="noreferrer" className="rounded-full border border-[#ff4e45]/35 bg-[#ff4e45]/15 px-4 py-2 text-sm font-semibold text-[#ffd0cb] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-[#ff7d74]/45 hover:bg-[#ff4e45]/24 hover:shadow-[0_0_24px_rgba(255,78,69,0.24)]">▶ YouTube</a></div></div></div></section><ScheduleCalendarSection schedule={schedule} /><section id="notice" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8"><SectionTitle eyebrow="SOOP 점검 안내" title="SOOP 탭은 점검 중" logo="🔵" /><div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-white/65">점검중</div></section><section id="youtube" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8"><SectionTitle title="YOUTUBE" logo="▶" /><div className="mb-6 flex flex-wrap gap-3"><YoutubeTabButton label="영상" isActive={activeTab === 'videos'} onClick={() => setActiveTab('videos')} hasNew={hasNewVideos} /><YoutubeTabButton label="쇼츠" isActive={activeTab === 'shorts'} onClick={() => setActiveTab('shorts')} hasNew={hasNewShorts} /><YoutubeTabButton label="풀영상" isActive={activeTab === 'full'} onClick={() => setActiveTab('full')} hasNew={hasNewFull} /></div>{activeTab === 'videos' ? <YoutubePanel title="영상" items={youtube?.videos || []} moreHref={youtube.channels.latest.videosUrl} moreLabel="영상 더보기" /> : null}{activeTab === 'shorts' ? <YoutubePanel title="쇼츠" items={youtube?.shorts || []} vertical moreHref={youtube.channels.latest.shortsUrl} moreLabel="쇼츠 더보기" /> : null}{activeTab === 'full' ? <YoutubePanel title="풀영상" items={youtube?.full || []} moreHref={youtube.channels.full.videosUrl || youtube.channels.full.url} moreLabel="풀영상 더보기" /> : null}</section>{isYoutubeDebugMode ? <section className="mt-8 rounded-[32px] border border-yellow-300/20 bg-yellow-500/[0.05] p-6 shadow-xl shadow-black/20 lg:p-8"><SectionTitle title="YOUTUBE DEBUG" logo="🛠️" /><div className="rounded-[24px] border border-yellow-300/20 bg-[#0b0f17] p-4"><pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-yellow-100/90">{JSON.stringify(youtubeDebug || { message: 'debug data not loaded' }, null, 2)}</pre></div></section> : null}</main><footer className="mt-16 border-t border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.28),rgba(2,8,18,0.68))]"><div className="mx-auto max-w-7xl px-5 py-10 lg:px-8"><div className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-6 py-10 text-center shadow-[0_14px_40px_rgba(0,0,0,0.18)]"><div className="text-[28px] font-extrabold tracking-[0.18em] text-white sm:text-[34px]">JANGJISOU FAN ARCHIVE</div><div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-white/35 to-transparent" /><p className="mt-6 text-sm font-medium tracking-[0.04em] text-white/72">장지수 팬 아카이브 · Edited by 장지수 편집자</p><p className="mt-3 text-sm leading-7 text-white/50">본 사이트는 비영리 팬 아카이브이며, 모든 콘텐츠의 저작권은 원저작권자에게 있습니다.</p><p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-white/34">ARCHIVED WITH RESPECT</p><p className="mt-4 text-sm italic text-white/56">Fan Archive by 장지수 편집자</p><p className="mt-5 text-xs text-white/30">© 2026 JANGJISOU FAN ARCHIVE</p></div></div></footer></div>;
}

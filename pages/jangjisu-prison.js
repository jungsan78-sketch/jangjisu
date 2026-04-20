import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const WARDEN = {
  nickname: '장지수',
  image: 'https://stimg.sooplive.com/LOGO/ia/iamquaddurup/iamquaddurup.jpg',
  station: 'https://www.sooplive.com/station/iamquaddurup',
  youtube: 'https://www.youtube.com/@jisoujang',
  cafe: 'https://cafe.naver.com/quaddurupfancafe',
};

const PRISON_MEMBERS = [
  { nickname: '냥냥두둥', image: 'https://stimg.sooplive.com/LOGO/do/doodong/doodong.jpg', station: 'https://www.sooplive.com/station/doodong', youtube: 'https://www.youtube.com/channel/UCCAaGF_vfM6QygNRCp4x1dw', cafe: 'https://cafe.naver.com/meowdoodong' },
  { nickname: '치치', image: 'https://stimg.sooplive.com/LOGO/lo/lomioeov/m/lomioeov.webp', station: 'https://www.sooplive.com/station/lomioeov', youtube: 'https://www.youtube.com/@chichi0e0' },
  { nickname: '시몽', image: 'https://stimg.sooplive.com/LOGO/xi/ximong/ximong.jpg', station: 'https://www.sooplive.com/station/ximong' },
  { nickname: '유오늘', image: 'https://stimg.sooplive.com/LOGO/yo/youoneul/youoneul.jpg', station: 'https://www.sooplive.com/station/youoneul' },
  { nickname: '아야네세나', image: 'https://stimg.sooplive.com/LOGO/ay/ayanesena/ayanesena.jpg', station: 'https://www.sooplive.com/station/ayanesena', youtube: 'https://www.youtube.com/@%EC%95%84%EC%95%BC%EB%84%A4%EC%84%B8%EB%82%98', cafe: 'https://cafe.naver.com/ayanesena' },
  { nickname: '포포', image: 'https://stimg.sooplive.com/LOGO/su/sunza1122/sunza1122.jpg', station: 'https://www.sooplive.com/station/sunza1122', youtube: 'https://www.youtube.com/@%EB%B2%84%ED%8A%9C%EB%B2%84%ED%8F%AC%ED%8F%AC' },
  { nickname: '채니', image: 'https://stimg.sooplive.com/LOGO/k1/k1baaa/k1baaa.jpg', station: 'https://www.sooplive.com/station/k1baaa' },
  { nickname: '코로미', image: 'https://stimg.sooplive.com/LOGO/bx/bxroong/bxroong.jpg', station: 'https://www.sooplive.com/station/bxroong', cafe: 'https://cafe.naver.com/koromieie' },
  { nickname: '구월이', image: 'https://stimg.sooplive.com/LOGO/is/isq1158/isq1158.jpg', station: 'https://www.sooplive.com/station/isq1158', youtube: 'https://www.youtube.com/@%EA%B5%AC%EC%9B%94%EC%9D%B4', cafe: 'https://cafe.naver.com/guweol' },
  { nickname: '린링', image: 'https://stimg.sooplive.com/LOGO/mi/mini1212/mini1212.jpg', station: 'https://www.sooplive.com/station/mini1212' },
  { nickname: '띠꾸', image: 'https://stimg.sooplive.com/LOGO/dd/ddikku0714/ddikku0714.jpg', station: 'https://www.sooplive.com/station/ddikku0714', youtube: 'https://www.youtube.com/@ddikku_0714', cafe: 'https://cafe.naver.com/ddikku' },
];

const SCHEDULE_MEMBERS = [WARDEN, ...PRISON_MEMBERS];

function NavChip({ href, label, tone = 'steel', icon = '' }) {
  const toneClass = tone === 'warm' ? 'border-amber-200/25 bg-amber-300/12 text-amber-50' : 'border-white/10 bg-white/[0.06] text-white/80';
  return <a href={href} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-white/10 ${toneClass}`}>{icon && <span>{icon}</span>}<span>{label}</span></a>;
}

function SectionTitle({ title, logo }) {
  return <div className="mb-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/18 bg-amber-200/10 text-lg text-amber-100">{logo}</span><h3 className="text-[28px] font-black tracking-tight text-white sm:text-[34px]">{title}</h3></div>;
}

function parseMonthFromLabel(monthLabel) {
  const match = String(monthLabel || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!match) { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() + 1 }; }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function buildCalendarCells(schedule) {
  const { year, month } = parseMonthFromLabel(schedule.monthLabel);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingEmpty = new Date(year, month - 1, 1).getDay();
  const totalCells = Math.ceil((leadingEmpty + daysInMonth) / 7) * 7;
  const itemMap = new Map((schedule.items || []).map((item) => [Number(item.dayNumber), item]));
  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - leadingEmpty + 1;
    if (day < 1 || day > daysInMonth) return null;
    return itemMap.get(day) || { dayNumber: day, title: '', empty: true };
  });
}

function CalendarPreview() {
  const [selectedMember, setSelectedMember] = useState('전체보기');
  const [mainSchedule, setMainSchedule] = useState({ monthLabel: '', items: [], loaded: false });

  useEffect(() => {
    let mounted = true;
    const loadMainSchedule = async () => {
      try {
        const res = await fetch('/api/schedule');
        const json = await res.json();
        if (mounted) setMainSchedule({ monthLabel: json.monthLabel || '', items: Array.isArray(json.items) ? json.items : [], loaded: true });
      } catch { if (mounted) setMainSchedule({ monthLabel: '', items: [], loaded: true }); }
    };
    loadMainSchedule();
    const timer = setInterval(loadMainSchedule, 60 * 1000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const calendarCells = useMemo(() => buildCalendarCells(mainSchedule), [mainSchedule]);
  const { month } = useMemo(() => parseMonthFromLabel(mainSchedule.monthLabel), [mainSchedule.monthLabel]);
  const today = new Date();
  const schedules = useMemo(() => (mainSchedule.items || [])
    .filter((item) => !item.empty && String(item.title || '').trim())
    .map((item) => ({ day: item.dayNumber, member: '장지수', title: item.title })), [mainSchedule]);
  const visibleSchedules = selectedMember === '전체보기' ? schedules : schedules.filter((item) => item.member === selectedMember);
  const scheduleByDay = useMemo(() => {
    const map = new Map();
    visibleSchedules.forEach((item) => { const list = map.get(item.day) || []; list.push(item); map.set(item.day, list); });
    return map;
  }, [visibleSchedules]);

  return (
    <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
      <SectionTitle title="장지수용소 일정표" logo="⛓️" />
      <div className="rounded-[30px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-[26px] font-extrabold text-white sm:text-[30px]">수용소 월간 일정</div><div className="mt-2 text-[15px] font-semibold leading-7 text-white/68">전체보기는 모든 멤버 일정을 합쳐서 보여주고, 멤버 버튼은 해당 멤버 일정만 표시합니다.</div></div><div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black tracking-[0.22em] text-cyan-100">{mainSchedule.monthLabel || 'PRISON SCHEDULE'}</div></div>
        <div className="mb-5 flex flex-wrap gap-2 rounded-[24px] border border-white/8 bg-[#05101d] p-3"><button onClick={() => setSelectedMember('전체보기')} className={`rounded-full border px-5 py-2.5 text-[15px] font-black ${selectedMember === '전체보기' ? 'border-cyan-200/38 bg-cyan-300/14 text-white' : 'border-white/10 bg-white/[0.06] text-white/72'}`}>전체보기</button>{SCHEDULE_MEMBERS.map((member) => <button key={member.nickname} onClick={() => setSelectedMember(member.nickname)} className={`rounded-full border px-5 py-2.5 text-[15px] font-black ${selectedMember === member.nickname ? 'border-cyan-200/38 bg-cyan-300/14 text-white' : 'border-white/10 bg-white/[0.06] text-white/72'}`}>{member.nickname}</button>)}</div>
        <div className="rounded-[28px] border border-white/10 bg-[#05101d] p-4 sm:p-5"><div className="mb-4 grid grid-cols-7 gap-3 text-center text-[15px] font-black text-white/68">{['일', '월', '화', '수', '목', '금', '토'].map((day, index) => <div key={day} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{day}</div>)}</div><div className="grid grid-cols-7 gap-3">{calendarCells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} className={`${selectedMember === '전체보기' ? 'min-h-[160px]' : 'min-h-[132px]'} rounded-[22px] border border-white/5 bg-white/[0.02]`} />;
          const day = Number(cell.dayNumber);
          const daySchedules = scheduleByDay.get(day) || [];
          const isToday = today.getMonth() + 1 === month && today.getDate() === day;
          return <div key={day} className={`group relative overflow-hidden ${selectedMember === '전체보기' ? 'min-h-[160px]' : 'min-h-[132px]'} rounded-[22px] border p-3.5 transition-all duration-300 hover:-translate-y-1 ${daySchedules.length ? 'border-white/10 bg-[linear-gradient(180deg,rgba(11,23,38,0.96),rgba(7,17,31,0.98))] hover:border-cyan-300/24 hover:shadow-[0_14px_30px_rgba(56,189,248,0.08)]' : 'border-white/8 bg-[#07111f] hover:border-white/12 hover:bg-[#091729]'}`}><div className="flex items-start justify-between gap-2"><div className="text-[17px] font-black text-white/95">{day}</div>{isToday ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-2 py-0.5 text-[10px] font-black text-cyan-100">TODAY</span> : null}</div><div className="mt-3 space-y-2">{daySchedules.map((item) => { const off = String(item.title || '').includes('휴방'); return <div key={`${item.day}-${item.member}-${item.title}`} className={`text-[13px] font-black leading-6 ${off ? 'text-rose-200' : 'text-white'}`}>{off ? <><span className="text-rose-100">{item.member}</span><span className="ml-1 text-rose-100">휴방</span></> : <><span className="text-cyan-100">{item.member}</span><span className="px-1.5 text-white/42">-</span><span>{item.title}</span></>}</div>; })}</div></div>;
        })}</div>{!mainSchedule.loaded ? <div className="mt-4 text-sm font-bold text-white/55">메인 일정표 데이터를 불러오는 중입니다.</div> : null}{mainSchedule.loaded && visibleSchedules.length === 0 ? <div className="mt-4 text-sm font-bold text-white/55">선택한 메뉴의 일정 데이터가 아직 비어 있습니다.</div> : null}</div>
      </div>
    </section>
  );
}

function PlatformButton({ href, type }) {
  const srcMap = { youtube: '/youtube-logo.svg', cafe: '/naver-cafe-logo.svg', soop: '/soop-logo.svg' };
  const labelMap = { youtube: 'YouTube 채널', cafe: 'NAVER 팬카페', soop: 'SOOP 방송국' };
  const toneClass = type === 'youtube' ? 'border-red-300/20 bg-red-500/10 hover:border-red-200/42' : type === 'cafe' ? 'border-emerald-300/20 bg-emerald-400/10 hover:border-emerald-200/42' : 'border-cyan-200/20 bg-cyan-300/10 hover:border-cyan-100/42';
  const baseClass = `inline-flex h-11 w-[58px] items-center justify-center rounded-full border px-2 transition duration-300 hover:-translate-y-0.5 hover:scale-[1.04] ${toneClass}`;
  const icon = <img src={srcMap[type]} alt={labelMap[type]} className="max-h-7 max-w-[38px] object-contain" />;
  if (!href) return <span className={`${baseClass} pointer-events-none opacity-25 grayscale`} title={`${labelMap[type]} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={labelMap[type]} title={labelMap[type]} className={baseClass}>{icon}</a>;
}

function ProfileCard({ member, large = false }) {
  return <div className={`group rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.065] ${large ? 'mx-auto max-w-[360px]' : ''}`}><img src={member.image} alt={member.nickname} className={`${large ? 'h-28 w-28' : 'h-20 w-20'} mx-auto rounded-full border border-white/10 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.22)]`} /><div className={`${large ? 'text-xl' : 'text-sm'} mt-4 font-black text-white`}>{member.nickname}</div><div className="mt-4 flex items-center justify-center gap-2"><PlatformButton href={member.station} type="soop" /><PlatformButton href={member.youtube} type="youtube" /><PlatformButton href={member.cafe} type="cafe" /></div></div>;
}

function MemberBoardPreview() {
  return <section id="members" className="mt-8 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] lg:p-8"><SectionTitle title="장지수용소 멤버표" logo="🪪" /><div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_30%),linear-gradient(180deg,rgba(13,17,25,0.98),rgba(5,7,11,0.99))] p-5 shadow-[0_22px_55px_rgba(0,0,0,0.34)] sm:p-7"><div className="mb-5 flex items-center justify-between gap-4"><div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">교도소장</div><div className="rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs font-black tracking-[0.22em] text-amber-50">WARDEN</div></div><ProfileCard member={WARDEN} large /><div className="mt-8 border-t border-white/10 pt-7"><div className="mb-5 flex items-center justify-between gap-4"><div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">수감생</div><div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black tracking-[0.22em] text-white/78">{PRISON_MEMBERS.length}명</div></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{PRISON_MEMBERS.map((member) => <ProfileCard key={member.nickname} member={member} />)}</div></div></div></section>;
}

function YoutubeCard({ item, shorts = false }) {
  return <a href={item.url} target="_blank" rel="noreferrer" className={`group overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.018))] shadow-[0_16px_38px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-red-200/24 hover:bg-white/[0.07] ${shorts ? 'max-w-[230px]' : ''}`}><div className={`relative overflow-hidden bg-black/30 ${shorts ? 'aspect-[9/16]' : 'aspect-video'}`}>{item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}<div className="absolute left-3 top-3 rounded-full border border-red-200/22 bg-red-500/18 px-3 py-1 text-xs font-black text-red-50">{item.member}</div>{shorts ? <div className="absolute right-3 top-3 rounded-full border border-white/14 bg-black/30 px-2.5 py-1 text-[10px] font-black text-white/86">SHORTS</div> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" /></div><div className="p-4"><div className="line-clamp-2 min-h-[48px] text-sm font-black leading-6 text-white">{item.title}</div><div className="mt-3 text-xs font-bold text-white/42">{item.channelTitle}</div></div></a>;
}

function RecentYoutubeSection() {
  const [activeTab, setActiveTab] = useState('videos');
  const [data, setData] = useState({ videos: [], shorts: [], loaded: false, missingKey: false });
  useEffect(() => { let mounted = true; const loadVideos = async () => { try { const res = await fetch('/api/prison-youtube'); const json = await res.json(); if (mounted) setData({ videos: json.videos || [], shorts: json.shorts || [], loaded: true, missingKey: Boolean(json.missingKey) }); } catch { if (mounted) setData({ videos: [], shorts: [], loaded: true, missingKey: false }); } }; loadVideos(); const timer = setInterval(loadVideos, 15 * 60 * 1000); return () => { mounted = false; clearInterval(timer); }; }, []);
  const list = activeTab === 'videos' ? data.videos : data.shorts;
  const isShortsTab = activeTab === 'shorts';
  return <section id="recent-youtube" className="mt-8 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] lg:p-8"><SectionTitle title="수용소 최근 유튜브" logo="▶" /><div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.13),transparent_28%),linear-gradient(180deg,rgba(14,12,18,0.98),rgba(5,7,11,0.99))] p-5 shadow-[0_22px_55px_rgba(0,0,0,0.34)] sm:p-7"><div className="mb-5 flex justify-end"><div className="flex gap-2 rounded-full border border-white/10 bg-black/24 p-1.5"><button onClick={() => setActiveTab('videos')} className={`rounded-full px-4 py-2 text-sm font-black transition ${activeTab === 'videos' ? 'bg-red-500/18 text-white' : 'text-white/55 hover:text-white'}`}>최신영상</button><button onClick={() => setActiveTab('shorts')} className={`rounded-full px-4 py-2 text-sm font-black transition ${activeTab === 'shorts' ? 'bg-red-500/18 text-white' : 'text-white/55 hover:text-white'}`}>최신쇼츠</button></div></div>{data.missingKey ? <div className="rounded-[24px] border border-amber-200/16 bg-amber-300/8 p-5 text-sm font-bold leading-7 text-amber-50/82">YouTube API 키가 아직 연결되지 않았습니다. Vercel 환경변수에 <span className="text-white">YOUTUBE_API_KEY</span>를 넣으면 자동으로 영상이 채워집니다.</div> : !data.loaded ? <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-white/58">유튜브 영상을 불러오는 중입니다.</div> : list.length ? <div className={isShortsTab ? 'grid justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-5' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'}>{list.map((item) => <YoutubeCard key={`${activeTab}-${item.id}`} item={item} shorts={isShortsTab} />)}</div> : <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-white/58">표시할 영상이 아직 없습니다.</div>}</div></section>;
}

export default function JangjisuPrisonPage() {
  return <><Head><title>장지수용소 모드 | 장지수용소 팬메이드</title><meta name="description" content="장지수용소 팬메이드 서브사이트" /></Head><div className="min-h-screen bg-[#05070c] text-white"><div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-slate-500/10 blur-3xl" /><div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-amber-500/8 blur-3xl" /><div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" /></div><header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8"><a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.07] hover:border-white/25"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a><nav className="flex flex-wrap items-center justify-end gap-3"><NavChip href="/" label="SOU 메인" icon="↩" /><NavChip href="#members" label="멤버표" icon="🪪" /><NavChip href="#schedule" label="일정표" icon="⛓️" tone="warm" /><NavChip href="#recent-youtube" label="최근 유튜브" icon="▶" /><NavChip href="/jangjisu-prison/crews" label="종겜 크루 목록" icon="📋" /></nav></div></header><main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8"><section className="overflow-hidden rounded-[36px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.36)]" aria-label="장지수용소 대문"><div className="relative min-h-[360px] overflow-hidden sm:min-h-[460px] lg:min-h-[560px]"><img src="/jangjisu-prison-hero.png" alt="장지수용소" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_48%),linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.10)_58%,rgba(5,7,12,0.48))]" /><div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#05070c] to-transparent" /></div></section><MemberBoardPreview /><CalendarPreview /><RecentYoutubeSection /></main></div></>;
}

import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const CATEGORY_LABELS = {
  soop: '숲 종겜 크루',
  gamcom: '감컴 종겜 크루',
};

const FALLBACK_CREW_GROUPS = [
  { name: '사자회', category: 'soop', categoryLabel: CATEGORY_LABELS.soop, members: ['춘봉', '필메', '추르미', '또니', '쏭아야', '오봉구', '상득', '뚜닝', '채하', '차투리', '달묘', '오늘님', '쿠아', '감초'] },
  { name: '오락실', category: 'gamcom', categoryLabel: CATEGORY_LABELS.gamcom, members: ['오아'] },
].map((crew, index) => ({
  ...crew,
  members: crew.members.map((nickname, memberIndex) => ({ nickname, role: memberIndex === 0 ? 'leader' : 'member', stationUrl: '' })),
  leader: { nickname: crew.members[0], role: 'leader', stationUrl: '' },
  accentIndex: index,
}));

const CREW_MEMBER_RENAMES = {
  어인섬: {
    거밍챠: '차밍챠',
  },
};

const MANUAL_CREW_UPDATES = {
  버컴퍼니: {
    category: 'soop',
    categoryLabel: CATEGORY_LABELS.soop,
    members: [
      { nickname: '바밍', stationUrl: 'https://www.sooplive.com/station/qweasd3456' },
      { nickname: '킹냥이', stationUrl: 'https://www.sooplive.com/station/sa5791' },
      { nickname: '앙또', stationUrl: 'https://www.sooplive.com/station/aangdoxx' },
      { nickname: '설이', stationUrl: 'https://www.sooplive.com/station/mini8282' },
    ],
  },
  뚱딴지: {
    category: 'soop',
    categoryLabel: CATEGORY_LABELS.soop,
    leader: { nickname: '아뚱', stationUrl: 'https://www.sooplive.com/station/gjstn7637' },
    members: [
      { nickname: '니니밍', stationUrl: 'https://www.sooplive.com/station/niniming' },
    ],
  },
  버인협회: {
    category: 'soop',
    categoryLabel: CATEGORY_LABELS.soop,
    members: [
      { nickname: '두두지', stationUrl: 'https://www.sooplive.com/station/dduduji' },
    ],
  },
  로스타시티: {
    category: 'soop',
    categoryLabel: CATEGORY_LABELS.soop,
    members: [
      { nickname: '은초롱', stationUrl: 'https://www.sooplive.com/station/eunchr' },
      { nickname: '리피피', stationUrl: 'https://www.sooplive.com/station/haeri001' },
      { nickname: '쥬멩이', stationUrl: 'https://www.sooplive.com/station/ju010228' },
      { nickname: '냐르', stationUrl: 'https://www.sooplive.com/station/love0610' },
      { nickname: '푸릉', stationUrl: 'https://www.sooplive.com/station/hunhunforce' },
      { nickname: '별이쓰', stationUrl: 'https://www.sooplive.com/station/nsvs311' },
      { nickname: '너구리아', stationUrl: 'https://www.sooplive.com/station/vnuguria' },
      { nickname: '한비', stationUrl: 'https://www.sooplive.com/station/imhanbily' },
      { nickname: '아르르', stationUrl: 'https://www.sooplive.com/station/cosmicaaarrr' },
      { nickname: '삭비', stationUrl: 'https://www.sooplive.com/station/sakbi1' },
      { nickname: '푸마고치', stationUrl: 'https://www.sooplive.com/station/fumagochi' },
      { nickname: '찐랑', stationUrl: 'https://www.sooplive.com/station/phs6162' },
      { nickname: '이투', stationUrl: 'https://www.sooplive.com/station/etwo22' },
      { nickname: '루디딕', stationUrl: 'https://www.sooplive.com/station/mnomno55' },
    ],
  },
};

const CARD_THEMES = [
  'from-cyan-300/12 via-slate-200/5 to-transparent',
  'from-rose-300/12 via-slate-200/5 to-transparent',
  'from-amber-300/12 via-slate-200/5 to-transparent',
  'from-violet-300/12 via-slate-200/5 to-transparent',
  'from-emerald-300/12 via-slate-200/5 to-transparent',
  'from-sky-300/12 via-slate-200/5 to-transparent',
];

function displayNickname(nickname = '') {
  return String(nickname).replace(/\s*\(거미\)\s*/g, '').trim();
}

function normalizeName(value = '') {
  return String(value).replace(/\s+/g, '').trim();
}

function renameMemberForCrew(crewName = '', nickname = '') {
  const clean = displayNickname(nickname);
  return CREW_MEMBER_RENAMES[crewName]?.[clean] || clean;
}

function extractStationId(url = '') {
  const matched = String(url || '').match(/sooplive\.(?:com|co\.kr)\/station\/([^/?#]+)/i);
  return matched?.[1]?.toLowerCase() || '';
}

function buildProfileImages(stationUrl = '') {
  const id = extractStationId(stationUrl);
  if (!id) return [];
  const prefix = id.slice(0, 2).toLowerCase();
  return [
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/${id}.jpg`,
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/m/${id}.webp`,
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/${id}.webp`,
    `https://stimg.sooplive.com/LOGO/${prefix}/${id}/m/${id}.jpg`,
  ];
}

function normalizeMember(member = {}, index = 0, crewName = '') {
  const stationUrl = member.stationUrl || '';
  const profileImages = member.profileImages?.length ? member.profileImages : buildProfileImages(stationUrl);
  return {
    ...member,
    nickname: renameMemberForCrew(crewName, member.nickname || ''),
    role: member.role || (index === 0 ? 'leader' : 'member'),
    stationUrl,
    profileImage: member.profileImage || profileImages[0] || '',
    profileImages,
  };
}

function dedupeMembers(members = [], crewName = '') {
  const seen = new Set();
  const result = [];
  members.forEach((member, index) => {
    const normalized = normalizeMember(member, index, crewName);
    const key = extractStationId(normalized.stationUrl) || normalizeName(normalized.nickname);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push({ ...normalized, role: result.length === 0 ? 'leader' : normalized.role === 'leader' ? 'member' : normalized.role });
  });
  return result;
}

function applyManualCrewUpdates(crews = []) {
  const crewMap = new Map(crews.map((crew) => [crew.name, { ...crew, members: [...(crew.members || [])] }]));

  Object.entries(MANUAL_CREW_UPDATES).forEach(([crewName, update]) => {
    const crew = crewMap.get(crewName) || {
      name: crewName,
      category: update.category || 'soop',
      categoryLabel: update.categoryLabel || CATEGORY_LABELS.soop,
      members: [],
    };

    if (update.leader) {
      const existingWithoutLeader = crew.members.filter((member) => normalizeName(member.nickname) !== normalizeName(update.leader.nickname) && extractStationId(member.stationUrl) !== extractStationId(update.leader.stationUrl));
      crew.members = [{ ...update.leader, role: 'leader' }, ...existingWithoutLeader];
    }

    const additions = (update.members || []).map((member) => ({ ...member, role: 'member' }));
    crew.members = dedupeMembers([...(crew.members || []), ...additions], crewName);
    crew.leader = crew.members[0] || null;
    crew.count = Math.max(crew.count || 0, crew.members.length);
    crew.category = crew.category || update.category || 'soop';
    crew.categoryLabel = crew.categoryLabel || update.categoryLabel || CATEGORY_LABELS[crew.category] || '종겜 크루';
    crewMap.set(crewName, crew);
  });

  return Array.from(crewMap.values()).map((crew, index) => {
    const members = dedupeMembers(crew.members || [], crew.name);
    return {
      ...crew,
      members,
      leader: members[0] || null,
      count: Math.max(crew.count || 0, members.length),
      accentIndex: index,
    };
  });
}

function formatUpdatedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function NavButton({ href, children }) {
  return <a href={href} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] px-4 py-2 text-sm font-bold text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white">{children}</a>;
}

function FilterButton({ active, onClick, children, strong = false }) {
  return <button onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_22px_rgba(0,0,0,0.18)] transition ${active ? 'bg-[linear-gradient(180deg,rgba(245,158,11,0.22),rgba(255,255,255,0.055))] text-amber-50 shadow-[0_0_26px_rgba(245,158,11,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]' : strong ? 'bg-cyan-300/8 text-cyan-50/78 hover:bg-cyan-300/12 hover:text-white' : 'bg-white/[0.045] text-white/64 hover:bg-white/[0.075] hover:text-white'}`}>{children}</button>;
}

function StatPill({ label, crewCount, memberCount }) {
  return <div className="group relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.085),rgba(255,255,255,0.026))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_42px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(0,0,0,0.30)]"><div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.13),transparent_58%)] opacity-70 transition group-hover:opacity-100" /><div className="relative text-[15px] font-black tracking-[0.24em] text-white/52">{label}</div><div className="relative mt-1 text-[30px] font-black tracking-tight text-white sm:text-[34px]">{crewCount}개 크루 · {memberCount}명</div></div>;
}

function Avatar({ member, leader = false }) {
  const [imageIndex, setImageIndex] = useState(0);
  const profileImages = member?.profileImages?.length ? member.profileImages : (member?.profileImage ? [member.profileImage] : []);
  const profileImage = profileImages[imageIndex] || '';
  const sizeClass = leader ? 'h-24 w-24 text-2xl' : 'h-20 w-20 text-xl';
  const name = displayNickname(member?.nickname || '?');
  if (profileImage) return <img src={profileImage} alt={name} onError={() => setImageIndex((prev) => prev + 1)} className={`${sizeClass} mx-auto rounded-full object-cover shadow-[0_14px_30px_rgba(0,0,0,0.34),0_0_18px_rgba(103,232,249,0.06)]`} />;
  return <div className={`${sizeClass} mx-auto flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(255,255,255,0.075)_55%,rgba(255,255,255,0.02)_78%)] font-black text-white shadow-[0_14px_30px_rgba(0,0,0,0.34)]`}>{name.slice(0, 1)}</div>;
}

function SoopButton({ stationUrl, large = false }) {
  const baseClass = `${large ? 'h-12 w-16' : 'h-11 w-14'} inline-flex items-center justify-center rounded-2xl px-2 transition duration-300`;
  const icon = <img src="/soop-logo.svg" alt="SOOP 방송국" className={`${large ? 'h-8 w-11' : 'h-7 w-10'} block object-contain`} />;
  if (!stationUrl) return <span className={`${baseClass} pointer-events-none bg-cyan-300/8 opacity-30 grayscale`} title="방송국 링크 준비중">{icon}</span>;
  return <a href={stationUrl} target="_blank" rel="noreferrer" aria-label="SOOP 방송국" title="SOOP 방송국" className={`${baseClass} bg-cyan-300/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_10px_24px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:scale-[1.05] hover:bg-cyan-300/18 hover:shadow-[0_14px_32px_rgba(34,211,238,0.12)]`}>{icon}</a>;
}

function MemberBlock({ member, leader = false }) {
  return <div className="text-center"><Avatar member={member} leader={leader} /><div className={`${leader ? 'text-[22px]' : 'text-[17px]'} mt-3 break-keep font-black leading-snug text-white`}>{displayNickname(member.nickname)}</div><div className="mt-3 flex justify-center"><SoopButton stationUrl={member.stationUrl} large={leader} /></div></div>;
}

function CrewCard({ crew }) {
  const glow = CARD_THEMES[crew.accentIndex % CARD_THEMES.length];
  const leader = crew.leader || crew.members[0];
  const normalMembers = crew.members.filter((member, index) => index !== 0);

  return <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,rgba(14,18,27,0.98),rgba(6,8,13,0.99))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_22px_58px_rgba(0,0,0,0.34),0_0_44px_rgba(103,232,249,0.035)] transition duration-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.075),0_28px_74px_rgba(0,0,0,0.42),0_0_52px_rgba(103,232,249,0.065)]">
    <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${glow}`} />
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-[30px] font-black tracking-tight text-white">{crew.name}</h2><span className="rounded-full bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">수장 {displayNickname(leader?.nickname || '-')}</span><span className="rounded-full bg-white/[0.055] px-3 py-1 text-xs font-black text-white/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">{crew.categoryLabel || CATEGORY_LABELS[crew.category] || '종겜 크루'}</span></div>
      <div className="w-fit rounded-full bg-white/[0.055] px-4 py-2 text-sm font-black text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_24px_rgba(0,0,0,0.18)]">총 {crew.members.length}명</div>
    </div>
    <div className="relative mt-5 grid gap-4 lg:grid-cols-[190px_1fr]">
      <div className="rounded-[26px] bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(255,255,255,0.025))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_16px_34px_rgba(0,0,0,0.22)] transition duration-300 hover:bg-amber-200/10 hover:shadow-[0_18px_40px_rgba(245,158,11,0.10)]">
        <MemberBlock member={leader || { nickname: '?' }} leader />
        <div className="mt-3 inline-flex rounded-full bg-amber-200/10 px-3 py-1 text-[11px] font-black text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">CREW LEADER</div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {normalMembers.map((member) => <div key={`${crew.name}-${member.nickname}-${member.stationUrl}`} className="rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_14px_30px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-white/[0.07] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_38px_rgba(0,0,0,0.26),0_0_22px_rgba(103,232,249,0.055)]"><MemberBlock member={member} /></div>)}
      </div>
    </div>
  </section>;
}

export default function JangjisuPrisonCrewsPage() {
  const [selected, setSelected] = useState({ category: 'soop', crew: null });
  const [crewGroups, setCrewGroups] = useState(() => applyManualCrewUpdates(FALLBACK_CREW_GROUPS));
  const [sheetState, setSheetState] = useState({ loaded: false, source: 'fallback', updatedAt: '', categoryStats: {} });

  useEffect(() => {
    let mounted = true;
    const loadCrews = async () => {
      try {
        const res = await fetch('/api/crew-sheet');
        const json = await res.json();
        if (!mounted) return;
        if (Array.isArray(json.crews) && json.crews.length) {
          setCrewGroups(applyManualCrewUpdates(json.crews).map((crew, index) => ({ ...crew, accentIndex: index })));
          setSheetState({ loaded: true, source: json.source || 'google-sheet', updatedAt: json.updatedAt || new Date().toISOString(), categoryStats: json.categoryStats || {} });
        } else {
          setSheetState({ loaded: true, source: 'fallback', updatedAt: new Date().toISOString(), categoryStats: {} });
        }
      } catch {
        if (mounted) setSheetState({ loaded: true, source: 'fallback', updatedAt: new Date().toISOString(), categoryStats: {} });
      }
    };
    loadCrews();
    return () => { mounted = false; };
  }, []);

  const categoryStats = useMemo(() => {
    const make = (category) => {
      const crews = crewGroups.filter((crew) => crew.category === category);
      return { label: CATEGORY_LABELS[category], crewCount: crews.length, memberCount: crews.reduce((sum, crew) => sum + crew.members.length, 0) };
    };
    return { soop: make('soop'), gamcom: make('gamcom') };
  }, [crewGroups]);

  const visibleCrews = useMemo(() => crewGroups.filter((crew) => crew.category === selected.category && (!selected.crew || crew.name === selected.crew)), [selected, crewGroups]);
  const soopCrews = crewGroups.filter((crew) => crew.category === 'soop');
  const gamcomCrews = crewGroups.filter((crew) => crew.category === 'gamcom');
  const updatedAtText = sheetState.loaded ? formatUpdatedAt(sheetState.updatedAt) : '';

  return <>
    <Head><title>종겜 크루 목록 | 장지수용소 팬메이드</title><meta name="description" content="장지수용소 종겜 크루 목록" /></Head>
    <div className="min-h-screen bg-[#05070c] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-slate-500/10 blur-3xl" /><div className="absolute top-16 right-[-70px] h-80 w-80 rounded-full bg-amber-500/8 blur-3xl" /><div className="absolute bottom-0 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" /></div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8"><a href="/jangjisu-prison" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.07] hover:border-white/25"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a><div className="flex-1 px-4 text-center text-[28px] font-black tracking-tight text-white">종겜 크루 목록</div><nav className="flex flex-wrap items-center justify-end gap-3"><NavButton href="/jangjisu-prison">↩ 장지수용소 홈</NavButton><NavButton href="/">SOU 메인</NavButton></nav></div></header>
      <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-4 flex justify-end"><div className="rounded-full bg-white/[0.055] px-4 py-2 text-xs font-black text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_12px_24px_rgba(0,0,0,0.16)]">{updatedAtText ? `${updatedAtText} 갱신` : '갱신 확인중'}</div></div>
        <section className="mb-7 grid gap-4 lg:grid-cols-2"><StatPill {...categoryStats.soop} /><StatPill {...categoryStats.gamcom} /></section>
        <section className="mb-7 rounded-[28px] bg-black/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_42px_rgba(0,0,0,0.20)]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><FilterButton strong active={selected.category === 'soop' && !selected.crew} onClick={() => setSelected({ category: 'soop', crew: null })}>숲 종겜 크루 전체보기</FilterButton>{soopCrews.map((crew) => <FilterButton key={`soop-${crew.name}`} active={selected.category === 'soop' && selected.crew === crew.name} onClick={() => setSelected({ category: 'soop', crew: crew.name })}>{crew.name}</FilterButton>)}</div>
            <div className="h-px bg-white/8" />
            <div className="flex flex-wrap gap-2"><FilterButton strong active={selected.category === 'gamcom' && !selected.crew} onClick={() => setSelected({ category: 'gamcom', crew: null })}>감컴 종겜 크루 전체보기</FilterButton>{gamcomCrews.map((crew) => <FilterButton key={`gamcom-${crew.name}`} active={selected.category === 'gamcom' && selected.crew === crew.name} onClick={() => setSelected({ category: 'gamcom', crew: crew.name })}>{crew.name}</FilterButton>)}</div>
          </div>
        </section>
        <section className="grid gap-6">{visibleCrews.map((crew) => <CrewCard key={`${crew.category}-${crew.name}`} crew={crew} />)}</section>
      </main>
    </div>
  </>;
}

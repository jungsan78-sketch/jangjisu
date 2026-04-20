import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const FALLBACK_CREW_GROUPS = [
  { name: '사자회', category: 'soop', categoryLabel: '숲 종겜 크루', members: ['춘봉', '필메', '추르미', '또니', '쏭아야', '오봉구', '상득', '뚜닝', '채하', '차투리', '달묘', '오늘님', '쿠아', '감초'] },
  { name: '오락실', category: 'gamcom', categoryLabel: '감컴 종겜 크루', members: ['오아'] },
].map((crew, index) => ({
  ...crew,
  members: crew.members.map((nickname, memberIndex) => ({ nickname, role: memberIndex === 0 ? 'leader' : 'member' })),
  leader: { nickname: crew.members[0], role: 'leader' },
  accentIndex: index,
}));

const CATEGORY_LABELS = {
  soop: '숲 종겜 크루',
  gamcom: '감컴 종겜 크루',
};

const CARD_THEMES = [
  'from-cyan-300/12 via-slate-200/5 to-transparent',
  'from-rose-300/12 via-slate-200/5 to-transparent',
  'from-amber-300/12 via-slate-200/5 to-transparent',
  'from-violet-300/12 via-slate-200/5 to-transparent',
  'from-emerald-300/12 via-slate-200/5 to-transparent',
  'from-sky-300/12 via-slate-200/5 to-transparent',
];

function NavButton({ href, children }) {
  return <a href={href} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] px-4 py-2 text-sm font-bold text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/10 hover:text-white">{children}</a>;
}

function FilterButton({ active, onClick, children, strong = false }) {
  return <button onClick={onClick} className={`rounded-full border px-4 py-2 text-sm font-black transition ${active ? 'border-amber-200/35 bg-[linear-gradient(180deg,rgba(245,158,11,0.20),rgba(255,255,255,0.055))] text-amber-50 shadow-[0_0_26px_rgba(245,158,11,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]' : strong ? 'border-cyan-200/18 bg-cyan-300/8 text-cyan-50/78 hover:border-cyan-100/25 hover:bg-cyan-300/12 hover:text-white' : 'border-white/10 bg-white/[0.045] text-white/64 hover:border-white/18 hover:bg-white/[0.075] hover:text-white'}`}>{children}</button>;
}

function StatPill({ label, crewCount, memberCount }) {
  return <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"><div className="text-xs font-black tracking-[0.26em] text-white/38">{label}</div><div className="mt-1 text-[24px] font-black text-white">{crewCount}개 크루 · {memberCount}명</div></div>;
}

function Avatar({ member, leader = false }) {
  const [imageIndex, setImageIndex] = useState(0);
  const profileImages = member?.profileImages?.length ? member.profileImages : (member?.profileImage ? [member.profileImage] : []);
  const profileImage = profileImages[imageIndex] || '';
  const sizeClass = leader ? 'h-24 w-24 text-2xl' : 'h-20 w-20 text-xl';
  if (profileImage) {
    return <img src={profileImage} alt={member.nickname} onError={() => setImageIndex((prev) => prev + 1)} className={`${sizeClass} mx-auto rounded-full border border-white/10 object-cover shadow-[0_12px_26px_rgba(0,0,0,0.26)]`} />;
  }
  return <div className={`${sizeClass} mx-auto flex items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(255,255,255,0.075)_55%,rgba(255,255,255,0.02)_78%)] font-black text-white shadow-[0_12px_26px_rgba(0,0,0,0.26)]`}>{String(member?.nickname || '?').slice(0, 1)}</div>;
}

function SoopButton({ stationUrl, large = false }) {
  const baseClass = `${large ? 'h-12 w-16' : 'h-11 w-15'} inline-flex items-center justify-center rounded-2xl border px-2 transition duration-300`;
  const icon = <img src="/soop-logo.svg" alt="SOOP 방송국" className={`${large ? 'max-h-8 max-w-[44px]' : 'max-h-7 max-w-[40px]'} -translate-x-0.5 object-contain`} />;
  if (!stationUrl) return <span className={`${baseClass} pointer-events-none border-cyan-200/10 bg-white/[0.035] opacity-25 grayscale`} title="방송국 링크 준비중">{icon}</span>;
  return <a href={stationUrl} target="_blank" rel="noreferrer" aria-label="SOOP 방송국" title="SOOP 방송국" className={`${baseClass} border-cyan-200/20 bg-cyan-300/10 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-cyan-100/42`}>{icon}</a>;
}

function MemberBlock({ member, leader = false }) {
  return <div className="text-center">
    <Avatar member={member} leader={leader} />
    <div className={`${leader ? 'text-[22px]' : 'text-[17px]'} mt-3 break-keep font-black leading-snug text-white`}>{member.nickname}</div>
    <div className="mt-3 flex justify-center"><SoopButton stationUrl={member.stationUrl} large={leader} /></div>
  </div>;
}

function CrewCard({ crew }) {
  const glow = CARD_THEMES[crew.accentIndex % CARD_THEMES.length];
  const leader = crew.leader || crew.members[0];
  const normalMembers = crew.members.filter((member, index) => index !== 0);

  return <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,27,0.98),rgba(6,8,13,0.99))] p-5 shadow-[0_20px_54px_rgba(0,0,0,0.32)]">
    <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${glow}`} />
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-[30px] font-black tracking-tight text-white">{crew.name}</h2><span className="rounded-full border border-amber-200/18 bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100">수장 {leader?.nickname || '-'}</span><span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-white/52">{crew.categoryLabel || CATEGORY_LABELS[crew.category] || '종겜 크루'}</span></div>
      <div className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-black text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">총 {crew.members.length}명</div>
    </div>
    <div className="relative mt-5 grid gap-4 lg:grid-cols-[190px_1fr]">
      <div className="rounded-[26px] border border-amber-200/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(255,255,255,0.025))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
        <MemberBlock member={leader || { nickname: '?' }} leader />
        <div className="mt-3 inline-flex rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-[11px] font-black text-amber-100">CREW LEADER</div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {normalMembers.map((member) => <div key={`${crew.name}-${member.nickname}`} className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-300 hover:-translate-y-1 hover:border-white/16 hover:bg-white/[0.065]"><MemberBlock member={member} /></div>)}
      </div>
    </div>
  </section>;
}

export default function JangjisuPrisonCrewsPage() {
  const [selected, setSelected] = useState({ category: 'soop', crew: null });
  const [crewGroups, setCrewGroups] = useState(FALLBACK_CREW_GROUPS);
  const [sheetState, setSheetState] = useState({ loaded: false, source: 'fallback', categoryStats: {} });

  useEffect(() => {
    let mounted = true;
    const loadCrews = async () => {
      try {
        const res = await fetch('/api/crew-sheet');
        const json = await res.json();
        if (!mounted) return;
        if (Array.isArray(json.crews) && json.crews.length) {
          setCrewGroups(json.crews.map((crew, index) => ({ ...crew, accentIndex: index })));
          setSheetState({ loaded: true, source: json.source || 'google-sheet', categoryStats: json.categoryStats || {} });
        } else {
          setSheetState({ loaded: true, source: 'fallback', categoryStats: {} });
        }
      } catch {
        if (mounted) setSheetState({ loaded: true, source: 'fallback', categoryStats: {} });
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
    return { soop: sheetState.categoryStats?.soop || make('soop'), gamcom: sheetState.categoryStats?.gamcom || make('gamcom') };
  }, [crewGroups, sheetState.categoryStats]);

  const visibleCrews = useMemo(() => crewGroups.filter((crew) => crew.category === selected.category && (!selected.crew || crew.name === selected.crew)), [selected, crewGroups]);
  const soopCrews = crewGroups.filter((crew) => crew.category === 'soop');
  const gamcomCrews = crewGroups.filter((crew) => crew.category === 'gamcom');

  return <>
    <Head><title>종겜 크루 목록 | 장지수용소 팬메이드</title><meta name="description" content="장지수용소 종겜 크루 목록" /></Head>
    <div className="min-h-screen bg-[#05070c] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-slate-500/10 blur-3xl" /><div className="absolute top-16 right-[-70px] h-80 w-80 rounded-full bg-amber-500/8 blur-3xl" /><div className="absolute bottom-0 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" /></div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8"><a href="/jangjisu-prison" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.07] hover:border-white/25"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a><div className="flex-1 px-4 text-center text-[28px] font-black tracking-tight text-white">종겜 크루 목록</div><nav className="flex flex-wrap items-center justify-end gap-3"><NavButton href="/jangjisu-prison">↩ 장지수용소 홈</NavButton><NavButton href="/">S SOU 메인</NavButton></nav></div></header>
      <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="mb-7 grid gap-4 lg:grid-cols-2"><StatPill {...categoryStats.soop} /><StatPill {...categoryStats.gamcom} /></section>
        <section className="mb-7 rounded-[28px] border border-white/10 bg-black/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
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

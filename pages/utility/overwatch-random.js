import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sou:overwatch-random:v4';

const POSITION_META = {
  tank: { label: '탱커', icon: '🛡️', ring: 'border-sky-300/30', badge: 'border-sky-300/35 bg-sky-300/12 text-sky-100' },
  dps: { label: '딜러', icon: '⚔️', ring: 'border-orange-300/30', badge: 'border-orange-300/35 bg-orange-300/12 text-orange-100' },
  support: { label: '힐러', icon: '💚', ring: 'border-emerald-300/30', badge: 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100' },
  random: { label: '랜덤', icon: '❓', ring: 'border-violet-300/30', badge: 'border-violet-300/35 bg-violet-300/12 text-violet-100' },
};

const TEAM_ACCENTS = [
  { border: 'border-sky-300/24', glow: 'bg-sky-400/10', badge: 'border-sky-300/35 bg-sky-300/12 text-sky-100' },
  { border: 'border-rose-300/24', glow: 'bg-rose-400/10', badge: 'border-rose-300/35 bg-rose-300/12 text-rose-100' },
  { border: 'border-emerald-300/24', glow: 'bg-emerald-400/10', badge: 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100' },
  { border: 'border-violet-300/24', glow: 'bg-violet-400/10', badge: 'border-violet-300/35 bg-violet-300/12 text-violet-100' },
  { border: 'border-amber-300/24', glow: 'bg-amber-400/10', badge: 'border-amber-300/35 bg-amber-300/12 text-amber-100' },
];

const KNOWN_MEMBER_PROFILES = [
  { nickname: '장지수', profileImage: 'https://stimg.sooplive.com/LOGO/ia/iamquaddurup/iamquaddurup.jpg' },
  { nickname: '냥냥두둥', profileImage: 'https://stimg.sooplive.com/LOGO/do/doodong/doodong.jpg' },
  { nickname: '치치', profileImage: 'https://stimg.sooplive.com/LOGO/lo/lomioeov/m/lomioeov.webp' },
  { nickname: '시몽', profileImage: 'https://stimg.sooplive.com/LOGO/xi/ximong/ximong.jpg' },
  { nickname: '유오늘', profileImage: 'https://stimg.sooplive.com/LOGO/yo/youoneul/youoneul.jpg' },
  { nickname: '아야네세나', profileImage: 'https://stimg.sooplive.com/LOGO/ay/ayanesena/ayanesena.jpg' },
  { nickname: '포포', profileImage: 'https://stimg.sooplive.com/LOGO/su/sunza1122/sunza1122.jpg' },
  { nickname: '채니', profileImage: 'https://stimg.sooplive.com/LOGO/k1/k1baaa/k1baaa.jpg' },
  { nickname: '코로미', profileImage: 'https://stimg.sooplive.com/LOGO/bx/bxroong/bxroong.jpg' },
  { nickname: '구월이', profileImage: 'https://stimg.sooplive.com/LOGO/is/isq1158/isq1158.jpg' },
  { nickname: '린링', profileImage: 'https://stimg.sooplive.com/LOGO/mi/mini1212/mini1212.jpg' },
  { nickname: '띠꾸', profileImage: 'https://stimg.sooplive.com/LOGO/dd/ddikku0714/ddikku0714.jpg' },
];

const MAP_POOL = ['부산', '리장 타워', '일리오스', '왕의 길', '할리우드', '눔바니', '66번 국도', '감시 기지: 지브롤터', '서킷 로얄', '파라이소'];
const FIELD_CLASS = 'h-11 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-sm font-bold text-white outline-none placeholder:text-white/34 focus:border-cyan-300/38';

function normalizeName(value = '') {
  return String(value).replace(/[👑🦁⭐★☆✅✔️☑️🏆🥇🥈🥉🔥💎🎖️]/g, '').replace(/\s+/g, '').trim();
}

function getRoleTemplate(mode) {
  return mode === '6v6'
    ? ['탱커1', '탱커2', '딜러1', '딜러2', '힐러1', '힐러2']
    : ['탱커', '딜러1', '딜러2', '힐러1', '힐러2'];
}

function getRoleType(role) {
  if (role.startsWith('탱')) return 'tank';
  if (role.startsWith('딜')) return 'dps';
  if (role.startsWith('힐')) return 'support';
  return 'random';
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function readSavedState() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeSavedState(payload) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
}

function PlayerCard({ item, profile, size = 'large', faded = false, draggable = false, onDragStart, onDragEnd, onClick, onRemove, locked = false, onToggleLock }) {
  const meta = POSITION_META[item.position] || POSITION_META.random;
  const [failed, setFailed] = useState(false);
  const src = !failed && profile?.profileImage ? profile.profileImage : '';
  const compact = size === 'small';
  const cardSize = compact ? 'w-[112px] min-h-[122px] p-2.5' : 'w-[132px] min-h-[146px] p-3';
  const imageSize = compact ? 'h-14 w-14' : 'h-16 w-16';

  return (
    <button
      type="button"
      draggable={draggable && !locked}
      onDragStart={locked ? undefined : onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group relative flex ${cardSize} flex-col items-center justify-start rounded-[22px] border ${locked ? 'border-amber-300/45 bg-amber-300/[0.08]' : meta.ring} bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-white/24 hover:bg-white/[0.075] ${faded ? 'opacity-38 saturate-50' : ''} ${locked ? 'cursor-pointer' : draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      {onToggleLock ? (
        <span onClick={(e) => { e.stopPropagation(); onToggleLock(); }} className={`absolute right-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-[11px] font-black transition ${locked ? 'border-amber-200/45 bg-amber-300/20 text-amber-100' : 'border-white/10 bg-black/35 text-white/50 hover:text-white'}`}>{locked ? '🔒' : '🔓'}</span>
      ) : null}
      {onRemove ? <span onClick={(e) => { e.stopPropagation(); onRemove(item.name); }} className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/35 text-xs text-white/58 opacity-0 transition hover:text-white group-hover:opacity-100">×</span> : null}
      <div className={`${imageSize} mt-1 overflow-hidden rounded-full border border-white/12 bg-black/22 shadow-[0_8px_18px_rgba(0,0,0,0.28)]`}>
        {src ? <img src={src} alt={item.name} onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),rgba(255,255,255,0.015)_62%,transparent)]" />}
      </div>
      <div className={`${compact ? 'mt-2 text-[15px]' : 'mt-3 text-[17px]'} max-w-full truncate font-black leading-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.28)]`}>{item.name}</div>
      <div className={`mt-2 rounded-full border px-2.5 py-1 text-[11px] font-black ${locked ? 'border-amber-200/35 bg-amber-300/12 text-amber-100' : meta.badge}`}>{locked ? '잠금' : `${meta.icon} ${meta.label}`}</div>
    </button>
  );
}

function EmptySlot({ role, onDrop, active }) {
  const type = getRoleType(role);
  const meta = POSITION_META[type] || POSITION_META.random;
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`flex w-[112px] min-h-[122px] flex-col items-center justify-center rounded-[22px] border ${active ? 'border-cyan-300/38 bg-cyan-300/10' : 'border-white/8 bg-white/[0.022]'} transition`}
    >
      <div className="h-14 w-14 rounded-full border border-white/8 bg-white/[0.03]" />
      <div className="mt-2 text-[11px] font-black text-white/30">{role}</div>
      <div className={`mt-2 rounded-full border px-2 py-0.5 text-[10px] font-black ${meta.badge}`}>{meta.label}</div>
    </div>
  );
}

function MoveMenu({ target, teams, currentTeam, onClose, onMoveToLobby, onMoveToTeam, onSwap }) {
  if (!target) return null;
  const otherPlayers = teams.flatMap((team) => team.players.map((player) => ({ ...player, teamNo: team.teamNo }))).filter((player) => player.id !== target.item.id);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/64 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-[28px] border border-white/12 bg-[#090e18] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.55)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs font-black tracking-[0.28em] text-cyan-100/55">PLAYER MOVE</div>
            <div className="mt-2 text-2xl font-black text-white">{target.item.name} 이동</div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-white/60 hover:text-white">닫기</button>
        </div>
        <div className="mt-4 grid gap-2">
          {currentTeam ? <button onClick={onMoveToLobby} className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-left text-sm font-black text-white hover:bg-white/10">대기실로 보내기</button> : null}
          {teams.map((team) => (
            <button key={team.teamNo} onClick={() => onMoveToTeam(team.teamNo)} className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-left text-sm font-black text-white hover:bg-white/10">TEAM {team.teamNo}로 이동</button>
          ))}
        </div>
        {otherPlayers.length ? <>
          <div className="mt-5 text-sm font-black text-white/60">교체</div>
          <div className="mt-2 grid max-h-[260px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {otherPlayers.map((player) => <button key={player.id} onClick={() => onSwap(player)} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left text-sm font-black text-white/86 hover:bg-white/10">TEAM {player.teamNo} · {player.name}</button>)}
          </div>
        </> : null}
      </div>
    </div>
  );
}

export default function OverwatchRandomPage() {
  const [teamCount, setTeamCount] = useState(2);
  const [mode, setMode] = useState('5v5');
  const [nameInput, setNameInput] = useState('');
  const [positionInput, setPositionInput] = useState('random');
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [slotLocks, setSlotLocks] = useState({});
  const [currentMap, setCurrentMap] = useState('');
  const [profileMap, setProfileMap] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);

  const roles = useMemo(() => getRoleTemplate(mode), [mode]);
  const assignedNames = useMemo(() => new Set(Object.values(assignments).filter(Boolean)), [assignments]);
  const lobbyPlayers = useMemo(() => participants.filter((item) => !assignedNames.has(item.name)), [participants, assignedNames]);
  const getProfile = (name) => profileMap[normalizeName(name)] || null;

  const teams = useMemo(() => Array.from({ length: teamCount }, (_, i) => {
    const teamNo = i + 1;
    const players = roles.map((role) => {
      const slotKey = `${teamNo}-${role}`;
      const name = assignments[slotKey];
      const item = name ? participants.find((p) => p.name === name) : null;
      return item ? { ...item, role, slotKey } : null;
    }).filter(Boolean);
    return { teamNo, players };
  }), [teamCount, roles, assignments, participants]);

  useEffect(() => {
    const saved = readSavedState();
    if (saved) {
      if (Number(saved.teamCount) >= 2 && Number(saved.teamCount) <= 10) setTeamCount(Number(saved.teamCount));
      if (saved.mode === '5v5' || saved.mode === '6v6') setMode(saved.mode);
      if (Array.isArray(saved.participants)) setParticipants(saved.participants.filter((item) => item?.name && item?.position).map((item, index) => ({ ...item, id: item.id || `saved-${index}-${item.name}` })));
      if (saved.assignments && typeof saved.assignments === 'object') setAssignments(saved.assignments);
      if (saved.slotLocks && typeof saved.slotLocks === 'object') setSlotLocks(saved.slotLocks);
      if (typeof saved.currentMap === 'string') setCurrentMap(saved.currentMap);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const baseMap = {};
    KNOWN_MEMBER_PROFILES.forEach((member) => { baseMap[normalizeName(member.nickname)] = member; });
    setProfileMap(baseMap);
    let mounted = true;
    const loadProfiles = async () => {
      try {
        const res = await fetch('/api/crew-sheet');
        const json = await res.json();
        if (!mounted) return;
        const next = { ...baseMap };
        (json.crews || []).forEach((crew) => (crew.members || []).forEach((member) => {
          const key = normalizeName(member.nickname);
          if (!key) return;
          next[key] = { nickname: member.nickname, profileImage: member.profileImage || member.profileImages?.[0] || '' };
        }));
        setProfileMap(next);
      } catch {}
    };
    loadProfiles();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSavedState({ teamCount, mode, participants, assignments, slotLocks, currentMap });
  }, [hydrated, teamCount, mode, participants, assignments, slotLocks, currentMap]);

  const addParticipant = () => {
    const names = nameInput.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
    if (!names.length) return;
    setParticipants((prev) => {
      const seen = new Set(prev.map((item) => normalizeName(item.name)));
      const next = [...prev];
      names.forEach((name) => {
        const key = normalizeName(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        next.push({ id: `${Date.now()}-${key}-${Math.random().toString(36).slice(2, 8)}`, name, position: positionInput });
      });
      return next;
    });
    setNameInput('');
  };

  const removeParticipant = (name) => {
    setParticipants((prev) => prev.filter((item) => item.name !== name));
    setAssignments((prev) => Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, value === name ? '' : value])));
  };

  const moveToSlot = (item, slotKey) => {
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => { if (next[key] === item.name) next[key] = ''; });
      next[slotKey] = item.name;
      return next;
    });
  };

  const moveToTeam = (item, teamNo) => {
    const emptyRole = roles.find((role) => !assignments[`${teamNo}-${role}`]);
    const role = emptyRole || roles[0];
    moveToSlot(item, `${teamNo}-${role}`);
  };

  const moveToLobby = (item) => {
    setAssignments((prev) => Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, value === item.name ? '' : value])));
  };

  const swapPlayers = (a, b) => {
    setAssignments((prev) => {
      const next = { ...prev };
      const aSlot = Object.entries(next).find(([, value]) => value === a.name)?.[0];
      const bSlot = Object.entries(next).find(([, value]) => value === b.name)?.[0];
      if (aSlot) next[aSlot] = b.name;
      if (bSlot) next[bSlot] = a.name;
      if (!aSlot && bSlot) next[bSlot] = a.name;
      return next;
    });
  };

  const toggleSlotLock = (slotKey) => {
    setSlotLocks((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  const shuffleTeams = () => {
    const lockedNames = new Set(Object.entries(assignments).filter(([slotKey, name]) => slotLocks[slotKey] && name).map(([, name]) => name));
    const pool = shuffle(participants.filter((item) => !lockedNames.has(item.name)));
    const next = { ...assignments };
    let index = 0;
    for (let teamNo = 1; teamNo <= teamCount; teamNo += 1) {
      roles.forEach((role) => {
        const slotKey = `${teamNo}-${role}`;
        if (slotLocks[slotKey] && next[slotKey]) return;
        next[slotKey] = pool[index]?.name || '';
        index += 1;
      });
    }
    setAssignments(next);
  };

  const resetTeams = () => { setAssignments({}); setSlotLocks({}); };
  const clearAll = () => {
    setParticipants([]); setAssignments({}); setSlotLocks({}); setCurrentMap('');
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  };

  const copyResult = async () => {
    const text = teams.map((team) => {
      const players = roles.map((role) => `${role}: ${assignments[`${team.teamNo}-${role}`] || '-'}`).join('\n');
      return `TEAM ${team.teamNo}\n${players}`;
    }).join('\n\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const handleDropToSlot = (teamNo, role) => {
    if (!dragState?.item) return;
    const slotKey = `${teamNo}-${role}`;
    if (slotLocks[slotKey]) return;
    moveToSlot(dragState.item, slotKey);
    setDragState(null);
  };

  return (
    <>
      <Head>
        <title>오버워치 랜덤뽑기 | 장지수 팬 아카이브</title>
        <meta name="description" content="방송용 오버워치 랜덤 팀 편성 툴" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-24 left-[-90px] h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute right-[-80px] top-16 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" />
        </div>

        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[118rem] items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/" className="block h-12 w-12 overflow-hidden rounded-full border border-white/10 transition hover:scale-105"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a>
            <div className="text-[26px] font-black tracking-tight text-white">오버워치 랜덤뽑기</div>
            <a href="/utility" className="rounded-full border border-cyan-300/28 bg-cyan-300/12 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/18">유틸리티</a>
          </div>
        </header>

        <main className="relative mx-auto max-w-[118rem] px-5 py-6 lg:px-8">
          <section className="mb-5 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <div className="flex flex-wrap items-center gap-3">
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addParticipant(); }} placeholder="스트리머 이름 추가..." className={`${FIELD_CLASS} w-[260px]`} />
              <select value={positionInput} onChange={(e) => setPositionInput(e.target.value)} className={FIELD_CLASS}>
                <option value="tank">🛡️ 탱커</option><option value="dps">⚔️ 딜러</option><option value="support">💚 힐러</option><option value="random">❓ 랜덤</option>
              </select>
              <button onClick={addParticipant} className="h-11 rounded-xl border border-cyan-300/28 bg-cyan-400/14 px-5 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/20">추가</button>
              <div className="mx-1 h-8 w-px bg-white/10" />
              <button onClick={() => setMode('5v5')} className={`h-10 rounded-xl border px-4 text-sm font-black ${mode === '5v5' ? 'border-orange-300/40 bg-orange-400/18 text-orange-50' : 'border-white/10 bg-white/5 text-white/58'}`}>5 vs 5</button>
              <button onClick={() => setMode('6v6')} className={`h-10 rounded-xl border px-4 text-sm font-black ${mode === '6v6' ? 'border-orange-300/40 bg-orange-400/18 text-orange-50' : 'border-white/10 bg-white/5 text-white/58'}`}>6 vs 6</button>
              <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} className={`${FIELD_CLASS} w-[96px]`}>{Array.from({ length: 9 }, (_, i) => i + 2).map((count) => <option key={count} value={count}>{count}팀</option>)}</select>
              <button onClick={shuffleTeams} className="h-11 rounded-xl border border-orange-300/45 bg-orange-500 px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(249,115,22,0.20)] transition hover:brightness-110">랜덤 섞기</button>
              <button onClick={resetTeams} className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70 transition hover:bg-white/10">팀 초기화</button>
              <button onClick={copyResult} className="h-11 rounded-xl border border-cyan-300/28 bg-cyan-300/12 px-4 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/18">결과 복사</button>
              <button onClick={() => setCurrentMap(MAP_POOL[Math.floor(Math.random() * MAP_POOL.length)])} className="h-11 rounded-xl border border-violet-300/28 bg-violet-300/12 px-4 text-sm font-bold text-violet-100 transition hover:bg-violet-300/18">맵 뽑기</button>
              <button onClick={clearAll} className="ml-auto h-11 rounded-xl border border-rose-300/24 bg-rose-300/10 px-4 text-sm font-bold text-rose-100/80 transition hover:bg-rose-300/16">전체삭제</button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-white/55">
              <span>등록 {participants.length}명</span><span>대기 {lobbyPlayers.length}명</span><span>배정 {assignedNames.size}명</span><span>잠금 {Object.values(slotLocks).filter(Boolean).length}칸</span>{currentMap ? <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-violet-100">현재 맵: {currentMap}</span> : null}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(520px,0.95fr)_minmax(680px,1.35fr)]">
            <section className="min-h-[700px] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.016))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
              <div className="flex items-end justify-between gap-4">
                <div><div className="text-xs font-black tracking-[0.32em] text-cyan-100/45">WAITING ROOM</div><h2 className="mt-2 text-[34px] font-black tracking-tight text-white">대기실</h2></div>
                <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-black text-white/65">{lobbyPlayers.length}명</div>
              </div>
              <div className="mt-5 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="grid gap-4">
                  {['tank','dps','support','random'].map((type) => {
                    const list = lobbyPlayers.filter((item) => item.position === type);
                    const meta = POSITION_META[type];
                    return (
                      <div key={type} className="rounded-[24px] border border-white/7 bg-[linear-gradient(180deg,rgba(8,13,23,0.72),rgba(5,8,14,0.54))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragState?.item) { moveToLobby(dragState.item); setDragState(null); } }}>
                        <div className="mb-3 flex items-center justify-between"><div className="text-base font-black text-white">{meta.icon} {meta.label}</div><div className="text-sm font-bold text-white/40">{list.length}명</div></div>
                        <div className="flex min-h-[154px] flex-wrap gap-3 rounded-[20px] bg-black/10 p-3">
                          {list.length ? list.map((item) => <PlayerCard key={item.id} item={item} profile={getProfile(item.name)} draggable onDragStart={() => setDragState({ item })} onDragEnd={() => setDragState(null)} onClick={() => setMoveTarget({ item })} onRemove={removeParticipant} />) : <div className="flex min-h-[130px] w-full items-center justify-center rounded-[20px] bg-white/[0.018] text-sm font-bold text-white/26">대기중인 인원이 없습니다.</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.016))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
              <div className="flex items-end justify-between gap-4">
                <div><div className="text-xs font-black tracking-[0.32em] text-orange-100/45">TEAM BOARD</div><h2 className="mt-2 text-[34px] font-black tracking-tight text-white">팀 결과판</h2></div>
                <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-black text-white/65">{teamCount}팀 · {mode}</div>
              </div>
              <div className="mt-5 grid gap-4 2xl:grid-cols-2">
                {teams.map((team) => {
                  const theme = TEAM_ACCENTS[(team.teamNo - 1) % TEAM_ACCENTS.length];
                  return (
                    <div key={team.teamNo} className={`relative overflow-hidden rounded-[26px] border ${theme.border} bg-[#0b111d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_rgba(0,0,0,0.24)]`}>
                      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 ${theme.glow}`} />
                      <div className="relative flex items-center justify-between gap-3 border-b border-white/8 pb-3">
                        <div className="text-[24px] font-black text-white">TEAM {team.teamNo}</div>
                        <div className={`rounded-full border px-3 py-1 text-xs font-black ${theme.badge}`}>{team.players.length}/{roles.length}</div>
                      </div>
                      <div className="relative mt-4 flex min-h-[286px] flex-wrap content-start gap-3">
                        {roles.map((role) => {
                          const slotKey = `${team.teamNo}-${role}`;
                          const name = assignments[slotKey];
                          const item = name ? participants.find((p) => p.name === name) : null;
                          return item ? (
                            <PlayerCard
                              key={slotKey}
                              item={item}
                              profile={getProfile(item.name)}
                              size="small"
                              locked={Boolean(slotLocks[slotKey])}
                              onToggleLock={() => toggleSlotLock(slotKey)}
                              draggable
                              onDragStart={() => setDragState({ item })}
                              onDragEnd={() => setDragState(null)}
                              onClick={() => setMoveTarget({ item })}
                            />
                          ) : <EmptySlot key={slotKey} role={role} active={Boolean(dragState) && !slotLocks[slotKey]} onDrop={() => handleDropToSlot(team.teamNo, role)} />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </section>
        </main>

        <MoveMenu
          target={moveTarget}
          teams={teams}
          currentTeam={moveTarget ? teams.find((team) => team.players.some((player) => player.id === moveTarget.item.id)) : null}
          onClose={() => setMoveTarget(null)}
          onMoveToLobby={() => { moveToLobby(moveTarget.item); setMoveTarget(null); }}
          onMoveToTeam={(teamNo) => { moveToTeam(moveTarget.item, teamNo); setMoveTarget(null); }}
          onSwap={(player) => { swapPlayers(moveTarget.item, player); setMoveTarget(null); }}
        />
      </div>
    </>
  );
}

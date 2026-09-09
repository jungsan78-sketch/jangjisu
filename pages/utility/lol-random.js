import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';
import StreamerAutocomplete from '../../components/utility/StreamerAutocomplete';

const STORAGE_KEY = 'sou:lol-random:v1';
const TEAMS = [
  { id: 'blue', label: 'BLUE TEAM', border: 'border-sky-300/28', glow: 'bg-sky-400/12', badge: 'bg-sky-300/15 text-sky-100' },
  { id: 'red', label: 'RED TEAM', border: 'border-rose-300/28', glow: 'bg-rose-400/12', badge: 'bg-rose-300/15 text-rose-100' },
];
const ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];
const ROLE_META = {
  top: { label: '탑', icon: '🛡️', tone: 'border-amber-300/28 bg-amber-300/10 text-amber-100' },
  jungle: { label: '정글', icon: '🌿', tone: 'border-emerald-300/28 bg-emerald-300/10 text-emerald-100' },
  mid: { label: '미드', icon: '✨', tone: 'border-violet-300/28 bg-violet-300/10 text-violet-100' },
  adc: { label: '원딜', icon: '🏹', tone: 'border-rose-300/28 bg-rose-300/10 text-rose-100' },
  support: { label: '서포터', icon: '💚', tone: 'border-cyan-300/28 bg-cyan-300/10 text-cyan-100' },
  random: { label: '랜덤', icon: '❓', tone: 'border-white/15 bg-white/[0.06] text-white/76' },
};
const ROLE_OPTIONS = [...ROLES, 'random'];
const KNOWN_PROFILES = [
  ['장지수', 'https://stimg.sooplive.com/LOGO/ia/iamquaddurup/iamquaddurup.jpg'],
  ['냥냥두둥', 'https://stimg.sooplive.com/LOGO/do/doodong/doodong.jpg'],
  ['시몽', 'https://stimg.sooplive.com/LOGO/xi/ximong/ximong.jpg'],
  ['후룽카카', 'https://stimg.sooplive.com/LOGO/ka/kakazzang/kakazzang.jpg'],
  ['포포', 'https://stimg.sooplive.com/LOGO/su/sunza1122/sunza1122.jpg'],
  ['구월이', 'https://stimg.sooplive.com/LOGO/is/isq1158/isq1158.jpg'],
  ['린링', 'https://stimg.sooplive.com/LOGO/mi/mini1212/mini1212.jpg'],
];

const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, '').toLowerCase();
const shuffle = (values) => {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};
const slotKey = (teamId, role) => `${teamId}-${role}`;

function readSavedState() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function PlayerCard({ player, profile, compact = false, locked = false, onClick, onRemove, draggable, onDragStart, onDragEnd }) {
  const meta = ROLE_META[player.position] || ROLE_META.random;
  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick} className={`group relative flex cursor-pointer items-center gap-3 rounded-[20px] border border-white/10 bg-[#111927] transition hover:-translate-y-0.5 hover:border-white/20 ${compact ? 'min-h-[72px] p-3' : 'min-h-[82px] p-4'}`}>
      <div className={`${compact ? 'h-11 w-11' : 'h-12 w-12'} grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/[0.06] text-lg font-black text-white/72`}>
        {profile ? <img src={profile} alt="" className="h-full w-full object-cover" /> : player.name.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-white">{player.name}</div>
        <span className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${meta.tone}`}>{meta.icon} {meta.label}</span>
      </div>
      {locked ? <span className="text-sm" title="자리 잠금">🔒</span> : null}
      {onRemove ? <button type="button" onClick={(event) => { event.stopPropagation(); onRemove(player.name); }} className="grid h-7 w-7 place-items-center rounded-full bg-white/[0.055] text-xs font-black text-white/45 opacity-0 transition hover:bg-rose-300/15 hover:text-rose-100 group-hover:opacity-100">×</button> : null}
    </div>
  );
}

function EmptySlot({ role, active, onDrop }) {
  const meta = ROLE_META[role];
  return (
    <div onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className={`flex min-h-[72px] items-center gap-3 rounded-[20px] border border-dashed p-3 transition ${active ? 'border-amber-200/48 bg-amber-300/8' : 'border-white/10 bg-black/12'}`}>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.045] text-lg">{meta.icon}</span>
      <span className="text-sm font-black text-white/38">{meta.label} 대기</span>
    </div>
  );
}

function MoveDialog({ target, assigned, assignments, locks, onClose, onLobby, onSlot, onLock }) {
  if (!target) return null;
  const currentSlot = Object.entries(assignments).find(([, name]) => name === target.name)?.[0] || '';
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/72 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-[560px] rounded-[28px] border border-white/12 bg-[#0a101b] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.65)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">{target.name} 이동</h2>
          <button type="button" onClick={onClose} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-sm font-black text-white/60">닫기</button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {currentSlot ? <button type="button" onClick={() => onLock(currentSlot)} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-left text-sm font-black text-amber-100">{locks[currentSlot] ? '🔓 자리 잠금 해제' : '🔒 현재 자리 잠금'}</button> : null}
          {currentSlot ? <button type="button" onClick={onLobby} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-left text-sm font-black text-white/80">대기실로 이동</button> : null}
          {TEAMS.flatMap((team) => ROLES.map((role) => ({ team, role }))).map(({ team, role }) => {
            const key = slotKey(team.id, role);
            const occupant = assigned.get(key);
            const compatible = target.position === role || target.position === 'random';
            return (
              <button key={key} type="button" disabled={!compatible || locks[key]} onClick={() => onSlot(key)} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left text-sm font-black text-white/78 enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
                {team.label} · {ROLE_META[role].label}{occupant ? ` (${occupant.name})` : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LolRandomPage() {
  const [nameInput, setNameInput] = useState('');
  const [position, setPosition] = useState('random');
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [locks, setLocks] = useState({});
  const [profiles, setProfiles] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [dragPlayer, setDragPlayer] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const assignedNames = useMemo(() => new Set(Object.values(assignments).filter(Boolean)), [assignments]);
  const lobby = useMemo(() => participants.filter((player) => !assignedNames.has(player.name)), [participants, assignedNames]);
  const assigned = useMemo(() => new Map(Object.entries(assignments).map(([key, name]) => [key, participants.find((player) => player.name === name)]).filter(([, player]) => player)), [assignments, participants]);

  useEffect(() => {
    const saved = readSavedState();
    if (Array.isArray(saved?.participants)) setParticipants(saved.participants.filter((player) => player?.name && ROLE_OPTIONS.includes(player.position)));
    if (saved?.assignments && typeof saved.assignments === 'object') setAssignments(saved.assignments);
    if (saved?.locks && typeof saved.locks === 'object') setLocks(saved.locks);
    setHydrated(true);
  }, []);
  useEffect(() => {
    const base = Object.fromEntries(KNOWN_PROFILES.map(([name, image]) => [normalizeName(name), image]));
    setProfiles(base);
    let mounted = true;
    fetch('/api/crew-sheet').then((response) => response.json()).then((data) => {
      if (!mounted) return;
      const next = { ...base };
      (data.crews || []).forEach((crew) => (crew.members || []).forEach((member) => { if (member.nickname) next[normalizeName(member.nickname)] = member.profileImage || member.profileImages?.[0] || ''; }));
      setProfiles(next);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ participants, assignments, locks }));
  }, [hydrated, participants, assignments, locks]);

  const addParticipants = () => {
    const names = nameInput.split(/\n|,/).map((name) => name.trim()).filter(Boolean);
    if (!names.length) return;
    setParticipants((current) => {
      const seen = new Set(current.map((player) => normalizeName(player.name)));
      const additions = names.filter((name) => !seen.has(normalizeName(name))).map((name) => ({ id: `${Date.now()}-${normalizeName(name)}-${Math.random().toString(36).slice(2, 7)}`, name, position }));
      return [...current, ...additions];
    });
    setNameInput('');
  };
  const addSuggestedParticipant = (candidate) => {
    if (!candidate?.nickname || !candidate?.stationId) return;
    setParticipants((current) => {
      const duplicate = current.some((player) => normalizeName(player.name) === normalizeName(candidate.nickname) || player.stationId === candidate.stationId);
      if (duplicate) return current;
      return [...current, {
        id: `${Date.now()}-${candidate.stationId}-${Math.random().toString(36).slice(2, 7)}`,
        name: candidate.nickname,
        position,
        stationId: candidate.stationId,
        profileImage: candidate.profileImage || '',
        favoriteCount: candidate.favoriteCount,
      }];
    });
    if (candidate.profileImage) setProfiles((current) => ({ ...current, [normalizeName(candidate.nickname)]: candidate.profileImage }));
    setNameInput('');
  };
  const removeParticipant = (name) => {
    setParticipants((current) => current.filter((player) => player.name !== name));
    setAssignments((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value === name ? '' : value])));
  };
  const moveToSlot = (player, key) => {
    const role = key.split('-').slice(1).join('-');
    if (locks[key] || (player.position !== role && player.position !== 'random')) return;
    setAssignments((current) => {
      const next = { ...current };
      const previousKey = Object.entries(next).find(([, name]) => name === player.name)?.[0];
      const occupant = next[key];
      if (previousKey) {
        const previousRole = previousKey.split('-').slice(1).join('-');
        const occupantPlayer = participants.find((candidate) => candidate.name === occupant);
        next[previousKey] = occupantPlayer && (occupantPlayer.position === previousRole || occupantPlayer.position === 'random') ? occupant : '';
      }
      next[key] = player.name;
      return next;
    });
    setMoveTarget(null);
  };
  const moveToLobby = (player) => {
    setAssignments((current) => Object.fromEntries(Object.entries(current).map(([key, name]) => [key, name === player.name ? '' : name])));
    setMoveTarget(null);
  };
  const randomize = () => {
    const lockedNames = new Set(Object.entries(assignments).filter(([key, name]) => locks[key] && name).map(([, name]) => name));
    const next = { ...assignments };
    Object.keys(next).forEach((key) => { if (!locks[key]) next[key] = ''; });
    const randomPool = shuffle(participants.filter((player) => player.position === 'random' && !lockedNames.has(player.name)));
    ROLES.forEach((role) => {
      const pool = shuffle(participants.filter((player) => player.position === role && !lockedNames.has(player.name)));
      const keys = shuffle(TEAMS.map((team) => slotKey(team.id, role)).filter((key) => !locks[key]));
      keys.forEach((key) => { next[key] = (pool.shift() || randomPool.shift())?.name || ''; });
    });
    setAssignments(next);
  };
  const resetTeams = () => { setAssignments({}); setLocks({}); };
  const clearAll = () => { setParticipants([]); setAssignments({}); setLocks({}); if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY); };
  const copyResult = async () => {
    const text = TEAMS.map((team) => `${team.label}\n${ROLES.map((role) => `${ROLE_META[role].label}: ${assignments[slotKey(team.id, role)] || '-'}`).join('\n')}`).join('\n\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <>
      <Head><title>롤 랜덤뽑기 | 장지수용소</title><meta name="description" content="롤 포지션 기반 5대5 랜덤 팀 편성 도구" /><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <PrisonPageChrome wide>
        <section className="relative w-full overflow-visible rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.016))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.26)] sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="mr-auto"><p className="text-[10px] font-black tracking-[0.28em] text-amber-100/48">LEAGUE OF LEGENDS</p><h1 className="mt-1 text-[28px] font-black tracking-[-0.04em] text-white">롤 랜덤뽑기</h1></div>
            <a href="/utility" className="rounded-xl border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm font-black text-white/72 hover:bg-white/10">유틸리티 선택</a>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <StreamerAutocomplete value={nameInput} onChange={setNameInput} onSelect={addSuggestedParticipant} onSubmit={addParticipants} placeholder="스트리머 이름 추가..." className="w-[250px]" inputClassName="h-11 rounded-xl border border-white/10 bg-[#08101b] px-4 text-sm font-bold text-white outline-none placeholder:text-white/28 focus:border-amber-200/38" />
            <select value={position} onChange={(event) => setPosition(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#08101b] px-3 text-sm font-black text-white outline-none">
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_META[role].label}</option>)}
            </select>
            <button type="button" onClick={addParticipants} className="h-11 rounded-xl bg-amber-400 px-5 text-sm font-black text-[#171006] hover:brightness-110">추가</button>
            <span className="rounded-xl border border-amber-300/24 bg-amber-300/10 px-4 py-2.5 text-sm font-black text-amber-100">5 VS 5 고정</span>
            <button type="button" onClick={randomize} className="h-11 rounded-xl bg-[linear-gradient(135deg,#eab308,#0ea5e9)] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(234,179,8,0.16)]">랜덤 섞기</button>
            <button type="button" onClick={resetTeams} className="h-11 rounded-xl border border-white/10 bg-white/[0.055] px-4 text-sm font-black text-white/72">팀 초기화</button>
            <button type="button" onClick={copyResult} className="h-11 rounded-xl border border-cyan-300/22 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100">결과 복사</button>
            <button type="button" onClick={clearAll} className="h-11 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 text-sm font-black text-rose-100/78">전체삭제</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-black text-white/42"><span>등록 {participants.length}명</span><span>대기 {lobby.length}명</span><span>배정 {assignedNames.size}명</span><span>잠금 {Object.values(locks).filter(Boolean).length}칸</span></div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(360px,0.72fr)_minmax(760px,1.5fr)]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-end justify-between"><div><p className="text-[10px] font-black tracking-[0.3em] text-cyan-100/42">WAITING ROOM</p><h2 className="mt-2 text-[30px] font-black text-white">대기실</h2></div><span className="rounded-full bg-white/[0.055] px-3 py-1.5 text-xs font-black text-white/52">{lobby.length}명</span></div>
            <div className="mt-5 grid gap-4">
              {ROLE_OPTIONS.map((role) => {
                const list = lobby.filter((player) => player.position === role);
                return <div key={role} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragPlayer) moveToLobby(dragPlayer); setDragPlayer(null); }} className="rounded-[22px] border border-white/8 bg-black/12 p-3"><div className="mb-3 text-sm font-black text-white/68">{ROLE_META[role].icon} {ROLE_META[role].label} <span className="text-white/30">{list.length}</span></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">{list.length ? list.map((player) => <PlayerCard key={player.id} player={player} profile={player.profileImage || profiles[normalizeName(player.name)]} onClick={() => setMoveTarget(player)} onRemove={removeParticipant} draggable onDragStart={() => setDragPlayer(player)} onDragEnd={() => setDragPlayer(null)} />) : <div className="rounded-2xl bg-white/[0.018] px-4 py-5 text-center text-xs font-black text-white/22">대기 없음</div>}</div></div>;
              })}
            </div>
          </div>

          <div className="grid content-start gap-5 2xl:grid-cols-2">
            {TEAMS.map((team) => (
              <div key={team.id} className={`relative overflow-hidden rounded-[28px] border bg-[#0a111d] p-5 ${team.border}`}>
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 ${team.glow}`} />
                <div className="relative flex items-center justify-between border-b border-white/10 pb-4"><h2 className="text-[25px] font-black text-white">{team.label}</h2><span className={`rounded-full px-3 py-1 text-xs font-black ${team.badge}`}>{ROLES.filter((role) => assignments[slotKey(team.id, role)]).length}/5</span></div>
                <div className="relative mt-4 grid gap-3">
                  {ROLES.map((role) => {
                    const key = slotKey(team.id, role);
                    const player = assigned.get(key);
                    return player ? <PlayerCard key={key} player={player} profile={player.profileImage || profiles[normalizeName(player.name)]} compact locked={Boolean(locks[key])} onClick={() => setMoveTarget(player)} draggable={!locks[key]} onDragStart={() => setDragPlayer(player)} onDragEnd={() => setDragPlayer(null)} /> : <EmptySlot key={key} role={role} active={Boolean(dragPlayer) && !locks[key] && (dragPlayer.position === role || dragPlayer.position === 'random')} onDrop={() => { if (dragPlayer) moveToSlot(dragPlayer, key); setDragPlayer(null); }} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
        <MoveDialog target={moveTarget} assigned={assigned} assignments={assignments} locks={locks} onClose={() => setMoveTarget(null)} onLobby={() => moveToLobby(moveTarget)} onSlot={(key) => moveToSlot(moveTarget, key)} onLock={(key) => setLocks((current) => ({ ...current, [key]: !current[key] }))} />
      </PrisonPageChrome>
    </>
  );
}


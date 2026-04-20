import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sou:overwatch-random:v2';

const POSITION_META = {
  tank: {
    label: '탱커',
    icon: '🛡️',
    chip: 'border-sky-200/90 bg-sky-500 text-white shadow-[0_10px_22px_rgba(14,165,233,0.28)]',
    teamChip: 'border-sky-200/90 bg-sky-500 text-white shadow-[0_10px_22px_rgba(14,165,233,0.24)]',
    card: 'border-sky-400/24 bg-[linear-gradient(180deg,rgba(9,23,42,0.98),rgba(8,13,24,0.98))]',
    slot: 'border-sky-300/24 bg-[linear-gradient(180deg,rgba(13,49,82,0.98),rgba(10,24,41,0.98))] text-sky-50',
  },
  dps: {
    label: '딜러',
    icon: '⚔️',
    chip: 'border-orange-200/90 bg-orange-500 text-white shadow-[0_10px_22px_rgba(249,115,22,0.28)]',
    teamChip: 'border-orange-200/90 bg-orange-500 text-white shadow-[0_10px_22px_rgba(249,115,22,0.24)]',
    card: 'border-orange-400/24 bg-[linear-gradient(180deg,rgba(38,19,9,0.98),rgba(18,12,10,0.98))]',
    slot: 'border-orange-300/24 bg-[linear-gradient(180deg,rgba(92,46,12,0.98),rgba(34,18,10,0.98))] text-orange-50',
  },
  support: {
    label: '힐러',
    icon: '💚',
    chip: 'border-emerald-200/90 bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.28)]',
    teamChip: 'border-emerald-200/90 bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.24)]',
    card: 'border-emerald-400/24 bg-[linear-gradient(180deg,rgba(8,30,22,0.98),rgba(8,15,14,0.98))]',
    slot: 'border-emerald-300/24 bg-[linear-gradient(180deg,rgba(13,73,56,0.98),rgba(9,29,22,0.98))] text-emerald-50',
  },
  random: {
    label: '랜덤',
    icon: '❓',
    chip: 'border-violet-200/90 bg-violet-500 text-white shadow-[0_10px_22px_rgba(139,92,246,0.28)]',
    teamChip: 'border-violet-200/90 bg-violet-500 text-white shadow-[0_10px_22px_rgba(139,92,246,0.24)]',
    card: 'border-violet-400/24 bg-[linear-gradient(180deg,rgba(25,15,39,0.98),rgba(13,11,19,0.98))]',
    slot: 'border-violet-300/24 bg-[linear-gradient(180deg,rgba(63,33,104,0.98),rgba(21,14,34,0.98))] text-violet-50',
  },
};

const TEAM_ACCENTS = [
  {
    wrapper: 'border-sky-300/32 bg-[linear-gradient(180deg,rgba(15,39,68,0.98),rgba(10,18,30,0.98))]',
    header: 'from-sky-300/40 via-sky-400/18 to-sky-500/8 border-sky-200/50',
    badge: 'border-sky-200/55 bg-sky-400/22 text-sky-50',
  },
  {
    wrapper: 'border-rose-300/32 bg-[linear-gradient(180deg,rgba(68,23,31,0.98),rgba(25,12,16,0.98))]',
    header: 'from-rose-300/40 via-rose-400/18 to-rose-500/8 border-rose-200/50',
    badge: 'border-rose-200/55 bg-rose-400/22 text-rose-50',
  },
  {
    wrapper: 'border-emerald-300/32 bg-[linear-gradient(180deg,rgba(20,55,44,0.98),rgba(11,20,17,0.98))]',
    header: 'from-emerald-300/40 via-emerald-400/18 to-emerald-500/8 border-emerald-200/50',
    badge: 'border-emerald-200/55 bg-emerald-400/22 text-emerald-50',
  },
  {
    wrapper: 'border-violet-300/32 bg-[linear-gradient(180deg,rgba(44,28,76,0.98),rgba(16,12,28,0.98))]',
    header: 'from-violet-300/40 via-violet-400/18 to-violet-500/8 border-violet-200/50',
    badge: 'border-violet-200/55 bg-violet-400/22 text-violet-50',
  },
  {
    wrapper: 'border-amber-300/32 bg-[linear-gradient(180deg,rgba(74,49,18,0.98),rgba(24,16,8,0.98))]',
    header: 'from-amber-300/40 via-amber-400/18 to-amber-500/8 border-amber-200/50',
    badge: 'border-amber-200/55 bg-amber-400/22 text-amber-50',
  },
];

const KNOWN_MEMBER_PROFILES = [
  { nickname: '장지수', profileImage: 'https://stimg.sooplive.com/LOGO/ia/iamquaddurup/iamquaddurup.jpg', stationUrl: 'https://www.sooplive.com/station/iamquaddurup' },
  { nickname: '냥냥두둥', profileImage: 'https://stimg.sooplive.com/LOGO/do/doodong/doodong.jpg', stationUrl: 'https://www.sooplive.com/station/doodong' },
  { nickname: '치치', profileImage: 'https://stimg.sooplive.com/LOGO/lo/lomioeov/m/lomioeov.webp', stationUrl: 'https://www.sooplive.com/station/lomioeov' },
  { nickname: '시몽', profileImage: 'https://stimg.sooplive.com/LOGO/xi/ximong/ximong.jpg', stationUrl: 'https://www.sooplive.com/station/ximong' },
  { nickname: '유오늘', profileImage: 'https://stimg.sooplive.com/LOGO/yo/youoneul/youoneul.jpg', stationUrl: 'https://www.sooplive.com/station/youoneul' },
  { nickname: '아야네세나', profileImage: 'https://stimg.sooplive.com/LOGO/ay/ayanesena/ayanesena.jpg', stationUrl: 'https://www.sooplive.com/station/ayanesena' },
  { nickname: '포포', profileImage: 'https://stimg.sooplive.com/LOGO/su/sunza1122/sunza1122.jpg', stationUrl: 'https://www.sooplive.com/station/sunza1122' },
  { nickname: '채니', profileImage: 'https://stimg.sooplive.com/LOGO/k1/k1baaa/k1baaa.jpg', stationUrl: 'https://www.sooplive.com/station/k1baaa' },
  { nickname: '코로미', profileImage: 'https://stimg.sooplive.com/LOGO/bx/bxroong/bxroong.jpg', stationUrl: 'https://www.sooplive.com/station/bxroong' },
  { nickname: '구월이', profileImage: 'https://stimg.sooplive.com/LOGO/is/isq1158/isq1158.jpg', stationUrl: 'https://www.sooplive.com/station/isq1158' },
  { nickname: '린링', profileImage: 'https://stimg.sooplive.com/LOGO/mi/mini1212/mini1212.jpg', stationUrl: 'https://www.sooplive.com/station/mini1212' },
  { nickname: '띠꾸', profileImage: 'https://stimg.sooplive.com/LOGO/dd/ddikku0714/ddikku0714.jpg', stationUrl: 'https://www.sooplive.com/station/ddikku0714' },
];

const MAP_POOL = ['부산', '리장 타워', '일리오스', '왕의 길', '할리우드', '눔바니', '66번 국도', '감시 기지: 지브롤터', '서킷 로얄', '파라이소'];
const OUTER_CARD = 'rounded-[26px] border border-[#2a4e86]/55 bg-[linear-gradient(180deg,rgba(10,15,25,0.97),rgba(7,10,17,0.98))] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.24)]';
const FIELD_CLASS = 'w-full rounded-2xl border border-[#335b95]/70 bg-[#101826] px-4 py-3 text-base text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45';

function normalizeName(value = '') {
  return String(value).replace(/[👑🦁⭐★☆✅✔️☑️🏆🥇🥈🥉🔥💎🎖️]/g, '').replace(/\s+/g, '').trim();
}

function shuffleArray(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getRoleType(role) {
  if (role.startsWith('탱')) return 'tank';
  if (role.startsWith('딜')) return 'dps';
  if (role.startsWith('힐')) return 'support';
  return 'random';
}

function getRoleTemplate(mode) {
  return mode === '6v6'
    ? ['탱커1', '탱커2', '딜러1', '딜러2', '힐러1', '힐러2']
    : ['탱커', '딜러1', '딜러2', '힐러1', '힐러2'];
}

function isAssignable(participant, role) {
  const roleType = getRoleType(role);
  return participant.position === roleType || participant.position === 'random';
}

function getSavedState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function SectionCard({ title, desc, children, className = '' }) {
  return (
    <section className={`${OUTER_CARD} ${className}`}>
      <div>
        <div className="text-sm font-bold tracking-[0.18em] text-[#9dc6ff]">{title}</div>
        {desc ? <div className="mt-2 text-sm leading-7 text-white/62">{desc}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OptionPill({ active, onClick, children, tone = 'blue' }) {
  const activeClass = tone === 'orange'
    ? 'border-orange-300/45 bg-orange-400/18 text-orange-50 shadow-[0_0_18px_rgba(251,146,60,0.18)]'
    : 'border-cyan-300/45 bg-cyan-300/16 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)]';
  const idleClass = 'border-[#335b95]/65 bg-[#111a28] text-white/65 hover:bg-[#152133] hover:text-white';
  return <button onClick={onClick} className={`rounded-2xl border px-4 py-3 text-base font-bold transition ${active ? activeClass : idleClass}`}>{children}</button>;
}

function ProfileAvatar({ name, profile, small = false }) {
  const [failed, setFailed] = useState(false);
  const src = !failed && profile?.profileImage ? profile.profileImage : '';
  const initial = String(name || '?').slice(0, 1);
  const size = small ? 'h-7 w-7 text-[12px]' : 'h-9 w-9 text-sm';

  if (src) {
    return <img src={src} alt={name} onError={() => setFailed(true)} className={`${size} shrink-0 rounded-full border border-white/25 object-cover shadow-[0_6px_14px_rgba(0,0,0,0.28)]`} />;
  }
  return <span className={`${size} flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/22 font-black text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]`}>{initial}</span>;
}

function PersonChip({ item, meta, muted = false, onRemove = null, draggable = false, onDragStart = null, onDragEnd = null, teamStyle = false, profile = null }) {
  const styleClass = teamStyle ? meta.teamChip : meta.chip;
  return (
    <div draggable={draggable} onDragStart={onDragStart || undefined} onDragEnd={onDragEnd || undefined} className={`inline-flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-[17px] font-black leading-none ${styleClass} ${muted ? 'opacity-55 saturate-50' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      <ProfileAvatar name={item.name} profile={profile} small={teamStyle} />
      <span className="drop-shadow-[0_1px_8px_rgba(0,0,0,0.25)]">{item.name}</span>
      {onRemove ? <button onClick={() => onRemove(item.name)} className="ml-1 rounded-full px-1 text-white/70 transition hover:text-white">×</button> : null}
    </div>
  );
}

function RoleLane({ title, type, participants, assignedNames, onRemove, onParticipantDragStart, onParticipantDragEnd, onLaneDrop, dragState, getProfile }) {
  const meta = POSITION_META[type];
  const activeDrop = dragState && dragState.type === 'participant' && dragState.item.position !== type;
  return (
    <div onDragOver={(e) => { if (dragState) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); onLaneDrop(type); }} className={`rounded-[20px] border p-4 transition ${meta.card} ${activeDrop ? 'ring-2 ring-cyan-300/25 border-cyan-300/40' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-extrabold text-white">{meta.icon} {title}</div>
        <div className="text-sm text-white/48">{participants.length}명</div>
      </div>
      <div className="mt-3 flex min-h-[58px] flex-wrap gap-2.5">
        {participants.length ? participants.map((item) => {
          const isAssigned = assignedNames.has(item.name);
          return (
            <PersonChip
              key={item.id}
              item={item}
              meta={meta}
              muted={isAssigned}
              onRemove={onRemove}
              draggable={!isAssigned}
              onDragStart={() => onParticipantDragStart(item)}
              onDragEnd={onParticipantDragEnd}
              profile={getProfile(item.name)}
            />
          );
        }) : <div className="rounded-2xl border border-dashed border-[#335b95]/60 px-4 py-3 text-sm text-white/40">등록된 인원이 없습니다.</div>}
      </div>
    </div>
  );
}

function TeamPanel({ teamNo, captain, roles, assignments, locks, participants, onAssign, onToggleLock, dragState, onSlotDragStart, onSlotDragEnd, onSlotDrop, onCaptainChange, getProfile }) {
  const theme = TEAM_ACCENTS[(teamNo - 1) % TEAM_ACCENTS.length];
  const teamNames = roles.map((role) => assignments[`${teamNo}-${role}`]).filter(Boolean);
  return (
    <div className={`rounded-[24px] border p-4 shadow-[0_18px_42px_rgba(0,0,0,0.24)] ${theme.wrapper}`}>
      <div className={`mb-4 rounded-[18px] border bg-gradient-to-r px-4 py-4 ${theme.header}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[22px] font-black tracking-tight text-white">TEAM {teamNo}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${theme.badge}`}>팀장</span>
              <select value={captain || ''} onChange={(e) => onCaptainChange(teamNo, e.target.value)} className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm font-bold text-white outline-none">
                <option value="">팀장 선택</option>
                {teamNames.map((name) => <option key={`${teamNo}-${name}`} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs font-bold tracking-[0.22em] ${theme.badge}`}>DRAW</div>
        </div>
      </div>
      <div className="space-y-3">
        {roles.map((role) => {
          const key = `${teamNo}-${role}`;
          const roleType = getRoleType(role);
          const roleMeta = POSITION_META[roleType] || POSITION_META.random;
          const selected = assignments[key] || '';
          const usedNames = new Set(Object.entries(assignments).filter(([slot, name]) => slot !== key && name).map(([, name]) => name));
          const candidates = participants.filter((item) => isAssignable(item, role) && (!usedNames.has(item.name) || item.name === selected));
          const activeDrop = dragState && dragState.slotKey !== key && (dragState.type === 'participant' ? isAssignable(dragState.item, role) : getRoleType(dragState.role) === roleType);
          const selectedItem = selected ? participants.find((item) => item.name === selected) : null;
          return (
            <div key={key} onDragOver={(e) => { if (dragState) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); onSlotDrop(key, role); }} className={`rounded-[20px] border px-4 py-4 transition ${selected ? roleMeta.slot : 'border-[#335b95]/60 bg-[#111827] text-white'} ${activeDrop ? 'border-cyan-300/40 ring-2 ring-cyan-300/25' : ''}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-base font-bold">{roleMeta.icon} {role}</div>
                <button onClick={() => onToggleLock(key)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${locks[key] ? 'border border-cyan-300/28 bg-cyan-300/12 text-cyan-100' : 'border border-[#335b95]/65 bg-[#0d1624] text-white/60 hover:bg-[#142133]'}`}>{locks[key] ? '잠금됨' : '잠금'}</button>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {selectedItem ? (
                  <div draggable onDragStart={() => onSlotDragStart({ slotKey: key, role, name: selected })} onDragEnd={onSlotDragEnd} className="cursor-grab active:cursor-grabbing">
                    <PersonChip item={selectedItem} meta={roleMeta} teamStyle profile={getProfile(selectedItem.name)} />
                  </div>
                ) : <div className="rounded-xl border border-dashed border-[#335b95]/60 px-3 py-2 text-sm text-white/38">빈 슬롯</div>}
                {captain === selected ? <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${theme.badge}`}>팀장</span> : null}
              </div>
              <select value={selected} onChange={(e) => onAssign(key, e.target.value)} className="w-full rounded-2xl border border-[#335b95]/65 bg-[#0c1320] px-4 py-3 text-base text-white outline-none focus:border-cyan-300/35">
                <option value="">선수 선택</option>
                {candidates.map((item) => <option key={`${key}-${item.id}`} value={item.name}>{item.name} · {POSITION_META[item.position].label}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OverwatchRandomPage() {
  const [teamCount, setTeamCount] = useState(2);
  const [mode, setMode] = useState('5v5');
  const [nameInput, setNameInput] = useState('');
  const [positionInput, setPositionInput] = useState('random');
  const [captains, setCaptains] = useState({});
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [locks, setLocks] = useState({});
  const [dragState, setDragState] = useState(null);
  const [currentMap, setCurrentMap] = useState('');
  const [profileMap, setProfileMap] = useState({});
  const [hydrated, setHydrated] = useState(false);

  const roles = useMemo(() => getRoleTemplate(mode), [mode]);
  const grouped = useMemo(() => ({
    tank: participants.filter((item) => item.position === 'tank'),
    dps: participants.filter((item) => item.position === 'dps'),
    support: participants.filter((item) => item.position === 'support'),
    random: participants.filter((item) => item.position === 'random'),
  }), [participants]);
  const assignedNames = useMemo(() => new Set(Object.values(assignments).filter(Boolean)), [assignments]);
  const getProfile = (name) => profileMap[normalizeName(name)] || null;

  useEffect(() => {
    const saved = getSavedState();
    if (saved) {
      if (Number(saved.teamCount) >= 2 && Number(saved.teamCount) <= 10) setTeamCount(Number(saved.teamCount));
      if (saved.mode === '5v5' || saved.mode === '6v6') setMode(saved.mode);
      if (Array.isArray(saved.participants)) setParticipants(saved.participants.filter((item) => item?.name && item?.position).map((item, index) => ({ ...item, id: item.id || `saved-${index}-${item.name}` })));
      if (saved.assignments && typeof saved.assignments === 'object') setAssignments(saved.assignments);
      if (saved.locks && typeof saved.locks === 'object') setLocks(saved.locks);
      if (saved.captains && typeof saved.captains === 'object') setCaptains(saved.captains);
      if (typeof saved.currentMap === 'string') setCurrentMap(saved.currentMap);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const baseMap = {};
    KNOWN_MEMBER_PROFILES.forEach((member) => {
      baseMap[normalizeName(member.nickname)] = member;
    });
    setProfileMap(baseMap);

    let mounted = true;
    const loadProfiles = async () => {
      try {
        const res = await fetch('/api/crew-sheet');
        const json = await res.json();
        if (!mounted) return;
        const next = { ...baseMap };
        (json.crews || []).forEach((crew) => {
          (crew.members || []).forEach((member) => {
            const key = normalizeName(member.nickname);
            if (!key) return;
            next[key] = {
              nickname: member.nickname,
              profileImage: member.profileImage || member.profileImages?.[0] || '',
              profileImages: member.profileImages || [],
              stationUrl: member.stationUrl || '',
            };
          });
        });
        setProfileMap(next);
      } catch {}
    };
    loadProfiles();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ teamCount, mode, participants, assignments, locks, captains, currentMap });
  }, [hydrated, teamCount, mode, participants, assignments, locks, captains, currentMap]);

  const handleTeamCountChange = (value) => {
    const nextCount = Number(value);
    setTeamCount(nextCount);
    setAssignments((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => Number(key.split('-')[0]) <= nextCount)));
    setLocks((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => Number(key.split('-')[0]) <= nextCount)));
    setCaptains((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => Number(key) <= nextCount)));
  };

  const addParticipant = () => {
    const names = nameInput.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
    if (!names.length) return;
    setParticipants((prev) => {
      const seen = new Set(prev.map((item) => normalizeName(item.name)));
      const next = [...prev];
      names.forEach((name) => {
        const key = normalizeName(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        next.push({ id: `${Date.now()}-${name}-${Math.random().toString(36).slice(2, 7)}`, name, position: positionInput });
      });
      return next;
    });
    setNameInput('');
  };

  const removeParticipant = (name) => {
    setParticipants((prev) => prev.filter((item) => item.name !== name));
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => { if (next[key] === name) next[key] = ''; });
      return next;
    });
    setCaptains((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => { if (next[key] === name) next[key] = ''; });
      return next;
    });
  };

  const handleAssign = (slotKey, name) => {
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => { if (key !== slotKey && next[key] === name) next[key] = ''; });
      next[slotKey] = name;
      return next;
    });
  };

  const handleToggleLock = (slotKey) => setLocks((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));

  const handleShuffle = () => {
    const pools = {
      tank: shuffleArray(participants.filter((item) => item.position === 'tank')),
      dps: shuffleArray(participants.filter((item) => item.position === 'dps')),
      support: shuffleArray(participants.filter((item) => item.position === 'support')),
      random: shuffleArray(participants.filter((item) => item.position === 'random')),
    };
    const next = { ...assignments };
    const used = new Set(Object.entries(next).filter(([key, name]) => locks[key] && name).map(([, name]) => name));
    const pull = (type) => {
      const first = pools[type].find((item) => !used.has(item.name));
      if (first) { used.add(first.name); return first.name; }
      const fallback = pools.random.find((item) => !used.has(item.name));
      if (fallback) { used.add(fallback.name); return fallback.name; }
      return '';
    };
    for (let teamNo = 1; teamNo <= teamCount; teamNo += 1) {
      roles.forEach((role) => {
        const key = `${teamNo}-${role}`;
        if (locks[key]) return;
        next[key] = pull(getRoleType(role));
      });
    }
    setAssignments(next);
  };

  const handleResetUnlocked = () => {
    setAssignments((prev) => Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, locks[key] ? value : ''])));
    setCaptains({});
  };

  const handleFullReset = () => {
    setAssignments({});
    setLocks({});
    setCaptains({});
    setCurrentMap('');
  };

  const handleClearAll = () => {
    setParticipants([]);
    setAssignments({});
    setLocks({});
    setCaptains({});
    setCurrentMap('');
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
  };

  const copyResult = async () => {
    const text = Array.from({ length: teamCount }, (_, idx) => idx + 1).map((teamNo) => {
      const captainText = captains[teamNo] ? ` (팀장: ${captains[teamNo]})` : '';
      const header = `팀 ${teamNo}${captainText}`;
      const body = roles.map((role) => `${role}: ${assignments[`${teamNo}-${role}`] || '-'}`).join('\n');
      return `${header}\n${body}`;
    }).join('\n\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const drawMap = () => setCurrentMap(MAP_POOL[Math.floor(Math.random() * MAP_POOL.length)]);
  const handleParticipantDragStart = (item) => setDragState({ type: 'participant', item });
  const handleSlotDragStart = (payload) => setDragState({ type: 'slot', ...payload });
  const handleDragEnd = () => setDragState(null);

  const handleSlotDrop = (targetSlotKey, targetRole) => {
    if (!dragState) return;
    if (dragState.type === 'participant') {
      if (!isAssignable(dragState.item, targetRole)) { setDragState(null); return; }
      handleAssign(targetSlotKey, dragState.item.name);
      setDragState(null);
      return;
    }
    if (dragState.type === 'slot') {
      if (dragState.slotKey === targetSlotKey) { setDragState(null); return; }
      if (getRoleType(dragState.role) !== getRoleType(targetRole)) { setDragState(null); return; }
      setAssignments((prev) => {
        const next = { ...prev };
        const targetName = next[targetSlotKey] || '';
        next[targetSlotKey] = dragState.name || '';
        next[dragState.slotKey] = targetName;
        return next;
      });
      setDragState(null);
    }
  };

  const handleRoleLaneDrop = (targetType) => {
    if (!dragState || dragState.type !== 'participant') return;
    setParticipants((prev) => prev.map((item) => item.id === dragState.item.id ? { ...item, position: targetType } : item));
    setDragState(null);
  };

  return (
    <>
      <Head>
        <title>오버워치 랜덤뽑기 | 장지수 팬 아카이브</title>
        <meta name="description" content="가독성 위주로 재구성한 오버워치 랜덤뽑기" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[116rem] items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-[#335b95]/65 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-cyan-300/40 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a>
            <div className="flex-1 px-4 text-center text-[28px] font-black tracking-tight text-white">오버워치 랜덤뽑기</div>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/28 bg-cyan-300/12 px-4 py-2.5 text-base font-medium text-cyan-100 transition hover:bg-cyan-300/18">유틸리티</a>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-[116rem] px-5 py-8 lg:px-8">
          <section className="grid gap-6 xl:grid-cols-[300px_280px_minmax(0,1fr)] items-start">
            <SectionCard title="리모컨" desc="등록, 인원 관리, 팀 수 설정만 왼쪽에 남겼습니다." className="xl:sticky xl:top-24">
              <div className="grid gap-3">
                <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) addParticipant(); }} placeholder="스트리머 이름 입력 (쉼표/엔터 지원)" className={FIELD_CLASS} />
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <select value={positionInput} onChange={(e) => setPositionInput(e.target.value)} className={FIELD_CLASS}>
                    <option value="tank">🛡️ 탱커</option>
                    <option value="dps">⚔️ 딜러</option>
                    <option value="support">💚 힐러</option>
                    <option value="random">❓ 랜덤</option>
                  </select>
                  <button onClick={addParticipant} className="rounded-2xl border border-cyan-300/30 bg-cyan-300/14 px-5 py-3 text-base font-bold text-cyan-100 transition hover:bg-cyan-300/20">등록</button>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-[#335b95]/65 bg-[#111a28] px-4 py-4">
                <div className="flex items-center justify-between gap-3"><div className="text-sm text-white/46">등록 인원</div><button onClick={handleClearAll} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55 transition hover:bg-white/10 hover:text-white">전체삭제</button></div>
                <div className="mt-2 text-[28px] font-black text-white">{participants.length}</div>
                <div className="mt-4 text-sm font-bold text-white/50">게임 방식</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <OptionPill active={mode === '5v5'} onClick={() => setMode('5v5')} tone="orange">5 vs 5</OptionPill>
                  <OptionPill active={mode === '6v6'} onClick={() => setMode('6v6')} tone="orange">6 vs 6</OptionPill>
                </div>
              </div>
              <div className="mt-5">
                <div className="text-sm font-bold text-white/50">팀 수</div>
                <div className="mt-3 rounded-2xl border border-[#335b95]/65 bg-[#111a28] p-2 max-h-[168px] overflow-y-auto">
                  <div className="grid gap-2">
                    {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => <OptionPill key={count} active={teamCount === count} onClick={() => handleTeamCountChange(count)}>{count}팀</OptionPill>)}
                  </div>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="포지션 보드" desc="검색을 제거하고 조작 버튼을 더 크게, 더 진하게 정리했습니다.">
              <div className="flex flex-wrap gap-2">
                <button onClick={handleShuffle} className="rounded-2xl border border-orange-200/55 bg-orange-500 px-6 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)] transition hover:brightness-110">랜덤 섞기</button>
                <button onClick={handleResetUnlocked} className="rounded-2xl border border-[#335b95]/65 bg-[#111a28] px-4 py-4 text-sm font-bold text-white/82 transition hover:bg-[#172334]">잠금 제외 초기화</button>
                <button onClick={handleFullReset} className="rounded-2xl border border-[#335b95]/65 bg-[#111a28] px-4 py-4 text-sm font-bold text-white/82 transition hover:bg-[#172334]">초기화</button>
                <button onClick={copyResult} className="rounded-2xl border border-cyan-300/35 bg-cyan-500/18 px-4 py-4 text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/24">결과 복사</button>
                <button onClick={drawMap} className="rounded-2xl border border-violet-300/35 bg-violet-500/18 px-4 py-4 text-sm font-black text-violet-50 transition hover:bg-violet-500/24">맵 뽑기</button>
              </div>
              {currentMap ? <div className="mt-3 inline-flex rounded-xl border border-violet-300/35 bg-violet-400/16 px-4 py-2 text-sm font-black text-violet-50">현재 맵: {currentMap}</div> : null}
              <div className="mt-4 space-y-4">
                <RoleLane title="탱커" type="tank" participants={grouped.tank} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} onLaneDrop={handleRoleLaneDrop} dragState={dragState} getProfile={getProfile} />
                <RoleLane title="딜러" type="dps" participants={grouped.dps} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} onLaneDrop={handleRoleLaneDrop} dragState={dragState} getProfile={getProfile} />
                <RoleLane title="힐러" type="support" participants={grouped.support} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} onLaneDrop={handleRoleLaneDrop} dragState={dragState} getProfile={getProfile} />
                <RoleLane title="랜덤" type="random" participants={grouped.random} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} onLaneDrop={handleRoleLaneDrop} dragState={dragState} getProfile={getProfile} />
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-7 text-cyan-100/80">포지션 보드에서 다른 줄로 드래그하면 포지션이 바뀝니다. 미배정 칩은 슬롯에 직접 드래그할 수 있고, 결과판 칩은 같은 포지션끼리 교체됩니다. 등록한 인원은 브라우저에 자동 저장됩니다.</div>
            </SectionCard>
            <SectionCard title="팀 결과판" desc="팀마다 컬러를 넣고, 결과 칩도 더 선명한 드래프트 느낌으로 바꿨습니다.">
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: teamCount }, (_, idx) => idx + 1).map((teamNo) => (
                  <TeamPanel key={teamNo} teamNo={teamNo} captain={captains[teamNo] || ''} roles={roles} assignments={assignments} locks={locks} participants={participants} onAssign={handleAssign} onToggleLock={handleToggleLock} dragState={dragState} onSlotDragStart={handleSlotDragStart} onSlotDragEnd={handleDragEnd} onSlotDrop={handleSlotDrop} onCaptainChange={(no, value) => setCaptains((prev) => ({ ...prev, [no]: value }))} getProfile={getProfile} />
                ))}
              </div>
            </SectionCard>
          </section>
        </main>
      </div>
    </>
  );
}

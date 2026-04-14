import Head from 'next/head';
import { useMemo, useState } from 'react';

const POSITION_META = {
  tank: {
    label: '탱커',
    icon: '🛡️',
    chip: 'border-sky-400/38 bg-sky-400/12 text-sky-100',
    card: 'border-sky-400/24 bg-[linear-gradient(180deg,rgba(9,23,42,0.98),rgba(8,13,24,0.98))]',
    slot: 'border-sky-300/18 bg-sky-400/[0.07] text-sky-100',
  },
  dps: {
    label: '딜러',
    icon: '⚔️',
    chip: 'border-orange-400/38 bg-orange-400/12 text-orange-100',
    card: 'border-orange-400/24 bg-[linear-gradient(180deg,rgba(38,19,9,0.98),rgba(18,12,10,0.98))]',
    slot: 'border-orange-300/18 bg-orange-400/[0.07] text-orange-100',
  },
  support: {
    label: '힐러',
    icon: '💚',
    chip: 'border-emerald-400/38 bg-emerald-400/12 text-emerald-100',
    card: 'border-emerald-400/24 bg-[linear-gradient(180deg,rgba(8,30,22,0.98),rgba(8,15,14,0.98))]',
    slot: 'border-emerald-300/18 bg-emerald-400/[0.07] text-emerald-100',
  },
  random: {
    label: '랜덤',
    icon: '❓',
    chip: 'border-violet-400/38 bg-violet-400/12 text-violet-100',
    card: 'border-violet-400/24 bg-[linear-gradient(180deg,rgba(25,15,39,0.98),rgba(13,11,19,0.98))]',
    slot: 'border-violet-300/18 bg-violet-400/[0.07] text-violet-100',
  },
};

const TEAM_ACCENTS = [
  'from-sky-300/22 via-sky-400/8 to-transparent border-sky-300/28',
  'from-orange-300/22 via-orange-400/8 to-transparent border-orange-300/28',
  'from-emerald-300/22 via-emerald-400/8 to-transparent border-emerald-300/28',
  'from-violet-300/22 via-violet-400/8 to-transparent border-violet-300/28',
  'from-rose-300/22 via-rose-400/8 to-transparent border-rose-300/28',
];

const OUTER_CARD = 'rounded-[26px] border border-[#2a4e86]/55 bg-[linear-gradient(180deg,rgba(10,15,25,0.97),rgba(7,10,17,0.98))] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.24)]';
const FIELD_CLASS = 'w-full rounded-2xl border border-[#335b95]/70 bg-[#101826] px-4 py-3 text-base text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45';

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

function SectionCard({ title, desc, children, action, className = '' }) {
  return (
    <section className={`${OUTER_CARD} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold tracking-[0.18em] text-[#9dc6ff]">{title}</div>
          {desc ? <div className="mt-2 text-sm leading-7 text-white/62">{desc}</div> : null}
        </div>
        {action || null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OptionPill({ active, onClick, children, tone = 'blue' }) {
  const activeClass =
    tone === 'orange'
      ? 'border-orange-300/45 bg-orange-400/18 text-orange-50 shadow-[0_0_18px_rgba(251,146,60,0.18)]'
      : 'border-cyan-300/45 bg-cyan-300/16 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)]';
  const idleClass = 'border-[#335b95]/65 bg-[#111a28] text-white/65 hover:bg-[#152133] hover:text-white';
  return (
    <button onClick={onClick} className={`rounded-2xl border px-4 py-3 text-base font-bold transition ${active ? activeClass : idleClass}`}>
      {children}
    </button>
  );
}

function PersonChip({ item, meta, muted = false, onRemove = null, draggable = false, onDragStart = null, onDragEnd = null }) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart || undefined}
      onDragEnd={onDragEnd || undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${meta.chip} ${muted ? 'opacity-70' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <span>{item.name}</span>
      {onRemove ? <button onClick={() => onRemove(item.name)} className="rounded-full px-1 text-white/45 transition hover:text-red-200">×</button> : null}
    </div>
  );
}

function RoleBoard({ title, type, participants, assignedNames, onRemove, onParticipantDragStart, onParticipantDragEnd }) {
  const meta = POSITION_META[type];
  return (
    <div className={`rounded-[22px] border p-4 ${meta.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-extrabold text-white">{meta.icon} {title}</div>
        <div className="text-sm text-white/48">{participants.length}명</div>
      </div>
      <div className="mt-4 flex min-h-[96px] flex-wrap gap-2">
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
            />
          );
        }) : <div className="rounded-2xl border border-dashed border-[#335b95]/60 px-4 py-4 text-sm text-white/40">등록된 인원이 없습니다.</div>}
      </div>
    </div>
  );
}

function TeamPanel({ teamNo, captain, roles, assignments, locks, participants, onAssign, onToggleLock, dragState, onSlotDragStart, onSlotDragEnd, onSlotDrop }) {
  const accent = TEAM_ACCENTS[(teamNo - 1) % TEAM_ACCENTS.length];
  return (
    <div className="rounded-[26px] border border-[#2a4e86]/55 bg-[#0a1019] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.24)]">
      <div className={`mb-4 rounded-[18px] border bg-gradient-to-r px-4 py-4 ${accent}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[22px] font-black tracking-tight text-white">TEAM {teamNo}</div>
            <div className="mt-1 text-sm text-white/62">팀장: {captain || '-'}</div>
          </div>
          <div className="rounded-full border border-[#335b95]/70 bg-[#111a28] px-3 py-1 text-xs font-bold tracking-[0.22em] text-[#9dc6ff]">DRAW</div>
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
          return (
            <div
              key={key}
              onDragOver={(e) => {
                if (dragState) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                onSlotDrop(key, role);
              }}
              className={`rounded-[20px] border px-4 py-4 transition ${selected ? roleMeta.slot : 'border-[#335b95]/60 bg-[#111827] text-white'} ${activeDrop ? 'border-cyan-300/40 ring-2 ring-cyan-300/25' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-base font-bold">{roleMeta.icon} {role}</div>
                <button
                  onClick={() => onToggleLock(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${locks[key] ? 'border border-cyan-300/28 bg-cyan-300/12 text-cyan-100' : 'border border-[#335b95]/65 bg-[#0d1624] text-white/60 hover:bg-[#142133]'}`}
                >
                  {locks[key] ? '잠금됨' : '잠금'}
                </button>
              </div>
              {selected ? (
                <div
                  draggable
                  onDragStart={() => onSlotDragStart({ slotKey: key, role, name: selected })}
                  onDragEnd={onSlotDragEnd}
                  className="mb-3 inline-flex cursor-grab items-center gap-2 rounded-full border border-cyan-300/22 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 active:cursor-grabbing"
                >
                  <span>드래그 이동</span>
                  <span>{selected}</span>
                </div>
              ) : null}
              <select value={selected} onChange={(e) => onAssign(key, e.target.value)} className="w-full rounded-2xl border border-[#335b95]/65 bg-[#0c1320] px-4 py-3 text-base text-white outline-none focus:border-cyan-300/35">
                <option value="">선수 선택</option>
                {candidates.map((item) => (
                  <option key={`${key}-${item.id}`} value={item.name}>{item.name} · {POSITION_META[item.position].label}</option>
                ))}
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
  const [captainInputs, setCaptainInputs] = useState(['', '']);
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [locks, setLocks] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dragState, setDragState] = useState(null);

  const roles = useMemo(() => getRoleTemplate(mode), [mode]);
  const filteredParticipants = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    return participants.filter((item) => !lower || item.name.toLowerCase().includes(lower));
  }, [participants, searchTerm]);
  const grouped = useMemo(() => ({
    tank: filteredParticipants.filter((item) => item.position === 'tank'),
    dps: filteredParticipants.filter((item) => item.position === 'dps'),
    support: filteredParticipants.filter((item) => item.position === 'support'),
    random: filteredParticipants.filter((item) => item.position === 'random'),
  }), [filteredParticipants]);
  const assignedNames = useMemo(() => new Set(Object.values(assignments).filter(Boolean)), [assignments]);

  const handleTeamCount = (nextCount) => {
    setTeamCount(nextCount);
    setCaptainInputs((prev) => Array.from({ length: nextCount }, (_, index) => prev[index] || ''));
    setAssignments((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => Number(key.split('-')[0]) <= nextCount)));
    setLocks((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => Number(key.split('-')[0]) <= nextCount)));
  };

  const addParticipant = () => {
    const names = nameInput.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
    if (!names.length) return;
    setParticipants((prev) => {
      const seen = new Set(prev.map((item) => item.name));
      const next = [...prev];
      names.forEach((name) => {
        if (seen.has(name)) return;
        seen.add(name);
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
      Object.keys(next).forEach((key) => {
        if (next[key] === name) next[key] = '';
      });
      return next;
    });
  };

  const handleAssign = (slotKey, name) => {
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key !== slotKey && next[key] === name) next[key] = '';
      });
      next[slotKey] = name;
      return next;
    });
  };

  const handleToggleLock = (slotKey) => {
    setLocks((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  const handleShuffle = () => {
    const groupedAll = {
      tank: participants.filter((item) => item.position === 'tank'),
      dps: participants.filter((item) => item.position === 'dps'),
      support: participants.filter((item) => item.position === 'support'),
      random: participants.filter((item) => item.position === 'random'),
    };
    const pools = {
      tank: shuffleArray(groupedAll.tank),
      dps: shuffleArray(groupedAll.dps),
      support: shuffleArray(groupedAll.support),
      random: shuffleArray(groupedAll.random),
    };
    const next = { ...assignments };
    const used = new Set(Object.entries(next).filter(([key, name]) => locks[key] && name).map(([, name]) => name));
    const pull = (type) => {
      const first = pools[type].find((item) => !used.has(item.name));
      if (first) {
        used.add(first.name);
        return first.name;
      }
      const fallback = pools.random.find((item) => !used.has(item.name));
      if (fallback) {
        used.add(fallback.name);
        return fallback.name;
      }
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

  const handleReset = () => {
    setAssignments((prev) => Object.fromEntries(Object.entries(prev).map(([key, value]) => [key, locks[key] ? value : ''])));
  };

  const copyResult = async () => {
    const text = Array.from({ length: teamCount }, (_, idx) => idx + 1).map((teamNo) => {
      const header = `팀 ${teamNo}${captainInputs[teamNo - 1] ? ` (${captainInputs[teamNo - 1]})` : ''}`;
      const body = roles.map((role) => `${role}: ${assignments[`${teamNo}-${role}`] || '-'}`).join('\n');
      return `${header}\n${body}`;
    }).join('\n\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const handleParticipantDragStart = (item) => {
    setDragState({ type: 'participant', item });
  };

  const handleSlotDragStart = (payload) => {
    setDragState({ type: 'slot', ...payload });
  };

  const handleDragEnd = () => {
    setDragState(null);
  };

  const handleSlotDrop = (targetSlotKey, targetRole) => {
    if (!dragState) return;
    if (dragState.type === 'participant') {
      if (!isAssignable(dragState.item, targetRole)) {
        setDragState(null);
        return;
      }
      handleAssign(targetSlotKey, dragState.item.name);
      setDragState(null);
      return;
    }
    if (dragState.type === 'slot') {
      if (dragState.slotKey === targetSlotKey) {
        setDragState(null);
        return;
      }
      if (getRoleType(dragState.role) !== getRoleType(targetRole)) {
        setDragState(null);
        return;
      }
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
          <div className="mx-auto flex max-w-[108rem] items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-[#335b95]/65 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-cyan-300/40 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/28 bg-cyan-300/12 px-4 py-2.5 text-base font-medium text-cyan-100 transition hover:bg-cyan-300/18">유틸리티</a>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-[108rem] px-5 py-8 lg:px-8">
          <section className="rounded-[34px] border border-[#2a4e86]/55 bg-[linear-gradient(145deg,rgba(18,25,39,0.98),rgba(10,12,18,0.98))] p-8 shadow-2xl shadow-black/30 lg:p-10">
            <div className="text-sm font-bold tracking-[0.42em] text-orange-200/58">UTILITY TOOL</div>
            <div className="mt-4 text-[38px] font-black tracking-tight text-white sm:text-[52px]">오버워치 랜덤뽑기</div>
            <p className="mt-4 max-w-4xl text-base leading-8 text-white/68">왼쪽은 리모컨, 가운데는 포지션 보드, 오른쪽은 팀 결과판 구조로 정리했습니다. 포지션 보드 이름도 바로 드래그해서 슬롯에 넣을 수 있습니다.</p>
          </section>
          <section className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px] items-start">
            <SectionCard title="리모컨" desc="등록, 검색, 모드 변경, 팀 수, 복사까지 왼쪽에 모았습니다." className="xl:sticky xl:top-24">
              <div className="grid gap-3">
                <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="스트리머 이름 입력 (쉼표/엔터 지원)" className={FIELD_CLASS} />
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <select value={positionInput} onChange={(e) => setPositionInput(e.target.value)} className={FIELD_CLASS}>
                    <option value="tank">🛡️ 탱커</option>
                    <option value="dps">⚔️ 딜러</option>
                    <option value="support">💚 힐러</option>
                    <option value="random">❓ 랜덤</option>
                  </select>
                  <button onClick={addParticipant} className="rounded-2xl border border-cyan-300/30 bg-cyan-300/14 px-5 py-3 text-base font-bold text-cyan-100 transition hover:bg-cyan-300/20">등록</button>
                </div>
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="포지션 보드 검색" className={FIELD_CLASS} />
              </div>
              <div className="mt-4 rounded-2xl border border-[#335b95]/65 bg-[#111a28] px-4 py-4"><div className="text-sm text-white/46">등록 인원</div><div className="mt-2 text-[28px] font-black text-white">{participants.length}</div></div>
              <div className="mt-4">
                <div className="text-sm font-bold text-white/50">게임 방식</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <OptionPill active={mode === '5v5'} onClick={() => setMode('5v5')} tone="orange">5 vs 5</OptionPill>
                  <OptionPill active={mode === '6v6'} onClick={() => setMode('6v6')} tone="orange">6 vs 6</OptionPill>
                </div>
              </div>
              <div className="mt-5">
                <div className="text-sm font-bold text-white/50">팀 수</div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => (
                    <OptionPill key={count} active={teamCount === count} onClick={() => handleTeamCount(count)}>{count}팀</OptionPill>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <button onClick={handleShuffle} className="rounded-2xl border border-orange-300/35 bg-orange-400/16 px-4 py-4 text-base font-black text-orange-50 transition hover:bg-orange-400/22">랜덤 섞기</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleReset} className="rounded-2xl border border-[#335b95]/65 bg-[#111a28] px-4 py-4 text-base font-bold text-white/82 transition hover:bg-[#172334]">잠금 제외 초기화</button>
                  <button onClick={copyResult} className="rounded-2xl border border-cyan-300/30 bg-cyan-300/14 px-4 py-4 text-base font-bold text-cyan-100 transition hover:bg-cyan-300/20">결과 복사</button>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {Array.from({ length: teamCount }, (_, index) => (
                  <input key={`captain-${index}`} value={captainInputs[index] || ''} onChange={(e) => setCaptainInputs((prev) => { const next = [...prev]; next[index] = e.target.value; return next; })} placeholder={`팀장 이름 ${index + 1}`} className={FIELD_CLASS} />
                ))}
              </div>
            </SectionCard>
            <SectionCard title="포지션 보드" desc="가운데 포지션 보드에서 바로 드래그해서 팀 슬롯으로 옮길 수 있습니다.">
              <div className="grid gap-4 xl:grid-cols-2">
                <RoleBoard title="탱커" type="tank" participants={grouped.tank} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} />
                <RoleBoard title="딜러" type="dps" participants={grouped.dps} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} />
                <RoleBoard title="힐러" type="support" participants={grouped.support} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} />
                <RoleBoard title="랜덤" type="random" participants={grouped.random} assignedNames={assignedNames} onRemove={removeParticipant} onParticipantDragStart={handleParticipantDragStart} onParticipantDragEnd={handleDragEnd} />
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-7 text-cyan-100/80">이미 배정된 인원은 흐리게 보이고, 미배정 인원만 드래그할 수 있습니다. 슬롯에 들어간 이름은 같은 포지션끼리 드래그 교체가 가능합니다.</div>
            </SectionCard>
            <SectionCard title="팀 결과판" desc="오른쪽에 고정감 있게 두고, 팀 수가 많아지면 아래로 이어서 보이게 했습니다.">
              <div className="space-y-4">
                {Array.from({ length: teamCount }, (_, idx) => idx + 1).map((teamNo) => (
                  <TeamPanel key={teamNo} teamNo={teamNo} captain={captainInputs[teamNo - 1] || ''} roles={roles} assignments={assignments} locks={locks} participants={participants} onAssign={handleAssign} onToggleLock={handleToggleLock} dragState={dragState} onSlotDragStart={handleSlotDragStart} onSlotDragEnd={handleDragEnd} onSlotDrop={handleSlotDrop} />
                ))}
              </div>
            </SectionCard>
          </section>
        </main>
      </div>
    </>
  );
}

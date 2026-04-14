import Head from 'next/head';
import { useMemo, useState } from 'react';

const POSITION_META = {
  tank: {
    label: '탱커',
    icon: '🛡️',
    chip: 'border-sky-400/35 bg-sky-400/12 text-sky-100',
    card: 'border-sky-400/20 bg-[linear-gradient(180deg,rgba(11,25,43,0.98),rgba(8,14,23,0.98))]',
    slot: 'border-sky-300/18 bg-sky-400/[0.07] text-sky-100',
  },
  dps: {
    label: '딜러',
    icon: '⚔️',
    chip: 'border-orange-400/35 bg-orange-400/12 text-orange-100',
    card: 'border-orange-400/20 bg-[linear-gradient(180deg,rgba(38,20,10,0.98),rgba(17,12,10,0.98))]',
    slot: 'border-orange-300/18 bg-orange-400/[0.07] text-orange-100',
  },
  support: {
    label: '힐러',
    icon: '💚',
    chip: 'border-emerald-400/35 bg-emerald-400/12 text-emerald-100',
    card: 'border-emerald-400/20 bg-[linear-gradient(180deg,rgba(10,30,22,0.98),rgba(9,16,14,0.98))]',
    slot: 'border-emerald-300/18 bg-emerald-400/[0.07] text-emerald-100',
  },
  random: {
    label: '랜덤',
    icon: '❓',
    chip: 'border-violet-400/35 bg-violet-400/12 text-violet-100',
    card: 'border-violet-400/20 bg-[linear-gradient(180deg,rgba(27,17,39,0.98),rgba(13,11,19,0.98))]',
    slot: 'border-violet-300/18 bg-violet-400/[0.07] text-violet-100',
  },
};

const TEAM_ACCENTS = [
  'from-sky-300/22 via-sky-400/8 to-transparent border-sky-300/24',
  'from-orange-300/22 via-orange-400/8 to-transparent border-orange-300/24',
  'from-emerald-300/22 via-emerald-400/8 to-transparent border-emerald-300/24',
  'from-violet-300/22 via-violet-400/8 to-transparent border-violet-300/24',
  'from-rose-300/22 via-rose-400/8 to-transparent border-rose-300/24',
];

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

function SectionCard({ title, desc, children, action }) {
  return (
    <section className="rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(11,16,27,0.96),rgba(8,11,18,0.98))] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold tracking-[0.18em] text-white/42">{title}</div>
          {desc ? <div className="mt-2 text-sm leading-7 text-white/62">{desc}</div> : null}
        </div>
        {action || null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function RoleBoard({ title, type, participants, onRemove }) {
  const meta = POSITION_META[type];
  return (
    <div className={`rounded-[22px] border p-4 ${meta.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-base font-extrabold text-white">{meta.icon} {title}</div>
        <div className="text-sm text-white/48">{participants.length}명</div>
      </div>
      <div className="mt-4 flex min-h-[88px] flex-wrap gap-2">
        {participants.length ? participants.map((item) => (
          <div key={item.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold ${meta.chip}`}>
            <span>{item.name}</span>
            <button onClick={() => onRemove(item.name)} className="rounded-full px-1 text-white/45 transition hover:text-red-200">×</button>
          </div>
        )) : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-white/40">등록된 인원이 없습니다.</div>}
      </div>
    </div>
  );
}

function TeamPanel({ teamNo, captain, roles, assignments, locks, participants, onAssign, onToggleLock }) {
  const accent = TEAM_ACCENTS[(teamNo - 1) % TEAM_ACCENTS.length];
  return (
    <div className="rounded-[26px] border border-white/12 bg-[#0a1019] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.24)]">
      <div className={`mb-4 rounded-[18px] border bg-gradient-to-r px-4 py-4 ${accent}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[22px] font-black tracking-tight text-white">TEAM {teamNo}</div>
            <div className="mt-1 text-sm text-white/62">팀장: {captain || '-'}</div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold tracking-[0.22em] text-white/58">RESULT</div>
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
          return (
            <div key={key} className={`rounded-[20px] border px-4 py-4 ${selected ? roleMeta.slot : 'border-white/10 bg-[#121926] text-white'}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-base font-bold">{roleMeta.icon} {role}</div>
                <button
                  onClick={() => onToggleLock(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${locks[key] ? 'border border-cyan-300/28 bg-cyan-300/12 text-cyan-100' : 'border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'}`}
                >
                  {locks[key] ? '잠금됨' : '잠금'}
                </button>
              </div>
              <select
                value={selected}
                onChange={(e) => onAssign(key, e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0c1320] px-4 py-3 text-base text-white outline-none focus:border-cyan-300/35"
              >
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

  const roles = useMemo(() => getRoleTemplate(mode), [mode]);
  const grouped = useMemo(() => ({
    tank: participants.filter((item) => item.position === 'tank'),
    dps: participants.filter((item) => item.position === 'dps'),
    support: participants.filter((item) => item.position === 'support'),
    random: participants.filter((item) => item.position === 'random'),
  }), [participants]);
  const totalSlots = teamCount * roles.length;

  const handleTeamCount = (value) => {
    const nextCount = Math.max(2, Math.min(10, Number(value) || 2));
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
    const pools = {
      tank: shuffleArray(grouped.tank),
      dps: shuffleArray(grouped.dps),
      support: shuffleArray(grouped.support),
      random: shuffleArray(grouped.random),
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
            <a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-white/25 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]"><img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" /></a>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/15 px-4 py-2.5 text-base font-medium text-[#b8d8ff] transition hover:bg-[#3b82f6]/22">유틸리티</a>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-[108rem] px-5 py-8 lg:px-8">
          <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(23,28,40,0.98),rgba(10,12,18,0.98))] p-8 shadow-2xl shadow-black/30 lg:p-10">
            <div className="text-sm font-bold tracking-[0.42em] text-orange-200/58">UTILITY TOOL</div>
            <div className="mt-4 text-[38px] font-black tracking-tight text-white sm:text-[52px]">오버워치 랜덤뽑기</div>
            <p className="mt-4 max-w-4xl text-base leading-8 text-white/68">등록 / 설정 / 결과를 한눈에 보이도록 다시 정리했습니다. 팀 결과판 대비를 높이고, 포지션별 색상 구분과 액션 버튼 우선순위를 더 분명하게 잡았습니다.</p>
          </section>
          <section className="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-6">
              <SectionCard title="등록" desc="스트리머를 먼저 넣고 포지션별 보드에서 분포를 확인하세요.">
                <div className="grid gap-3">
                  <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="이름 입력 (쉼표/엔터 지원)" className="w-full rounded-2xl border border-white/12 bg-[#121926] px-4 py-3 text-base text-white outline-none placeholder:text-white/28 focus:border-cyan-300/35" />
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <select value={positionInput} onChange={(e) => setPositionInput(e.target.value)} className="w-full rounded-2xl border border-white/12 bg-[#121926] px-4 py-3 text-base text-white outline-none focus:border-cyan-300/35">
                      <option value="tank">🛡️ 탱커</option>
                      <option value="dps">⚔️ 딜러</option>
                      <option value="support">💚 힐러</option>
                      <option value="random">❓ 랜덤</option>
                    </select>
                    <button onClick={addParticipant} className="rounded-2xl border border-cyan-300/28 bg-cyan-300/12 px-5 py-3 text-base font-semibold text-cyan-100 transition hover:bg-cyan-300/20">등록</button>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-7 text-white/48">예시) 장지수, 봉준, 김민교 처럼 여러 명을 한 번에 넣을 수 있습니다.</div>
              </SectionCard>
              <SectionCard title="요약" desc="전체 인원과 필요 슬롯을 먼저 확인하세요.">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"><div className="text-sm text-white/48">등록 인원</div><div className="mt-2 text-[28px] font-black text-white">{participants.length}</div></div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"><div className="text-sm text-white/48">총 슬롯</div><div className="mt-2 text-[28px] font-black text-white">{totalSlots}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">{Object.entries(POSITION_META).map(([key, meta]) => (<div key={key} className={`rounded-full border px-3 py-2 text-sm font-semibold ${meta.chip}`}>{meta.icon} {meta.label} {grouped[key].length}명</div>))}</div>
              </SectionCard>
            </div>
            <div className="space-y-6">
              <SectionCard title="설정 / 컨트롤" desc="중요 버튼만 상단에 모아서 방송 중에도 바로 조작할 수 있게 구성했습니다.">
                <div className="grid gap-4 xl:grid-cols-[210px_210px_minmax(0,1fr)]">
                  <label className="rounded-2xl border border-white/10 bg-[#121926] px-4 py-4"><div className="text-sm text-white/48">팀 수</div><select value={teamCount} onChange={(e) => handleTeamCount(e.target.value)} className="mt-2 w-full bg-transparent text-[24px] font-black text-white outline-none">{Array.from({ length: 9 }, (_, index) => index + 2).map((count) => <option key={count} value={count}>{count}팀</option>)}</select></label>
                  <label className="rounded-2xl border border-white/10 bg-[#121926] px-4 py-4"><div className="text-sm text-white/48">게임 방식</div><select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-2 w-full bg-transparent text-[24px] font-black text-white outline-none"><option value="5v5">5 : 5</option><option value="6v6">6 : 6</option></select></label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button onClick={handleShuffle} className="rounded-2xl border border-[#ff6b5f]/30 bg-[#ff6b5f]/14 px-4 py-4 text-base font-bold text-[#ffd8d2] transition hover:bg-[#ff6b5f]/20">랜덤 섞기</button>
                    <button onClick={handleReset} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-base font-bold text-white/80 transition hover:bg-white/[0.09]">잠금 제외 초기화</button>
                    <button onClick={copyResult} className="rounded-2xl border border-cyan-300/28 bg-cyan-300/12 px-4 py-4 text-base font-bold text-cyan-100 transition hover:bg-cyan-300/20">결과 복사</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: teamCount }, (_, index) => (<input key={`captain-${index}`} value={captainInputs[index] || ''} onChange={(e) => setCaptainInputs((prev) => { const next = [...prev]; next[index] = e.target.value; return next; })} placeholder={`팀장 이름 ${index + 1}`} className="w-full rounded-2xl border border-white/10 bg-[#121926] px-4 py-3 text-base text-white outline-none placeholder:text-white/28 focus:border-cyan-300/35" />))}</div>
              </SectionCard>
              <SectionCard title="포지션 보드" desc="색 대비를 올리고 보드를 나눠서 현재 분포가 바로 보이도록 구성했습니다.">
                <div className="grid gap-4 xl:grid-cols-2">
                  <RoleBoard title="탱커" type="tank" participants={grouped.tank} onRemove={removeParticipant} />
                  <RoleBoard title="딜러" type="dps" participants={grouped.dps} onRemove={removeParticipant} />
                  <RoleBoard title="힐러" type="support" participants={grouped.support} onRemove={removeParticipant} />
                  <RoleBoard title="랜덤" type="random" participants={grouped.random} onRemove={removeParticipant} />
                </div>
              </SectionCard>
              <SectionCard title="팀 결과판" desc="결과 영역을 더 크게 확보해서 방송 중에도 각 팀 구성이 한눈에 들어오도록 정리했습니다.">
                <div className="grid gap-4 2xl:grid-cols-3 xl:grid-cols-2">{Array.from({ length: teamCount }, (_, idx) => idx + 1).map((teamNo) => (<TeamPanel key={teamNo} teamNo={teamNo} captain={captainInputs[teamNo - 1] || ''} roles={roles} assignments={assignments} locks={locks} participants={participants} onAssign={handleAssign} onToggleLock={handleToggleLock} />))}</div>
              </SectionCard>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const POSITION_META = {
  tank: { label: '탱커', icon: '🛡️' },
  dps: { label: '딜러', icon: '⚔️' },
  support: { label: '힐러', icon: '💚' },
  flex: { label: '플렉스', icon: '❓' },
};

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
  return 'flex';
}

function getRoleLabel(role) {
  const roleType = getRoleType(role);
  const meta = POSITION_META[roleType] || POSITION_META.flex;
  return `${meta.icon} ${role}`;
}

function buildTeamOrder(orderMode, captainNames, teamCount) {
  const base = Array.from({ length: teamCount }, (_, index) => ({ teamNo: index + 1, captain: captainNames[index] || `팀 ${index + 1}` }));
  if (orderMode === 'shuffle') return shuffleArray(base);
  if (orderMode === 'reverse') return [...base].reverse();
  return base;
}

function OverwatchRandomPicker() {
  const [teamCount, setTeamCount] = useState(2);
  const [mode, setMode] = useState('5v5');
  const [orderMode, setOrderMode] = useState('manual');
  const [captainInputs, setCaptainInputs] = useState(['', '']);
  const [captainOrder, setCaptainOrder] = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [positionInput, setPositionInput] = useState('flex');
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [locks, setLocks] = useState({});

  const roleTemplate = useMemo(
    () => (mode === '6v6' ? ['탱커1', '탱커2', '딜러1', '딜러2', '힐러1', '힐러2'] : ['탱커', '딜러1', '딜러2', '힐러1', '힐러2']),
    [mode]
  );

  const teamOrder = useMemo(() => {
    const base = buildTeamOrder(orderMode, captainInputs, teamCount);
    return captainOrder.length === teamCount ? captainOrder : base;
  }, [captainInputs, captainOrder, orderMode, teamCount]);

  const slotOrder = useMemo(() => {
    const orderedTeamNumbers = teamOrder.map((item) => item.teamNo);
    return roleTemplate.flatMap((role) => orderedTeamNumbers.map((teamNo) => `${teamNo}-${role}`));
  }, [roleTemplate, teamOrder]);

  useEffect(() => {
    setCaptainInputs((prev) => {
      const next = Array.from({ length: teamCount }, (_, index) => prev[index] || '');
      return next;
    });
    setCaptainOrder((prev) => prev.filter((item) => item.teamNo <= teamCount));
    setAssignments((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const [teamNo, role] = key.split('-');
        if (Number(teamNo) <= teamCount && roleTemplate.includes(role)) next[key] = value;
      });
      return next;
    });
    setLocks((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const [teamNo, role] = key.split('-');
        if (Number(teamNo) <= teamCount && roleTemplate.includes(role)) next[key] = value;
      });
      return next;
    });
  }, [teamCount, roleTemplate]);

  const addParticipant = () => {
    const name = nameInput.trim();
    if (!name) return;
    setParticipants((prev) => {
      if (prev.some((item) => item.name === name)) return prev;
      return [...prev, { id: `${Date.now()}-${name}`, name, position: positionInput }];
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

  const toggleLock = (slotKey) => {
    setLocks((prev) => ({ ...prev, [slotKey]: !prev[slotKey] }));
  };

  const setManualAssignment = (slotKey, value) => {
    setAssignments((prev) => ({ ...prev, [slotKey]: value }));
  };

  const drawCaptainOrder = () => {
    setCaptainOrder(buildTeamOrder(orderMode === 'manual' ? 'shuffle' : orderMode, captainInputs, teamCount));
  };

  const handleShuffle = () => {
    const lockedNames = new Set(
      Object.entries(assignments)
        .filter(([slotKey, value]) => locks[slotKey] && value)
        .map(([, value]) => value)
    );

    const availableByRole = {
      tank: shuffleArray(participants.filter((item) => !lockedNames.has(item.name) && item.position === 'tank')),
      dps: shuffleArray(participants.filter((item) => !lockedNames.has(item.name) && item.position === 'dps')),
      support: shuffleArray(participants.filter((item) => !lockedNames.has(item.name) && item.position === 'support')),
      flex: shuffleArray(participants.filter((item) => !lockedNames.has(item.name) && item.position === 'flex')),
    };
    const used = new Set(lockedNames);

    const takePlayer = (roleType) => {
      const primary = availableByRole[roleType].find((item) => !used.has(item.name));
      if (primary) {
        used.add(primary.name);
        return primary.name;
      }
      const flex = availableByRole.flex.find((item) => !used.has(item.name));
      if (flex) {
        used.add(flex.name);
        return flex.name;
      }
      const fallback = participants.find((item) => !used.has(item.name));
      if (fallback) {
        used.add(fallback.name);
        return fallback.name;
      }
      return '';
    };

    setAssignments((prev) => {
      const next = { ...prev };
      slotOrder.forEach((slotKey) => {
        if (locks[slotKey]) return;
        const [, role] = slotKey.split('-');
        next[slotKey] = takePlayer(getRoleType(role));
      });
      return next;
    });
  };

  const handleResetUnlocked = () => {
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((slotKey) => {
        if (!locks[slotKey]) next[slotKey] = '';
      });
      return next;
    });
  };

  const handleClearAll = () => {
    setParticipants([]);
    setAssignments({});
    setLocks({});
    setCaptainOrder([]);
    setCaptainInputs(Array.from({ length: teamCount }, () => ''));
    setNameInput('');
  };

  const copyResult = async () => {
    const text = teamOrder
      .map((team) => {
        const header = `팀 ${team.teamNo}${team.captain ? ` (${team.captain})` : ''}`;
        const lines = roleTemplate.map((role) => `${role}: ${assignments[`${team.teamNo}-${role}`] || '-'}`);
        return [header, ...lines].join('\n');
      })
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const totalSlots = teamCount * roleTemplate.length;

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,20,0.98),rgba(7,10,18,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] lg:p-6">
      <div className="grid gap-6 xl:grid-cols-[1.04fr_1.96fr]">
        <div className="space-y-5">
          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5">
            <div className="text-sm font-bold tracking-[0.18em] text-white/40">SETTINGS</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label>
                <div className="mb-2 text-sm font-semibold text-white">팀 수</div>
                <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40">
                  {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => <option key={count} value={count}>{count}팀</option>)}
                </select>
              </label>
              <label>
                <div className="mb-2 text-sm font-semibold text-white">게임 방식</div>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40">
                  <option value="5v5">5 : 5</option>
                  <option value="6v6">6 : 6</option>
                </select>
              </label>
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-300/5 px-4 py-3 text-sm leading-6 text-white/65">현재 {teamCount}팀 / {mode === '6v6' ? '팀당 6명' : '팀당 5명'} 구성입니다. 총 슬롯은 {totalSlots}칸입니다.</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5">
            <div className="text-sm font-bold tracking-[0.18em] text-white/40">팀 뽑기 순서</div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: teamCount }, (_, index) => (
                <input
                  key={`captain-${index}`}
                  value={captainInputs[index] || ''}
                  onChange={(e) => setCaptainInputs((prev) => {
                    const next = [...prev];
                    next[index] = e.target.value;
                    return next;
                  })}
                  placeholder={`팀장 이름 ${index + 1}`}
                  className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-cyan-300/40"
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <select value={orderMode} onChange={(e) => setOrderMode(e.target.value)} className="rounded-full border border-white/10 bg-[#111827] px-4 py-2 text-sm text-white outline-none focus:border-cyan-300/40">
                <option value="manual">무작위 추첨</option>
                <option value="reverse">역순 추첨</option>
                <option value="shuffle">완전 랜덤</option>
              </select>
              <button onClick={drawCaptainOrder} className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/18">순서 추첨</button>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#111827] p-4">
              <div className="text-xs font-bold tracking-[0.18em] text-white/40">추첨 결과</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(teamOrder.length ? teamOrder : buildTeamOrder('manual', captainInputs, teamCount)).map((team, index) => (
                  <div key={`${team.teamNo}-${index}`} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100">
                    {index + 1}. {team.captain || `팀 ${team.teamNo}`}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5">
            <div className="text-sm font-bold tracking-[0.18em] text-white/40">스트리머 등록</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="이름 입력" className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-cyan-300/40" />
              <select value={positionInput} onChange={(e) => setPositionInput(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40">
                <option value="tank">🛡️ 탱커</option>
                <option value="dps">⚔️ 딜러</option>
                <option value="support">💚 힐러</option>
                <option value="flex">❓ 플렉스</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button onClick={addParticipant} className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/18">등록</button>
              <button onClick={handleClearAll} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10">전체 초기화</button>
            </div>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {participants.length ? participants.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111827] px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-white">{item.name}</div>
                    <div className="mt-1 text-xs text-white/45">{POSITION_META[item.position].icon} {POSITION_META[item.position].label}</div>
                  </div>
                  <button onClick={() => removeParticipant(item.name)} className="text-xs font-semibold text-white/45 transition hover:text-red-300">삭제</button>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">등록된 참가자가 없습니다.</div>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold tracking-[0.18em] text-white/40">OVERWATCH RANDOM PICKER</div>
                <div className="mt-2 text-sm leading-6 text-white/58">포지션 우선 배치, 잠금 유지, 팀장 순서 반영까지 지원합니다.</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleShuffle} className="rounded-full border border-[#ff4e45]/30 bg-[#ff4e45]/15 px-4 py-2 text-sm font-semibold text-[#ffd0cb] transition hover:bg-[#ff4e45]/22">랜덤 섞기</button>
                <button onClick={copyResult} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10">결과 복사</button>
                <button onClick={handleResetUnlocked} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10">잠금 제외 초기화</button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {teamOrder.map((team) => (
              <div key={team.teamNo} className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-extrabold text-white">팀 {team.teamNo}</div>
                    <div className="mt-1 text-xs text-white/45">팀장: {team.captain || '-'}</div>
                  </div>
                  <div className="text-xs font-semibold tracking-[0.18em] text-white/35">{mode.toUpperCase()}</div>
                </div>
                <div className="space-y-3">
                  {roleTemplate.map((role) => {
                    const slotKey = `${team.teamNo}-${role}`;
                    const locked = Boolean(locks[slotKey]);
                    const roleType = getRoleType(role);
                    const candidates = participants.filter((item) => item.position === roleType || item.position === 'flex');
                    return (
                      <div key={slotKey} className={`rounded-[20px] border px-4 py-3 transition ${locked ? 'border-cyan-300/30 bg-cyan-300/10' : 'border-white/10 bg-[#111827]'}`}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="text-sm font-bold text-white">{getRoleLabel(role)}</div>
                          <button onClick={() => toggleLock(slotKey)} className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${locked ? 'border border-cyan-300/30 bg-cyan-300/15 text-cyan-100' : 'border border-white/10 bg-white/5 text-white/55'}`}>
                            {locked ? '잠금됨' : '잠금'}
                          </button>
                        </div>
                        <select value={assignments[slotKey] || ''} onChange={(e) => setManualAssignment(slotKey, e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0d1420] px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/40">
                          <option value="">선수 선택</option>
                          {candidates.map((item) => <option key={`${slotKey}-${item.id}`} value={item.name}>{item.name} · {POSITION_META[item.position].label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverwatchRandomPage() {
  return (
    <>
      <Head>
        <title>오버워치 랜덤뽑기 | 장지수 팬 아카이브</title>
        <meta name="description" content="오버워치 랜덤뽑기 유틸리티" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-white/25 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]">
              <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
            </a>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <a href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10">홈으로</a>
              <a href="https://cafe.naver.com/quaddurupfancafe" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#03C75A]/30 bg-[#03C75A]/15 px-4 py-2 text-sm font-medium text-[#8df0b6] transition hover:bg-[#03C75A]/22">팬카페</a>
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/15 px-4 py-2 text-sm font-medium text-[#b8d8ff] transition hover:bg-[#3b82f6]/22">유틸리티</a>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(30,34,43,0.98),rgba(10,12,18,0.98))] p-7 shadow-2xl shadow-black/30 lg:p-9">
            <div className="text-xs font-bold tracking-[0.45em] text-orange-200/58">UTILITY TOOL</div>
            <div className="mt-4 text-[34px] font-black tracking-tight text-white sm:text-[44px]">오버워치 랜덤뽑기</div>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/60">포지션 등록, 팀장 순서 추첨, 라인 잠금, 잠금 제외 초기화까지 반영한 별도 페이지형 방송용 랜덤 편성 툴입니다.</p>
          </section>
          <section className="mt-8">
            <OverwatchRandomPicker />
          </section>
        </main>
      </div>
    </>
  );
}

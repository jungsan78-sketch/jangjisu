import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

function shuffleArray(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function OverwatchRandomPicker() {
  const [teamCount, setTeamCount] = useState(2);
  const [mode, setMode] = useState('5v5');
  const [pickOrder, setPickOrder] = useState('normal');
  const [nameInput, setNameInput] = useState('');
  const [participants, setParticipants] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [locks, setLocks] = useState({});

  const roleTemplate = useMemo(() => (mode === '6v6' ? ['탱커1', '탱커2', '딜러1', '딜러2', '힐러1', '힐러2'] : ['탱커', '딜러1', '딜러2', '힐러1', '힐러2']), [mode]);

  const slotOrder = useMemo(() => {
    const teamIndexes = Array.from({ length: teamCount }, (_, index) => index + 1);
    if (pickOrder === 'reverse') teamIndexes.reverse();
    if (pickOrder === 'snake') {
      const first = [...teamIndexes];
      const second = [...teamIndexes].reverse();
      const snake = [];
      roleTemplate.forEach((_, roleIndex) => {
        snake.push(...(roleIndex % 2 === 0 ? first : second));
      });
      return snake.flatMap((teamNo, idx) => {
        const roleIndex = Math.floor(idx / teamCount);
        const role = roleTemplate[roleIndex];
        return role ? [`${teamNo}-${role}`] : [];
      });
    }
    return roleTemplate.flatMap((role) => teamIndexes.map((teamNo) => `${teamNo}-${role}`));
  }, [pickOrder, roleTemplate, teamCount]);

  const totalSlots = teamCount * roleTemplate.length;

  useEffect(() => {
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

  const addParticipants = () => {
    const names = nameInput.split(/\n|,/).map((name) => name.trim()).filter(Boolean);
    if (!names.length) return;
    setParticipants((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      names.forEach((name) => {
        if (!seen.has(name)) {
          seen.add(name);
          next.push(name);
        }
      });
      return next;
    });
    setNameInput('');
  };

  const removeParticipant = (name) => {
    setParticipants((prev) => prev.filter((item) => item !== name));
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === name) next[key] = '';
      });
      return next;
    });
  };

  const toggleLock = (key) => {
    setLocks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setManualAssignment = (key, value) => {
    setAssignments((prev) => ({ ...prev, [key]: value }));
  };

  const handleShuffle = () => {
    const lockedNames = Object.entries(assignments)
      .filter(([key, value]) => locks[key] && value)
      .map(([, value]) => value);
    const lockedNameSet = new Set(lockedNames);
    const randomPool = shuffleArray(participants.filter((name) => !lockedNameSet.has(name)));
    let poolIndex = 0;

    setAssignments((prev) => {
      const next = { ...prev };
      slotOrder.forEach((slotKey) => {
        if (locks[slotKey]) return;
        next[slotKey] = randomPool[poolIndex] || '';
        poolIndex += 1;
      });
      return next;
    });
  };

  const handleReset = () => {
    setAssignments({});
    setLocks({});
  };

  const handleClearAll = () => {
    setParticipants([]);
    setAssignments({});
    setLocks({});
    setNameInput('');
  };

  const copyResult = async () => {
    const text = Array.from({ length: teamCount }, (_, teamIndex) => {
      const teamNo = teamIndex + 1;
      const lines = roleTemplate.map((role) => `${role}: ${assignments[`${teamNo}-${role}`] || '-'}`);
      return [`팀 ${teamNo}`, ...lines].join('\n');
    }).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const teams = Array.from({ length: teamCount }, (_, index) => index + 1);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,20,0.98),rgba(7,10,18,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] lg:p-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
        <div className="space-y-5">
          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5">
            <div className="text-sm font-bold tracking-[0.18em] text-white/40">SETTINGS</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-white">팀 수</div>
                <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40">
                  {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => <option key={count} value={count}>{count}팀</option>)}
                </select>
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-white">게임 방식</div>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40">
                  <option value="5v5">5 : 5</option>
                  <option value="6v6">6 : 6</option>
                </select>
              </label>
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-white">팀 뽑기 순서</div>
                <select value={pickOrder} onChange={(e) => setPickOrder(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40">
                  <option value="normal">정순</option>
                  <option value="reverse">역순</option>
                  <option value="snake">스네이크</option>
                </select>
              </label>
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-300/5 px-4 py-3 text-sm leading-6 text-white/65">현재 {teamCount}팀 / {mode === '6v6' ? '팀당 6명' : '팀당 5명'} 구성입니다. 총 슬롯은 {totalSlots}칸입니다.</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5">
            <div className="text-sm font-bold tracking-[0.18em] text-white/40">PLAYERS</div>
            <textarea value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="참가자 이름을 줄바꿈 또는 쉼표로 입력" className="mt-4 h-36 w-full rounded-[22px] border border-white/10 bg-[#111827] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/40" />
            <div className="mt-3 flex flex-wrap gap-3">
              <button onClick={addParticipants} className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/18">참가자 등록</button>
              <button onClick={handleClearAll} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10">전체 초기화</button>
            </div>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {participants.length ? participants.map((name) => <div key={name} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111827] px-4 py-3"><span className="text-sm font-medium text-white">{name}</span><button onClick={() => removeParticipant(name)} className="text-xs font-semibold text-white/45 transition hover:text-red-300">삭제</button></div>) : <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">등록된 참가자가 없습니다.</div>}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold tracking-[0.18em] text-white/40">OVERWATCH RANDOM PICKER</div>
                <div className="mt-2 text-sm leading-6 text-white/58">잠금된 라인은 유지한 채로 다시 랜덤 배치할 수 있습니다.</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={handleShuffle} className="rounded-full border border-[#ff4e45]/30 bg-[#ff4e45]/15 px-4 py-2 text-sm font-semibold text-[#ffd0cb] transition hover:bg-[#ff4e45]/22">랜덤 섞기</button>
                <button onClick={copyResult} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10">결과 복사</button>
                <button onClick={handleReset} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10">잠금 제외 초기화</button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {teams.map((teamNo) => (
              <div key={teamNo} className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold text-white">팀 {teamNo}</div>
                  <div className="text-xs font-semibold tracking-[0.18em] text-white/35">{mode.toUpperCase()}</div>
                </div>
                <div className="space-y-3">
                  {roleTemplate.map((role) => {
                    const slotKey = `${teamNo}-${role}`;
                    const locked = Boolean(locks[slotKey]);
                    return (
                      <div key={slotKey} className={`rounded-[20px] border px-4 py-3 transition ${locked ? 'border-cyan-300/30 bg-cyan-300/10' : 'border-white/10 bg-[#111827]'}`}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="text-sm font-bold text-white">{role}</div>
                          <button onClick={() => toggleLock(slotKey)} className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${locked ? 'border border-cyan-300/30 bg-cyan-300/15 text-cyan-100' : 'border border-white/10 bg-white/5 text-white/55'}`}>
                            {locked ? '잠금됨' : '잠금'}
                          </button>
                        </div>
                        <select value={assignments[slotKey] || ''} onChange={(e) => setManualAssignment(slotKey, e.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0d1420] px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40">
                          <option value="">선수 선택</option>
                          {participants.map((name) => <option key={name} value={name}>{name}</option>)}
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
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10">유틸리티</a>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30 lg:p-9">
            <div className="text-xs font-bold tracking-[0.45em] text-white/38">UTILITY TOOL</div>
            <div className="mt-4 text-[34px] font-black tracking-tight text-white sm:text-[44px]">오버워치 랜덤뽑기</div>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/60">팀 수 2~10팀, 5:5 / 6:6 전환, 팀 뽑기 순서, 라인 잠금까지 지원하는 별도 페이지형 방송용 랜덤 편성 툴입니다.</p>
          </section>
          <section className="mt-8">
            <OverwatchRandomPicker />
          </section>
        </main>
      </div>
    </>
  );
}

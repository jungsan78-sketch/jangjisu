import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const ADMIN_STORAGE_KEY = 'sou-broadcast-admin-password';
const ADMIN_PASSWORD = ['032', '359'].join('');
const TITLE_INPUT_CLASS = 'min-w-0 rounded-2xl border border-teal-200/10 bg-white px-4 py-3 text-[16px] font-black text-slate-950 caret-teal-600 outline-none transition placeholder:text-slate-400 focus:border-teal-300/70 focus:ring-2 focus:ring-teal-300/20';
const PASSWORD_INPUT_CLASS = 'w-full rounded-2xl border border-teal-200/12 bg-white px-4 py-3 text-lg font-black text-slate-950 caret-teal-600 outline-none transition placeholder:text-slate-400 focus:border-teal-300/70 focus:ring-2 focus:ring-teal-300/20';

function parseMonthLabel(label) {
  const matched = String(label || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!matched) return null;
  return { year: Number(matched[1]), month: Number(matched[2]) };
}

function flattenBroadcasts(payload) {
  const seen = new Map();
  (payload?.items || []).forEach((day) => {
    (day.broadcasts || []).forEach((broadcast) => {
      if (!broadcast?.id || seen.has(broadcast.id)) return;
      seen.set(broadcast.id, { ...broadcast, dayNumber: day.dayNumber });
    });
  });
  return Array.from(seen.values()).sort((a, b) => {
    const dayDiff = Number(a.dayNumber || 0) - Number(b.dayNumber || 0);
    if (dayDiff) return dayDiff;
    return String(a.startedAt || '').localeCompare(String(b.startedAt || ''));
  });
}

function buildMemberStats(broadcasts) {
  const map = new Map();
  broadcasts.forEach((broadcast) => {
    const key = broadcast.member || '미분류';
    const prev = map.get(key) || { member: key, totalSeconds: 0, count: 0, image: broadcast.memberImage || '' };
    prev.totalSeconds += Number(broadcast.durationSeconds || 0);
    prev.count += 1;
    if (!prev.image && broadcast.memberImage) prev.image = broadcast.memberImage;
    map.set(key, prev);
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.member === '장지수') return -1;
    if (b.member === '장지수') return 1;
    return b.totalSeconds - a.totalSeconds || a.member.localeCompare(b.member, 'ko');
  });
}

function buildCalendarCells(monthLabel, broadcasts, selectedMember, filterMode) {
  const parsed = parseMonthLabel(monthLabel);
  if (!parsed) return [];
  const days = new Date(parsed.year, parsed.month, 0).getDate();
  const lead = new Date(parsed.year, parsed.month - 1, 1).getDay();
  const total = Math.ceil((lead + days) / 7) * 7;
  const map = new Map();

  broadcasts.forEach((broadcast) => {
    if (selectedMember !== '전체' && broadcast.member !== selectedMember) return;
    if (filterMode === 'edited' && !broadcast._overrideTitle) return;
    if (filterMode === 'long' && String(broadcast.title || '').length < 25) return;
    const day = Number(broadcast.dayNumber || 0);
    if (!day || day < 1 || day > days) return;
    const list = map.get(day) || [];
    list.push(broadcast);
    map.set(day, list);
  });

  return Array.from({ length: total }, (_, index) => {
    const day = index - lead + 1;
    if (day < 1 || day > days) return null;
    return { dayNumber: day, broadcasts: map.get(day) || [] };
  });
}

function durationText(broadcast) {
  return broadcast.durationText || '0분';
}

function displayTitle(broadcast, drafts, overrides) {
  return drafts[broadcast.id] ?? overrides[broadcast.id]?.title ?? '';
}

function CalendarBroadcastCard({ broadcast, overrideTitle, active, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full rounded-[18px] border p-3 text-left transition hover:-translate-y-0.5 ${active ? 'border-teal-200/35 bg-teal-300/[0.13] shadow-[0_0_24px_rgba(45,212,191,0.14)]' : 'border-teal-200/[0.10] bg-white/[0.045] hover:border-teal-200/25 hover:bg-teal-300/[0.08]'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-black/24 px-2 py-1 text-[10px] font-black text-teal-50/80">{durationText(broadcast)}</span>
        {overrideTitle ? <span className="rounded-full bg-emerald-300/14 px-2 py-1 text-[10px] font-black text-emerald-50">수정됨</span> : null}
      </div>
      <div className="line-clamp-3 text-[14px] font-black leading-snug text-white sm:text-[15px]" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
        {overrideTitle || broadcast.title}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-black text-white/40">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-200/65" />
        <span>{broadcast.member}</span>
      </div>
    </button>
  );
}

export default function BroadcastAdminPage() {
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [payload, setPayload] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState('장지수');
  const [filterMode, setFilterMode] = useState('all');
  const [editingId, setEditingId] = useState('');

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_STORAGE_KEY) : '';
      if (saved === ADMIN_PASSWORD) {
        setPassword(saved);
        setAuthorized(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!authorized) return undefined;
    let mounted = true;

    async function load() {
      setLoading(true);
      setMessage('');
      try {
        const [summaryRes, overridesRes] = await Promise.all([
          fetch(`/api/prison-broadcast-summary?t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/prison-broadcast-overrides?t=${Date.now()}`, { cache: 'no-store' }),
        ]);
        const summaryJson = summaryRes.ok ? await summaryRes.json() : null;
        const overridesJson = overridesRes.ok ? await overridesRes.json() : null;
        if (!mounted) return;
        setPayload(summaryJson || null);
        const nextOverrides = overridesJson?.overrides || {};
        setOverrides(nextOverrides);
        setDrafts(Object.fromEntries(Object.entries(nextOverrides).map(([id, value]) => [id, value?.title || ''])));
        if (!summaryJson?.ok) setMessage(summaryJson?.message || '다시보기 목록을 아직 불러오지 못했습니다.');
      } catch {
        if (mounted) setMessage('목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [authorized]);

  const broadcasts = useMemo(() => flattenBroadcasts(payload).map((broadcast) => ({
    ...broadcast,
    _overrideTitle: overrides[broadcast.id]?.title || '',
  })), [payload, overrides]);
  const memberStats = useMemo(() => buildMemberStats(broadcasts), [broadcasts]);
  const cells = useMemo(() => buildCalendarCells(payload?.monthLabel, broadcasts, selectedMember, filterMode), [payload?.monthLabel, broadcasts, selectedMember, filterMode]);
  const editingBroadcast = broadcasts.find((broadcast) => broadcast.id === editingId) || null;

  useEffect(() => {
    if (!memberStats.length) return;
    if (selectedMember !== '전체' && !memberStats.some((stat) => stat.member === selectedMember)) setSelectedMember(memberStats[0].member);
  }, [memberStats, selectedMember]);

  function handleLogin(event) {
    event.preventDefault();
    if (password.trim() !== ADMIN_PASSWORD) {
      setMessage('비밀번호가 맞지 않습니다.');
      return;
    }
    try { localStorage.setItem(ADMIN_STORAGE_KEY, password.trim()); } catch {}
    setAuthorized(true);
    setMessage('');
  }

  async function saveTitle(broadcast) {
    const id = broadcast.id;
    const title = String(drafts[id] ?? '').trim();
    setSavingId(id);
    setMessage('');
    try {
      const res = await fetch('/api/prison-broadcast-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password.trim() },
        body: JSON.stringify({ id, title }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || '저장 실패');
      setOverrides(json.overrides || {});
      setDrafts((prev) => ({ ...prev, [id]: title }));
      setMessage(title ? '수정 제목을 저장했습니다.' : '수정 제목을 원본으로 되돌렸습니다.');
    } catch (error) {
      setMessage(error.message || '저장하지 못했습니다.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <>
      <Head>
        <title>다시보기 달력 관리자 | 장지수용소</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrisonPageChrome wide>
        <div className="min-h-[calc(100vh-56px)] w-full pt-0">
          <section className="relative z-10 mx-auto w-full rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_28%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
            <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-[34px] font-black tracking-[-0.04em] sm:text-[44px]">다시보기 달력 관리자</div>
                <p className="mt-2 text-sm font-bold leading-6 text-white/52 sm:text-base">달력에서 날짜별 다시보기를 클릭해서 사이트 표시 제목만 빠르게 수정합니다.</p>
              </div>
              <a href="/jangjisu-prison/broadcast-summary" className="w-fit rounded-full bg-teal-300/12 px-5 py-3 text-sm font-black text-teal-50 transition hover:bg-teal-300/20">달력 보기</a>
            </div>

            {!authorized ? (
              <form onSubmit={handleLogin} className="max-w-md rounded-[24px] bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <label className="mb-2 block text-sm font-black text-white/70">관리자 비밀번호</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={PASSWORD_INPUT_CLASS} placeholder="비밀번호 입력" />
                {message ? <div className="mt-3 text-sm font-black text-rose-200">{message}</div> : null}
                <button type="submit" className="mt-4 rounded-2xl bg-teal-300/16 px-5 py-3 text-sm font-black text-teal-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-teal-300/24">들어가기</button>
              </form>
            ) : (
              <div>
                <div className="mb-4 rounded-[24px] bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-black text-white/64">{payload?.monthLabel || '이번 달'} · {loading ? '불러오는 중' : `${broadcasts.length}개 다시보기`}</div>
                    <div className="flex flex-wrap gap-2">
                      {[['all', '전체'], ['edited', '수정된 제목만'], ['long', '긴 제목만']].map(([mode, label]) => (
                        <button key={mode} type="button" onClick={() => setFilterMode(mode)} className={`rounded-full px-3 py-2 text-xs font-black transition ${filterMode === mode ? 'bg-teal-300/18 text-teal-50 shadow-[0_0_18px_rgba(45,212,191,0.12)]' : 'bg-white/[0.045] text-white/52 hover:bg-white/[0.075] hover:text-white/80'}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button type="button" onClick={() => setSelectedMember('전체')} className={`rounded-full border px-3 py-2 text-sm font-black transition ${selectedMember === '전체' ? 'border-teal-200/32 bg-teal-300/14 text-white' : 'border-[#253f4c]/80 bg-slate-950/28 text-white/64 hover:border-teal-200/24 hover:text-white'}`}>전체</button>
                    {memberStats.map((stat) => (
                      <button key={stat.member} type="button" onClick={() => setSelectedMember(stat.member)} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition ${selectedMember === stat.member ? 'border-teal-200/32 bg-teal-300/14 text-white' : 'border-[#253f4c]/80 bg-slate-950/28 text-white/64 hover:border-teal-200/24 hover:text-white'}`}>
                        {stat.image ? <img src={stat.image} alt="" className="h-7 w-7 rounded-full object-cover" /> : null}
                        <span>{stat.member}</span>
                        <span className="rounded-full bg-black/22 px-2 py-1 text-[11px] text-white/50">{stat.count}개</span>
                      </button>
                    ))}
                  </div>
                </div>

                {message ? <div className="mb-4 rounded-2xl bg-teal-300/10 px-4 py-3 text-sm font-black text-teal-50">{message}</div> : null}

                {loading ? (
                  <div className="rounded-[22px] bg-white/[0.035] p-6 text-sm font-black text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">다시보기 목록을 불러오는 중입니다.</div>
                ) : cells.length ? (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="rounded-[26px] bg-[#05101d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
                      <div className="mb-3 grid grid-cols-7 gap-2 text-center text-sm font-black text-white/60 sm:gap-3 sm:text-base">
                        {DAY_LABELS.map((day, index) => <div key={day} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{day}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-2 sm:gap-3">
                        {cells.map((cell, index) => {
                          if (!cell) return <div key={`empty-${index}`} className="min-h-[130px] rounded-[18px] bg-white/[0.02] sm:min-h-[220px] sm:rounded-[24px]" />;
                          const hasItems = cell.broadcasts.length > 0;
                          const date = parseMonthLabel(payload?.monthLabel || '');
                          const weekday = date ? new Date(date.year, date.month - 1, cell.dayNumber).getDay() : 0;
                          return (
                            <div key={cell.dayNumber} className={`min-h-[130px] rounded-[18px] p-2.5 sm:min-h-[220px] sm:rounded-[24px] sm:p-3 ${hasItems ? 'bg-[linear-gradient(180deg,rgba(8,28,38,0.95),rgba(7,17,31,0.98))] shadow-[inset_0_0_0_1px_rgba(94,234,212,0.08)]' : 'bg-[#07111f]'}`}>
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className={`text-[16px] font-black sm:text-[20px] ${weekday === 0 ? 'text-[#ff8e8e]' : weekday === 6 ? 'text-[#89b4ff]' : 'text-white/92'}`}>{cell.dayNumber}</div>
                                {hasItems ? <span className="rounded-full bg-teal-300/12 px-2 py-1 text-[10px] font-black text-teal-50">{cell.broadcasts.length}개</span> : null}
                              </div>
                              <div className="space-y-2">
                                {cell.broadcasts.slice(0, 4).map((broadcast) => (
                                  <CalendarBroadcastCard
                                    key={broadcast.id}
                                    broadcast={broadcast}
                                    overrideTitle={displayTitle(broadcast, drafts, overrides)}
                                    active={editingId === broadcast.id}
                                    onOpen={() => setEditingId(broadcast.id)}
                                  />
                                ))}
                                {cell.broadcasts.length > 4 ? <div className="rounded-full bg-white/[0.045] px-2 py-1 text-center text-[11px] font-black text-white/46">+{cell.broadcasts.length - 4}개 더 있음</div> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <aside className="sticky top-6 h-fit rounded-[26px] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_46px_rgba(0,0,0,0.2)] sm:p-5">
                      {editingBroadcast ? (
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-black text-white/45">
                            <span className="rounded-full bg-teal-300/10 px-2.5 py-1 text-teal-50/75">{editingBroadcast.member}</span>
                            <span>{editingBroadcast.dayNumber}일</span>
                            <span>{durationText(editingBroadcast)}</span>
                            <a href={editingBroadcast.url} target="_blank" rel="noreferrer" className="text-teal-100/70 hover:text-teal-50">다시보기 열기 ↗</a>
                          </div>
                          <div className="mb-2 text-sm font-black text-white/46">원본 제목</div>
                          <div className="mb-4 rounded-2xl bg-black/24 p-3 text-[15px] font-black leading-6 text-white/82">{editingBroadcast.title}</div>
                          <label className="mb-2 block text-sm font-black text-white/66">사이트 표시 제목</label>
                          <textarea
                            value={drafts[editingBroadcast.id] ?? overrides[editingBroadcast.id]?.title ?? ''}
                            onChange={(event) => setDrafts((prev) => ({ ...prev, [editingBroadcast.id]: event.target.value }))}
                            className={`${TITLE_INPUT_CLASS} min-h-[120px] resize-y leading-6`}
                            placeholder="사이트에 표시할 제목 입력. 비우고 저장하면 원본 사용"
                          />
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => saveTitle(editingBroadcast)} disabled={savingId === editingBroadcast.id} className="rounded-2xl bg-teal-300/16 px-4 py-3 text-sm font-black text-teal-50 transition hover:bg-teal-300/24 disabled:opacity-45">{savingId === editingBroadcast.id ? '저장중' : '저장'}</button>
                            <button type="button" onClick={() => { setDrafts((prev) => ({ ...prev, [editingBroadcast.id]: '' })); }} className="rounded-2xl bg-white/[0.055] px-4 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.085]">원본으로 비우기</button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-black/18 p-5 text-sm font-bold leading-6 text-white/52">달력에서 수정할 다시보기 카드를 클릭하면 이곳에 편집창이 열립니다.</div>
                      )}
                    </aside>
                  </div>
                ) : (
                  <div className="rounded-[22px] bg-white/[0.035] p-6 text-sm font-black text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">표시할 다시보기가 없습니다. 다시보기 달력 API가 수집된 뒤 표시됩니다.</div>
                )}
              </div>
            )}
          </section>
        </div>
      </PrisonPageChrome>
    </>
  );
}

import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';

const ADMIN_STORAGE_KEY = 'sou-broadcast-admin-password';
const ADMIN_PASSWORD = ['032', '359'].join('');
const ADMIN_INPUT_CLASS = 'w-full rounded-2xl border border-teal-200/12 bg-white px-4 py-3 text-lg font-black text-slate-950 caret-teal-600 outline-none transition placeholder:text-slate-400 focus:border-teal-300/70 focus:ring-2 focus:ring-teal-300/20';
const TITLE_INPUT_CLASS = 'min-w-0 rounded-2xl border border-teal-200/10 bg-white px-4 py-3 text-[16px] font-black text-slate-950 caret-teal-600 outline-none transition placeholder:text-slate-400 focus:border-teal-300/70 focus:ring-2 focus:ring-teal-300/20';

function flattenBroadcasts(payload) {
  const seen = new Map();
  (payload?.items || []).forEach((day) => {
    (day.broadcasts || []).forEach((broadcast) => {
      if (!broadcast?.id || seen.has(broadcast.id)) return;
      seen.set(broadcast.id, { ...broadcast, dayNumber: day.dayNumber });
    });
  });
  return Array.from(seen.values()).sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
}

function formatDayLabel(broadcast) {
  const day = Number(broadcast?.dayNumber || 0);
  return day ? `${day}일` : '-';
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

  const broadcasts = useMemo(() => flattenBroadcasts(payload), [payload]);

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
            <div className="mb-7">
              <div className="text-[34px] font-black tracking-[-0.04em] sm:text-[44px]">다시보기 달력 관리자</div>
              <p className="mt-2 text-sm font-bold leading-6 text-white/52 sm:text-base">SOOP 원본 제목은 그대로 두고, 사이트에 표시될 제목만 덮어씁니다.</p>
            </div>

            {!authorized ? (
              <form onSubmit={handleLogin} className="max-w-md rounded-[24px] bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <label className="mb-2 block text-sm font-black text-white/70">관리자 비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="비밀번호 입력"
                />
                <button type="submit" className="mt-4 rounded-2xl bg-teal-300/16 px-5 py-3 text-sm font-black text-teal-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-teal-300/24">들어가기</button>
              </form>
            ) : (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="text-sm font-black text-white/64">{payload?.monthLabel || '이번 달'} · {loading ? '불러오는 중' : `${broadcasts.length}개 다시보기`}</div>
                  <a href="/jangjisu-prison/broadcast-summary" className="rounded-full bg-teal-300/12 px-4 py-2 text-xs font-black text-teal-50 transition hover:bg-teal-300/20">달력 보기</a>
                </div>

                {message ? <div className="mb-4 rounded-2xl bg-teal-300/10 px-4 py-3 text-sm font-black text-teal-50">{message}</div> : null}

                {loading ? (
                  <div className="rounded-[22px] bg-white/[0.035] p-6 text-sm font-black text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">다시보기 목록을 불러오는 중입니다.</div>
                ) : broadcasts.length ? (
                  <div className="space-y-3">
                    {broadcasts.map((broadcast) => {
                      const overrideTitle = drafts[broadcast.id] ?? overrides[broadcast.id]?.title ?? '';
                      return (
                        <div key={broadcast.id} className="rounded-[24px] bg-white/[0.040] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_14px_34px_rgba(0,0,0,0.18)]">
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-black text-white/45">
                            <span className="rounded-full bg-teal-300/10 px-2.5 py-1 text-teal-50/75">{broadcast.member}</span>
                            <span>{formatDayLabel(broadcast)}</span>
                            <span>{broadcast.durationText || '0분'}</span>
                            <a href={broadcast.url} target="_blank" rel="noreferrer" className="text-teal-100/70 hover:text-teal-50">다시보기 열기 ↗</a>
                          </div>
                          <div className="mb-2 text-[15px] font-black leading-6 text-white/78">원본: {broadcast.title}</div>
                          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                            <input
                              value={overrideTitle}
                              onChange={(event) => setDrafts((prev) => ({ ...prev, [broadcast.id]: event.target.value }))}
                              className={TITLE_INPUT_CLASS}
                              placeholder="사이트에 표시할 제목 입력. 비우고 저장하면 원본 사용"
                            />
                            <button
                              type="button"
                              onClick={() => saveTitle(broadcast)}
                              disabled={savingId === broadcast.id}
                              className="rounded-2xl bg-teal-300/14 px-5 py-3 text-sm font-black text-teal-50 transition hover:bg-teal-300/22 disabled:opacity-45"
                            >
                              {savingId === broadcast.id ? '저장중' : overrideTitle.trim() ? '저장' : '원본 사용'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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

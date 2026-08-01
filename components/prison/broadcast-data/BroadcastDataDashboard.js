import { useEffect, useMemo, useRef, useState } from 'react';
import BroadcastDataCalendar from './BroadcastDataCalendar';
import BroadcastDataRanking from './BroadcastDataRanking';

function initialMonthKey() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function BroadcastDataDashboard() {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [payload, setPayload] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('iamquaddurup');
  const [rankingMode, setRankingMode] = useState('donations');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const verifiedRequests = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);
    setError('');
    fetch(`/api/prison-broadcast-data?month=${encodeURIComponent(monthKey)}`, { cache: 'no-store' })
      .then((response) => response.json().then((json) => ({ response, json })))
      .then(({ response, json }) => {
        if (!response.ok || !json.ok) throw new Error(json.message || '방송 데이터를 불러오지 못했습니다.');
        if (!cancelled) setPayload(json);
      })
      .catch((fetchError) => { if (!cancelled) setError(fetchError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [monthKey]);

  useEffect(() => {
    if (payload?.monthKey !== monthKey || !payload?.members?.length || !selectedMemberId) return undefined;
    const requestKey = `${monthKey}:${selectedMemberId}`;
    if (verifiedRequests.current.has(requestKey)) return undefined;
    verifiedRequests.current.add(requestKey);
    let cancelled = false;
    setVerifying(true);
    fetch(`/api/prison-broadcast-data?month=${encodeURIComponent(monthKey)}&member=${encodeURIComponent(selectedMemberId)}&verify=1`, { cache: 'no-store' })
      .then((response) => response.json().then((json) => ({ response, json })))
      .then(({ response, json }) => {
        if (!response.ok || !json.ok) throw new Error(json.message || '교차검증에 실패했습니다.');
        if (!cancelled) setPayload(json);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setVerifying(false); });
    return () => { cancelled = true; };
  }, [monthKey, payload?.monthKey, selectedMemberId]);

  const selectedMember = useMemo(
    () => payload?.members?.find((member) => member.id === selectedMemberId) || payload?.members?.[0] || null,
    [payload, selectedMemberId],
  );

  return (
    <div id="broadcast-data" className="mx-auto w-full max-w-none rounded-[30px] bg-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_70px_rgba(0,0,0,0.22)] sm:p-5 lg:p-7">
      <header className="rounded-[26px] border border-white/[0.07] bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.11),transparent_35%),#07111f] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-cyan-200/60">BROADCAST DATA</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">방송 데이터 달력</h1>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/50">풍투데이와 풍고의 수치를 대조하고, 차이가 1,000명 미만이면 더 높은 최고 시청자 수를 표시합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(payload?.availableMonths || []).map((month) => (
              <button
                type="button"
                key={month.monthKey}
                onClick={() => setMonthKey(month.monthKey)}
                className={`rounded-full px-4 py-2.5 text-sm font-black transition ${monthKey === month.monthKey ? 'bg-white text-[#07111f]' : 'bg-white/[0.06] text-white/55 hover:bg-white/[0.1] hover:text-white'}`}
              >
                {month.buttonLabel}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="mt-5 flex min-h-[420px] items-center justify-center rounded-[26px] border border-white/[0.06] bg-[#07111f]">
          <div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-cyan-200/20 border-t-cyan-200" /><p className="mt-4 text-sm font-black text-white/50">방송 데이터를 정리하고 있습니다.</p></div>
        </div>
      ) : error ? (
        <div className="mt-5 rounded-[26px] border border-rose-300/15 bg-rose-300/[0.06] px-5 py-12 text-center text-sm font-black text-rose-100">{error}</div>
      ) : (
        <>
          <div className="mt-5"><BroadcastDataRanking rankings={payload?.rankings} mode={rankingMode} onModeChange={setRankingMode} selectedMemberId={selectedMemberId} onSelectMember={setSelectedMemberId} /></div>
          <section className="mt-5 rounded-[26px] border border-white/[0.07] bg-[#07111f] p-4 sm:p-5">
            <div className="mb-3 text-xs font-black tracking-[0.12em] text-white/35">MEMBER SELECT</div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(payload?.members || []).map((member) => (
                <button type="button" key={member.id} onClick={() => setSelectedMemberId(member.id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition ${selectedMemberId === member.id ? 'border-cyan-200/35 bg-cyan-300/12 text-cyan-50' : 'border-white/[0.07] bg-white/[0.035] text-white/55 hover:text-white'}`}>
                  <img src={member.image} alt="" className="h-7 w-7 rounded-full object-cover" />{member.nickname}
                </button>
              ))}
            </div>
          </section>
          <div className="mt-5"><BroadcastDataCalendar monthKey={monthKey} member={selectedMember} verifying={verifying} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] font-bold text-white/30">
            <span>기본 데이터 30분 캐시 · 선택 멤버 풍고 교차검증 · 장애 시 이전 캐시 사용</span>
            <span>{payload?.stale ? '이전 캐시 표시 중' : `마지막 갱신 ${payload?.cachedAt ? new Date(payload.cachedAt).toLocaleString('ko-KR') : '-'}`}</span>
          </div>
        </>
      )}
    </div>
  );
}

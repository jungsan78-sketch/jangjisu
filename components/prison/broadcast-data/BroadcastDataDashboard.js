import { useEffect, useMemo, useRef, useState } from 'react';
import BroadcastDataCalendar from './BroadcastDataCalendar';
import BroadcastDataRanking from './BroadcastDataRanking';

function initialMonthKey() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function readApiJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('방송 데이터 준비가 지연되고 있습니다. 잠시 후 다시 확인해주세요.');
  }
  try {
    return await response.json();
  } catch {
    throw new Error('방송 데이터를 읽지 못했습니다. 잠시 후 다시 확인해주세요.');
  }
}

export default function BroadcastDataDashboard() {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [payload, setPayload] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('iamquaddurup');
  const [rankingMode, setRankingMode] = useState('peakViewers');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const verifiedRequests = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setVerifying(true);
    setPayload(null);
    setError('');
    fetch(`/api/prison-broadcast-data?month=${encodeURIComponent(monthKey)}`)
      .then((response) => readApiJson(response).then((json) => ({ response, json })))
      .then(({ response, json }) => {
        if (!response.ok || !json.ok) throw new Error(json.message || '방송 데이터를 불러오지 못했습니다.');
        if (!cancelled) setPayload(json);
      })
      .catch((fetchError) => { if (!cancelled) { setError(fetchError.message); setVerifying(false); } })
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
      .then((response) => readApiJson(response).then((json) => ({ response, json })))
      .then(({ response, json }) => {
        if (!response.ok || !json.ok) throw new Error(json.message || '데이터 확인에 실패했습니다.');
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

  const selectMember = (id) => {
    if (id === selectedMemberId) return;
    setVerifying(true);
    setSelectedMemberId(id);
  };

  return (
    <div id="broadcast-data" className="mx-auto w-full max-w-none rounded-[30px] bg-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_70px_rgba(0,0,0,0.22)] sm:p-5 lg:p-7">
      <header className="rounded-[26px] border border-white/[0.07] bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.11),transparent_35%),#07111f] p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h1 className="mr-1 text-3xl font-black tracking-tight text-white sm:text-4xl">방송 데이터 달력</h1>
          <div className="flex flex-wrap gap-2">
            {(payload?.availableMonths || []).map((month) => (
              <button
                type="button"
                key={month.monthKey}
                onClick={() => setMonthKey(month.monthKey)}
                className={`min-w-[112px] rounded-2xl border px-5 py-3 text-base font-black transition sm:min-w-[128px] ${monthKey === month.monthKey ? 'border-cyan-100/55 bg-cyan-300 text-[#06111a] shadow-[0_10px_30px_rgba(103,232,249,0.2)]' : 'border-white/10 bg-white/[0.06] text-white/65 hover:border-white/20 hover:bg-white/[0.1] hover:text-white'}`}
              >
                {month.buttonLabel}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-white/50">별풍선과 최고 시청자 기록을 날짜별로 한눈에 확인할 수 있습니다.</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className="text-rose-300">!</span> 데이터는 불확실할 수 있습니다.
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
          <div className="mt-5"><BroadcastDataRanking rankings={payload?.rankings} mode={rankingMode} onModeChange={setRankingMode} selectedMemberId={selectedMemberId} onSelectMember={selectMember} /></div>
          <div className="mt-5"><BroadcastDataCalendar monthKey={monthKey} member={selectedMember} verifying={verifying} /></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] font-bold text-white/30">
            <span>방송 데이터는 주기적으로 자동 갱신됩니다.</span>
            <span>{payload?.stale ? '이전 캐시 표시 중' : `마지막 갱신 ${payload?.cachedAt ? new Date(payload.cachedAt).toLocaleString('ko-KR') : '-'}`}</span>
          </div>
        </>
      )}
    </div>
  );
}


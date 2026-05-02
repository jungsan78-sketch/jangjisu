import { useMemo, useRef, useState } from 'react';

const MAX_EVENTS = 500;

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString('ko-KR');
}

function nowText() {
  return new Date().toLocaleTimeString('ko-KR', { hour12: false });
}

function Button({ children, tone = 'cyan', wide = false, ...props }) {
  const toneClass = tone === 'rose'
    ? 'bg-[linear-gradient(180deg,rgba(251,113,133,0.22),rgba(190,18,60,0.12))] text-rose-50 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.32),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-rose-400/22'
    : 'bg-[linear-gradient(180deg,rgba(34,211,238,0.20),rgba(14,165,233,0.10))] text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.28),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-cyan-300/22';
  return <button type="button" {...props} className={`${wide ? 'w-full' : ''} min-h-[56px] rounded-[24px] px-5 py-4 text-sm font-black tracking-[-0.01em] transition hover:-translate-y-0.5 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}>{children}</button>;
}

function Field(props) {
  return <input {...props} className="w-full rounded-[22px] bg-[#062033] px-4 py-4 text-[20px] font-black text-white outline-none shadow-[inset_0_0_0_2px_rgba(34,211,238,0.32),0_10px_26px_rgba(0,0,0,0.18)] placeholder:text-white/38 transition" />;
}

function Panel({ title, desc, right, children }) {
  return (
    <section className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(145deg,rgba(20,41,64,0.94),rgba(8,18,34,0.96))] p-5 shadow-[0_26px_72px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-cyan-100/[0.045]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.13),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(110,231,183,0.08),transparent_28%)]" />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-[22px] font-black tracking-[-0.02em] text-white">{title}</h2>{desc ? <p className="mt-1 text-sm font-bold leading-6 text-slate-300/82">{desc}</p> : null}</div>
        {right}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function StatusPill({ status }) {
  const tone = ['connected', 'received', 'ready'].includes(status) ? 'bg-emerald-300 text-emerald-950' : ['connecting'].includes(status) ? 'bg-amber-300 text-amber-950' : status === 'error' ? 'bg-rose-300 text-rose-950' : 'bg-slate-400 text-slate-950';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${tone}`}>{status}</span>;
}

function buildMemo(events, validBase) {
  return [...events]
    .reverse()
    .map((event) => {
      const unit = Math.floor(toNumber(event.amount) / validBase);
      if (unit < 1) return null;
      return `${String(event.name || '익명').trim()}*${unit}`;
    })
    .filter(Boolean)
    .join(',');
}

export default function SoopFundingNew() {
  const [streamerId, setStreamerId] = useState('');
  const [validCount, setValidCount] = useState(100);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('스트리머 아이디와 유효개수를 입력한 뒤 자동수신을 시작하세요.');
  const [lastReceivedAt, setLastReceivedAt] = useState('없음');
  const [copyStatus, setCopyStatus] = useState('');
  const sourceRef = useRef(null);
  const seenRef = useRef(new Set());

  const stop = () => {
    sourceRef.current?.close?.();
    sourceRef.current = null;
    setStatus('idle');
    setStatusText('자동수신을 중지했습니다.');
  };

  const start = () => {
    const id = streamerId.trim();
    if (!id || /\s/.test(id)) {
      setStatus('error');
      setStatusText('스트리머 아이디를 정확히 입력해주세요.');
      return;
    }
    sourceRef.current?.close?.();
    const source = new EventSource(`/api/soop-balloon-check?streamerId=${encodeURIComponent(id)}`);
    sourceRef.current = source;
    setStatus('connecting');
    setStatusText(`${id} 후원 이벤트 자동수신 연결 중입니다.`);
    source.onmessage = (event) => {
      let payload = null;
      try { payload = JSON.parse(event.data); } catch { return; }
      if (payload.type === 'status') {
        setStatus(payload.status === 'ready' ? 'ready' : 'connected');
        setStatusText(payload.status === 'ready' ? '자동수신 준비 완료. 후원 이벤트를 기다립니다.' : `상태: ${payload.status}`);
        return;
      }
      if (payload.type !== 'donation') return;
      const name = String(payload.fromUsername || payload.nickname || payload.name || '').trim();
      const amount = toNumber(payload.amount || payload.count, 0);
      if (!name || amount <= 0) return;
      const eventId = String(payload.id || `${id}-${name}-${amount}-${payload.createdAt || Date.now()}-${Math.random().toString(36).slice(2)}`);
      if (seenRef.current.has(eventId)) return;
      seenRef.current.add(eventId);
      setLastReceivedAt(nowText());
      setStatus('received');
      setStatusText(`${name}님 ${formatNumber(amount)}개 수신`);
      setEvents((prev) => [{ id: eventId, name, amount, kind: payload.kind || 'normalBalloon', createdAt: payload.createdAt || new Date().toISOString() }, ...prev].slice(0, MAX_EVENTS));
    };
    source.onerror = () => {
      setStatus('error');
      setStatusText('자동수신 연결이 끊겼거나 실패했습니다. 중지 후 다시 시작해주세요.');
    };
  };

  const reset = () => {
    setEvents([]);
    seenRef.current = new Set();
    setLastReceivedAt('없음');
    setCopyStatus('');
    setStatusText('후원 기록을 초기화했습니다.');
  };

  const validBase = Math.max(1, toNumber(validCount, 100));
  const validEvents = useMemo(() => events.filter((event) => toNumber(event.amount) >= validBase), [events, validBase]);
  const memoText = useMemo(() => buildMemo(events, validBase), [events, validBase]);
  const total = useMemo(() => events.reduce((sum, event) => sum + toNumber(event.amount), 0), [events]);
  const validTotal = useMemo(() => validEvents.reduce((sum, event) => sum + toNumber(event.amount), 0), [validEvents]);

  const copyMemo = async () => {
    if (!memoText) {
      setCopyStatus('복사할 메모가 없습니다.');
      return;
    }
    try {
      await navigator.clipboard.writeText(memoText);
      setCopyStatus('복사 완료');
    } catch {
      setCopyStatus('복사 실패: 직접 선택해서 복사해주세요.');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#07101f,#091827_42%,#06101f)] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(52,211,153,0.10),transparent_28%),radial-gradient(circle_at_48%_100%,rgba(129,140,248,0.10),transparent_34%)]" />
      <header className="sticky top-0 z-40 bg-[#06101e]/78 backdrop-blur-2xl shadow-[0_10px_32px_rgba(0,0,0,0.22)]"><div className="mx-auto flex max-w-[1760px] items-center justify-between gap-4 px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><a href="/utility" className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-black text-white/80">← 유틸리티</a><h1 className="text-xl font-black sm:text-2xl">SOOP 펀딩 New</h1></div><a href="/" className="rounded-full bg-cyan-300/12 px-4 py-2 text-xs font-black text-cyan-50">장지수용소</a></div></header>
      <main className="relative mx-auto max-w-[1760px] px-5 py-6 lg:px-8">
        <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <Panel title="자동수신 설정" desc="SOOP 로그인 없이 스트리머 아이디 기준으로 후원 이벤트만 수신합니다.">
              <div className="mb-4 rounded-[28px] bg-[#052235]/80 p-4 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.09)]"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/13"><img src="/logos/SOOP.png" alt="SOOP" className="max-h-7 max-w-10 object-contain" /></div><div><div className="text-sm font-black text-white">SSE 후원 수신</div><div className="mt-1 text-xs font-bold text-cyan-50/58">streamerId → donation event</div></div></div><StatusPill status={status} /></div><div className="mt-4 rounded-[22px] bg-[#061421]/88 p-4 text-sm font-bold leading-6 text-white/76 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">{statusText}</div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-black text-white/48"><span>마지막 수신: {lastReceivedAt}</span><span>최대 기록: {formatNumber(MAX_EVENTS)}건</span></div></div>
              <div className="grid gap-3"><label className="block"><div className="mb-2 text-sm font-black text-cyan-50">스트리머 아이디</div><Field value={streamerId} onChange={(event) => setStreamerId(event.target.value)} placeholder="예: go0117" /></label><label className="block"><div className="mb-2 text-sm font-black text-cyan-50">유효개수</div><Field type="number" min="1" value={validCount} onChange={(event) => setValidCount(event.target.value)} /></label><Button onClick={start}>자동수신 시작</Button><Button tone="rose" onClick={stop} wide>자동수신 중지</Button><Button tone="rose" onClick={reset} wide>기록 초기화</Button></div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="후원 수신 목록" desc="유효개수 이상 후원만 표시합니다.">
              <div className="mb-4 grid grid-cols-3 gap-3"><div className="rounded-[22px] bg-cyan-300/10 p-4 text-center"><div className="text-xs font-black text-white/45">전체 건수</div><div className="mt-1 text-2xl font-black">{formatNumber(events.length)}</div></div><div className="rounded-[22px] bg-emerald-300/10 p-4 text-center"><div className="text-xs font-black text-white/45">유효 건수</div><div className="mt-1 text-2xl font-black">{formatNumber(validEvents.length)}</div></div><div className="rounded-[22px] bg-emerald-300/10 p-4 text-center"><div className="text-xs font-black text-white/45">유효 합계</div><div className="mt-1 text-2xl font-black">{formatNumber(validTotal)}</div></div></div>
              <div className="max-h-[620px] space-y-2 overflow-auto pr-1">{validEvents.length ? validEvents.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-[#07101a] px-4 py-4"><div className="min-w-0"><div className="truncate text-lg font-black text-white">{event.name}</div><div className="mt-1 text-[11px] font-bold text-white/36">{event.kind}</div></div><div className="text-2xl font-black text-cyan-50">{formatNumber(event.amount)}개</div></div>) : <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-10 text-center text-white/50">유효 후원 수신 대기 중</div>}</div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="메모장 복사" desc="유효개수 단위로 닉네임*개수 형식을 만듭니다.">
              <div className="rounded-[22px] bg-[#07101a] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"><textarea value={memoText} readOnly placeholder="유효 후원이 들어오면 예: 닉네임*10 형태로 표시됩니다." className="min-h-[210px] w-full resize-none bg-transparent text-lg font-black leading-8 text-cyan-50 outline-none placeholder:text-white/30" /></div>
              <div className="mt-3 grid gap-2"><Button onClick={copyMemo} wide>메모장 복사</Button>{copyStatus ? <div className="rounded-[16px] bg-white/[0.06] px-4 py-3 text-sm font-black text-white/70">{copyStatus}</div> : null}</div>
            </Panel>
            <Panel title="전체 요약" desc="유효개수 미만 후원도 합산에는 보관됩니다."><div className="grid gap-3"><div className="rounded-[22px] bg-cyan-300/10 p-4 text-center"><div className="text-xs font-black text-white/45">총 후원</div><div className="mt-1 text-3xl font-black">{formatNumber(total)}</div></div><div className="rounded-[22px] bg-white/[0.05] p-4 text-sm font-bold leading-7 text-white/60">유효개수 {formatNumber(validBase)}개 기준으로 1,000개 후원은 닉네임*{formatNumber(Math.floor(1000 / validBase))} 형태로 변환됩니다.</div></div></Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

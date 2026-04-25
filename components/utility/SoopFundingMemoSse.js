import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'sou-soop-funding-sse-settings-v1';
const DEFAULT_SETTINGS = {
  soopId: '',
  validCount: 1000,
  inputMode: 'nickname',
  separator: ',',
  autoEnabled: false,
  soundEnabled: true,
};

const SAMPLE_EVENTS = [
  { id: 'sample-1', name: '장지수', message: '장지수', amount: 10000, source: 'sample' },
  { id: 'sample-2', name: '냥냥두둥', message: '냥냥두둥', amount: 20000, source: 'sample' },
  { id: 'sample-3', name: '후원자1', message: '후원자', amount: 3000, source: 'sample' },
];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString('ko-KR');
}

function readSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

function makeMemo(events, settings) {
  const validCount = Math.max(1, toNumber(settings.validCount, 1000));
  const grouped = new Map();
  events.forEach((event) => {
    const units = Math.floor(toNumber(event.amount) / validCount);
    if (units < 1) return;
    const key = String(settings.inputMode === 'message' ? event.message : event.name || '').trim() || '익명';
    grouped.set(key, (grouped.get(key) || 0) + units);
  });
  return Array.from(grouped.entries()).map(([name, units]) => `${name}*${units}`).join(settings.separator === 'newline' ? '\n' : ',');
}

function playBeep(amount) {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = amount >= 10000 ? 0.12 : 0.07;
  gain.connect(ctx.destination);
  [523, amount >= 10000 ? 784 : 659].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.type = 'sine';
    osc.connect(gain);
    const start = ctx.currentTime + index * 0.08;
    osc.start(start);
    osc.stop(start + 0.12);
  });
  setTimeout(() => ctx.close().catch(() => {}), 800);
}

async function readSse(response, onData) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      block.split('\n').forEach((line) => {
        if (!line.startsWith('data: ')) return;
        try {
          onData(JSON.parse(line.slice(6)));
        } catch {}
      });
      idx = buffer.indexOf('\n\n');
    }
  }
}

function normalizePayload(payload) {
  if (!payload || payload.type !== 'donation') return null;
  const name = String(payload.fromUsername || payload.name || '').trim();
  const amount = toNumber(payload.amount);
  if (!name || amount <= 0) return null;
  return {
    id: String(payload.id || `${Date.now()}-${name}-${amount}-${Math.random().toString(16).slice(2)}`),
    name,
    message: String(payload.message || name).trim(),
    amount,
    source: payload.demo ? 'sse-test' : 'soop-sse',
  };
}

function Card({ title, children }) {
  return <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20"><h2 className="mb-4 text-xl font-black text-white">{title}</h2>{children}</section>;
}

function Field({ label, help, children }) {
  return <label className="block rounded-[20px] border border-white/10 bg-black/20 p-4"><div className="text-sm font-black text-white">{label}</div>{help ? <p className="mt-1 text-xs font-semibold leading-5 text-white/45">{help}</p> : null}<div className="mt-3">{children}</div></label>;
}

export default function SoopFundingMemoSse() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState(SAMPLE_EVENTS);
  const [manualName, setManualName] = useState('테스트후원');
  const [manualMessage, setManualMessage] = useState('장지수');
  const [manualAmount, setManualAmount] = useState(1000);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('자동입력을 켜면 SSE 연결을 시작합니다.');
  const [notice, setNotice] = useState(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(null);
  const seenRef = useRef(new Set());

  useEffect(() => setSettings(readSettings()), []);
  useEffect(() => saveSettings(settings), [settings]);

  const addEvent = (event) => {
    if (!event || seenRef.current.has(event.id)) return;
    seenRef.current.add(event.id);
    setEvents((prev) => [event, ...prev].slice(0, 120));
    setNotice(event);
    if (settings.soundEnabled && event.amount >= 1000) playBeep(event.amount);
    setTimeout(() => setNotice(null), event.amount >= 10000 ? 3200 : 2200);
  };

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const streamerId = String(settings.soopId || '').trim();
    if (!settings.autoEnabled) {
      setStatus('idle');
      setStatusText('자동입력이 꺼져 있습니다.');
      return undefined;
    }
    if (!streamerId || /\s/.test(streamerId)) {
      setStatus('error');
      setStatusText('SOOP 아이디를 입력해주세요.');
      return undefined;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setStatus('connecting');
    setStatusText('SSE 연결 중...');
    const demo = settings.demoStream ? '&demo=1' : '';
    fetch(`/api/soop-balloon-check?streamerId=${encodeURIComponent(streamerId)}${demo}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('connect failed');
        await readSse(res, (payload) => {
          if (payload.type === 'status') {
            setStatus(payload.status || 'ready');
            setStatusText(payload.status === 'waiting' ? '후원 이벤트 대기 중입니다.' : 'SSE 연결 완료');
            return;
          }
          if (payload.type === 'error') {
            setStatus('error');
            setStatusText(payload.message || 'SSE 오류');
            return;
          }
          const event = normalizePayload(payload);
          if (event) {
            setStatus('received');
            setStatusText(`${event.name}님 ${formatNumber(event.amount)}개 자동 반영`);
            addEvent(event);
          }
        });
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setStatus('error');
        setStatusText('SSE 연결이 끊어졌습니다.');
      });

    return () => ac.abort();
  }, [settings.autoEnabled, settings.soopId, settings.demoStream]);

  const memo = useMemo(() => makeMemo(events, settings), [events, settings]);
  const total = useMemo(() => events.reduce((sum, event) => sum + toNumber(event.amount), 0), [events]);
  const validCount = Math.max(1, toNumber(settings.validCount, 1000));
  const validEvents = events.filter((event) => toNumber(event.amount) >= validCount);

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const addManual = () => addEvent({ id: `manual-${Date.now()}`, name: manualName.trim() || '익명', message: manualMessage.trim() || manualName.trim() || '익명', amount: toNumber(manualAmount), source: 'manual' });
  const runDemo = () => {
    updateSetting('demoStream', true);
    updateSetting('autoEnabled', true);
    setTimeout(() => updateSetting('demoStream', false), 5200);
  };
  const copyMemo = async () => {
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      {notice ? <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"><div className="rounded-[34px] border border-cyan-200/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.20),rgba(14,19,30,0.96))] px-8 py-7 text-center shadow-[0_32px_100px_rgba(0,0,0,0.55)]"><div className="text-sm font-black tracking-[0.22em] text-white/60">SOOP FUNDING</div><div className="mt-3 text-[34px] font-black tracking-tight text-white">{notice.name}님</div><div className="mt-2 text-[26px] font-black text-cyan-100">{formatNumber(notice.amount)}개 후원!</div><div className="mt-4 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-black text-white/78">핀볼 +{Math.floor(notice.amount / validCount)}</div></div></div> : null}
      <div className="pointer-events-none fixed inset-0"><div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" /><div className="absolute top-16 right-[-90px] h-96 w-96 rounded-full bg-blue-500/12 blur-3xl" /></div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8"><a href="/utility" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/80">← 유틸리티</a><div className="rounded-full border border-cyan-200/18 bg-cyan-200/10 px-4 py-2 text-xs font-black tracking-[0.18em] text-cyan-100">SSE BETA</div></div></header>
      <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 lg:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="text-xs font-black tracking-[0.42em] text-cyan-100/55">SOOP FUNDING MEMO</div><h1 className="mt-4 text-[34px] font-black tracking-tight text-white sm:text-[52px]">SOOP 펀딩 자동 메모장</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/58">Hoxy 방식과 같은 SSE 자동입력 구조입니다. 현재는 서버 ready/test donation까지 연결했고, SOOP 원본 수집 API 확인 후 서버 내부만 교체하면 됩니다.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-[22px] border border-emerald-200/14 bg-emerald-300/10 px-5 py-4 text-center"><div className="text-xs font-black text-emerald-100/60">총 펀딩</div><div className="mt-1 text-2xl font-black text-white">{formatNumber(total)}</div></div><div className="rounded-[22px] border border-cyan-200/14 bg-cyan-300/10 px-5 py-4 text-center"><div className="text-xs font-black text-cyan-100/60">유효 건수</div><div className="mt-1 text-2xl font-black text-white">{validEvents.length}</div></div></div></div></section>
        <section className="mt-6 grid gap-6 lg:grid-cols-[390px_1fr]">
          <div className="space-y-4">
            <Card title="SOOP 자동입력 연결"><div className="space-y-3"><div className="rounded-[20px] border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between"><div><div className="text-sm font-black text-white">자동입력</div><div className="mt-1 text-xs font-semibold text-white/45">SSE 스트림 연결</div></div><button type="button" onClick={() => updateSetting('autoEnabled', !settings.autoEnabled)} className={`rounded-full border px-4 py-2 text-sm font-black ${settings.autoEnabled ? 'border-emerald-200/30 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>{settings.autoEnabled ? 'ON' : 'OFF'}</button></div><div className="mt-4 rounded-2xl border border-white/10 bg-black/24 px-4 py-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{status}</div><div className="mt-2 text-xs font-semibold leading-5 text-white/58">{statusText}</div></div></div><button type="button" onClick={runDemo} className="w-full rounded-2xl border border-cyan-200/22 bg-cyan-300/14 px-4 py-3 text-sm font-black text-cyan-50">SSE 테스트 후원 실행</button></div></Card>
            <Card title="자동입력 설정"><div className="space-y-3"><Field label="SOOP 아이디" help="자동입력 ON이면 이 아이디로 서버 SSE에 연결합니다."><input value={settings.soopId} onChange={(e) => updateSetting('soopId', e.target.value.trim())} placeholder="예: khm11903" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25" /></Field><Field label="유효개수"><input type="number" min="1" value={settings.validCount} onChange={(e) => updateSetting('validCount', Math.max(1, toNumber(e.target.value, 1000)))} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none" /></Field><Field label="기입 기준"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => updateSetting('inputMode', 'nickname')} className={`rounded-2xl border px-3 py-3 text-sm font-black ${settings.inputMode === 'nickname' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>후원닉네임</button><button type="button" onClick={() => updateSetting('inputMode', 'message')} className={`rounded-2xl border px-3 py-3 text-sm font-black ${settings.inputMode === 'message' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>후원메시지</button></div></Field><Field label="출력 구분"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => updateSetting('separator', ',')} className={`rounded-2xl border px-3 py-3 text-sm font-black ${settings.separator === ',' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>쉼표</button><button type="button" onClick={() => updateSetting('separator', 'newline')} className={`rounded-2xl border px-3 py-3 text-sm font-black ${settings.separator === 'newline' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55'}`}>줄바꿈</button></div></Field><button type="button" onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)} className={`w-full rounded-2xl border px-3 py-3 text-sm font-black ${settings.soundEnabled ? 'border-emerald-200/30 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>효과음 {settings.soundEnabled ? 'ON' : 'OFF'}</button></div></Card>
            <Card title="수동 후원 추가"><div className="space-y-3"><input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="후원 닉네임" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25" /><input value={manualMessage} onChange={(e) => setManualMessage(e.target.value)} placeholder="후원 메시지" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25" /><input type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="후원 개수" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25" /><button type="button" onClick={addManual} className="w-full rounded-2xl border border-cyan-200/22 bg-cyan-300/14 px-4 py-3 text-sm font-black text-cyan-50">수동 추가</button></div></Card>
          </div>
          <div className="space-y-6"><Card title="핀볼 복붙 결과"><div className="mb-4 flex justify-end gap-2"><button type="button" onClick={copyMemo} disabled={!memo} className="rounded-full border border-cyan-200/22 bg-cyan-300/14 px-5 py-2 text-sm font-black text-cyan-50 disabled:opacity-40">{copied ? '복사됨' : '복사'}</button><button type="button" onClick={() => setEvents([])} className="rounded-full border border-rose-200/18 bg-rose-300/10 px-5 py-2 text-sm font-black text-rose-50">리셋</button></div><textarea value={memo} readOnly placeholder="기준값 이상 후원자가 생기면 여기에 자동 생성됩니다." className="min-h-[180px] w-full resize-y rounded-[24px] border border-white/10 bg-black/28 px-5 py-4 text-[18px] font-black leading-8 text-white outline-none placeholder:text-white/25" /></Card><Card title="최근 후원 로그"><div className="grid gap-3 md:grid-cols-2">{events.length ? events.map((event) => { const units = Math.floor(toNumber(event.amount) / validCount); return <div key={event.id} className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><div className="truncate text-sm font-black text-white">{event.name}</div>{event.source === 'soop-sse' || event.source === 'sse-test' ? <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">AUTO</span> : null}</div><div className="mt-1 truncate text-xs font-semibold text-white/45">{event.message}</div></div><div className="text-right"><div className="text-sm font-black text-white">{formatNumber(event.amount)}개</div><div className="mt-1 text-xs font-black text-cyan-100">{units >= 1 ? `*${units}` : '제외'}</div></div></div></div>; }) : <div className="rounded-[22px] border border-white/10 bg-black/18 p-5 text-sm font-semibold text-white/55">후원 로그가 비어 있습니다.</div>}</div></Card></div>
        </section>
      </main>
    </div>
  );
}

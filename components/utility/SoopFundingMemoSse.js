import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'sou-soop-funding-sse-settings-v2';
const DEFAULT_SETTINGS = {
  soopId: '',
  validCount: 1000,
  alertMinCount: 1000,
  inputMode: 'nickname',
  separator: ',',
  autoEnabled: false,
  soundEnabled: true,
  overlayEnabled: true,
};

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
  if (typeof window === 'undefined') return;
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

  return Array.from(grouped.entries())
    .map(([name, units]) => `${name}*${units}`)
    .join(settings.separator === 'newline' ? '\n' : ',');
}

function buildRanking(events) {
  const map = new Map();
  events.forEach((event) => {
    const name = String(event.name || '').trim() || '익명';
    const prev = map.get(name) || { name, amount: 0, count: 0 };
    prev.amount += toNumber(event.amount);
    prev.count += 1;
    map.set(name, prev);
  });
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 10);
}

function playBeep(amount) {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = amount >= 10000 ? 0.12 : 0.07;
  gain.connect(ctx.destination);

  const notes = amount >= 10000 ? [523, 659, 784, 1046] : [523, 659];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.type = 'sine';
    osc.connect(gain);
    const start = ctx.currentTime + index * 0.08;
    osc.start(start);
    osc.stop(start + 0.12);
  });

  setTimeout(() => ctx.close().catch(() => {}), 900);
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
    source: payload.relay ? 'soop-sse' : payload.demo ? 'test' : 'soop-sse',
    createdAt: payload.createdAt || new Date().toISOString(),
  };
}

function Card({ title, caption, right, className = '', children }) {
  return (
    <section className={`overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.03))] p-4 shadow-2xl shadow-black/25 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
          {caption ? <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{caption}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, help, children, compact = false }) {
  return (
    <label className={`block rounded-[18px] border border-white/10 bg-black/22 transition focus-within:border-cyan-200/30 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="text-xs font-black text-white/86">{label}</div>
      {help ? <p className="mt-1 text-[11px] font-semibold leading-4 text-white/38">{help}</p> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function PillButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition ${
        active
          ? 'border-cyan-200/40 bg-cyan-300/16 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
          : 'border-white/10 bg-white/[0.045] text-white/55 hover:border-white/18 hover:bg-white/[0.07] hover:text-white/80'
      }`}
    >
      {children}
    </button>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-white/10 bg-[#090d15] px-3.5 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/35"
    />
  );
}

function StatBox({ label, value, tone = 'cyan' }) {
  const toneClass = tone === 'emerald' ? 'border-emerald-200/16 bg-emerald-300/10 text-emerald-100' : 'border-cyan-200/16 bg-cyan-300/10 text-cyan-100';
  return (
    <div className={`rounded-[18px] border px-4 py-3 text-center ${toneClass}`}>
      <div className="text-[11px] font-black text-white/45">{label}</div>
      <div key={value} className="mt-1 animate-[numberPop_420ms_ease-out] text-2xl font-black tracking-tight text-white">{value}</div>
    </div>
  );
}

function RankIcon({ rank }) {
  if (rank === 1) return <span className="text-lg">👑</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-black text-white/55">{rank}</span>;
}

export default function SoopFundingMemoSse() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState([]);
  const [manualName, setManualName] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [manualAmount, setManualAmount] = useState(1000);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('자동입력을 켜면 후원 감지를 시작합니다.');
  const [notice, setNotice] = useState(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(null);
  const seenRef = useRef(new Set());
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);

  const addEvent = useCallback((event) => {
    if (!event || seenRef.current.has(event.id)) return;

    seenRef.current.add(event.id);
    setEvents((prev) => [event, ...prev].slice(0, 160));

    const currentSettings = settingsRef.current;
    const alertMinCount = Math.max(1, toNumber(currentSettings.alertMinCount, 1000));
    const shouldAlert = event.amount >= alertMinCount;

    if (!shouldAlert) return;

    if (currentSettings.soundEnabled) playBeep(event.amount);
    if (currentSettings.overlayEnabled) {
      setNotice(event);
      setTimeout(() => setNotice(null), event.amount >= 10000 ? 3200 : 2300);
    }
  }, []);

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
      setStatusText('SOOP 아이디를 먼저 입력해주세요.');
      return undefined;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setStatus('connecting');
    setStatusText('후원 감지 서버에 연결 중입니다...');

    fetch(`/api/soop-balloon-check?streamerId=${encodeURIComponent(streamerId)}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('connect failed');

        await readSse(res, (payload) => {
          if (payload.type === 'status') {
            setStatus(payload.status || 'ready');
            setStatusText(payload.status === 'ready' ? '후원 감지 연결 완료' : '후원 이벤트 대기 중입니다.');
            return;
          }

          if (payload.type === 'error') {
            setStatus('error');
            setStatusText(payload.message || '후원 감지 오류가 발생했습니다.');
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
        setStatusText('후원 감지 연결이 끊어졌습니다.');
      });

    return () => ac.abort();
  }, [settings.autoEnabled, settings.soopId, addEvent]);

  const memo = useMemo(() => makeMemo(events, settings), [events, settings]);
  const ranking = useMemo(() => buildRanking(events), [events]);
  const total = useMemo(() => events.reduce((sum, event) => sum + toNumber(event.amount), 0), [events]);
  const validCount = Math.max(1, toNumber(settings.validCount, 1000));
  const validEvents = events.filter((event) => toNumber(event.amount) >= validCount);

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const addManual = () => {
    const amount = toNumber(manualAmount);
    if (amount <= 0) return;
    const name = manualName.trim() || '익명';
    addEvent({
      id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      message: manualMessage.trim() || name,
      amount,
      source: 'manual',
      createdAt: new Date().toISOString(),
    });
  };

  const copyMemo = async () => {
    if (!memo) return;
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const resetEvents = () => {
    setEvents([]);
    seenRef.current = new Set();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      {notice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="rounded-[34px] border border-cyan-200/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),rgba(14,19,30,0.97))] px-8 py-7 text-center shadow-[0_32px_100px_rgba(0,0,0,0.55)]">
            <div className="text-sm font-black tracking-[0.22em] text-cyan-100/70">SOOP FUNDING</div>
            <div className="mt-3 text-[34px] font-black tracking-tight text-white">{notice.name}님</div>
            <div className="mt-2 text-[26px] font-black text-cyan-100">{formatNumber(notice.amount)}개 후원!</div>
            <div className="mt-4 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-black text-white/78">핀볼 +{Math.floor(notice.amount / validCount)}</div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes numberPop {
          0% { transform: translateY(3px) scale(0.96); opacity: 0.72; }
          55% { transform: translateY(-1px) scale(1.04); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute top-16 right-[-90px] h-96 w-96 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-fuchsia-500/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1780px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <a href="/utility" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/80 transition hover:bg-white/10">← 유틸리티</a>
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">SOOP 펀딩 자동메모장</h1>
          </div>
          <div className="rounded-full border border-cyan-200/18 bg-cyan-200/10 px-4 py-2 text-xs font-black tracking-[0.18em] text-cyan-100">AUTO RELAY</div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1780px] px-5 py-5 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)_390px] 2xl:grid-cols-[420px_minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <Card title="자동입력" caption="아이디 입력과 ON/OFF를 한 곳에서 관리합니다." className="xl:min-h-[238px]">
              <div className="space-y-3">
                <Field label="SOOP 아이디" help="예: lshooooo" compact>
                  <div className="flex gap-2">
                    <TextInput value={settings.soopId} onChange={(e) => updateSetting('soopId', e.target.value.trim())} placeholder="방송자 SOOP 아이디" />
                    <button
                      type="button"
                      onClick={() => updateSetting('autoEnabled', !settings.autoEnabled)}
                      className={`shrink-0 rounded-2xl border px-5 py-2.5 text-sm font-black transition ${
                        settings.autoEnabled
                          ? 'border-emerald-200/35 bg-emerald-300/16 text-emerald-50 shadow-[0_0_28px_rgba(16,185,129,0.16)]'
                          : 'border-white/10 bg-white/[0.05] text-white/55 hover:bg-white/[0.08]'
                      }`}
                    >
                      {settings.autoEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </Field>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{status}</div>
                    <div className={`h-2.5 w-2.5 rounded-full ${status === 'error' ? 'bg-rose-300' : settings.autoEnabled ? 'bg-emerald-300' : 'bg-white/25'}`} />
                  </div>
                  <div className="mt-2 min-h-[20px] text-xs font-semibold leading-5 text-white/58">{statusText}</div>
                </div>
              </div>
            </Card>

            <Card title="설정" className="xl:min-h-[360px]">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="유효개수" help="복붙 기준" compact>
                    <TextInput type="number" min="1" value={settings.validCount} onChange={(e) => updateSetting('validCount', Math.max(1, toNumber(e.target.value, 1000)))} />
                  </Field>
                  <Field label="알림 최소" help="팝업/효과음" compact>
                    <TextInput type="number" min="1" value={settings.alertMinCount} onChange={(e) => updateSetting('alertMinCount', Math.max(1, toNumber(e.target.value, 1000)))} />
                  </Field>
                </div>
                <Field label="기입 기준" compact>
                  <div className="grid grid-cols-2 gap-2">
                    <PillButton active={settings.inputMode === 'nickname'} onClick={() => updateSetting('inputMode', 'nickname')}>후원닉네임</PillButton>
                    <PillButton active={settings.inputMode === 'message'} onClick={() => updateSetting('inputMode', 'message')}>후원메시지</PillButton>
                  </div>
                </Field>
                <Field label="출력 구분" compact>
                  <div className="grid grid-cols-2 gap-2">
                    <PillButton active={settings.separator === ','} onClick={() => updateSetting('separator', ',')}>쉼표</PillButton>
                    <PillButton active={settings.separator === 'newline'} onClick={() => updateSetting('separator', 'newline')}>줄바꿈</PillButton>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)} className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition ${settings.soundEnabled ? 'border-emerald-200/30 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>효과음 {settings.soundEnabled ? 'ON' : 'OFF'}</button>
                  <button type="button" onClick={() => updateSetting('overlayEnabled', !settings.overlayEnabled)} className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition ${settings.overlayEnabled ? 'border-emerald-200/30 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>팝업 {settings.overlayEnabled ? 'ON' : 'OFF'}</button>
                </div>
              </div>
            </Card>

            <Card title="수동 추가" caption="누락된 후원을 빠르게 입력합니다." className="xl:min-h-[256px]">
              <div className="space-y-2.5">
                <TextInput value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="후원 닉네임" />
                <TextInput value={manualMessage} onChange={(e) => setManualMessage(e.target.value)} placeholder="후원 메시지 또는 별칭" />
                <div className="flex gap-2">
                  <TextInput type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="후원 개수" />
                  <button type="button" onClick={addManual} className="shrink-0 rounded-2xl border border-cyan-200/25 bg-cyan-300/16 px-5 py-2.5 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/22">추가</button>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card
              title="핀볼 복붙 결과"
              caption="유효개수 기준을 넘긴 후원자만 정리됩니다. 결과 박스 안에서 스크롤됩니다."
              className="xl:min-h-[360px]"
              right={
                <div className="flex gap-2">
                  <button type="button" onClick={copyMemo} disabled={!memo} className="rounded-full border border-cyan-200/25 bg-cyan-300/16 px-5 py-2 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/22 disabled:cursor-not-allowed disabled:opacity-40">{copied ? '복사됨' : '복사'}</button>
                  <button type="button" onClick={resetEvents} className="rounded-full border border-rose-200/18 bg-rose-300/10 px-5 py-2 text-sm font-black text-rose-50 transition hover:bg-rose-300/16">리셋</button>
                </div>
              }
            >
              <textarea
                value={memo}
                readOnly
                placeholder="아직 복붙할 후원 데이터가 없습니다."
                className="h-[250px] w-full resize-none overflow-auto rounded-[28px] border border-cyan-200/14 bg-[#07101a] px-5 py-4 text-[17px] font-black leading-8 text-cyan-50 outline-none placeholder:text-white/24 selection:bg-cyan-300/30 selection:text-white shadow-inner shadow-black/30 xl:h-[270px]"
              />
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/40">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">유효개수 {formatNumber(validCount)}개</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">알림 {formatNumber(settings.alertMinCount)}개 이상</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">총 {events.length}건 수집</span>
              </div>
            </Card>

            <Card title="최근 후원 로그" caption="내부 스크롤로 최근 기록을 확인합니다." className="xl:h-[494px]">
              <div className="grid max-h-[390px] gap-3 overflow-auto pr-1 md:grid-cols-2 xl:max-h-[398px]">
                {events.length ? (
                  events.map((event) => {
                    const units = Math.floor(toNumber(event.amount) / validCount);
                    const alertActive = event.amount >= Math.max(1, toNumber(settings.alertMinCount, 1000));
                    return (
                      <div key={event.id} className="rounded-[22px] border border-white/10 bg-[#07101a] px-4 py-3 shadow-lg shadow-black/15">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-black text-white">{event.name}</div>
                              {event.source === 'soop-sse' ? <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">AUTO</span> : null}
                              {event.source === 'manual' ? <span className="rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-white/55">MANUAL</span> : null}
                            </div>
                            <div className="mt-1 truncate text-xs font-semibold text-white/45">{event.message}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div key={event.amount} className="animate-[numberPop_420ms_ease-out] text-sm font-black text-white">{formatNumber(event.amount)}개</div>
                            <div className={`mt-1 text-xs font-black ${units >= 1 ? 'text-cyan-100' : 'text-white/35'}`}>{units >= 1 ? `*${units}` : '제외'}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2 text-[11px] font-bold text-white/35">
                          <span>{new Date(event.createdAt || Date.now()).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className={alertActive ? 'text-emerald-200/75' : 'text-white/30'}>{alertActive ? '알림 대상' : '로그만 저장'}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-8 text-center md:col-span-2">
                    <div className="text-lg font-black text-white/70">아직 후원 로그가 없습니다.</div>
                    <div className="mt-2 text-sm font-semibold text-white/40">자동입력을 켜고 실제 후원이 들어오면 여기에 쌓입니다.</div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="후원자 순위 TOP 10" caption="후원 개수 합산 기준입니다." className="xl:h-[610px]">
              <div className="mb-3 grid grid-cols-2 gap-3">
                <StatBox label="총 펀딩" value={formatNumber(total)} tone="emerald" />
                <StatBox label="유효 건수" value={validEvents.length} />
              </div>
              <div className="max-h-[456px] space-y-2 overflow-auto pr-1 xl:max-h-[464px]">
                {ranking.length ? (
                  ranking.map((item, index) => {
                    const rank = index + 1;
                    return (
                      <div key={item.name} className={`rounded-[20px] border px-3.5 py-3 transition ${rank === 1 ? 'border-yellow-200/28 bg-yellow-300/10 shadow-[0_0_34px_rgba(250,204,21,0.10)]' : 'border-white/10 bg-[#07101a]'}`}>
                        <div className="flex items-center gap-3">
                          <RankIcon rank={rank} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-white">{item.name}</div>
                            <div className="mt-1 text-[11px] font-bold text-white/36">후원 {item.count}회</div>
                          </div>
                          <div key={item.amount} className="animate-[numberPop_420ms_ease-out] text-right text-base font-black text-cyan-50">{formatNumber(item.amount)}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-8 text-center">
                    <div className="text-lg font-black text-white/70">순위 대기 중</div>
                    <div className="mt-2 text-sm font-semibold text-white/40">후원이 들어오면 TOP 10이 표시됩니다.</div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="요약" className="xl:h-[244px]">
              <div className="grid gap-2 text-xs font-bold text-white/50">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">닉네임/개수 자동연동: {settings.autoEnabled ? '사용 중' : '꺼짐'}</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">복붙 기준: {formatNumber(validCount)}개당 1개</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">알림 기준: {formatNumber(settings.alertMinCount)}개 이상</div>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'sou-soop-funding-memo-settings-v1';
const PROCESSED_KEY = 'sou-soop-funding-memo-processed-v1';
const DEFAULT_SETTINGS = {
  soopId: '',
  validCount: 1000,
  inputMode: 'nickname',
  separator: ',',
  soundEnabled: true,
  overlayEnabled: true,
};
const DEMO_EVENTS = [
  { id: 'demo-1', nickname: '장지수', message: '장지수', count: 10000, createdAt: new Date().toISOString() },
  { id: 'demo-2', nickname: '냥냥두둥', message: '냥냥두둥', count: 20000, createdAt: new Date().toISOString() },
  { id: 'demo-3', nickname: '후원자1', message: '후원자', count: 3000, createdAt: new Date().toISOString() },
  { id: 'demo-4', nickname: '999개 제외', message: '제외', count: 999, createdAt: new Date().toISOString() },
];

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString('ko-KR');
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function buildMemo(events, settings) {
  const threshold = Math.max(1, safeNumber(settings.validCount, 1000));
  const grouped = new Map();

  events.forEach((event) => {
    const count = safeNumber(event.count);
    const units = Math.floor(count / threshold);
    if (units < 1) return;

    const name = String(settings.inputMode === 'message' ? event.message : event.nickname || '').trim() || '익명';
    grouped.set(name, (grouped.get(name) || 0) + units);
  });

  const separator = settings.separator === 'newline' ? '\n' : ',';
  return Array.from(grouped.entries()).map(([name, units]) => `${name}*${units}`).join(separator);
}

function playTone(type = 'normal') {
  if (typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const audio = new AudioContext();
  const gain = audio.createGain();
  gain.gain.value = type === 'mega' ? 0.13 : 0.08;
  gain.connect(audio.destination);

  const notes = type === 'mega' ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25];
  notes.forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    const start = audio.currentTime + index * 0.09;
    oscillator.start(start);
    oscillator.stop(start + 0.12);
  });

  setTimeout(() => audio.close().catch(() => {}), 900);
}

function SettingInput({ label, help, children }) {
  return (
    <label className="block rounded-[22px] border border-white/10 bg-black/18 p-4">
      <div className="text-sm font-black text-white">{label}</div>
      {help ? <div className="mt-1 text-xs font-semibold leading-5 text-white/45">{help}</div> : null}
      <div className="mt-3">{children}</div>
    </label>
  );
}

function EventRow({ event, validCount }) {
  const units = Math.floor(safeNumber(event.count) / Math.max(1, safeNumber(validCount, 1000)));
  const active = units >= 1;
  return (
    <div className={`rounded-[18px] border px-4 py-3 ${active ? 'border-cyan-200/14 bg-cyan-200/[0.045]' : 'border-white/8 bg-white/[0.025] opacity-60'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">{event.nickname || '익명'}</div>
          <div className="mt-1 truncate text-xs font-semibold text-white/45">{event.message || '메시지 없음'}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-black text-white">{formatNumber(event.count)}개</div>
          <div className={`mt-1 text-xs font-black ${active ? 'text-cyan-100' : 'text-white/35'}`}>{active ? `*${units}` : '제외'}</div>
        </div>
      </div>
    </div>
  );
}

export default function SoopFundingMemo() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [manualName, setManualName] = useState('테스트후원');
  const [manualMessage, setManualMessage] = useState('장지수');
  const [manualCount, setManualCount] = useState(1000);
  const [copied, setCopied] = useState(false);
  const [alert, setAlert] = useState(null);
  const processedRef = useRef(new Set());

  useEffect(() => {
    const saved = readJson(STORAGE_KEY, DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS, ...saved });
    processedRef.current = new Set(readJson(PROCESSED_KEY, []));
  }, []);

  useEffect(() => {
    writeJson(STORAGE_KEY, settings);
  }, [settings]);

  useEffect(() => {
    const newBigEvents = events.filter((event) => {
      const count = safeNumber(event.count);
      return count >= 1000 && !processedRef.current.has(event.id);
    });

    if (!newBigEvents.length) return;

    newBigEvents.forEach((event) => processedRef.current.add(event.id));
    writeJson(PROCESSED_KEY, Array.from(processedRef.current).slice(-100));

    const topEvent = newBigEvents.sort((a, b) => safeNumber(b.count) - safeNumber(a.count))[0];
    const type = safeNumber(topEvent.count) >= 10000 ? 'mega' : 'normal';

    if (settings.soundEnabled) playTone(type);
    if (settings.overlayEnabled) {
      setAlert({ ...topEvent, type });
      const timer = setTimeout(() => setAlert(null), type === 'mega' ? 3200 : 2300);
      return () => clearTimeout(timer);
    }
  }, [events, settings.soundEnabled, settings.overlayEnabled]);

  const memoText = useMemo(() => buildMemo(events, settings), [events, settings]);
  const totalCount = useMemo(() => events.reduce((sum, event) => sum + safeNumber(event.count), 0), [events]);
  const validEvents = useMemo(() => events.filter((event) => safeNumber(event.count) >= Math.max(1, safeNumber(settings.validCount, 1000))), [events, settings.validCount]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const addManualEvent = () => {
    const count = Math.max(0, safeNumber(manualCount, 0));
    if (!count) return;
    setEvents((prev) => [
      {
        id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        nickname: manualName.trim() || '익명',
        message: manualMessage.trim() || manualName.trim() || '익명',
        count,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const copyMemo = async () => {
    try {
      await navigator.clipboard.writeText(memoText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const resetAll = () => {
    setEvents([]);
    processedRef.current = new Set();
    writeJson(PROCESSED_KEY, []);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      {alert ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className={`animate-[fundingAlert_2200ms_ease-out_forwards] rounded-[34px] border px-8 py-7 text-center shadow-[0_32px_100px_rgba(0,0,0,0.55)] ${alert.type === 'mega' ? 'border-yellow-200/35 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.24),rgba(14,19,30,0.96))]' : 'border-cyan-200/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.20),rgba(14,19,30,0.96))]'}`}>
            <div className="text-sm font-black tracking-[0.22em] text-white/60">SOOP FUNDING</div>
            <div className="mt-3 text-[30px] font-black tracking-tight text-white sm:text-[42px]">{alert.nickname}님</div>
            <div className="mt-2 text-[22px] font-black text-cyan-100 sm:text-[32px]">{formatNumber(alert.count)}개 후원!</div>
            <div className="mt-4 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-black text-white/78">핀볼 +{Math.floor(safeNumber(alert.count) / Math.max(1, safeNumber(settings.validCount, 1000)))}</div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        @keyframes fundingAlert {
          0% { opacity: 0; transform: translateY(24px) scale(0.92); filter: blur(6px); }
          12% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          82% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-16px) scale(0.98); filter: blur(3px); }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute top-16 right-[-90px] h-96 w-96 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-fuchsia-500/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/80 transition hover:bg-white/10">← 유틸리티</a>
          <div className="rounded-full border border-cyan-200/18 bg-cyan-200/10 px-4 py-2 text-xs font-black tracking-[0.18em] text-cyan-100">BETA</div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-6 shadow-2xl shadow-black/30 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.42em] text-cyan-100/55">SOOP FUNDING MEMO</div>
              <h1 className="mt-4 text-[34px] font-black tracking-tight text-white sm:text-[52px]">SOOP 펀딩 자동 메모장</h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/58">현재는 확인용 1차 버전입니다. F12에서 실제 후원 API를 확인하면 샘플 데이터 대신 실시간 후원 기록으로 연결합니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              <div className="rounded-[22px] border border-emerald-200/14 bg-emerald-300/10 px-5 py-4 text-center">
                <div className="text-xs font-black text-emerald-100/60">총 펀딩</div>
                <div className="mt-1 text-2xl font-black text-white">{formatNumber(totalCount)}</div>
              </div>
              <div className="rounded-[22px] border border-cyan-200/14 bg-cyan-300/10 px-5 py-4 text-center">
                <div className="text-xs font-black text-cyan-100/60">유효 건수</div>
                <div className="mt-1 text-2xl font-black text-white">{validEvents.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
              <div className="mb-4 text-xl font-black text-white">자동입력 설정</div>
              <div className="space-y-3">
                <SettingInput label="SOOP 아이디" help="개인 로컬 저장입니다. 지금은 실제 API 연결 전 표시용입니다.">
                  <input value={settings.soopId} onChange={(event) => updateSetting('soopId', event.target.value.trim())} placeholder="예: khm11903" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-cyan-200/35" />
                </SettingInput>
                <SettingInput label="유효개수" help="이 개수 이상부터 핀볼 1개로 계산합니다.">
                  <input type="number" min="1" value={settings.validCount} onChange={(event) => updateSetting('validCount', Math.max(1, safeNumber(event.target.value, 1000)))} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-cyan-200/35" />
                </SettingInput>
                <SettingInput label="기입 기준" help="후원자 닉네임 또는 후원 메시지 기준으로 결과를 만듭니다.">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => updateSetting('inputMode', 'nickname')} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${settings.inputMode === 'nickname' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.07]'}`}>후원닉네임</button>
                    <button type="button" onClick={() => updateSetting('inputMode', 'message')} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${settings.inputMode === 'message' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.07]'}`}>후원메시지</button>
                  </div>
                </SettingInput>
                <SettingInput label="출력 구분" help="핀볼 사이트에 붙여넣기 좋은 형태를 고릅니다.">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => updateSetting('separator', ',')} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${settings.separator === ',' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.07]'}`}>쉼표</button>
                    <button type="button" onClick={() => updateSetting('separator', 'newline')} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${settings.separator === 'newline' ? 'border-cyan-200/35 bg-cyan-200/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.07]'}`}>줄바꿈</button>
                  </div>
                </SettingInput>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${settings.soundEnabled ? 'border-emerald-200/30 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>효과음 {settings.soundEnabled ? 'ON' : 'OFF'}</button>
                  <button type="button" onClick={() => updateSetting('overlayEnabled', !settings.overlayEnabled)} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${settings.overlayEnabled ? 'border-emerald-200/30 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>알림 {settings.overlayEnabled ? 'ON' : 'OFF'}</button>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
              <div className="mb-4 text-xl font-black text-white">테스트 후원 추가</div>
              <div className="space-y-3">
                <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="후원 닉네임" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25" />
                <input value={manualMessage} onChange={(event) => setManualMessage(event.target.value)} placeholder="후원 메시지" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25" />
                <input type="number" value={manualCount} onChange={(event) => setManualCount(event.target.value)} placeholder="후원 개수" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25" />
                <button type="button" onClick={addManualEvent} className="w-full rounded-2xl border border-cyan-200/22 bg-cyan-300/14 px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/20">테스트 추가</button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 lg:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xl font-black text-white">핀볼 복붙 결과</div>
                  <div className="mt-1 text-xs font-semibold text-white/45">예: 장지수*10,냥냥두둥*20,후원자*3</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={copyMemo} disabled={!memoText} className="rounded-full border border-cyan-200/22 bg-cyan-300/14 px-5 py-2 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/20 disabled:opacity-40">{copied ? '복사됨' : '복사'}</button>
                  <button type="button" onClick={resetAll} className="rounded-full border border-rose-200/18 bg-rose-300/10 px-5 py-2 text-sm font-black text-rose-50 transition hover:bg-rose-300/16">리셋</button>
                </div>
              </div>
              <textarea value={memoText} readOnly placeholder="기준값 이상 후원자가 생기면 여기에 자동 생성됩니다." className="min-h-[170px] w-full resize-y rounded-[24px] border border-white/10 bg-black/28 px-5 py-4 text-[18px] font-black leading-8 text-white outline-none placeholder:text-white/25" />
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 lg:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xl font-black text-white">최근 후원 로그</div>
                  <div className="mt-1 text-xs font-semibold text-white/45">현재는 샘플/수동 추가 데이터입니다.</div>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white/55">{events.length}건</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {events.length ? events.map((event) => <EventRow key={event.id} event={event} validCount={settings.validCount} />) : <div className="rounded-[22px] border border-white/10 bg-black/18 p-5 text-sm font-semibold text-white/55">후원 로그가 비어 있습니다.</div>}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

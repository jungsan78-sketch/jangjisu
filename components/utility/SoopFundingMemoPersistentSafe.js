import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseSoopSocketPacket } from '../../lib/soop/parse-socket-packet';

const SETTINGS_KEY = 'sou-soop-funding-persistent-settings-v2';
const EVENTS_KEY = 'sou-soop-funding-persistent-events-v2';
const MAX_EVENTS = 220;

const DEFAULT_SETTINGS = {
  soopId: '',
  validCount: 1000,
  alertMinCount: 1000,
  messageMatchSeconds: 10,
  inputMode: 'nickname',
  autoEnabled: false,
  soundEnabled: true,
  overlayEnabled: true,
};

function num(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function fmt(value) {
  return num(value).toLocaleString('ko-KR');
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function makeMemo(events, settings) {
  const validCount = Math.max(1, num(settings.validCount, 1000));
  return [...events]
    .reverse()
    .map((event) => {
      const units = Math.floor(num(event.amount) / validCount);
      if (units < 1) return null;
      const key = String(settings.inputMode === 'message' ? event.message : event.name || '').trim() || '익명';
      return `${key}*${units}`;
    })
    .filter(Boolean)
    .join(',');
}

function makeRanking(events) {
  const map = new Map();
  events.forEach((event) => {
    const name = String(event.name || '').trim() || '익명';
    const item = map.get(name) || { name, amount: 0, count: 0 };
    item.amount += num(event.amount);
    item.count += 1;
    map.set(name, item);
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
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
    let index = buffer.indexOf('\n\n');
    while (index !== -1) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      block.split('\n').forEach((line) => {
        if (!line.startsWith('data: ')) return;
        try {
          onData(JSON.parse(line.slice(6)));
        } catch {}
      });
      index = buffer.indexOf('\n\n');
    }
  }
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
    const start = ctx.currentTime + index * 0.09;
    osc.start(start);
    osc.stop(start + 0.13);
  });
  setTimeout(() => ctx.close().catch(() => {}), 700);
}

function Card({ title, caption, right, children, className = '' }) {
  return (
    <section className={`rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.03))] p-4 shadow-2xl shadow-black/25 ${className}`}>
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

function Field({ label, help, children }) {
  return (
    <label className="block rounded-[18px] border border-white/10 bg-black/22 p-3 transition focus-within:border-cyan-200/30">
      <div className="text-xs font-black text-white/86">{label}</div>
      {help ? <p className="mt-1 text-[11px] font-semibold leading-4 text-white/38">{help}</p> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Input(props) {
  return <input {...props} className="w-full rounded-2xl border border-white/10 bg-[#090d15] px-3.5 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-cyan-200/35" />;
}

function Toggle({ active, children, ...props }) {
  return (
    <button {...props} type="button" className={`rounded-2xl border px-3 py-2.5 text-xs font-black transition ${active ? 'border-cyan-200/40 bg-cyan-300/16 text-cyan-50' : 'border-white/10 bg-white/[0.045] text-white/60 hover:bg-white/[0.07]'}`}>
      {children}
    </button>
  );
}

function normalizeDonation(payload) {
  if (!payload || payload.type !== 'donation') return null;
  const name = String(payload.fromUsername || payload.name || '').trim();
  const amount = num(payload.amount);
  if (!name || amount <= 0) return null;
  return {
    id: String(payload.id || `relay-${Date.now()}-${name}-${amount}-${Math.random().toString(16).slice(2)}`),
    name,
    message: name,
    amount,
    pendingMessage: true,
    messageMatched: false,
    source: payload.relay ? 'hoxy-relay' : 'soop-relay',
    createdAt: payload.createdAt || new Date().toISOString(),
    donatedAtMs: Date.now(),
  };
}

export default function SoopFundingMemoPersistentSafe() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('자동입력을 켜면 후원 감지를 시작합니다.');
  const [collectorStatus, setCollectorStatus] = useState('수집기 미연결');
  const [packetBase64, setPacketBase64] = useState('');
  const [packetResult, setPacketResult] = useState(null);
  const [manual, setManual] = useState({ name: '', message: '', amount: 1000 });
  const [copied, setCopied] = useState(false);
  const [collectorCopied, setCollectorCopied] = useState(false);
  const [notice, setNotice] = useState(null);
  const abortRef = useRef(null);
  const seenRef = useRef(new Set());
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    const savedSettings = { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) };
    const savedEvents = readJson(EVENTS_KEY, []).filter((event) => event?.id && event?.name && num(event.amount) > 0).slice(0, MAX_EVENTS);
    setSettings(savedSettings);
    setEvents(savedEvents);
    settingsRef.current = savedSettings;
    seenRef.current = new Set(savedEvents.map((event) => event.id));
    setHydrated(true);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    if (hydrated) writeJson(SETTINGS_KEY, settings);
  }, [settings, hydrated]);

  useEffect(() => {
    if (hydrated) writeJson(EVENTS_KEY, events.slice(0, MAX_EVENTS));
  }, [events, hydrated]);

  const addEvent = useCallback((event) => {
    if (!event || seenRef.current.has(event.id)) return;
    seenRef.current.add(event.id);
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    const alertMin = Math.max(1, num(settingsRef.current.alertMinCount, 1000));
    if (event.amount >= alertMin) {
      if (settingsRef.current.soundEnabled) playBeep(event.amount);
      if (settingsRef.current.overlayEnabled) {
        setNotice(event);
        setTimeout(() => setNotice(null), event.amount >= 10000 ? 3200 : 2300);
      }
    }
  }, []);

  const matchChat = useCallback((chat) => {
    if (!chat?.nickname || !chat?.message) return false;
    const now = Date.now();
    const limitMs = Math.max(1, num(settingsRef.current.messageMatchSeconds, 10)) * 1000;
    let matched = false;
    setEvents((prev) => {
      const next = [...prev];
      const index = next.findIndex((event) => {
        if (event.messageMatched) return false;
        if (event.name !== chat.nickname) return false;
        const donatedAtMs = num(event.donatedAtMs || new Date(event.createdAt).getTime(), 0);
        const diff = now - donatedAtMs;
        return donatedAtMs && diff >= 0 && diff <= limitMs;
      });
      if (index === -1) return prev;
      matched = true;
      next[index] = { ...next[index], message: chat.message, pendingMessage: false, messageMatched: true, matchedAt: new Date().toISOString() };
      return next;
    });
    setCollectorStatus(matched ? `${chat.nickname} 채팅 매칭 완료` : `${chat.nickname} 채팅 수신: ${chat.message}`);
    return matched;
  }, []);

  const handlePacket = useCallback((parsed) => {
    if (!parsed) return;
    if (parsed.type === 'donation') {
      addEvent({
        id: `socket-${Date.now()}-${parsed.nickname}-${parsed.amount}-${Math.random().toString(16).slice(2)}`,
        name: parsed.nickname,
        message: parsed.nickname,
        amount: parsed.amount,
        pendingMessage: true,
        messageMatched: false,
        source: 'socket-packet',
        createdAt: new Date().toISOString(),
        donatedAtMs: Date.now(),
      });
      setCollectorStatus(`${parsed.nickname} ${fmt(parsed.amount)}개 소켓 후원 반영`);
    }
    if (parsed.type === 'chat') matchChat(parsed);
  }, [addEvent, matchChat]);

  useEffect(() => {
    const onMessage = (event) => {
      if (!event.origin.includes('sooplive.com')) return;
      const data = event.data || {};
      if (data.type !== 'SOU_SOOP_CHAT') return;
      matchChat({ nickname: data.nickname, message: data.message, userId: data.userId });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [matchChat]);

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
          const donation = normalizeDonation(payload);
          if (donation) {
            setStatus('received');
            setStatusText(`${donation.name}님 ${fmt(donation.amount)}개 자동 반영`);
            addEvent(donation);
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

  const appUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/utility/soop-funding-memo`;
  const collectorScript = useMemo(() => {
    if (!appUrl) return '';
    return `(function(){
  const targetOrigin=${JSON.stringify(appUrl ? new URL(appUrl).origin : '')};
  const targetUrl=${JSON.stringify(appUrl)};
  const target=window.open(targetUrl,'sou_funding_memo');
  const seen=new WeakSet();
  function text(el){return (el&&el.innerText||'').trim();}
  function send(item){
    const user=item.querySelector('button.user,.user');
    const msg=item.querySelector('.message-text .msg,#message-original,.msg');
    const nickname=(user&&user.getAttribute('user_nick'))||text(item.querySelector('.author'));
    const userId=(user&&user.getAttribute('user_id'))||'';
    const message=text(msg);
    if(!nickname||!message) return;
    target.postMessage({type:'SOU_SOOP_CHAT',nickname,userId,message,at:Date.now()},targetOrigin);
    console.log('[SOU CHAT]',nickname,message);
  }
  function scan(root){(root||document).querySelectorAll('.chatting-list-item').forEach((item)=>{if(seen.has(item))return;seen.add(item);send(item);});}
  scan(document);
  const observer=new MutationObserver((mutations)=>{mutations.forEach((mutation)=>{mutation.addedNodes.forEach((node)=>{if(!(node instanceof HTMLElement))return;if(node.matches&&node.matches('.chatting-list-item')){if(!seen.has(node)){seen.add(node);send(node);}return;}scan(node);});});});
  observer.observe(document.body,{childList:true,subtree:true});
  window.__souFundingCollectorStop=function(){observer.disconnect();console.log('[SOU CHAT] stopped');};
  console.log('[SOU CHAT] collector started. 장지수용소 펀딩 자동메모장 창을 닫지 마세요.');
})();`;
  }, [appUrl]);

  const memo = useMemo(() => makeMemo(events, settings), [events, settings]);
  const ranking = useMemo(() => makeRanking(events), [events]);
  const total = useMemo(() => events.reduce((sum, event) => sum + num(event.amount), 0), [events]);
  const validCount = Math.max(1, num(settings.validCount, 1000));
  const validEvents = events.filter((event) => num(event.amount) >= validCount);

  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const parsePacket = () => {
    const parsed = parseSoopSocketPacket(packetBase64);
    setPacketResult(parsed);
    handlePacket(parsed);
  };
  const copyMemo = async () => {
    if (!memo) return;
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const copyCollector = async () => {
    await navigator.clipboard.writeText(collectorScript);
    setCollectorCopied(true);
    setTimeout(() => setCollectorCopied(false), 1400);
  };
  const addManual = () => {
    const amount = num(manual.amount);
    if (amount <= 0) return;
    const name = manual.name.trim() || '익명';
    addEvent({
      id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      message: manual.message.trim() || name,
      amount,
      source: 'manual',
      createdAt: new Date().toISOString(),
      donatedAtMs: Date.now(),
      pendingMessage: !manual.message.trim(),
      messageMatched: Boolean(manual.message.trim()),
    });
  };
  const resetEvents = () => {
    setEvents([]);
    seenRef.current = new Set();
    setPacketResult(null);
    writeJson(EVENTS_KEY, []);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      {notice ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="rounded-[34px] border border-cyan-200/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),rgba(14,19,30,0.97))] px-8 py-7 text-center shadow-[0_32px_100px_rgba(0,0,0,0.55)]">
            <div className="text-sm font-black tracking-[0.22em] text-cyan-100/70">SOOP FUNDING</div>
            <div className="mt-3 text-[34px] font-black tracking-tight text-white">{notice.name}님</div>
            <div className="mt-2 text-[26px] font-black text-cyan-100">{fmt(notice.amount)}개 후원!</div>
            <div className="mt-4 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-black text-white/78">핀볼 +{Math.floor(notice.amount / validCount)}</div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`@keyframes numberPop{0%{transform:translateY(3px) scale(.96);opacity:.72}55%{transform:translateY(-1px) scale(1.04);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}`}</style>
      <div className="pointer-events-none fixed inset-0"><div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" /><div className="absolute top-16 right-[-90px] h-96 w-96 rounded-full bg-blue-500/12 blur-3xl" /></div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1780px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3"><a href="/utility" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/80 transition hover:bg-white/10">← 유틸리티</a><h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">장지수용소 펀딩 자동메모장</h1></div>
          <a href="/" className="rounded-full border border-cyan-200/18 bg-cyan-200/10 px-4 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-200/16">장지수용소로 돌아가기</a>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1780px] px-5 py-5 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[410px_minmax(0,1fr)_410px] 2xl:grid-cols-[430px_minmax(0,1fr)_430px]">
          <div className="space-y-4">
            <Card title="자동입력" caption="페이지가 열려 있고 자동입력이 ON이면 계속 수신합니다. 저장 기록은 초기화 전까지 유지됩니다.">
              <div className="space-y-3"><Field label="SOOP 아이디" help="예: lshooooo"><div className="flex gap-2"><Input value={settings.soopId} onChange={(e) => updateSetting('soopId', e.target.value.trim())} placeholder="방송자 SOOP 아이디" /><button type="button" onClick={() => updateSetting('autoEnabled', !settings.autoEnabled)} className={`shrink-0 rounded-2xl border px-5 py-2.5 text-sm font-black transition ${settings.autoEnabled ? 'border-emerald-200/35 bg-emerald-300/16 text-emerald-50' : 'border-white/10 bg-white/[0.05] text-white/55 hover:bg-white/[0.08]'}`}>{settings.autoEnabled ? 'ON' : 'OFF'}</button></div></Field><div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"><div className="flex items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{status}</div><div className={`h-2.5 w-2.5 rounded-full ${status === 'error' ? 'bg-rose-300' : settings.autoEnabled ? 'bg-emerald-300' : 'bg-white/25'}`} /></div><div className="mt-2 min-h-[20px] text-xs font-semibold leading-5 text-white/58">{statusText}</div></div></div>
            </Card>
            <Card title="SOOP 채팅 수집기" caption="SOOP 방송 페이지 Console에 붙여넣으면 화면 채팅을 이 창으로 보내줍니다.">
              <div className="space-y-3"><button type="button" onClick={copyCollector} className="w-full rounded-2xl border border-cyan-200/25 bg-cyan-300/16 px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/22">{collectorCopied ? '수집기 코드 복사됨' : '수집기 코드 복사'}</button><div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-bold leading-5 text-white/45">SOOP 방송 페이지에서 F12 → Console → 붙여넣기. 이 창은 닫지 마세요.</div><div className="rounded-2xl border border-emerald-200/12 bg-emerald-300/8 px-3 py-2 text-xs font-black text-emerald-100/80">{collectorStatus}</div></div>
            </Card>
            <Card title="설정"><div className="grid gap-3"><div className="grid grid-cols-2 gap-3"><Field label="유효개수" help="복붙 기준"><Input type="number" min="1" value={settings.validCount} onChange={(e) => updateSetting('validCount', Math.max(1, num(e.target.value, 1000)))} /></Field><Field label="알림 최소" help="팝업/효과음"><Input type="number" min="1" value={settings.alertMinCount} onChange={(e) => updateSetting('alertMinCount', Math.max(1, num(e.target.value, 1000)))} /></Field></div><Field label="메시지 매칭" help="후원 후 다음 채팅을 찾는 시간"><Input type="number" min="1" value={settings.messageMatchSeconds} onChange={(e) => updateSetting('messageMatchSeconds', Math.max(1, num(e.target.value, 10)))} /></Field><Field label="기입 기준"><div className="grid grid-cols-2 gap-2"><Toggle active={settings.inputMode === 'nickname'} onClick={() => updateSetting('inputMode', 'nickname')}>후원닉네임</Toggle><Toggle active={settings.inputMode === 'message'} onClick={() => updateSetting('inputMode', 'message')}>후원 후 채팅</Toggle></div></Field><div className="grid grid-cols-2 gap-2"><Toggle active={settings.soundEnabled} onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}>효과음 {settings.soundEnabled ? 'ON' : 'OFF'}</Toggle><Toggle active={settings.overlayEnabled} onClick={() => updateSetting('overlayEnabled', !settings.overlayEnabled)}>팝업 {settings.overlayEnabled ? 'ON' : 'OFF'}</Toggle></div></div></Card>
          </div>

          <div className="space-y-4">
            <Card title="핀볼 복붙 결과" caption="같은 사람이 다시 후원해도 복붙 결과는 이벤트별로 따로 추가됩니다." right={<div className="flex gap-2"><button type="button" onClick={copyMemo} disabled={!memo} className="rounded-full border border-cyan-200/25 bg-cyan-300/16 px-5 py-2 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/22 disabled:cursor-not-allowed disabled:opacity-40">{copied ? '복사됨' : '복사'}</button><button type="button" onClick={resetEvents} className="rounded-full border border-rose-200/18 bg-rose-300/10 px-5 py-2 text-sm font-black text-rose-50 transition hover:bg-rose-300/16">초기화</button></div>}><textarea value={memo} readOnly placeholder="아직 복붙할 후원 데이터가 없습니다." className="h-[250px] w-full resize-none overflow-auto rounded-[28px] border border-cyan-200/14 bg-[#07101a] px-5 py-4 text-[17px] font-black leading-8 text-cyan-50 outline-none placeholder:text-white/24 selection:bg-cyan-300/30 selection:text-white shadow-inner shadow-black/30 xl:h-[270px]" /><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/40"><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">유효개수 {fmt(validCount)}개</span><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">알림 {fmt(settings.alertMinCount)}개 이상</span><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">저장 기록 {events.length}건</span></div></Card>
            <Card title="SOOP 소켓 패킷 테스트" caption="수동 Base64 검증용입니다. 자동은 채팅 수집기를 사용하세요."><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px]"><textarea value={packetBase64} onChange={(e) => setPacketBase64(e.target.value)} placeholder="Copy as Base64 값을 붙여넣기" className="h-[120px] resize-none rounded-[22px] border border-white/10 bg-[#07101a] px-4 py-3 text-xs font-bold leading-5 text-white outline-none placeholder:text-white/24" /><div className="space-y-2"><button type="button" onClick={parsePacket} className="w-full rounded-2xl border border-cyan-200/25 bg-cyan-300/16 px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/22">패킷 반영</button><div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] font-bold leading-5 text-white/45">후원 패킷은 로그에 추가, 채팅 패킷은 같은 닉네임 대기 후원에 붙습니다.</div></div></div><div className="mt-3 rounded-[22px] border border-white/10 bg-black/22 p-4 text-xs font-bold leading-6 text-white/55">{packetResult ? <div><div className="text-white">분석 결과: {packetResult.type}</div>{packetResult.type === 'chat' ? <div>채팅: {packetResult.nickname} / {packetResult.message}</div> : null}{packetResult.type === 'donation' ? <div>후원: {packetResult.nickname} / {fmt(packetResult.amount)}개</div> : null}{packetResult.type === 'unknown' ? <div>알 수 없는 패킷: {packetResult.packetType || 'unknown'}</div> : null}</div> : <div>아직 분석한 패킷이 없습니다.</div>}</div></Card>
            <Card title="수동 추가" caption="누락된 후원을 빠르게 입력합니다."><div className="grid gap-2 md:grid-cols-[1fr_1fr_150px_auto]"><Input value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="후원 닉네임" /><Input value={manual.message} onChange={(e) => setManual((p) => ({ ...p, message: e.target.value }))} placeholder="후원 메시지 또는 별칭" /><Input type="number" value={manual.amount} onChange={(e) => setManual((p) => ({ ...p, amount: e.target.value }))} placeholder="후원 개수" /><button type="button" onClick={addManual} className="rounded-2xl border border-cyan-200/25 bg-cyan-300/16 px-5 py-2.5 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/22">추가</button></div></Card>
          </div>

          <div className="space-y-4">
            <Card title="후원자 순위 TOP 10" caption="후원 개수는 닉네임 기준으로 누적됩니다." className="xl:h-[520px]"><div className="mb-3 grid grid-cols-2 gap-3"><div className="rounded-[18px] border border-emerald-200/16 bg-emerald-300/10 px-4 py-3 text-center"><div className="text-[11px] font-black text-white/45">총 펀딩</div><div className="mt-1 text-2xl font-black tracking-tight text-white">{fmt(total)}</div></div><div className="rounded-[18px] border border-cyan-200/16 bg-cyan-300/10 px-4 py-3 text-center"><div className="text-[11px] font-black text-white/45">유효 건수</div><div className="mt-1 text-2xl font-black tracking-tight text-white">{validEvents.length}</div></div></div><div className="max-h-[370px] space-y-2 overflow-auto pr-1">{ranking.length ? ranking.map((item, index) => { const rank = index + 1; return <div key={item.name} className={`rounded-[20px] border px-3.5 py-3 transition ${rank === 1 ? 'border-yellow-200/28 bg-yellow-300/10 shadow-[0_0_34px_rgba(250,204,21,0.10)]' : 'border-white/10 bg-[#07101a]'}`}><div className="flex items-center gap-3"><span className="text-lg">{rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-black text-white">{item.name}</div><div className="mt-1 text-[11px] font-bold text-white/36">후원 {item.count}회</div></div><div className="text-right text-base font-black text-cyan-50">{fmt(item.amount)}</div></div></div>; }) : <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-8 text-center"><div className="text-lg font-black text-white/70">순위 대기 중</div><div className="mt-2 text-sm font-semibold text-white/40">후원이 들어오면 TOP 10이 표시됩니다.</div></div>}</div></Card>
            <Card title="최근 후원 로그" caption="초기화하기 전까지 새로고침해도 기록이 유지됩니다." className="xl:h-[330px]"><div className="max-h-[240px] space-y-2 overflow-auto pr-1">{events.length ? events.map((event) => { const units = Math.floor(num(event.amount) / validCount); return <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/55"><div className="flex items-center justify-between gap-2"><span className="truncate text-white">{event.name}</span><span className="shrink-0 text-cyan-100">{fmt(event.amount)}개 {units >= 1 ? `*${units}` : ''}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate">{event.message}</span><span className={event.messageMatched ? 'text-emerald-200/75' : event.pendingMessage ? 'text-yellow-200/70' : 'text-white/30'}>{event.messageMatched ? '채팅 매칭' : event.pendingMessage ? '채팅 대기' : event.source}</span></div></div>; }) : <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-6 text-center text-sm font-semibold text-white/40">아직 후원 로그가 없습니다.</div>}</div></Card>
          </div>
        </section>
      </main>
    </div>
  );
}

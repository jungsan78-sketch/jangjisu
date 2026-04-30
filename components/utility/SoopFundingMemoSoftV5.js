import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_KEY = 'sou-soop-official-sdk-token-v2';
const SETTINGS_KEY = 'sou-soop-funding-soft-v5-settings';
const EVENTS_KEY = 'sou-soop-funding-soft-v5-events';
const MAX_EVENTS = 2000;
const MAX_RECONNECTS = 8;
const RECONNECT_DELAYS = [1500, 2500, 4000, 6000, 9000, 12000, 16000, 20000];
const DEFAULT_SETTINGS = { validCount: 1000, outputMode: 'nickname' };

const toNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const formatNumber = (value) => toNumber(value).toLocaleString('ko-KR');
const nowText = () => new Date().toLocaleTimeString('ko-KR', { hour12: false });

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
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function getChatSdkClass() {
  if (typeof window === 'undefined') return null;
  return window.SOOP?.ChatSDK || window.ChatSDK || null;
}

function pick(obj, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => acc?.[key], obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function normalizeSdkArgs(args) {
  if (args.length === 1 && typeof args[0] === 'object') {
    const raw = args[0];
    return { action: String(raw.action || raw.type || raw.event || '').toUpperCase(), payload: raw.message || raw.data || raw.payload || raw };
  }
  return { action: String(args[0] || '').toUpperCase(), payload: args[1] || {} };
}

function normalizeDonation(action, payload) {
  const amount = toNumber(pick(payload, ['count', 'amount', 'balloonCount', 'giftCount', 'message.count', 'data.count']));
  const name = String(pick(payload, ['userNickname', 'nickname', 'userNick', 'fromUsername', 'name', 'message.userNickname', 'data.userNickname']) || '').trim();
  const userId = String(pick(payload, ['userId', 'userID', 'id', 'message.userId', 'data.userId']) || '').trim();
  const donationId = String(pick(payload, ['eventId', 'donationId', 'giftId', 'message.id', 'data.id']) || '').trim();
  const isDonation = action.includes('BALLOON') || action.includes('GIFT') || action.includes('DONATION');
  if (!isDonation || !name || amount <= 0) return null;
  return { amount, name, userId, donationId };
}

function normalizeChat(action, payload) {
  const isChat = action === 'MESSAGE' || action.includes('CHAT');
  const message = String(pick(payload, ['message', 'text', 'comment', 'content', 'msg', 'data.message', 'message.message']) || '').trim();
  const name = String(pick(payload, ['userNickname', 'nickname', 'userNick', 'name', 'data.userNickname', 'message.userNickname']) || '').trim();
  const userId = String(pick(payload, ['userId', 'userID', 'id', 'data.userId', 'message.userId']) || '').trim();
  if (!isChat || !name || !message) return null;
  return { name, userId, message };
}

function buildMemo(events, settings) {
  const base = Math.max(1, toNumber(settings.validCount, 1000));
  return [...events].reverse().map((event) => {
    const unit = Math.floor(toNumber(event.amount) / base);
    if (unit < 1) return null;
    const label = settings.outputMode === 'message' && event.matchedMessage ? event.matchedMessage : event.name;
    return `${String(label || '익명').trim()}*${unit}`;
  }).filter(Boolean).join(',');
}

function buildRanking(events) {
  const map = new Map();
  events.forEach((event) => {
    const name = event.name || '익명';
    const item = map.get(name) || { name, amount: 0, count: 0 };
    item.amount += toNumber(event.amount);
    item.count += 1;
    map.set(name, item);
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
}

function Panel({ title, desc, right, children, className = '' }) {
  return (
    <section className={`relative overflow-hidden rounded-[34px] bg-[linear-gradient(145deg,rgba(20,41,64,0.94),rgba(8,18,34,0.96))] p-5 shadow-[0_26px_72px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-cyan-100/[0.045] ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.13),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(110,231,183,0.08),transparent_28%)]" />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-black tracking-[-0.02em] text-white">{title}</h2>
          {desc ? <p className="mt-1 text-sm font-bold leading-6 text-slate-300/82">{desc}</p> : null}
        </div>
        {right}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function Field(props) {
  const mergedStyle = {
    backgroundColor: '#062033',
    color: '#ffffff',
    caretColor: '#67e8f9',
    colorScheme: 'dark',
    boxShadow: 'inset 0 0 0 2px rgba(34,211,238,0.32), 0 10px 26px rgba(0,0,0,0.18)',
    ...props.style,
  };
  return <input {...props} style={mergedStyle} className="w-full rounded-[22px] px-4 py-4 text-[20px] font-black outline-none placeholder:text-white/38 transition focus:shadow-[inset_0_0_0_2px_rgba(103,232,249,0.78),0_0_0_5px_rgba(34,211,238,0.11)]" />;
}

function Button({ children, tone = 'cyan', wide = false, active = false, ...props }) {
  const toneClass = tone === 'green'
    ? active
      ? 'bg-[linear-gradient(180deg,rgba(52,211,153,0.34),rgba(16,185,129,0.18))] text-emerald-50 shadow-[inset_0_0_0_2px_rgba(110,231,183,0.44),0_15px_32px_rgba(16,185,129,0.16)]'
      : 'bg-[linear-gradient(180deg,rgba(52,211,153,0.21),rgba(16,185,129,0.10))] text-emerald-50 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.28),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-emerald-400/25'
    : tone === 'rose'
      ? 'bg-[linear-gradient(180deg,rgba(251,113,133,0.19),rgba(190,18,60,0.10))] text-rose-50 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.30),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-rose-400/22'
      : tone === 'yellow'
        ? 'bg-[linear-gradient(180deg,rgba(252,211,77,0.22),rgba(217,119,6,0.10))] text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.30),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-amber-300/20'
        : active
          ? 'bg-[linear-gradient(180deg,rgba(34,211,238,0.32),rgba(14,165,233,0.15))] text-cyan-50 shadow-[inset_0_0_0_2px_rgba(103,232,249,0.42),0_15px_32px_rgba(14,165,233,0.16)]'
          : 'bg-[linear-gradient(180deg,rgba(34,211,238,0.18),rgba(14,165,233,0.08))] text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.26),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-cyan-300/22';
  return <button type="button" {...props} className={`${wide ? 'w-full' : ''} min-h-[56px] rounded-[24px] px-5 py-4 text-sm font-black tracking-[-0.01em] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}>{children}</button>;
}

function ChoiceButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-[62px] rounded-[24px] px-5 py-4 text-sm font-black transition active:scale-[0.985] ${active ? 'bg-[linear-gradient(180deg,rgba(52,211,153,0.34),rgba(14,165,233,0.16))] text-white shadow-[inset_0_0_0_2px_rgba(110,231,183,0.52),0_16px_34px_rgba(16,185,129,0.16)]' : 'bg-[#061827]/82 text-white/72 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16),0_10px_24px_rgba(0,0,0,0.18)] hover:text-white hover:bg-[#082033]'}`}>
      <span className="inline-flex items-center justify-center gap-2">{active ? <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-950">선택됨</span> : null}{children}</span>
    </button>
  );
}

function StatusPill({ status }) {
  const tone = ['connected', 'received', 'authorized'].includes(status) ? 'bg-emerald-300 text-emerald-950' : ['closed', 'closed-test', 'reconnecting'].includes(status) ? 'bg-amber-300 text-amber-950' : ['error', 'error-test'].includes(status) ? 'bg-rose-300 text-rose-950' : 'bg-slate-400 text-slate-950';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${tone}`}>{status}</span>;
}

export default function SoopFundingMemoSoftV5() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState([]);
  const [token, setToken] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('SOOP 로그인 후 방송 채팅 연결을 눌러주세요.');
  const [manual, setManual] = useState({ name: '', amount: 1000, message: '' });
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLiveDebug, setIsLiveDebug] = useState(false);
  const [lastReceivedAt, setLastReceivedAt] = useState('없음');
  const [lastDisconnectedAt, setLastDisconnectedAt] = useState('없음');
  const sdkRef = useRef(null);
  const connectRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const manualStopRef = useRef(false);
  const isConnectingRef = useRef(false);
  const seenRef = useRef(new Set());
  const pendingRef = useRef([]);
  const sdkUrl = process.env.NEXT_PUBLIC_SOOP_CHAT_SDK_URL || '';

  useEffect(() => {
    const savedEvents = readJson(EVENTS_KEY, []).filter((event) => event?.id && event?.name && toNumber(event.amount) > 0).slice(0, MAX_EVENTS);
    setSettings({ ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) });
    setEvents(savedEvents);
    setToken(readJson(TOKEN_KEY, null));
    setIsLiveDebug(new URLSearchParams(window.location.search).get('debug') === 'live');
    seenRef.current = new Set(savedEvents.map((event) => event.id).filter(Boolean));
  }, []);

  useEffect(() => writeJson(SETTINGS_KEY, settings), [settings]);
  useEffect(() => writeJson(EVENTS_KEY, events.slice(0, MAX_EVENTS)), [events]);

  const safeDisconnectSdk = useCallback((reason = 'cleanup') => {
    const sdk = sdkRef.current;
    sdkRef.current = null;
    if (!sdk) return;
    try { sdk.disconnect?.(); } catch {}
    try { sdk.destroy?.(); } catch {}
    try { sdk.close?.(); } catch {}
    if (reason !== 'silent') setLastDisconnectedAt(nowText());
  }, []);

  const scheduleReconnect = useCallback((reason = '연결 종료') => {
    if (manualStopRef.current || !token?.accessToken) return;
    const attempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempt;
    if (attempt > MAX_RECONNECTS) {
      setStatus('error');
      setStatusText(`${reason} 후 자동 재연결을 ${MAX_RECONNECTS}회 시도했지만 실패했습니다. 수동으로 다시 연결해주세요.`);
      return;
    }
    const delay = RECONNECT_DELAYS[Math.min(attempt - 1, RECONNECT_DELAYS.length - 1)];
    window.clearTimeout(reconnectTimerRef.current);
    setStatus('reconnecting');
    setStatusText(`${reason}. ${Math.round(delay / 1000)}초 후 자동 재연결 시도 ${attempt}/${MAX_RECONNECTS}`);
    reconnectTimerRef.current = window.setTimeout(() => connectRef.current?.({ reconnect: true }), delay);
  }, [token]);

  useEffect(() => () => {
    window.clearTimeout(reconnectTimerRef.current);
    safeDisconnectSdk('silent');
  }, [safeDisconnectSdk]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('soopAuth') === 'success' && params.get('token')) {
      try {
        const parsed = JSON.parse(atob(params.get('token').replace(/-/g, '+').replace(/_/g, '/')));
        writeJson(TOKEN_KEY, parsed);
        setToken(parsed);
        setStatus('authorized');
        setStatusText('SOOP 인증 완료. 2번 방송 채팅 연결을 눌러주세요.');
      } catch {
        setStatus('error');
        setStatusText('SOOP 인증 토큰을 읽지 못했습니다.');
      }
      window.history.replaceState({}, '', '/utility/soop-funding-memo?debug=live');
    }
  }, []);

  const addEvent = useCallback((event) => {
    if (!event) return false;
    if (event.donationId && seenRef.current.has(event.donationId)) return false;
    const safeId = event.donationId || event.id || `event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    seenRef.current.add(safeId);
    const finalEvent = { ...event, id: safeId };
    setLastReceivedAt(nowText());
    setEvents((prev) => [finalEvent, ...prev].slice(0, MAX_EVENTS));
    return true;
  }, []);

  const handleSdkPayload = useCallback((...args) => {
    const { action, payload } = normalizeSdkArgs(args);
    const donation = normalizeDonation(action, payload);
    if (donation) {
      const event = { id: donation.donationId || `soop-${Date.now()}-${Math.random().toString(36).slice(2)}`, donationId: donation.donationId, name: donation.name, userId: donation.userId, amount: donation.amount, source: 'soop', createdAt: new Date().toISOString(), donatedAtMs: Date.now() };
      if (addEvent(event)) {
        pendingRef.current.unshift({ ...event, matched: false });
        pendingRef.current = pendingRef.current.slice(0, 80);
        setStatus('received');
        setStatusText(`${event.name}님 ${formatNumber(event.amount)}개 후원 반영`);
      }
      return;
    }
    const chat = normalizeChat(action, payload);
    if (!chat) return;
    const now = Date.now();
    const target = pendingRef.current.find((item) => !item.matched && (item.userId && chat.userId ? item.userId === chat.userId : item.name === chat.name) && now - item.donatedAtMs <= 10000);
    if (!target) return;
    target.matched = true;
    setEvents((prev) => prev.map((event) => event.id === target.id ? { ...event, matchedMessage: chat.message, messageMatched: true } : event));
    setStatusText(`${chat.name}님 후원 메시지 매칭 완료`);
  }, [addEvent]);

  const startLogin = async () => {
    try {
      const res = await fetch('/api/soop/auth-url');
      const data = await res.json().catch(() => ({}));
      if (data.url) window.location.href = data.url;
      else setStatusText(data.message || data.error || 'SOOP 로그인 URL을 만들지 못했습니다.');
    } catch {
      setStatus('error');
      setStatusText('SOOP 로그인 URL을 가져오지 못했습니다.');
    }
  };

  const connectSdk = useCallback(({ reconnect = false } = {}) => {
    if (isConnectingRef.current) return;
    if (!token?.accessToken) {
      setStatus('error');
      setStatusText('먼저 1번 SOOP 로그인을 완료해주세요.');
      return;
    }
    const ChatSdk = getChatSdkClass();
    if (!sdkLoaded || !ChatSdk) {
      setStatus('error');
      setStatusText('채팅 연결 준비 중입니다. 새로고침 후 다시 눌러주세요.');
      return;
    }
    manualStopRef.current = false;
    isConnectingRef.current = true;
    setIsConnecting(true);
    window.clearTimeout(reconnectTimerRef.current);
    setStatus(reconnect ? 'reconnecting' : 'connecting');
    setStatusText(reconnect ? '자동 재연결 중입니다.' : '방송 채팅 연결 중입니다.');
    try {
      safeDisconnectSdk('silent');
      const sdk = new ChatSdk(process.env.NEXT_PUBLIC_SOOP_CLIENT_ID || '', '');
      if (!sdk || typeof sdk.connect !== 'function') throw new Error('Chat SDK 초기화 실패');
      if (typeof sdk.setAuth === 'function') sdk.setAuth(token.accessToken);
      if (typeof sdk.handleMessageReceived === 'function') sdk.handleMessageReceived((...args) => handleSdkPayload(...args));
      if (typeof sdk.handleChatClosed === 'function') sdk.handleChatClosed(() => {
        if (manualStopRef.current) return;
        setLastDisconnectedAt(nowText());
        setStatus('closed');
        setStatusText('방송 채팅 연결이 끊겼습니다. 자동 복구를 시도합니다.');
        sdkRef.current = null;
        scheduleReconnect('방송 채팅 연결 종료');
      });
      if (typeof sdk.handleError === 'function') sdk.handleError((code, msg) => {
        if (manualStopRef.current) return;
        setLastDisconnectedAt(nowText());
        setStatus('error');
        setStatusText(`연결 오류: ${code || ''} ${msg || ''}`.trim() || '연결 오류 - 자동 복구를 시도합니다.');
        sdkRef.current = null;
        scheduleReconnect('연결 오류');
      });
      sdk.connect();
      sdkRef.current = sdk;
      reconnectAttemptsRef.current = 0;
      setStatus('connected');
      setStatusText('방송 채팅 연결됨. 후원 대기 중입니다.');
    } catch (error) {
      safeDisconnectSdk('silent');
      setStatus('error');
      setStatusText(`${error?.message || '방송 채팅 연결에 실패했습니다.'} 자동 복구를 시도합니다.`);
      scheduleReconnect('연결 실패');
    } finally {
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }, [handleSdkPayload, safeDisconnectSdk, scheduleReconnect, sdkLoaded, token]);

  useEffect(() => { connectRef.current = connectSdk; }, [connectSdk]);

  const disconnectSdk = () => {
    manualStopRef.current = true;
    window.clearTimeout(reconnectTimerRef.current);
    reconnectAttemptsRef.current = 0;
    safeDisconnectSdk();
    setStatus('idle');
    setStatusText('방송 채팅 연결을 수동으로 중지했습니다.');
  };

  const forceClosedTest = () => {
    manualStopRef.current = false;
    safeDisconnectSdk();
    setStatus('closed-test');
    setStatusText('테스트: 연결 끊김 상태입니다. 자동 재연결을 시도합니다.');
    scheduleReconnect('테스트 연결 끊김');
  };

  const forceErrorTest = () => {
    manualStopRef.current = false;
    setStatus('error-test');
    setStatusText('테스트: ERROR 상태입니다. 자동 재연결을 시도합니다.');
    scheduleReconnect('테스트 오류');
  };

  const addManual = () => {
    const amount = toNumber(manual.amount);
    if (amount <= 0) return;
    const message = String(manual.message || '').trim();
    addEvent({ id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: manual.name.trim() || '익명', amount, source: 'manual', createdAt: new Date().toISOString(), donatedAtMs: Date.now(), matchedMessage: message, messageMatched: Boolean(message) });
  };

  const resetEvents = () => {
    setEvents([]);
    pendingRef.current = [];
    seenRef.current = new Set();
    writeJson(EVENTS_KEY, []);
  };

  const memo = useMemo(() => buildMemo(events, settings), [events, settings]);
  const ranking = useMemo(() => buildRanking(events), [events]);
  const total = useMemo(() => events.reduce((sum, event) => sum + toNumber(event.amount), 0), [events]);
  const validCount = Math.max(1, toNumber(settings.validCount, 1000));
  const validEvents = events.filter((event) => toNumber(event.amount) >= validCount);

  const copyMemo = async () => {
    if (!memo) return;
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#07101f,#091827_42%,#06101f)] text-white">
      {sdkUrl ? <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} onError={() => setStatusText('Chat SDK 스크립트 로드 실패')} /> : null}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(52,211,153,0.10),transparent_28%),radial-gradient(circle_at_48%_100%,rgba(129,140,248,0.10),transparent_34%)]" />
      <header className="sticky top-0 z-40 bg-[#06101e]/78 backdrop-blur-2xl shadow-[0_10px_32px_rgba(0,0,0,0.22)]">
        <div className="mx-auto flex max-w-[1760px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3"><a href="/utility" className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-black text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-white/[0.10]">← 유틸리티</a><h1 className="text-xl font-black sm:text-2xl">펀딩 자동메모장</h1></div>
          <a href="/" className="rounded-full bg-cyan-300/12 px-4 py-2 text-xs font-black text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16)]">장지수용소</a>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1760px] px-5 py-6 lg:px-8">
        <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <Panel title="방송 연결" desc="1번 로그인 후 2번 연결을 누르면 후원을 기다립니다.">
              <div className="mb-4 rounded-[28px] bg-[#052235]/80 p-4 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.09)]">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/13"><img src="/logos/SOOP.png" alt="SOOP" className="max-h-7 max-w-10 object-contain" /></div><div><div className="text-sm font-black text-white">SOOP 파트너 연결</div><div className="mt-1 text-xs font-bold text-cyan-50/58">상태만 보면 바로 알 수 있게 정리했습니다.</div></div></div><StatusPill status={status} /></div>
                <div className="mt-4 rounded-[22px] bg-[#061421]/88 p-4 text-sm font-bold leading-6 text-white/76 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">{statusText}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-black text-white/48"><span>마지막 수신: {lastReceivedAt}</span><span>마지막 끊김: {lastDisconnectedAt}</span></div>
              </div>
              <div className="grid gap-2"><div className="grid grid-cols-2 gap-2"><Button onClick={startLogin}>1. SOOP 로그인</Button><Button tone="green" onClick={token ? () => connectSdk() : startLogin} disabled={isConnecting}>{isConnecting ? '연결 중...' : '2. 방송 채팅 연결'}</Button></div><Button tone="rose" onClick={disconnectSdk} wide>연결 중지</Button></div>
              {isLiveDebug ? <div className="mt-3 grid grid-cols-2 gap-2 rounded-[22px] bg-amber-300/8 p-3 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.12)]"><Button tone="yellow" onClick={forceClosedTest}>연결 끊김 테스트</Button><Button tone="rose" onClick={forceErrorTest}>ERROR 테스트</Button><div className="col-span-2 text-[11px] font-bold leading-5 text-amber-100/76">debug=live 전용입니다. 자동 재연결 흐름을 확인합니다.</div></div> : null}
              {!sdkUrl ? <div className="mt-3 rounded-2xl bg-amber-300/10 px-3 py-2 text-[11px] font-bold leading-5 text-amber-100/85 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.13)]">NEXT_PUBLIC_SOOP_CHAT_SDK_URL 환경변수에 Chat SDK 스크립트 URL을 넣어야 연결 버튼이 동작합니다.</div> : null}
            </Panel>

            <Panel title="기준 설정" desc="몇 개부터 복붙 결과에 넣을지 정합니다.">
              <label className="block rounded-[26px] bg-cyan-300/[0.075] p-4 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.11)]"><div className="text-sm font-black text-cyan-50">유효개수</div><div className="mt-1 text-xs font-semibold text-white/52">복붙 결과에 반영할 최소 단위</div><div className="mt-3"><Field type="number" min="1" value={settings.validCount} onChange={(e) => setSettings((p) => ({ ...p, validCount: Math.max(1, toNumber(e.target.value, 1000)) }))} /></div></label>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="핀볼 복붙 결과" desc="후원 닉네임 또는 메시지 기준으로 바로 복사합니다." right={<div className="flex gap-2"><Button onClick={copyMemo} disabled={!memo}>{copied ? '복사됨' : '복사'}</Button><Button tone="rose" onClick={resetEvents}>초기화</Button></div>}>
              <div className="mb-4 grid gap-2 rounded-[24px] bg-[#061421]/70 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] md:grid-cols-2"><ChoiceButton active={settings.outputMode !== 'message'} onClick={() => setSettings((p) => ({ ...p, outputMode: 'nickname' }))}>후원 닉네임으로 복사</ChoiceButton><ChoiceButton active={settings.outputMode === 'message'} onClick={() => setSettings((p) => ({ ...p, outputMode: 'message' }))}>후원 메시지로 복사</ChoiceButton></div>
              <textarea value={memo} readOnly placeholder="아직 복붙할 후원 데이터가 없습니다." className="h-[390px] w-full resize-none rounded-[30px] bg-[#052033]/82 px-5 py-5 text-[20px] font-black leading-9 text-cyan-50 outline-none shadow-[inset_0_0_0_1px_rgba(103,232,249,0.10)] placeholder:text-white/26" />
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/54"><span className="rounded-full bg-cyan-300/8 px-3 py-1.5">유효개수 {formatNumber(validCount)}개</span><span className="rounded-full bg-cyan-300/8 px-3 py-1.5">기록 {events.length}건</span><span className="rounded-full bg-cyan-300/8 px-3 py-1.5">보관 최대 {formatNumber(MAX_EVENTS)}건</span></div>
            </Panel>

            <Panel title="수동 추가" desc="누락이 보이면 바로 보정합니다.">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><Field value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="후원 닉네임" /><Field type="number" value={manual.amount} onChange={(e) => setManual((p) => ({ ...p, amount: e.target.value }))} /><Button onClick={addManual}>추가</Button></div><div className="mt-3"><Field value={manual.message} onChange={(e) => setManual((p) => ({ ...p, message: e.target.value }))} placeholder="후원 메시지 선택 시 사용할 메시지 입력" /></div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="후원자 순위 TOP 10" desc="닉네임 기준 누적입니다.">
              <div className="mb-3 grid grid-cols-2 gap-3"><div className="rounded-[24px] bg-emerald-300/10 px-4 py-4 text-center"><div className="text-xs font-black text-white/50">총 펀딩</div><div className="mt-1 text-3xl font-black text-white">{formatNumber(total)}</div></div><div className="rounded-[24px] bg-cyan-300/10 px-4 py-4 text-center"><div className="text-xs font-black text-white/50">유효 건수</div><div className="mt-1 text-3xl font-black text-white">{validEvents.length}</div></div></div>
              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">{ranking.length ? ranking.map((item, index) => <div key={item.name} className={`rounded-[22px] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)] ${index === 0 ? 'bg-amber-300/12' : 'bg-[#071827]/84'}`}><div className="flex items-center gap-3"><span className="text-xl">{index === 0 ? '👑' : index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-base font-black text-white">{item.name}</div><div className="mt-1 text-xs font-bold text-white/42">후원 {item.count}회</div></div><div className="text-right text-lg font-black text-cyan-50">{formatNumber(item.amount)}</div></div></div>) : <div className="rounded-[24px] bg-white/[0.035] p-8 text-center text-sm font-semibold text-white/40">순위 대기 중</div>}</div>
            </Panel>

            <Panel title="최근 후원 로그" desc="후원 이벤트별로 기록됩니다.">
              <div className="max-h-[310px] space-y-2 overflow-auto pr-1">{events.length ? events.map((event) => <div key={event.id} className="rounded-2xl bg-[#071827]/84 px-3 py-2 text-xs font-bold text-white/58 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]"><div className="flex items-center justify-between gap-2"><span className="truncate text-white">{event.name}</span><span className="shrink-0 text-cyan-100">{formatNumber(event.amount)}개</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate">{event.matchedMessage || event.source}</span><span className={event.messageMatched ? 'text-emerald-200/85' : 'text-white/34'}>{event.messageMatched ? '메시지 매칭' : event.source}</span></div></div>) : <div className="rounded-[24px] bg-white/[0.035] p-6 text-center text-sm font-semibold text-white/40">아직 후원 로그가 없습니다.</div>}</div>
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

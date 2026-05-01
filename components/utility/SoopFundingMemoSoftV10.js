import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_KEY = 'sou-soop-official-sdk-token-v2';
const SETTINGS_KEY = 'sou-soop-funding-soft-v5-settings';
const EVENTS_KEY = 'sou-soop-funding-soft-v5-events';
const MAX_EVENTS = 2000;
const RECONNECT_DELAYS = [1000, 1500, 2500, 4000, 6000, 9000, 12000, 16000, 20000, 30000];
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const DEFAULT_SETTINGS = { validCount: 1000, outputMode: 'nickname', messageMatchMs: 30000 };

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

function normalizeStoredToken(token) {
  if (!token) return null;
  const accessToken = token.accessToken || token.access_token || token.raw?.access_token || '';
  const refreshToken = token.refreshToken || token.refresh_token || token.raw?.refresh_token || '';
  const expiresIn = toNumber(token.expiresIn || token.expires_in || token.raw?.expires_in, 0);
  const createdAt = toNumber(token.createdAt, Date.now());
  const expiresAt = toNumber(token.expiresAt, expiresIn > 0 ? createdAt + expiresIn * 1000 : 0);
  if (!accessToken && !refreshToken) return null;
  return { ...token, accessToken, refreshToken, expiresIn, createdAt, expiresAt };
}

function isTokenExpiring(token, marginMs = TOKEN_REFRESH_MARGIN_MS) {
  if (!token?.accessToken) return true;
  if (!token.expiresAt) return false;
  return Date.now() + marginMs >= token.expiresAt;
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
  const inlineMessage = String(pick(payload, ['message.text', 'message.message', 'data.message', 'comment', 'content', 'msg']) || '').trim();
  const isDonation = action.includes('BALLOON') || action.includes('GIFT') || action.includes('DONATION');
  if (!isDonation || !name || amount <= 0) return null;
  return { amount, name, userId, donationId, inlineMessage };
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

function Panel({ title, desc, right, children }) {
  return (
    <section className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(145deg,rgba(20,41,64,0.94),rgba(8,18,34,0.96))] p-5 shadow-[0_26px_72px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-cyan-100/[0.045]">
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
  return <input {...props} className="w-full rounded-[22px] bg-[#062033] px-4 py-4 text-[20px] font-black text-white outline-none shadow-[inset_0_0_0_2px_rgba(34,211,238,0.32),0_10px_26px_rgba(0,0,0,0.18)] placeholder:text-white/38 transition focus:shadow-[inset_0_0_0_2px_rgba(103,232,249,0.78),0_0_0_5px_rgba(34,211,238,0.11)]" />;
}

function Button({ children, tone = 'cyan', wide = false, active = false, ...props }) {
  const toneClass = tone === 'green'
    ? active ? 'bg-[linear-gradient(180deg,rgba(52,211,153,0.34),rgba(16,185,129,0.18))] text-emerald-50 shadow-[inset_0_0_0_2px_rgba(110,231,183,0.44),0_15px_32px_rgba(16,185,129,0.16)]' : 'bg-[linear-gradient(180deg,rgba(52,211,153,0.21),rgba(16,185,129,0.10))] text-emerald-50 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.28),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-emerald-400/25'
    : tone === 'rose'
      ? 'bg-[linear-gradient(180deg,rgba(251,113,133,0.19),rgba(190,18,60,0.10))] text-rose-50 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.30),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-rose-400/22'
      : 'bg-[linear-gradient(180deg,rgba(34,211,238,0.18),rgba(14,165,233,0.08))] text-cyan-50 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.26),0_12px_26px_rgba(0,0,0,0.18)] hover:bg-cyan-300/22';
  return <button type="button" {...props} className={`${wide ? 'w-full' : ''} min-h-[56px] rounded-[24px] px-5 py-4 text-sm font-black tracking-[-0.01em] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}>{children}</button>;
}

function ChoiceButton({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-[62px] rounded-[24px] px-5 py-4 text-sm font-black transition active:scale-[0.985] ${active ? 'bg-[linear-gradient(180deg,rgba(52,211,153,0.34),rgba(14,165,233,0.16))] text-white shadow-[inset_0_0_0_2px_rgba(110,231,183,0.52),0_16px_34px_rgba(16,185,129,0.16)]' : 'bg-[#061827]/82 text-white/72 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.16),0_10px_24px_rgba(0,0,0,0.18)] hover:bg-[#082033] hover:text-white'}`}>
      {active ? <span className="mr-2 rounded-full bg-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-950">선택됨</span> : null}{children}
    </button>
  );
}

function StatusPill({ status }) {
  const tone = ['connected', 'received', 'authorized', 'refreshing'].includes(status) ? 'bg-emerald-300 text-emerald-950' : ['closed', 'reconnecting'].includes(status) ? 'bg-amber-300 text-amber-950' : ['error'].includes(status) ? 'bg-rose-300 text-rose-950' : 'bg-slate-400 text-slate-950';
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${tone}`}>{status}</span>;
}

export default function SoopFundingMemoSoftV10() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState([]);
  const [token, setToken] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('SOOP 로그인 후 방송 채팅 연결을 눌러주세요.');
  const [manual, setManual] = useState({ name: '', amount: 1000, message: '' });
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastReceivedAt, setLastReceivedAt] = useState('없음');
  const [lastDisconnectedAt, setLastDisconnectedAt] = useState('없음');
  const sdkRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const manualStopRef = useRef(false);
  const isConnectingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const tokenRef = useRef(null);
  const seenRef = useRef(new Set());
  const pendingRef = useRef([]);
  const sdkUrl = process.env.NEXT_PUBLIC_SOOP_CHAT_SDK_URL || '';

  const saveToken = useCallback((nextToken) => {
    const normalized = normalizeStoredToken(nextToken);
    tokenRef.current = normalized;
    setToken(normalized);
    if (normalized) writeJson(TOKEN_KEY, normalized);
    return normalized;
  }, []);

  const refreshToken = useCallback(async ({ silent = false } = {}) => {
    const current = tokenRef.current;
    if (!current?.refreshToken) return current;
    if (isRefreshingRef.current) return current;
    isRefreshingRef.current = true;
    if (!silent) {
      setStatus('refreshing');
      setStatusText('SOOP 토큰 자동갱신 중입니다.');
    }
    try {
      const res = await fetch('/api/soop/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.token?.accessToken) throw new Error(data?.error || 'SOOP 토큰 자동갱신 실패');
      const next = saveToken({ ...data.token, refreshToken: data.token.refreshToken || current.refreshToken });
      if (!silent) setStatusText('SOOP 토큰 자동갱신 완료. 연결을 유지합니다.');
      reconnectAttemptsRef.current = 0;
      return next;
    } catch (error) {
      if (!silent) {
        setStatus('error');
        setStatusText(`${error?.message || 'SOOP 토큰 자동갱신 실패'} 1번 SOOP 로그인을 다시 진행해주세요.`);
      }
      throw error;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [saveToken]);

  const ensureFreshToken = useCallback(async ({ force = false, silent = false } = {}) => {
    const current = tokenRef.current;
    if (!current?.accessToken && !current?.refreshToken) return null;
    if (force || isTokenExpiring(current)) return refreshToken({ silent });
    return current;
  }, [refreshToken]);

  useEffect(() => {
    const savedEvents = readJson(EVENTS_KEY, []).filter((event) => event?.id && event?.name && toNumber(event.amount) > 0).slice(0, MAX_EVENTS);
    setSettings({ ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) });
    setEvents(savedEvents);
    saveToken(readJson(TOKEN_KEY, null));
    seenRef.current = new Set(savedEvents.map((event) => event.id).filter(Boolean));
  }, [saveToken]);

  useEffect(() => { writeJson(SETTINGS_KEY, settings); }, [settings]);
  useEffect(() => { writeJson(EVENTS_KEY, events.slice(0, MAX_EVENTS)); }, [events]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.clearTimeout(refreshTimerRef.current);
    const current = tokenRef.current;
    if (!current?.refreshToken || !current?.expiresAt) return undefined;
    const delay = Math.max(15000, current.expiresAt - Date.now() - TOKEN_REFRESH_MARGIN_MS);
    refreshTimerRef.current = window.setTimeout(() => refreshToken({ silent: true }).catch(() => {}), delay);
    return () => window.clearTimeout(refreshTimerRef.current);
  }, [token, refreshToken]);

  const safeDisconnectSdk = useCallback((reason = 'cleanup') => {
    const sdk = sdkRef.current;
    sdkRef.current = null;
    if (!sdk) return;
    try { sdk.disconnect?.(); } catch {}
    try { sdk.destroy?.(); } catch {}
    try { sdk.close?.(); } catch {}
    if (reason !== 'silent') setLastDisconnectedAt(nowText());
  }, []);

  const connectSdk = useCallback(async ({ reconnect = false, forceRefresh = false } = {}) => {
    if (isConnectingRef.current) return;
    const readyToken = await ensureFreshToken({ force: forceRefresh, silent: reconnect }).catch(() => null);
    if (!readyToken?.accessToken) {
      setStatus('error');
      setStatusText('SOOP 로그인 토큰이 없습니다. 1번 SOOP 로그인을 다시 진행해주세요.');
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
      if (typeof sdk.setAuth === 'function') sdk.setAuth(readyToken.accessToken);
      if (typeof sdk.handleMessageReceived === 'function') sdk.handleMessageReceived((...args) => handleSdkPayload(...args));
      if (typeof sdk.handleChatClosed === 'function') sdk.handleChatClosed(() => {
        if (manualStopRef.current) return;
        setLastDisconnectedAt(nowText());
        setStatus('closed');
        setStatusText('방송 채팅 연결이 끊겼습니다. 자동 복구를 계속 시도합니다.');
        sdkRef.current = null;
        scheduleReconnect('방송 채팅 연결 종료');
      });
      if (typeof sdk.handleError === 'function') sdk.handleError((code, msg) => {
        if (manualStopRef.current) return;
        setLastDisconnectedAt(nowText());
        const detail = `${code || ''} ${msg || ''}`.trim();
        setStatus('error');
        setStatusText(detail ? `연결 오류: ${detail}. 자동 복구를 계속 시도합니다.` : '연결 오류 - 자동 복구를 계속 시도합니다.');
        sdkRef.current = null;
        scheduleReconnect('연결 오류');
      });
      sdk.connect();
      sdkRef.current = sdk;
      reconnectAttemptsRef.current = 0;
      setStatus('connected');
      setStatusText('방송 채팅 연결됨. 연결 중지 전까지 자동 유지합니다.');
    } catch (error) {
      safeDisconnectSdk('silent');
      setStatus('error');
      setStatusText(`${error?.message || '방송 채팅 연결에 실패했습니다.'} 자동 복구를 계속 시도합니다.`);
      scheduleReconnect('연결 실패', { forceRefresh: true });
    } finally {
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }, [ensureFreshToken, safeDisconnectSdk, sdkLoaded]);

  const scheduleReconnect = useCallback((reason = '연결 종료', options = {}) => {
    if (manualStopRef.current || !tokenRef.current?.accessToken) return;
    const attempt = reconnectAttemptsRef.current + 1;
    reconnectAttemptsRef.current = attempt;
    const delay = RECONNECT_DELAYS[Math.min(attempt - 1, RECONNECT_DELAYS.length - 1)];
    window.clearTimeout(reconnectTimerRef.current);
    setStatus('reconnecting');
    setStatusText(`${reason}. ${Math.round(delay / 1000)}초 후 자동 재연결 시도 ${attempt}회차`);
    reconnectTimerRef.current = window.setTimeout(async () => {
      const shouldRefresh = options.forceRefresh || attempt === 1 || attempt % 3 === 0;
      if (shouldRefresh) await ensureFreshToken({ force: true, silent: true }).catch(() => null);
      connectSdk({ reconnect: true });
    }, delay);
  }, [connectSdk, ensureFreshToken]);

  useEffect(() => () => {
    window.clearTimeout(reconnectTimerRef.current);
    window.clearTimeout(refreshTimerRef.current);
    safeDisconnectSdk('silent');
  }, [safeDisconnectSdk]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('soopAuth') === 'success' && params.get('token')) {
      try {
        const parsed = JSON.parse(atob(params.get('token').replace(/-/g, '+').replace(/_/g, '/')));
        saveToken(parsed);
        setStatus('authorized');
        setStatusText('SOOP 인증 완료. 2번 방송 채팅 연결을 눌러주세요.');
      } catch {
        setStatus('error');
        setStatusText('SOOP 인증 토큰을 읽지 못했습니다.');
      }
      window.history.replaceState({}, '', '/utility/soop-funding-memo?debug=live');
    }
  }, [saveToken]);

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
      const event = {
        id: donation.donationId || `soop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        donationId: donation.donationId,
        name: donation.name,
        userId: donation.userId,
        amount: donation.amount,
        source: 'soop',
        createdAt: new Date().toISOString(),
        donatedAtMs: Date.now(),
        matchedMessage: donation.inlineMessage || '',
        messageMatched: Boolean(donation.inlineMessage),
      };
      if (addEvent(event)) {
        pendingRef.current.unshift({ ...event, matched: Boolean(donation.inlineMessage) });
        pendingRef.current = pendingRef.current.slice(0, 120);
        setStatus('received');
        setStatusText(`${event.name}님 ${formatNumber(event.amount)}개 후원 반영`);
      }
      return;
    }
    const chat = normalizeChat(action, payload);
    if (!chat) return;
    const now = Date.now();
    const limit = Math.max(5000, toNumber(settings.messageMatchMs, 30000));
    const target = pendingRef.current.find((item) => !item.matched && (item.userId && chat.userId ? item.userId === chat.userId : item.name === chat.name) && now - item.donatedAtMs <= limit);
    if (!target) return;
    target.matched = true;
    setEvents((prev) => prev.map((event) => event.id === target.id ? { ...event, matchedMessage: chat.message, messageMatched: true } : event));
    setStatusText(`${chat.name}님 후원 메시지 매칭 완료`);
  }, [addEvent, settings.messageMatchMs]);

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

  const disconnectSdk = () => {
    manualStopRef.current = true;
    window.clearTimeout(reconnectTimerRef.current);
    reconnectAttemptsRef.current = 0;
    safeDisconnectSdk();
    setStatus('idle');
    setStatusText('방송 채팅 연결을 수동으로 중지했습니다.');
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
            <Panel title="방송 연결" desc="1번 로그인 후 2번 연결을 누르면 연결 중지 전까지 자동 유지합니다.">
              <div className="mb-4 rounded-[28px] bg-[#052235]/80 p-4 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.09)]">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/13"><img src="/logos/SOOP.png" alt="SOOP" className="max-h-7 max-w-10 object-contain" /></div><div><div className="text-sm font-black text-white">SOOP 파트너 연결</div><div className="mt-1 text-xs font-bold text-cyan-50/58">토큰 만료 전 자동갱신 + 끊김 시 계속 재연결</div></div></div><StatusPill status={status} /></div>
                <div className="mt-4 rounded-[22px] bg-[#061421]/88 p-4 text-sm font-bold leading-6 text-white/76 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">{statusText}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-black text-white/48"><span>마지막 수신: {lastReceivedAt}</span><span>마지막 끊김: {lastDisconnectedAt}</span></div>
              </div>
              <div className="grid gap-2"><div className="grid grid-cols-2 gap-2"><Button onClick={startLogin}>1. SOOP 로그인</Button><Button tone="green" onClick={token ? () => connectSdk() : startLogin} disabled={isConnecting}>{isConnecting ? '연결 중...' : '2. 방송 채팅 연결'}</Button></div><Button tone="rose" onClick={disconnectSdk} wide>연결 중지</Button></div>
              {!sdkUrl ? <div className="mt-3 rounded-2xl bg-amber-300/10 px-3 py-2 text-[11px] font-bold leading-5 text-amber-100/85 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.13)]">NEXT_PUBLIC_SOOP_CHAT_SDK_URL 환경변수에 Chat SDK 스크립트 URL을 넣어야 연결 버튼이 동작합니다.</div> : null}
            </Panel>

            <Panel title="기준 설정" desc="몇 개부터 복붙 결과에 넣을지 정합니다.">
              <label className="block rounded-[26px] bg-cyan-300/[0.075] p-4 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.11)]"><div className="text-sm font-black text-cyan-50">유효개수</div><div className="mt-1 text-xs font-semibold text-white/52">복붙 결과에 반영할 최소 단위</div><div className="mt-3"><Field type="number" min="1" value={settings.validCount} onChange={(e) => setSettings((p) => ({ ...p, validCount: Math.max(1, toNumber(e.target.value, 1000)) }))} /></div></label>
            </Panel>

            <Panel title="수동 추가" desc="누락된 후원을 직접 입력합니다.">
              <div className="grid gap-3"><Field value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="후원 닉네임" /><Field value={manual.message} onChange={(e) => setManual((p) => ({ ...p, message: e.target.value }))} placeholder="후원 메시지" /><div className="flex gap-2"><Field type="number" value={manual.amount} onChange={(e) => setManual((p) => ({ ...p, amount: e.target.value }))} placeholder="후원 개수" /><Button onClick={addManual}>추가</Button></div></div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="핀볼 복붙 결과" desc="후원 닉네임 또는 메시지 기준으로 바로 복사합니다." right={<div className="flex gap-2"><Button onClick={copyMemo} disabled={!memo}>{copied ? '복사됨' : '복사'}</Button><Button tone="rose" onClick={resetEvents}>초기화</Button></div>}>
              <div className="mb-4 grid gap-2 rounded-[24px] bg-[#061421]/70 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)] md:grid-cols-2"><ChoiceButton active={settings.outputMode !== 'message'} onClick={() => setSettings((p) => ({ ...p, outputMode: 'nickname' }))}>후원 닉네임으로 복사</ChoiceButton><ChoiceButton active={settings.outputMode === 'message'} onClick={() => setSettings((p) => ({ ...p, outputMode: 'message' }))}>후원 메시지로 복사</ChoiceButton></div>
              <textarea value={memo} readOnly placeholder="아직 복붙할 후원 데이터가 없습니다." className="h-[390px] w-full resize-none rounded-[30px] bg-white px-5 py-5 text-[20px] font-black leading-9 text-gray-900 outline-none shadow-[inset_0_0_0_1px_rgba(103,232,249,0.10)] placeholder:text-gray-500" />
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/54"><span className="rounded-full bg-cyan-300/8 px-3 py-1.5">유효개수 {formatNumber(validCount)}개</span><span className="rounded-full bg-cyan-300/8 px-3 py-1.5">기록 {events.length}건</span><span className="rounded-full bg-cyan-300/8 px-3 py-1.5">유효 {validEvents.length}건</span></div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="후원자 순위 TOP 10" desc="후원 개수 합산 기준입니다.">
              <div className="mb-3 grid grid-cols-2 gap-3"><div className="rounded-[22px] bg-emerald-300/10 p-4 text-center"><div className="text-xs font-black text-white/45">총 펀딩</div><div className="mt-1 text-2xl font-black">{formatNumber(total)}</div></div><div className="rounded-[22px] bg-cyan-300/10 p-4 text-center"><div className="text-xs font-black text-white/45">유효 건수</div><div className="mt-1 text-2xl font-black">{validEvents.length}</div></div></div>
              <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
                {ranking.length ? ranking.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-[#07101a] px-3.5 py-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{index + 1}. {item.name}</div><div className="mt-1 text-[11px] font-bold text-white/36">후원 {item.count}회</div></div><div className="text-base font-black text-cyan-50">{formatNumber(item.amount)}</div></div>) : <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-8 text-center text-white/50">순위 대기 중</div>}
              </div>
            </Panel>
          </div>
        </section>
      </main>
    </div>
  );
}

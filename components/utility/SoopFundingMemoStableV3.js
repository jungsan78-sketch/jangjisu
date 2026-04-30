import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_KEY = 'sou-soop-official-sdk-token-v2';
const SETTINGS_KEY = 'sou-soop-funding-stable-v3-settings';
const EVENTS_KEY = 'sou-soop-funding-stable-v3-events';
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
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
    return {
      action: String(raw.action || raw.type || raw.event || '').toUpperCase(),
      payload: raw.message || raw.data || raw.payload || raw,
    };
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

function Card({ title, desc, children, right }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-cyan-100/18 bg-gradient-to-br from-cyan-300/12 via-white/[0.04] to-blue-300/8 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.30)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_34%)]" />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          {desc ? <p className="mt-1 text-sm font-bold leading-6 text-white/60">{desc}</p> : null}
        </div>
        {right}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function Field(props) {
  return <input {...props} className="w-full rounded-[22px] border border-cyan-100/20 bg-[#091827] px-4 py-4 text-[18px] font-black text-white outline-none placeholder:text-white/35 transition focus:border-cyan-200/60 focus:bg-[#0b2032]" />;
}

function Button({ children, tone = 'cyan', ...props }) {
  const toneClass = tone === 'green'
    ? 'border-emerald-200/36 bg-emerald-300/18 text-emerald-50 hover:bg-emerald-300/26'
    : tone === 'rose'
      ? 'border-rose-200/28 bg-rose-300/14 text-rose-50 hover:bg-rose-300/22'
      : tone === 'yellow'
        ? 'border-yellow-200/28 bg-yellow-300/12 text-yellow-100 hover:bg-yellow-300/18'
        : 'border-cyan-200/38 bg-cyan-300/18 text-cyan-50 hover:bg-cyan-300/26';
  return <button type="button" {...props} className={`rounded-[22px] border px-4 py-4 text-sm font-black transition hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}>{children}</button>;
}

export default function SoopFundingMemoStableV3() {
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
        setStatusText('SOOP 인증 완료. 방송 채팅 연결을 누르세요.');
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
      const event = {
        id: donation.donationId || `soop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        donationId: donation.donationId,
        name: donation.name,
        userId: donation.userId,
        amount: donation.amount,
        source: 'soop',
        createdAt: new Date().toISOString(),
        donatedAtMs: Date.now(),
      };
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
    const target = pendingRef.current.find((item) => {
      if (item.matched) return false;
      const sameUser = item.userId && chat.userId ? item.userId === chat.userId : item.name === chat.name;
      return sameUser && now - item.donatedAtMs <= 10000;
    });
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
      setStatusText('SOOP 로그인이 필요합니다.');
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
      if (typeof sdk.handleChatClosed === 'function') {
        sdk.handleChatClosed(() => {
          if (manualStopRef.current) return;
          setLastDisconnectedAt(nowText());
          setStatus('closed');
          setStatusText('방송 채팅 연결이 끊겼습니다. 자동 복구를 시도합니다.');
          sdkRef.current = null;
          scheduleReconnect('방송 채팅 연결 종료');
        });
      }
      if (typeof sdk.handleError === 'function') {
        sdk.handleError((code, msg) => {
          if (manualStopRef.current) return;
          const text = `연결 오류: ${code || ''} ${msg || ''}`.trim();
          setLastDisconnectedAt(nowText());
          setStatus('error');
          setStatusText(`${text || '연결 오류'} - 자동 복구를 시도합니다.`);
          sdkRef.current = null;
          scheduleReconnect('연결 오류');
        });
      }
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

  const clearLogin = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    disconnectSdk();
  };

  const addManual = () => {
    const amount = toNumber(manual.amount);
    if (amount <= 0) return;
    const message = String(manual.message || '').trim();
    addEvent({
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: manual.name.trim() || '익명',
      amount,
      source: 'manual',
      createdAt: new Date().toISOString(),
      donatedAtMs: Date.now(),
      matchedMessage: message,
      messageMatched: Boolean(message),
    });
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
  const statusDot = ['error', 'error-test'].includes(status) ? 'bg-rose-300' : ['closed', 'closed-test', 'reconnecting'].includes(status) ? 'bg-yellow-300' : ['connected', 'received', 'authorized'].includes(status) ? 'bg-emerald-300' : 'bg-white/25';

  const copyMemo = async () => {
    if (!memo) return;
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      {sdkUrl ? <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} onError={() => setStatusText('Chat SDK 스크립트 로드 실패')} /> : null}
      <header className="sticky top-0 z-40 border-b border-cyan-100/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1780px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <a href="/utility" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/80 transition hover:bg-white/10 active:scale-95">← 유틸리티</a>
            <h1 className="text-xl font-black sm:text-2xl">장지수용소 펀딩 자동메모장</h1>
          </div>
          <a href="/" className="rounded-full border border-cyan-200/22 bg-cyan-200/12 px-4 py-2 text-xs font-black text-cyan-50 transition hover:bg-cyan-200/20 active:scale-95">장지수용소로 돌아가기</a>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1780px] px-5 py-5 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)_430px]">
          <div className="space-y-4">
            <Card title="방송 연결" desc="끊김 감지 시 자동 재연결을 시도합니다. 수동 중지 버튼을 누른 경우에는 재연결하지 않습니다.">
              <div className="mb-4 flex items-center gap-3 rounded-[24px] border border-cyan-100/18 bg-[#092033] p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-100/24 bg-cyan-300/14"><img src="/logos/SOOP.png" alt="SOOP" className="max-h-8 max-w-12 object-contain" /></div>
                <div className="min-w-0 flex-1"><div className="text-sm font-black text-white">SOOP 파트너 연결</div><div className="mt-1 text-xs font-semibold leading-5 text-cyan-50/58">상태·마지막 수신·끊김 시간을 같이 확인하세요.</div></div>
              </div>
              <div className="rounded-[22px] border border-cyan-100/14 bg-[#071521] px-4 py-3">
                <div className="flex items-center justify-between gap-3"><div className="text-xs font-black uppercase tracking-[0.2em] text-white/44">{status}</div><div className={`h-3 w-3 rounded-full ${statusDot}`} /></div>
                <div className="mt-2 min-h-[22px] text-sm font-bold leading-6 text-white/70">{statusText}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-black text-white/48"><span>마지막 수신: {lastReceivedAt}</span><span>마지막 끊김: {lastDisconnectedAt}</span></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={startLogin}><img src="/logos/SOOP.png" alt="" className="mr-2 inline h-4 w-auto" /> SOOP 로그인</Button><Button tone="green" onClick={token ? () => connectSdk() : startLogin} disabled={isConnecting}>{isConnecting ? '연결 중...' : '방송 채팅 연결'}</Button><Button tone="rose" onClick={disconnectSdk}>연결 중지</Button><Button onClick={clearLogin}>로그인 정보 초기화</Button></div>
              {isLiveDebug ? <div className="mt-3 grid grid-cols-2 gap-2 rounded-[20px] border border-yellow-200/20 bg-yellow-300/8 p-3"><Button tone="yellow" onClick={forceClosedTest}>연결 끊김 테스트</Button><Button tone="rose" onClick={forceErrorTest}>ERROR 테스트</Button><div className="col-span-2 text-[11px] font-bold leading-5 text-yellow-100/75">debug=live 전용입니다. 자동 재연결 흐름과 SDK 안전 정리를 확인합니다.</div></div> : null}
              {!sdkUrl ? <div className="mt-3 rounded-2xl border border-yellow-200/20 bg-yellow-300/10 px-3 py-2 text-[11px] font-bold leading-5 text-yellow-100/85">NEXT_PUBLIC_SOOP_CHAT_SDK_URL 환경변수에 Chat SDK 스크립트 URL을 넣어야 연결 버튼이 동작합니다.</div> : null}
            </Card>

            <Card title="기준 설정" desc="복붙 결과에 반영할 최소 단위를 조절합니다.">
              <label className="block rounded-[24px] border border-cyan-100/20 bg-cyan-300/[0.085] p-4"><div className="text-sm font-black text-cyan-50">유효개수</div><div className="mt-1 text-xs font-semibold text-white/52">복붙 결과에 반영할 최소 단위</div><div className="mt-3"><Field type="number" min="1" value={settings.validCount} onChange={(e) => setSettings((p) => ({ ...p, validCount: Math.max(1, toNumber(e.target.value, 1000)) }))} /></div></label>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="핀볼 복붙 결과" desc="복사 기준을 고른 뒤 결과를 그대로 복사합니다." right={<div className="flex gap-2"><Button onClick={copyMemo} disabled={!memo}>{copied ? '복사됨' : '복사'}</Button><Button tone="rose" onClick={resetEvents}>초기화</Button></div>}>
              <div className="mb-4 grid gap-2 rounded-[26px] border border-cyan-100/16 bg-[#071827] p-3 md:grid-cols-2"><Button tone={settings.outputMode !== 'message' ? 'green' : 'cyan'} onClick={() => setSettings((p) => ({ ...p, outputMode: 'nickname' }))}>후원 닉네임으로 복사</Button><Button tone={settings.outputMode === 'message' ? 'green' : 'cyan'} onClick={() => setSettings((p) => ({ ...p, outputMode: 'message' }))}>후원 메시지로 복사</Button></div>
              <textarea value={memo} readOnly placeholder="아직 복붙할 후원 데이터가 없습니다." className="h-[390px] w-full resize-none overflow-auto rounded-[30px] border border-cyan-100/24 bg-[#071a2a] px-5 py-5 text-[20px] font-black leading-9 text-cyan-50 outline-none placeholder:text-white/30" />
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/50"><span className="rounded-full border border-cyan-100/14 bg-cyan-300/8 px-3 py-1.5">유효개수 {formatNumber(validCount)}개</span><span className="rounded-full border border-cyan-100/14 bg-cyan-300/8 px-3 py-1.5">기록 {events.length}건</span><span className="rounded-full border border-cyan-100/14 bg-cyan-300/8 px-3 py-1.5">보관 최대 {formatNumber(MAX_EVENTS)}건</span></div>
            </Card>

            <Card title="수동 추가" desc="누락된 후원이 있다면 즉시 보정합니다.">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><Field value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="후원 닉네임" /><Field type="number" value={manual.amount} onChange={(e) => setManual((p) => ({ ...p, amount: e.target.value }))} /><Button onClick={addManual}>추가</Button></div><div className="mt-3"><Field value={manual.message} onChange={(e) => setManual((p) => ({ ...p, message: e.target.value }))} placeholder="후원 메시지 선택 시 사용할 메시지 입력" /></div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="후원자 순위 TOP 10" desc="닉네임 기준 누적입니다.">
              <div className="mb-3 grid grid-cols-2 gap-3"><div className="rounded-[22px] border border-emerald-100/22 bg-emerald-300/12 px-4 py-4 text-center"><div className="text-xs font-black text-white/55">총 펀딩</div><div className="mt-1 text-3xl font-black tracking-tight text-white">{formatNumber(total)}</div></div><div className="rounded-[22px] border border-cyan-100/22 bg-cyan-300/12 px-4 py-4 text-center"><div className="text-xs font-black text-white/55">유효 건수</div><div className="mt-1 text-3xl font-black tracking-tight text-white">{validEvents.length}</div></div></div>
              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">{ranking.length ? ranking.map((item, index) => <div key={item.name} className={`rounded-[22px] border px-4 py-3 ${index === 0 ? 'border-yellow-200/36 bg-yellow-300/14' : 'border-cyan-100/12 bg-[#091827]'}`}><div className="flex items-center gap-3"><span className="text-xl">{index === 0 ? '👑' : index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-base font-black text-white">{item.name}</div><div className="mt-1 text-xs font-bold text-white/42">후원 {item.count}회</div></div><div className="text-right text-lg font-black text-cyan-50">{formatNumber(item.amount)}</div></div></div>) : <div className="rounded-[24px] border border-dashed border-cyan-100/16 bg-cyan-300/6 p-8 text-center text-sm font-semibold text-white/45">순위 대기 중</div>}</div>
            </Card>

            <Card title="최근 후원 로그" desc="후원 이벤트별로 기록됩니다.">
              <div className="max-h-[310px] space-y-2 overflow-auto pr-1">{events.length ? events.map((event) => <div key={event.id} className="rounded-2xl border border-cyan-100/12 bg-[#091827] px-3 py-2 text-xs font-bold text-white/58"><div className="flex items-center justify-between gap-2"><span className="truncate text-white">{event.name}</span><span className="shrink-0 text-cyan-100">{formatNumber(event.amount)}개</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate">{event.matchedMessage || event.source}</span><span className={event.messageMatched ? 'text-emerald-200/85' : 'text-white/34'}>{event.messageMatched ? '메시지 매칭' : event.source}</span></div></div>) : <div className="rounded-[24px] border border-dashed border-cyan-100/16 bg-cyan-300/6 p-6 text-center text-sm font-semibold text-white/45">아직 후원 로그가 없습니다.</div>}</div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

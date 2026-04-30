import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_KEY = 'sou-soop-official-sdk-token-v2';
const SETTINGS_KEY = 'sou-soop-funding-v2-settings';
const EVENTS_KEY = 'sou-soop-funding-v2-events';
const MAX_EVENTS = 220;
const DEDUPE_MS = 650;
const MESSAGE_MATCH_MS = 10000;
const DEFAULT_SETTINGS = { validCount: 1000, outputMode: 'nickname' };

const toNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const formatNumber = (value) => toNumber(value).toLocaleString('ko-KR');

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

function Card({ title, desc, right, children, glow = 'cyan' }) {
  const glowClass = glow === 'purple'
    ? 'from-fuchsia-300/14 via-white/[0.04] to-blue-300/8 border-fuchsia-100/18'
    : glow === 'green'
      ? 'from-emerald-300/14 via-white/[0.04] to-cyan-300/8 border-emerald-100/18'
      : 'from-cyan-300/14 via-white/[0.04] to-blue-300/8 border-cyan-100/18';
  return (
    <section className={`relative overflow-hidden rounded-[30px] border bg-gradient-to-br ${glowClass} p-5 shadow-[0_28px_80px_rgba(0,0,0,0.30)]`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.13),transparent_34%)]" />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">{title}</h2>
          {desc ? <p className="mt-1 text-sm font-bold leading-6 text-white/60">{desc}</p> : null}
        </div>
        {right}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function BigInput(props) {
  return <input {...props} className="w-full rounded-[22px] border border-cyan-100/20 bg-[#091827] px-4 py-4 text-[22px] font-black tracking-tight text-white outline-none placeholder:text-white/35 transition focus:border-cyan-200/60 focus:bg-[#0b2032] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.11)]" />;
}

function TextInput(props) {
  return <input {...props} className="w-full rounded-[22px] border border-cyan-100/20 bg-[#091827] px-4 py-4 text-[17px] font-black text-white outline-none placeholder:text-white/35 transition focus:border-cyan-200/60 focus:bg-[#0b2032] focus:shadow-[0_0_0_4px_rgba(34,211,238,0.11)]" />;
}

function ModeButton({ active, title, desc, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[22px] border p-4 text-left transition duration-200 hover:-translate-y-0.5 active:scale-[0.985] ${active ? 'border-cyan-100/60 bg-[linear-gradient(135deg,rgba(34,211,238,0.28),rgba(59,130,246,0.20))] shadow-[0_16px_42px_rgba(34,211,238,0.16)]' : 'border-white/12 bg-white/[0.075] hover:border-cyan-100/25 hover:bg-white/[0.11]'}`}>
      <div className={`text-base font-black ${active ? 'text-white' : 'text-white/84'}`}>{title}</div>
      <div className="mt-1 text-xs font-bold leading-5 text-white/56">{desc}</div>
    </button>
  );
}

export default function SoopFundingMemoPolishedV2() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState([]);
  const [token, setToken] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('SOOP 로그인 후 방송 채팅 연결을 눌러주세요.');
  const [manual, setManual] = useState({ name: '', amount: 1000, message: '' });
  const [copied, setCopied] = useState(false);
  const [isLiveDebug, setIsLiveDebug] = useState(false);
  const sdkRef = useRef(null);
  const seenRef = useRef(new Set());
  const recentRef = useRef(new Map());
  const pendingRef = useRef([]);
  const sdkUrl = process.env.NEXT_PUBLIC_SOOP_CHAT_SDK_URL || '';

  useEffect(() => {
    const savedEvents = readJson(EVENTS_KEY, []).filter((event) => event?.id && event?.name && toNumber(event.amount) > 0).slice(0, MAX_EVENTS);
    setSettings({ ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) });
    setEvents(savedEvents);
    setToken(readJson(TOKEN_KEY, null));
    setIsLiveDebug(new URLSearchParams(window.location.search).get('debug') === 'live');
    seenRef.current = new Set(savedEvents.map((event) => event.id));
  }, []);

  useEffect(() => writeJson(SETTINGS_KEY, settings), [settings]);
  useEffect(() => writeJson(EVENTS_KEY, events.slice(0, MAX_EVENTS)), [events]);

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
    if (event.source === 'soop') {
      const now = Date.now();
      const key = event.donationId || `${event.userId || event.name}:${event.amount}`;
      const lastAt = recentRef.current.get(key) || 0;
      if (now - lastAt < DEDUPE_MS) {
        setStatusText(`${event.name}님 ${formatNumber(event.amount)}개 중복 수신 1건 정리`);
        return false;
      }
      recentRef.current.set(key, now);
    }
    if (seenRef.current.has(event.id)) return false;
    seenRef.current.add(event.id);
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    return true;
  }, []);

  const handleSdkPayload = useCallback((...args) => {
    const { action, payload } = normalizeSdkArgs(args);
    const donation = normalizeDonation(action, payload);
    if (donation) {
      const event = {
        id: donation.donationId || `soop-${donation.userId || donation.name}-${donation.amount}-${Date.now()}`,
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
        pendingRef.current = pendingRef.current.slice(0, 40);
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
      return sameUser && now - item.donatedAtMs <= MESSAGE_MATCH_MS;
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

  const connectSdk = useCallback(() => {
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
    try {
      sdkRef.current?.disconnect?.();
      const sdk = new ChatSdk(process.env.NEXT_PUBLIC_SOOP_CLIENT_ID || '', '');
      sdk.setAuth(token.accessToken);
      sdk.handleMessageReceived?.((...args) => handleSdkPayload(...args));
      sdk.handleChatClosed?.(() => {
        setStatus('closed');
        setStatusText('방송 채팅 연결이 종료되었습니다. 방송 OFF 상태라면 방송을 켠 뒤 다시 연결하세요.');
      });
      sdk.handleError?.((code, msg) => {
        setStatus('error');
        setStatusText(`연결 오류: ${code || ''} ${msg || ''}`.trim());
      });
      sdk.connect();
      sdkRef.current = sdk;
      setStatus('connected');
      setStatusText('방송 채팅 연결됨. 후원 대기 중입니다.');
    } catch (error) {
      setStatus('error');
      setStatusText(error?.message || '방송 채팅 연결에 실패했습니다.');
    }
  }, [handleSdkPayload, sdkLoaded, token]);

  const disconnectSdk = () => {
    try { sdkRef.current?.disconnect?.(); } catch {}
    sdkRef.current = null;
    setStatus('idle');
    setStatusText('방송 채팅 연결을 중지했습니다.');
  };

  const forceClosedTest = () => {
    try { sdkRef.current?.disconnect?.(); } catch {}
    sdkRef.current = null;
    setStatus('closed-test');
    setStatusText('테스트: 연결 끊김 상태를 강제로 만들었습니다. 실제 CLOSED와 같은 복구 흐름 확인용입니다.');
  };

  const forceErrorTest = () => {
    setStatus('error-test');
    setStatusText('테스트: ERROR 상태를 강제로 표시했습니다. 실제 오류 표시/운영 대응 문구 확인용입니다.');
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
      id: `manual-${Date.now()}-${Math.random()}`,
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
    recentRef.current = new Map();
    writeJson(EVENTS_KEY, []);
  };

  const memo = useMemo(() => buildMemo(events, settings), [events, settings]);
  const ranking = useMemo(() => buildRanking(events), [events]);
  const total = useMemo(() => events.reduce((sum, event) => sum + toNumber(event.amount), 0), [events]);
  const validCount = Math.max(1, toNumber(settings.validCount, 1000));
  const validEvents = events.filter((event) => toNumber(event.amount) >= validCount);
  const statusDot = ['error', 'error-test'].includes(status) ? 'bg-rose-300' : ['closed', 'closed-test'].includes(status) ? 'bg-yellow-300' : ['connected', 'received', 'authorized'].includes(status) ? 'bg-emerald-300' : 'bg-white/25';
  const copyMemo = async () => {
    if (!memo) return;
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      {sdkUrl ? <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} onError={() => setStatusText('Chat SDK 스크립트 로드 실패')} /> : null}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute top-16 right-[-90px] h-96 w-96 rounded-full bg-blue-400/16 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-fuchsia-400/10 blur-3xl" />
      </div>
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
            <Card title="방송 연결" desc="SOOP 파트너 계정으로 로그인 후 본인 방송의 후원을 감지합니다.">
              <div className="mb-4 flex items-center gap-3 rounded-[24px] border border-cyan-100/18 bg-[#092033] p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-100/24 bg-cyan-300/14"><img src="/logos/SOOP.png" alt="SOOP" className="max-h-8 max-w-12 object-contain" /></div>
                <div className="min-w-0 flex-1"><div className="text-sm font-black text-white">SOOP 파트너 연결</div><div className="mt-1 text-xs font-semibold leading-5 text-cyan-50/58">방송 채팅 연결 후 후원 대기 상태가 됩니다.</div></div>
              </div>
              <div className="rounded-[22px] border border-cyan-100/14 bg-[#071521] px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="text-xs font-black uppercase tracking-[0.2em] text-white/44">{status}</div><div className={`h-3 w-3 rounded-full ${statusDot}`} /></div><div className="mt-2 min-h-[22px] text-sm font-bold leading-6 text-white/70">{statusText}</div></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={startLogin} className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-cyan-200/38 bg-cyan-300/18 px-4 py-4 text-sm font-black text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-300/26 active:scale-[0.97]"><img src="/logos/SOOP.png" alt="" className="h-4 w-auto" /> SOOP 로그인</button><button type="button" onClick={token ? connectSdk : startLogin} className="rounded-[22px] border border-emerald-200/36 bg-emerald-300/18 px-4 py-4 text-sm font-black text-emerald-50 transition hover:-translate-y-0.5 hover:bg-emerald-300/26 active:scale-[0.97]">방송 채팅 연결</button><button type="button" onClick={disconnectSdk} className="col-span-2 rounded-[22px] border border-white/12 bg-white/[0.075] px-4 py-3 text-sm font-black text-white/72 transition hover:bg-white/[0.11] active:scale-[0.98]">연결 중지</button></div>
              {isLiveDebug ? <div className="mt-3 grid grid-cols-2 gap-2 rounded-[20px] border border-yellow-200/20 bg-yellow-300/8 p-3"><button type="button" onClick={forceClosedTest} className="rounded-[18px] border border-yellow-200/28 bg-yellow-300/12 px-3 py-3 text-xs font-black text-yellow-100 transition hover:bg-yellow-300/18 active:scale-[0.98]">연결 끊김 테스트</button><button type="button" onClick={forceErrorTest} className="rounded-[18px] border border-rose-200/28 bg-rose-300/12 px-3 py-3 text-xs font-black text-rose-100 transition hover:bg-rose-300/18 active:scale-[0.98]">ERROR 테스트</button><div className="col-span-2 text-[11px] font-bold leading-5 text-yellow-100/75">debug=live 전용입니다. 실제 후원 없이 상태 전환과 운영 대응 문구만 확인합니다.</div></div> : null}
              <button type="button" onClick={clearLogin} className="mt-3 text-xs font-bold text-white/42 underline-offset-4 hover:text-white/65 hover:underline">로그인 정보 초기화</button>
              {!sdkUrl ? <div className="mt-3 rounded-2xl border border-yellow-200/20 bg-yellow-300/10 px-3 py-2 text-[11px] font-bold leading-5 text-yellow-100/85">NEXT_PUBLIC_SOOP_CHAT_SDK_URL 환경변수에 Chat SDK 스크립트 URL을 넣어야 연결 버튼이 동작합니다.</div> : null}
            </Card>

            <Card title="기준 설정" desc="복붙 결과에 반영할 최소 단위를 조절합니다." glow="purple">
              <div className="grid gap-3">
                <label className="rounded-[24px] border border-cyan-100/20 bg-cyan-300/[0.085] p-4"><div className="text-sm font-black text-cyan-50">유효개수</div><div className="mt-1 text-xs font-semibold text-white/52">복붙 결과에 반영할 최소 단위</div><div className="mt-3"><BigInput type="number" min="1" value={settings.validCount} onChange={(e) => setSettings((p) => ({ ...p, validCount: Math.max(1, toNumber(e.target.value, 1000)) }))} /></div></label>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="핀볼 복붙 결과" desc="복사 기준을 고른 뒤 결과를 그대로 복사합니다." right={<div className="flex gap-2"><button type="button" onClick={copyMemo} disabled={!memo} className="rounded-full border border-cyan-200/38 bg-cyan-300/18 px-5 py-2 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/26 active:scale-95 disabled:opacity-40">{copied ? '복사됨' : '복사'}</button><button type="button" onClick={resetEvents} className="rounded-full border border-rose-200/24 bg-rose-300/14 px-5 py-2 text-sm font-black text-rose-50 transition hover:bg-rose-300/22 active:scale-95">초기화</button></div>}>
              <div className="mb-4 rounded-[26px] border border-cyan-100/16 bg-[#071827] p-3"><div className="mb-2 px-1 text-sm font-black text-white">복사 기준</div><div className="grid gap-2 md:grid-cols-2"><ModeButton active={settings.outputMode !== 'message'} title="후원 닉네임으로 복사" desc="예: 장지수*1,장지수*1" onClick={() => setSettings((p) => ({ ...p, outputMode: 'nickname' }))} /><ModeButton active={settings.outputMode === 'message'} title="후원 메시지로 복사" desc="자동 매칭 또는 수동 입력 메시지를 사용" onClick={() => setSettings((p) => ({ ...p, outputMode: 'message' }))} /></div></div>
              <textarea value={memo} readOnly placeholder="아직 복붙할 후원 데이터가 없습니다." className="h-[390px] w-full resize-none overflow-auto rounded-[30px] border border-cyan-100/24 bg-[#071a2a] px-5 py-5 text-[20px] font-black leading-9 text-cyan-50 outline-none placeholder:text-white/30 selection:bg-cyan-300/30" />
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/50"><span className="rounded-full border border-cyan-100/14 bg-cyan-300/8 px-3 py-1.5">유효개수 {formatNumber(validCount)}개</span><span className="rounded-full border border-cyan-100/14 bg-cyan-300/8 px-3 py-1.5">기록 {events.length}건</span><span className="rounded-full border border-cyan-100/14 bg-cyan-300/8 px-3 py-1.5">쉼표 출력 고정</span></div>
            </Card>

            <Card title="수동 추가" desc="닉네임, 개수, 메시지를 직접 넣어 누락된 후원을 보정합니다." glow="green">
              <div className="grid gap-3"><div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><TextInput value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="후원 닉네임" /><BigInput type="number" value={manual.amount} onChange={(e) => setManual((p) => ({ ...p, amount: e.target.value }))} /><button type="button" onClick={addManual} className="rounded-[22px] border border-cyan-200/38 bg-cyan-300/18 px-7 py-4 text-sm font-black text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-300/26 active:scale-[0.97]">추가</button></div><TextInput value={manual.message} onChange={(e) => setManual((p) => ({ ...p, message: e.target.value }))} placeholder="후원 메시지 선택 시 사용할 메시지 입력" /></div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="후원자 순위 TOP 10" desc="복붙 결과와 달리 순위는 닉네임 기준 누적입니다." glow="green">
              <div className="mb-3 grid grid-cols-2 gap-3"><div className="rounded-[22px] border border-emerald-100/22 bg-emerald-300/12 px-4 py-4 text-center"><div className="text-xs font-black text-white/55">총 펀딩</div><div className="mt-1 text-3xl font-black tracking-tight text-white">{formatNumber(total)}</div></div><div className="rounded-[22px] border border-cyan-100/22 bg-cyan-300/12 px-4 py-4 text-center"><div className="text-xs font-black text-white/55">유효 건수</div><div className="mt-1 text-3xl font-black tracking-tight text-white">{validEvents.length}</div></div></div>
              <div className="max-h-[340px] space-y-2 overflow-auto pr-1">{ranking.length ? ranking.map((item, index) => <div key={item.name} className={`rounded-[22px] border px-4 py-3 transition hover:-translate-y-0.5 ${index === 0 ? 'border-yellow-200/36 bg-yellow-300/14' : 'border-cyan-100/12 bg-[#091827]'}`}><div className="flex items-center gap-3"><span className="text-xl">{index === 0 ? '👑' : index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-base font-black text-white">{item.name}</div><div className="mt-1 text-xs font-bold text-white/42">후원 {item.count}회</div></div><div className="text-right text-lg font-black text-cyan-50">{formatNumber(item.amount)}</div></div></div>) : <div className="rounded-[24px] border border-dashed border-cyan-100/16 bg-cyan-300/6 p-8 text-center text-sm font-semibold text-white/45">순위 대기 중</div>}</div>
            </Card>

            <Card title="최근 후원 로그" desc="후원 이벤트별로 한 줄씩 기록됩니다.">
              <div className="max-h-[310px] space-y-2 overflow-auto pr-1">{events.length ? events.map((event) => <div key={event.id} className="rounded-2xl border border-cyan-100/12 bg-[#091827] px-3 py-2 text-xs font-bold text-white/58"><div className="flex items-center justify-between gap-2"><span className="truncate text-white">{event.name}</span><span className="shrink-0 text-cyan-100">{formatNumber(event.amount)}개</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate">{event.matchedMessage || event.source}</span><span className={event.messageMatched ? 'text-emerald-200/85' : 'text-white/34'}>{event.messageMatched ? '메시지 매칭' : event.source}</span></div></div>) : <div className="rounded-[24px] border border-dashed border-cyan-100/16 bg-cyan-300/6 p-6 text-center text-sm font-semibold text-white/45">아직 후원 로그가 없습니다.</div>}</div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

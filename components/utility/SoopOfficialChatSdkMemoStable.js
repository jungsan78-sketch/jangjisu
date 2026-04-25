import Script from 'next/script';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_KEY = 'sou-soop-official-sdk-token-v2';
const SETTINGS_KEY = 'sou-soop-official-sdk-stable-settings-v1';
const EVENTS_KEY = 'sou-soop-official-sdk-stable-events-v1';
const MESSAGE_MATCH_MS = 10000;
const DONATION_DEDUPE_MS = 3500;
const MAX_EVENTS = 220;

const DEFAULT_SETTINGS = {
  validCount: 1000,
  alertMinCount: 1000,
  useMatchedMessage: false,
};

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
      raw,
    };
  }

  const [action, message] = args;
  return {
    action: String(action || '').toUpperCase(),
    payload: message || {},
    raw: args,
  };
}

function normalizeDonation(action, payload) {
  const amount = num(pick(payload, ['count', 'amount', 'balloonCount', 'giftCount', 'message.count', 'data.count']));
  const name = String(pick(payload, ['userNickname', 'nickname', 'userNick', 'fromUsername', 'name', 'message.userNickname', 'data.userNickname']) || '').trim();
  const userId = String(pick(payload, ['userId', 'userID', 'id', 'message.userId', 'data.userId']) || '').trim();
  const isDonation = action.includes('BALLOON') || action.includes('GIFT') || action.includes('DONATION');
  if (!isDonation || !name || amount <= 0) return null;
  return { name, userId, amount };
}

function normalizeChat(action, payload) {
  const isChat = action === 'MESSAGE' || action.includes('CHAT');
  const message = String(pick(payload, ['message', 'text', 'comment', 'content', 'msg', 'data.message', 'message.message']) || '').trim();
  const name = String(pick(payload, ['userNickname', 'nickname', 'userNick', 'name', 'data.userNickname', 'message.userNickname']) || '').trim();
  const userId = String(pick(payload, ['userId', 'userID', 'id', 'data.userId', 'message.userId']) || '').trim();
  if (!isChat || !name || !message) return null;
  return { name, userId, message };
}

function makeMemo(events, settings) {
  const base = Math.max(1, num(settings.validCount, 1000));
  return [...events]
    .reverse()
    .map((event) => {
      const units = Math.floor(num(event.amount) / base);
      if (units < 1) return null;
      const label = String(settings.useMatchedMessage && event.matchedMessage ? event.matchedMessage : event.name || '').trim() || '익명';
      return `${label}*${units}`;
    })
    .filter(Boolean)
    .join(',');
}

function makeRanking(events) {
  const map = new Map();
  events.forEach((event) => {
    const key = event.name || '익명';
    const item = map.get(key) || { name: key, amount: 0, count: 0 };
    item.amount += num(event.amount);
    item.count += 1;
    map.set(key, item);
  });
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
}

function Input(props) {
  return <input {...props} className="w-full rounded-2xl border border-white/10 bg-[#090d15] px-3.5 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-cyan-200/35" />;
}

function Card({ title, caption, right, children }) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.03))] p-4 shadow-2xl shadow-black/25">
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

export default function SoopOfficialChatSdkMemoStable() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [events, setEvents] = useState([]);
  const [token, setToken] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('SOOP 로그인 후 공식 SDK 연결을 눌러주세요.');
  const [manual, setManual] = useState({ name: '', amount: 1000 });
  const [copied, setCopied] = useState(false);
  const seenRef = useRef(new Set());
  const recentDonationRef = useRef(new Map());
  const pendingRef = useRef([]);
  const sdkRef = useRef(null);
  const sdkUrl = process.env.NEXT_PUBLIC_SOOP_CHAT_SDK_URL || '';

  useEffect(() => {
    const savedSettings = { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_KEY, {}) };
    const savedEvents = readJson(EVENTS_KEY, []).filter((event) => event?.id && event?.name && num(event.amount) > 0).slice(0, MAX_EVENTS);
    setSettings(savedSettings);
    setEvents(savedEvents);
    setToken(readJson(TOKEN_KEY, null));
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
        setStatusText('SOOP 인증 완료. 공식 SDK 연결을 누르세요.');
      } catch {
        setStatus('error');
        setStatusText('SOOP 인증 토큰을 읽지 못했습니다.');
      }
      window.history.replaceState({}, '', '/utility/soop-funding-memo');
    }
  }, []);

  const addEvent = useCallback((event) => {
    if (!event) return false;

    if (event.source === 'soop-official-chat-sdk') {
      const now = Date.now();
      const key = `${event.userId || event.name}:${event.amount}`;
      const recentAt = recentDonationRef.current.get(key) || 0;
      if (now - recentAt < DONATION_DEDUPE_MS) {
        setStatusText(`${event.name}님 ${fmt(event.amount)}개 중복 이벤트 1건 무시`);
        return false;
      }
      recentDonationRef.current.set(key, now);
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
        id: `official-${donation.userId || donation.name}-${donation.amount}-${Date.now()}`,
        name: donation.name,
        userId: donation.userId,
        amount: donation.amount,
        source: 'soop-official-chat-sdk',
        createdAt: new Date().toISOString(),
        donatedAtMs: Date.now(),
      };
      const inserted = addEvent(event);
      if (inserted) {
        pendingRef.current.unshift({ ...event, matched: false });
        pendingRef.current = pendingRef.current.slice(0, 40);
        setStatus('received');
        setStatusText(`${event.name}님 ${fmt(event.amount)}개 후원 반영`);
      }
      return;
    }

    const chat = normalizeChat(action, payload);
    if (chat) {
      const now = Date.now();
      const target = pendingRef.current.find((item) => {
        if (item.matched) return false;
        const sameUser = item.userId && chat.userId ? item.userId === chat.userId : item.name === chat.name;
        return sameUser && now - item.donatedAtMs >= 0 && now - item.donatedAtMs <= MESSAGE_MATCH_MS;
      });
      if (target) {
        target.matched = true;
        setEvents((prev) => prev.map((event) => event.id === target.id ? { ...event, matchedMessage: chat.message, messageMatched: true } : event));
        setStatusText(`${chat.name}님 후원 후 채팅 매칭: ${chat.message}`);
      }
    }
  }, [addEvent]);

  const connectSdk = useCallback(() => {
    if (!token?.accessToken) {
      setStatus('error');
      setStatusText('SOOP 로그인이 필요합니다.');
      return;
    }

    const ChatSdk = getChatSdkClass();
    if (!sdkLoaded || !ChatSdk) {
      setStatus('error');
      setStatusText('Chat SDK가 아직 준비되지 않았습니다. 새로고침 후 다시 눌러주세요.');
      return;
    }

    try {
      sdkRef.current?.disconnect?.();
      const sdk = new ChatSdk(process.env.NEXT_PUBLIC_SOOP_CLIENT_ID || '', '');
      sdk.setAuth(token.accessToken);
      sdk.handleMessageReceived?.((...args) => handleSdkPayload(...args));
      sdk.handleChatClosed?.(() => {
        setStatus('closed');
        setStatusText('SOOP 채팅 서버 연결이 종료되었습니다. 방송 OFF 상태라면 방송을 켠 뒤 다시 연결하세요.');
      });
      sdk.handleError?.((code, message) => {
        setStatus('error');
        setStatusText(`SDK 오류: ${code || ''} ${message || ''}`.trim());
      });
      sdk.connect();
      sdkRef.current = sdk;
      setStatus('connected');
      setStatusText('SOOP 공식 Chat SDK 연결됨. 후원 대기 중입니다.');
    } catch (error) {
      setStatus('error');
      setStatusText(error?.message || 'SOOP Chat SDK 연결에 실패했습니다.');
    }
  }, [handleSdkPayload, sdkLoaded, token]);

  const startLogin = async () => {
    try {
      const response = await fetch('/api/soop/auth-url');
      const data = await response.json().catch(() => ({}));
      if (data.url) window.location.href = data.url;
      else setStatusText(data.message || data.error || 'SOOP 로그인 URL을 만들지 못했습니다.');
    } catch {
      setStatus('error');
      setStatusText('SOOP 로그인 URL을 가져오지 못했습니다.');
    }
  };

  const disconnectSdk = () => {
    try {
      sdkRef.current?.disconnect?.();
    } catch {}
    sdkRef.current = null;
    setStatus('idle');
    setStatusText('SOOP 공식 SDK 연결을 중지했습니다.');
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    disconnectSdk();
  };

  const addManual = () => {
    const amount = num(manual.amount);
    if (amount <= 0) return;
    addEvent({
      id: `manual-${Date.now()}-${Math.random()}`,
      name: manual.name.trim() || '익명',
      amount,
      source: 'manual',
      createdAt: new Date().toISOString(),
      donatedAtMs: Date.now(),
    });
  };

  const resetEvents = () => {
    setEvents([]);
    pendingRef.current = [];
    seenRef.current = new Set();
    recentDonationRef.current = new Map();
    writeJson(EVENTS_KEY, []);
  };

  const memo = useMemo(() => makeMemo(events, settings), [events, settings]);
  const ranking = useMemo(() => makeRanking(events), [events]);
  const total = useMemo(() => events.reduce((sum, event) => sum + num(event.amount), 0), [events]);
  const validCount = Math.max(1, num(settings.validCount, 1000));
  const validEvents = events.filter((event) => num(event.amount) >= validCount);

  const copyMemo = async () => {
    if (!memo) return;
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      {sdkUrl ? <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setSdkLoaded(true)} onError={() => setStatusText('Chat SDK 스크립트 로드 실패')} /> : null}
      <div className="pointer-events-none fixed inset-0"><div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" /><div className="absolute top-16 right-[-90px] h-96 w-96 rounded-full bg-blue-500/12 blur-3xl" /></div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl"><div className="mx-auto flex max-w-[1780px] items-center justify-between gap-4 px-5 py-3 lg:px-8"><div className="flex items-center gap-3"><a href="/utility" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/80">← 유틸리티</a><h1 className="text-xl font-black sm:text-2xl">장지수용소 펀딩 자동메모장</h1></div><a href="/" className="rounded-full border border-cyan-200/18 bg-cyan-200/10 px-4 py-2 text-xs font-black text-cyan-100">장지수용소로 돌아가기</a></div></header>
      <main className="relative mx-auto max-w-[1780px] px-5 py-5 lg:px-8"><section className="grid gap-4 xl:grid-cols-[410px_minmax(0,1fr)_410px] 2xl:grid-cols-[430px_minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <Card title="SOOP 공식 연결" caption="스트리머 전용 기능입니다. 본인 방송의 채팅/별풍선 이벤트를 받습니다.">
            <div className="space-y-3"><div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.07] px-3 py-2 text-[11px] font-bold leading-5 text-cyan-50/75">SOOP 펀딩 복사는 스트리머 전용입니다. 같은 브라우저에서 SOOP에 로그인되어 있으면 인증 절차가 간단하게 넘어갈 수 있습니다.</div><div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"><div className="flex items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{status}</div><div className={`h-2.5 w-2.5 rounded-full ${status === 'error' ? 'bg-rose-300' : status === 'connected' || status === 'received' || status === 'authorized' ? 'bg-emerald-300' : 'bg-white/25'}`} /></div><div className="mt-2 min-h-[20px] text-xs font-semibold leading-5 text-white/58">{statusText}</div></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={startLogin} className="rounded-2xl border border-cyan-200/25 bg-cyan-300/16 px-4 py-3 text-sm font-black text-cyan-50">SOOP 로그인</button><button type="button" onClick={token ? connectSdk : startLogin} className="rounded-2xl border border-emerald-200/25 bg-emerald-300/14 px-4 py-3 text-sm font-black text-emerald-50">공식 SDK 연결</button><button type="button" onClick={disconnectSdk} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black text-white/62">연결 중지</button><button type="button" onClick={logout} className="rounded-2xl border border-rose-200/18 bg-rose-300/10 px-4 py-3 text-sm font-black text-rose-50">로그아웃</button></div>{!sdkUrl ? <div className="rounded-2xl border border-yellow-200/15 bg-yellow-300/8 px-3 py-2 text-[11px] font-bold leading-5 text-yellow-100/75">NEXT_PUBLIC_SOOP_CHAT_SDK_URL 환경변수에 Chat SDK 스크립트 URL을 넣어야 연결 버튼이 동작합니다.</div> : null}</div>
          </Card>
          <Card title="설정"><div className="grid gap-3"><div className="grid grid-cols-2 gap-3"><label className="rounded-[18px] border border-white/10 bg-black/22 p-3"><div className="text-xs font-black text-white/86">유효개수</div><Input type="number" min="1" value={settings.validCount} onChange={(e) => setSettings((p) => ({ ...p, validCount: Math.max(1, num(e.target.value, 1000)) }))} /></label><label className="rounded-[18px] border border-white/10 bg-black/22 p-3"><div className="text-xs font-black text-white/86">알림 최소</div><Input type="number" min="1" value={settings.alertMinCount} onChange={(e) => setSettings((p) => ({ ...p, alertMinCount: Math.max(1, num(e.target.value, 1000)) }))} /></label></div><button type="button" onClick={() => setSettings((p) => ({ ...p, useMatchedMessage: !p.useMatchedMessage }))} className={`rounded-2xl border px-3 py-2.5 text-xs font-black ${settings.useMatchedMessage ? 'border-cyan-200/40 bg-cyan-300/16 text-cyan-50' : 'border-white/10 bg-white/[0.045] text-white/60'}`}>후원 후 채팅 {settings.useMatchedMessage ? 'ON' : 'OFF'}</button></div></Card>
          <Card title="수동 추가"><div className="grid gap-2"><Input value={manual.name} onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} placeholder="후원 닉네임" /><div className="flex gap-2"><Input type="number" value={manual.amount} onChange={(e) => setManual((p) => ({ ...p, amount: e.target.value }))} /><button type="button" onClick={addManual} className="rounded-2xl border border-cyan-200/25 bg-cyan-300/16 px-5 py-2.5 text-sm font-black text-cyan-50">추가</button></div></div></Card>
        </div>
        <div className="space-y-4"><Card title="핀볼 복붙 결과" caption="동일 후원자도 이벤트별로 따로 추가됩니다." right={<div className="flex gap-2"><button type="button" onClick={copyMemo} disabled={!memo} className="rounded-full border border-cyan-200/25 bg-cyan-300/16 px-5 py-2 text-sm font-black text-cyan-50 disabled:opacity-40">{copied ? '복사됨' : '복사'}</button><button type="button" onClick={resetEvents} className="rounded-full border border-rose-200/18 bg-rose-300/10 px-5 py-2 text-sm font-black text-rose-50">초기화</button></div>}><textarea value={memo} readOnly placeholder="아직 복붙할 후원 데이터가 없습니다." className="h-[350px] w-full resize-none overflow-auto rounded-[28px] border border-cyan-200/14 bg-[#07101a] px-5 py-4 text-[17px] font-black leading-8 text-cyan-50 outline-none placeholder:text-white/24" /><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/40"><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">유효개수 {fmt(validCount)}개</span><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">저장 기록 {events.length}건</span></div></Card></div>
        <div className="space-y-4"><Card title="후원자 순위 TOP 10" caption="후원 개수는 닉네임 기준으로 누적됩니다."><div className="mb-3 grid grid-cols-2 gap-3"><div className="rounded-[18px] border border-emerald-200/16 bg-emerald-300/10 px-4 py-3 text-center"><div className="text-[11px] font-black text-white/45">총 펀딩</div><div className="mt-1 text-2xl font-black tracking-tight text-white">{fmt(total)}</div></div><div className="rounded-[18px] border border-cyan-200/16 bg-cyan-300/10 px-4 py-3 text-center"><div className="text-[11px] font-black text-white/45">유효 건수</div><div className="mt-1 text-2xl font-black tracking-tight text-white">{validEvents.length}</div></div></div><div className="max-h-[300px] space-y-2 overflow-auto pr-1">{ranking.length ? ranking.map((item, index) => <div key={item.name} className="rounded-[20px] border border-white/10 bg-[#07101a] px-3.5 py-3"><div className="flex items-center gap-3"><span className="text-lg">{index === 0 ? '👑' : index + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-black text-white">{item.name}</div><div className="mt-1 text-[11px] font-bold text-white/36">후원 {item.count}회</div></div><div className="text-right text-base font-black text-cyan-50">{fmt(item.amount)}</div></div></div>) : <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-8 text-center text-sm font-semibold text-white/40">순위 대기 중</div>}</div></Card><Card title="최근 후원 로그" caption="공식 SDK 이벤트와 매칭된 채팅을 같이 표시합니다."><div className="max-h-[260px] space-y-2 overflow-auto pr-1">{events.length ? events.map((event) => <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white/55"><div className="flex items-center justify-between gap-2"><span className="truncate text-white">{event.name}</span><span className="shrink-0 text-cyan-100">{fmt(event.amount)}개</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate">{event.matchedMessage || event.source}</span><span className={event.messageMatched ? 'text-emerald-200/75' : 'text-white/30'}>{event.messageMatched ? '채팅 매칭' : event.source}</span></div></div>) : <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-6 text-center text-sm font-semibold text-white/40">아직 후원 로그가 없습니다.</div>}</div></Card></div>
      </section></main>
    </div>
  );
}

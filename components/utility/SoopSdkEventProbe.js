import Script from 'next/script';
import { useEffect, useState } from 'react';

const TOKEN_KEY = 'sou-soop-official-sdk-token-v2';

function readSavedAuth() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  } catch {
    return null;
  }
}

function getChatSdkClass() {
  if (typeof window === 'undefined') return null;
  return window.SOOP?.ChatSDK || window.ChatSDK || null;
}

function stringify(value) {
  try {
    return JSON.stringify(value, null, 2).slice(0, 1600);
  } catch {
    return String(value).slice(0, 1600);
  }
}

export default function SoopSdkEventProbe() {
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('대기 중');
  const [logs, setLogs] = useState([]);
  const sdkUrl = process.env.NEXT_PUBLIC_SOOP_CHAT_SDK_URL || '';

  const addLog = (title, payload) => {
    setLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, title, payload: stringify(payload), at: new Date().toLocaleTimeString('ko-KR') }, ...prev].slice(0, 12));
  };

  const connect = () => {
    const auth = readSavedAuth();
    const ChatSdk = getChatSdkClass();
    if (!auth?.accessToken) {
      setStatus('SOOP 로그인을 먼저 해주세요.');
      return;
    }
    if (!loaded || !ChatSdk) {
      setStatus('Chat SDK가 아직 준비되지 않았습니다.');
      return;
    }

    try {
      const sdk = new ChatSdk(process.env.NEXT_PUBLIC_SOOP_CLIENT_ID || '', '');
      sdk.setAuth(auth.accessToken);
      sdk.handleMessageReceived?.((...args) => {
        addLog('handleMessageReceived', args.length === 1 ? args[0] : args);
      });
      sdk.handleChatClosed?.((...args) => {
        setStatus('채팅 서버 연결 종료');
        addLog('handleChatClosed', args);
      });
      sdk.handleError?.((...args) => {
        setStatus('SDK 오류');
        addLog('handleError', args);
      });
      sdk.connect();
      window.__souProbeSdk = sdk;
      setStatus('연결됨: 별풍선 1개 테스트 후 아래 로그 확인');
    } catch (error) {
      setStatus(error?.message || '연결 실패');
    }
  };

  const disconnect = () => {
    try {
      window.__souProbeSdk?.disconnect?.();
    } catch {}
    window.__souProbeSdk = null;
    setStatus('연결 중지');
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('soopAuth') === 'success') setStatus('SOOP 인증 완료. 프로브 연결을 눌러주세요.');
  }, []);

  return (
    <section className="rounded-[24px] border border-yellow-200/20 bg-yellow-300/[0.06] p-4 shadow-2xl shadow-black/25">
      {sdkUrl ? <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setLoaded(true)} onError={() => setStatus('Chat SDK 스크립트 로드 실패')} /> : null}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">SDK 원본 이벤트 프로브</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/45">별풍선 이벤트의 실제 action/payload 이름을 확인하기 위한 임시 로그입니다.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={connect} className="rounded-full border border-yellow-200/30 bg-yellow-300/12 px-4 py-2 text-xs font-black text-yellow-50">프로브 연결</button>
          <button type="button" onClick={disconnect} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white/60">중지</button>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs font-bold text-white/65">{status}</div>
      <div className="mt-3 max-h-[300px] space-y-2 overflow-auto pr-1">
        {logs.length ? logs.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="flex justify-between gap-2 text-xs font-black text-yellow-100"><span>{item.title}</span><span className="text-white/35">{item.at}</span></div>
            <pre className="mt-2 whitespace-pre-wrap break-all text-[11px] font-semibold leading-4 text-white/48">{item.payload}</pre>
          </div>
        )) : <div className="rounded-2xl border border-dashed border-white/12 p-5 text-center text-sm font-bold text-white/35">아직 원본 이벤트가 없습니다.</div>}
      </div>
    </section>
  );
}

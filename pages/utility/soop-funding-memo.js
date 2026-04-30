import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const TEST_EVENT_LIMIT = 2000;

const SoopFundingMemoStableV3 = dynamic(
  () => import('../../components/utility/SoopFundingMemoStableV3'),
  { ssr: false }
);

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString('ko-KR') : '0';
}

function buildMemo(events, validCount = 1000) {
  const base = Math.max(1, Number(validCount || 1000));
  return [...events]
    .reverse()
    .map((event) => {
      const unit = Math.floor(Number(event.amount || 0) / base);
      if (unit < 1) return null;
      return `${String(event.name || '익명').trim()}*${unit}`;
    })
    .filter(Boolean)
    .join(',');
}

function DebugFundingMemoTest() {
  const [events, setEvents] = useState([]);
  const [validCount, setValidCount] = useState(1000);
  const [status, setStatus] = useState('debug-ready');

  function makeEvent(index = 0, same = false) {
    const names = ['테스트A', '테스트B', '테스트C', '테스트D', '테스트E', '테스트F'];
    const name = same ? '동일닉네임' : names[index % names.length];
    const amount = same ? 1000 : (index % 5 + 1) * 1000;
    return {
      id: `debug-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      name,
      amount,
      source: 'debug',
      createdAt: new Date().toISOString(),
    };
  }

  function addBurst(count, same = false) {
    const next = Array.from({ length: count }, (_, index) => makeEvent(index, same));
    setEvents((prev) => [...next, ...prev].slice(0, TEST_EVENT_LIMIT));
    setStatus(`debug-added-${count}`);
  }

  const memo = useMemo(() => buildMemo(events, validCount), [events, validCount]);
  const total = useMemo(() => events.reduce((sum, event) => sum + Number(event.amount || 0), 0), [events]);
  const validEvents = useMemo(() => events.filter((event) => Number(event.amount || 0) >= Number(validCount || 1000)), [events, validCount]);

  return (
    <>
      <Head>
        <title>자동메모장 테스트 모드 | 유틸리티</title>
        <meta name="description" content="SOOP 펀딩 자동메모장 테스트 모드" />
      </Head>
      <main style={{ minHeight: '100vh', background: '#05070c', color: '#fff', padding: 24 }}>
        <section style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ border: '1px solid rgba(34,211,238,0.22)', borderRadius: 28, background: 'rgba(255,255,255,0.04)', padding: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.34em', color: 'rgba(125,211,252,0.72)' }}>DEBUG TEST MODE</div>
            <h1 style={{ marginTop: 14, fontSize: 38, fontWeight: 900 }}>SOOP 펀딩 자동메모장 테스트</h1>
            <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.8, fontWeight: 700 }}>실제 후원을 받지 않고 가짜 후원 이벤트를 주입해서 누락, 렉, 복붙 결과를 확인하는 화면입니다. 실제 SOOP 연결은 실행하지 않습니다.</p>
            <p style={{ marginTop: 10, color: 'rgba(251,191,36,0.82)', lineHeight: 1.8, fontWeight: 800 }}>실제 로그인/Chat SDK 연결 테스트는 ?debug=live 주소에서만 확인합니다.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) minmax(0, 1fr)', gap: 18, marginTop: 18 }}>
            <section style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 26, background: 'rgba(255,255,255,0.04)', padding: 22 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900 }}>테스트 조작</h2>
              <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.58)', lineHeight: 1.7, fontWeight: 700 }}>버튼을 눌러 실제 후원 대신 테스트 데이터를 넣습니다. 최대 {formatNumber(TEST_EVENT_LIMIT)}건까지 보관합니다.</p>

              <label style={{ display: 'block', marginTop: 18, fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.72)' }}>유효개수</label>
              <input value={validCount} onChange={(event) => setValidCount(event.target.value)} type="number" min="1" style={{ marginTop: 8, width: '100%', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, background: 'rgba(0,0,0,0.34)', color: '#fff', padding: 14, fontSize: 20, fontWeight: 900 }} />

              <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                <button onClick={() => addBurst(1)} style={buttonStyle}>테스트 후원 1건 추가</button>
                <button onClick={() => addBurst(10)} style={buttonStyle}>테스트 후원 10건 연속 추가</button>
                <button onClick={() => addBurst(100)} style={buttonStyle}>테스트 후원 100건 연속 추가</button>
                <button onClick={() => addBurst(1000)} style={buttonStyle}>테스트 후원 1,000건 연속 추가</button>
                <button onClick={() => addBurst(10, true)} style={warnButtonStyle}>동일 닉네임/동일 개수 10건</button>
                <button onClick={() => setStatus('closed-test')} style={darkButtonStyle}>CLOSED 상태 테스트</button>
                <button onClick={() => setStatus('error-test')} style={darkButtonStyle}>ERROR 상태 테스트</button>
                <button onClick={() => { setEvents([]); setStatus('debug-ready'); }} style={resetButtonStyle}>초기화</button>
                <a href="/utility/soop-funding-memo?debug=live" style={{ ...darkButtonStyle, textAlign: 'center', textDecoration: 'none' }}>실제 로그인 테스트로 이동</a>
              </div>
            </section>

            <section style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                <Metric title="상태" value={status} />
                <Metric title="총 기록" value={`${events.length}건`} />
                <Metric title="총 후원" value={formatNumber(total)} />
              </div>

              <section style={{ border: '1px solid rgba(34,211,238,0.18)', borderRadius: 26, background: 'rgba(34,211,238,0.06)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 900 }}>복붙 결과</h2>
                  <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: 13, fontWeight: 800 }}>유효 {validEvents.length}건</span>
                </div>
                <textarea value={memo} readOnly placeholder="테스트 후원을 추가하면 결과가 표시됩니다." style={{ marginTop: 14, width: '100%', minHeight: 220, border: '1px solid rgba(34,211,238,0.20)', borderRadius: 20, background: 'rgba(0,0,0,0.28)', color: '#cffafe', padding: 16, fontSize: 18, lineHeight: 1.7, fontWeight: 900 }} />
              </section>

              <section style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 26, background: 'rgba(255,255,255,0.04)', padding: 20 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900 }}>최근 테스트 로그</h2>
                <div style={{ marginTop: 14, display: 'grid', gap: 8, maxHeight: 330, overflow: 'auto' }}>
                  {events.length ? events.map((event) => (
                    <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, background: 'rgba(0,0,0,0.22)', padding: '10px 12px', fontSize: 13, fontWeight: 800 }}>
                      <span>{event.name}</span>
                      <span style={{ color: '#a5f3fc' }}>{formatNumber(event.amount)}개</span>
                    </div>
                  )) : <div style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 800 }}>아직 테스트 로그가 없습니다.</div>}
                </div>
              </section>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({ title, value }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, background: 'rgba(255,255,255,0.04)', padding: 18, textAlign: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 900 }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const buttonStyle = { border: '1px solid rgba(34,211,238,0.28)', borderRadius: 16, background: 'rgba(34,211,238,0.12)', color: '#ecfeff', padding: '13px 16px', fontWeight: 900, cursor: 'pointer' };
const warnButtonStyle = { ...buttonStyle, border: '1px solid rgba(251,191,36,0.32)', background: 'rgba(251,191,36,0.12)', color: '#fef3c7' };
const darkButtonStyle = { ...buttonStyle, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', color: '#fff' };
const resetButtonStyle = { ...buttonStyle, border: '1px solid rgba(251,113,133,0.28)', background: 'rgba(251,113,133,0.10)', color: '#ffe4e6' };

function LiveDebugNotice() {
  return (
    <div style={{ background: '#05070c', color: '#fff', padding: 16 }}>
      <div style={{ maxWidth: 1780, margin: '0 auto', border: '1px solid rgba(251,191,36,0.30)', borderRadius: 18, background: 'rgba(251,191,36,0.08)', padding: 14, fontSize: 13, fontWeight: 800, lineHeight: 1.7 }}>
        ⚠️ LIVE DEBUG: 이 화면은 실제 SOOP 로그인/Chat SDK 연결 테스트용입니다. 끊김 감지 시 자동 재연결을 시도하며, 안정화 확인 전에는 SOOP 실제 후원 내역과 반드시 대조하세요.
      </div>
    </div>
  );
}

function MaintenancePage() {
  const warningItems = [
    '방송 중에는 이 페이지 탭을 닫거나 새로고침하지 마세요.',
    'PC 절전 모드, 브라우저 절전 모드, 인터넷 끊김 상태에서는 후원 기록이 누락될 수 있습니다.',
    'CLOSED 또는 ERROR 상태가 보이면 후원 수신이 멈춘 상태일 수 있습니다.',
    '후원이 몰리는 상황에서는 SOOP 실제 후원 내역과 최근 후원 로그를 반드시 같이 확인해야 합니다.',
    '안정화 전까지 실전 방송에서 자동메모장만 단독으로 믿고 사용하지 마세요.',
  ];

  return (
    <>
      <Head>
        <title>점검중 | 유틸리티</title>
        <meta name="description" content="점검중" />
      </Head>
      <main style={{ minHeight: '100vh', background: '#05070c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section style={{ width: '100%', maxWidth: 760, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 28, background: 'rgba(255,255,255,0.04)', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.36em', color: 'rgba(255,255,255,0.45)' }}>MAINTENANCE</div>
          <h1 style={{ marginTop: 16, fontSize: 40, fontWeight: 900 }}>현재 점검중입니다</h1>
          <p style={{ margin: '16px auto 0', maxWidth: 560, lineHeight: 1.8, color: 'rgba(255,255,255,0.62)' }}>자동메모장 안정화 작업 중이라 잠시 이용할 수 없습니다.</p>

          <div style={{ margin: '28px auto 0', maxWidth: 640, border: '1px solid rgba(251,191,36,0.28)', borderRadius: 22, background: 'rgba(251,191,36,0.08)', padding: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#fde68a' }}>⚠️ 실전 사용 주의사항</div>
            <ul style={{ margin: '14px 0 0', paddingLeft: 20, color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, fontSize: 14, fontWeight: 700 }}>
              {warningItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <a href="/utility/soop-funding-memo?debug=1" style={{ display: 'inline-flex', marginTop: 28, marginRight: 10, border: '1px solid rgba(34,211,238,0.24)', borderRadius: 16, background: 'rgba(34,211,238,0.10)', padding: '12px 20px', color: '#ecfeff', fontWeight: 900, textDecoration: 'none' }}>테스트 모드</a>
          <a href="/utility" style={{ display: 'inline-flex', marginTop: 28, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, background: 'rgba(255,255,255,0.1)', padding: '12px 20px', color: '#fff', fontWeight: 900, textDecoration: 'none' }}>유틸리티로 돌아가기</a>
        </section>
      </main>
    </>
  );
}

export default function SoopFundingMemoPage() {
  const [debugMode, setDebugMode] = useState('maintenance');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const debug = new URLSearchParams(window.location.search).get('debug');
    if (debug === 'live') setDebugMode('live');
    else if (debug === '1') setDebugMode('test');
    else setDebugMode('maintenance');
  }, []);

  if (debugMode === 'live') {
    return (
      <>
        <LiveDebugNotice />
        <SoopFundingMemoStableV3 />
      </>
    );
  }

  return debugMode === 'test' ? <DebugFundingMemoTest /> : <MaintenancePage />;
}

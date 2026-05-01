import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const TEST_EVENT_LIMIT = 2000;

const SoopFundingMemoSoftV7 = dynamic(
  () => import('../../components/utility/SoopFundingMemoSoftV7'),
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
  const [status, setStatus] = useState('테스트 준비');

  function makeEvent(index = 0, same = false) {
    const names = ['테스트A', '테스트B', '테스트C', '테스트D', '테스트E', '테스트F'];
    const name = same ? '동일닉네임' : names[index % names.length];
    const amount = same ? 1000 : (index % 5 + 1) * 1000;
    return {
      id: `debug-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      name,
      amount,
      source: '테스트',
      createdAt: new Date().toISOString(),
    };
  }

  function addBurst(count, same = false) {
    const next = Array.from({ length: count }, (_, index) => makeEvent(index, same));
    setEvents((prev) => [...next, ...prev].slice(0, TEST_EVENT_LIMIT));
    setStatus(`테스트 ${formatNumber(count)}건 추가`);
  }

  const memo = useMemo(() => buildMemo(events, validCount), [events, validCount]);
  const total = useMemo(() => events.reduce((sum, event) => sum + Number(event.amount || 0), 0), [events]);
  const validEvents = useMemo(() => events.filter((event) => Number(event.amount || 0) >= Number(validCount || 1000)), [events, validCount]);

  return (
    <>
      <Head>
        <title>자동메모장 테스트 모드 | 유틸리티</title>
        <meta name="description" content="숲 펀딩 자동메모장 테스트 모드" />
      </Head>
      <main style={{ minHeight: '100vh', background: '#05070c', color: '#fff', padding: 24 }}>
        <section style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ border: '1px solid rgba(34,211,238,0.22)', borderRadius: 28, background: 'rgba(255,255,255,0.04)', padding: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.24em', color: 'rgba(125,211,252,0.72)' }}>테스트 모드</div>
            <h1 style={{ marginTop: 14, fontSize: 38, fontWeight: 900 }}>숲 펀딩 자동메모장 테스트</h1>
            <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.8, fontWeight: 700 }}>실제 후원을 받지 않고 가짜 후원 이벤트를 주입해서 누락, 렉, 복붙 결과를 확인하는 화면입니다. 실제 숲 연결은 실행하지 않습니다.</p>
            <p style={{ marginTop: 10, color: 'rgba(251,191,36,0.82)', lineHeight: 1.8, fontWeight: 800 }}>실제 로그인과 채팅 연결 테스트는 기본 페이지에서 확인합니다.</p>
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
                <button onClick={() => setStatus('연결 끊김 테스트')} style={darkButtonStyle}>연결 끊김 상태 테스트</button>
                <button onClick={() => setStatus('오류 테스트')} style={darkButtonStyle}>오류 상태 테스트</button>
                <button onClick={() => { setEvents([]); setStatus('테스트 준비'); }} style={resetButtonStyle}>초기화</button>
                <a href="/utility/soop-funding-memo" style={{ ...darkButtonStyle, textAlign: 'center', textDecoration: 'none' }}>베타 자동메모장으로 이동</a>
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

function BetaNotice() {
  return (
    <div style={{ background: '#07101f', color: '#fff', padding: 16 }}>
      <div style={{ maxWidth: 1760, margin: '0 auto', borderRadius: 20, background: 'rgba(251,191,36,0.10)', boxShadow: 'inset 0 0 0 1px rgba(252,211,77,0.13), 0 18px 45px rgba(0,0,0,0.18)', padding: 14, fontSize: 13, fontWeight: 800, lineHeight: 1.7 }}>
        ⚠️ 베타: 자동 재연결 안정화가 적용된 베타버전입니다. 실전 사용 시 숲 실제 후원 내역과 최근 후원 로그를 같이 확인하세요.
      </div>
    </div>
  );
}

export default function SoopFundingMemoPage() {
  const [debugMode, setDebugMode] = useState('live');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const debug = new URLSearchParams(window.location.search).get('debug');
    if (debug === '1') setDebugMode('test');
    else setDebugMode('live');
  }, []);

  if (debugMode === 'test') return <DebugFundingMemoTest />;

  return (
    <>
      <BetaNotice />
      <SoopFundingMemoSoftV7 />
    </>
  );
}

import Head from 'next/head';

export default function SoopFundingMemoPage() {
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

          <a href="/utility" style={{ display: 'inline-flex', marginTop: 28, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, background: 'rgba(255,255,255,0.1)', padding: '12px 20px', color: '#fff', fontWeight: 900, textDecoration: 'none' }}>유틸리티로 돌아가기</a>
        </section>
      </main>
    </>
  );
}

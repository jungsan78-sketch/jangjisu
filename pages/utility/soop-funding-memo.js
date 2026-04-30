import Head from 'next/head';

export default function SoopFundingMemoPage() {
  return (
    <>
      <Head>
        <title>점검중 | 유틸리티</title>
        <meta name="description" content="점검중" />
      </Head>
      <main style={{ minHeight: '100vh', background: '#05070c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section style={{ width: '100%', maxWidth: 720, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 28, background: 'rgba(255,255,255,0.04)', padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.36em', color: 'rgba(255,255,255,0.45)' }}>MAINTENANCE</div>
          <h1 style={{ marginTop: 16, fontSize: 40, fontWeight: 900 }}>현재 점검중입니다</h1>
          <p style={{ margin: '16px auto 0', maxWidth: 520, lineHeight: 1.8, color: 'rgba(255,255,255,0.62)' }}>안정화 작업 중이라 잠시 이용할 수 없습니다.</p>
          <a href="/utility" style={{ display: 'inline-flex', marginTop: 28, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, background: 'rgba(255,255,255,0.1)', padding: '12px 20px', color: '#fff', fontWeight: 900, textDecoration: 'none' }}>유틸리티로 돌아가기</a>
        </section>
      </main>
    </>
  );
}

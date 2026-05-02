import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const SoopFundingNew = dynamic(() => import('../../components/utility/SoopFundingNew'), { ssr: false });

export default function Page() {
  const [pw, setPw] = useState('');
  const [ok, setOk] = useState(false);

  if (!ok) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070c', color: 'white' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: 40, borderRadius: 24, background: 'linear-gradient(145deg,#142940,#081222)', boxShadow: '0 28px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <h2 style={{ marginBottom: 20, fontSize: 30, fontWeight: 950 }}>비밀번호 입력</h2>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            placeholder="비밀번호 입력"
            style={{ width: '100%', padding: '16px 18px', fontSize: 22, fontWeight: 900, borderRadius: 18, border: '2px solid rgba(103,232,249,0.34)', background: '#062033', color: '#ffffff', outline: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 12px 28px rgba(0,0,0,0.24)' }}
          />
          <div style={{ marginTop: 14 }}>
            <button onClick={() => { if (pw === '032359') setOk(true); }} style={{ width: '100%', padding: '15px 16px', borderRadius: 18, border: '1px solid rgba(103,232,249,0.32)', background: 'linear-gradient(180deg,rgba(34,211,238,0.25),rgba(14,165,233,0.14))', color: '#ecfeff', fontWeight: 950, cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>SOOP 펀딩 New | 유틸리티</title>
        <meta name="description" content="SOOP 로그인 없이 후원자 닉네임과 개수만 자동 수신하는 New 버전" />
      </Head>
      <SoopFundingNew />
    </>
  );
}

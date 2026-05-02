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
        <div style={{ padding: 40, borderRadius: 20, background: '#111827', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
          <h2 style={{ marginBottom: 20 }}>비밀번호 입력</h2>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={{ padding: 10, fontSize: 16, borderRadius: 8, width: 200 }}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={() => { if (pw === '032359') setOk(true); }} style={{ padding: '8px 16px', borderRadius: 8 }}>확인</button>
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

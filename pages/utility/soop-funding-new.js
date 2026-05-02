import Head from 'next/head';
import dynamic from 'next/dynamic';

const SoopFundingNew = dynamic(() => import('../../components/utility/SoopFundingNew'), { ssr: false });

export default function Page() {
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

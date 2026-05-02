import Head from 'next/head';
import dynamic from 'next/dynamic';

const SoopFundingNew = dynamic(() => import('../../components/utility/SoopFundingNew'), { ssr: false });

export default function Page() {
  return (
    <>
      <Head>
        <title>SOOP 펀딩 New2 | 유틸리티</title>
      </Head>
      <SoopFundingNew />
    </>
  );
}

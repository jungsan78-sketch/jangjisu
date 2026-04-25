import dynamic from 'next/dynamic';
import Head from 'next/head';

const SoopFundingMemoPolished = dynamic(
  () => import('../../components/utility/SoopFundingMemoPolished'),
  { ssr: false }
);

export default function SoopFundingMemoPage() {
  return (
    <>
      <Head>
        <title>장지수용소 펀딩 자동메모장 | 유틸리티</title>
        <meta name="description" content="SOOP 공식 Chat SDK로 별풍선과 채팅을 매칭하는 핀볼용 자동메모장" />
      </Head>
      <SoopFundingMemoPolished />
    </>
  );
}

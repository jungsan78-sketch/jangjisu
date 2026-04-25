import dynamic from 'next/dynamic';
import Head from 'next/head';

const SoopFundingMemoClean = dynamic(
  () => import('../../components/utility/SoopFundingMemoClean'),
  { ssr: false }
);

export default function SoopFundingMemoPage() {
  return (
    <>
      <Head>
        <title>장지수용소 펀딩 자동메모장 | 유틸리티</title>
        <meta name="description" content="SOOP 펀딩 데이터를 핀볼용 복붙 메모로 변환하는 유틸리티" />
      </Head>
      <SoopFundingMemoClean />
    </>
  );
}

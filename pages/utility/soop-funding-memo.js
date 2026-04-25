import Head from 'next/head';
import SoopFundingMemo from '../../components/utility/SoopFundingMemo';

export default function SoopFundingMemoPage() {
  return (
    <>
      <Head>
        <title>SOOP 펀딩 자동 메모장 | 유틸리티</title>
        <meta name="description" content="SOOP 펀딩 데이터를 핀볼용 복붙 메모로 변환하는 유틸리티" />
      </Head>
      <SoopFundingMemo />
    </>
  );
}

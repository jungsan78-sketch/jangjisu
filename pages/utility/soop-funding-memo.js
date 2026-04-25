import dynamic from 'next/dynamic';
import Head from 'next/head';

const SoopOfficialChatSdkMemo = dynamic(
  () => import('../../components/utility/SoopOfficialChatSdkMemo'),
  { ssr: false }
);

const SoopSdkEventProbe = dynamic(
  () => import('../../components/utility/SoopSdkEventProbe'),
  { ssr: false }
);

export default function SoopFundingMemoPage() {
  return (
    <>
      <Head>
        <title>장지수용소 펀딩 자동메모장 | 유틸리티</title>
        <meta name="description" content="SOOP 공식 Chat SDK로 별풍선과 채팅을 매칭하는 핀볼용 자동메모장" />
      </Head>
      <SoopOfficialChatSdkMemo />
      <div className="bg-[#05070c] px-5 pb-8 lg:px-8">
        <div className="mx-auto max-w-[1780px]">
          <SoopSdkEventProbe />
        </div>
      </div>
    </>
  );
}

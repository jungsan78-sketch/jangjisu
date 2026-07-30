import Head from 'next/head';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';
import PrisonMultiview from '../../components/prison/multiview/PrisonMultiview';

export default function PrisonMultiviewPage() {
  return (
    <>
      <Head>
        <title>멀티뷰 | 장지수용소</title>
        <meta name="description" content="장지수용소 멤버들의 SOOP 라이브 방송을 최대 4개까지 함께 보는 멀티뷰" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrisonPageChrome wide>
        <PrisonMultiview />
      </PrisonPageChrome>
    </>
  );
}

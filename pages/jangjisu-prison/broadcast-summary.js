import Head from 'next/head';
import BroadcastSummaryCalendar from '../../components/prison/BroadcastSummaryCalendar';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';

export default function PrisonBroadcastSummaryPage() {
  return (
    <>
      <Head>
        <title>방송요약 | 장지수용소</title>
        <meta name="description" content="장지수용소 멤버들의 이번 달 다시보기 흐름을 달력으로 보는 방송요약 페이지" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrisonPageChrome>
        <BroadcastSummaryCalendar />
      </PrisonPageChrome>
    </>
  );
}

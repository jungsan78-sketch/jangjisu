import Head from 'next/head';
import BroadcastSummaryCalendar from '../../components/prison/BroadcastSummaryCalendar';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';

export default function PrisonBroadcastSummaryPage() {
  return (
    <>
      <Head>
        <title>이번 달 다시보기 달력 | 장지수용소</title>
        <meta name="description" content="장지수용소 멤버들의 이번 달 다시보기 방송시간과 제목을 달력으로 보는 페이지" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrisonPageChrome wide>
        <div className="min-h-[calc(100vh-56px)] w-full pt-0">
          <BroadcastSummaryCalendar />
        </div>
      </PrisonPageChrome>
    </>
  );
}

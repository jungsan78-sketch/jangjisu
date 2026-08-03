import Head from 'next/head';
import SiteFooter from '../../components/SiteFooter';
import BroadcastDataDashboard from '../../components/prison/broadcast-data/BroadcastDataDashboard';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';

export default function PrisonBroadcastDataPage() {
  return (
    <>
      <Head>
        <title>방송 데이터 달력 | 장지수용소</title>
        <meta name="description" content="장지수용소 멤버들의 별풍선, 최고 시청자, 방송시간과 다시보기를 날짜별로 보는 방송 데이터 달력" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrisonPageChrome wide>
        <div className="min-h-[calc(100vh-56px)] w-full pt-0">
          <BroadcastDataDashboard />
        </div>
        <SiteFooter />
      </PrisonPageChrome>
    </>
  );
}


import Head from 'next/head';
import SiteFooter from '../../components/SiteFooter';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';
import ScheduleCalendarDashboard from '../../components/prison/schedule-calendar/ScheduleCalendarDashboard';

export default function PrisonScheduleCalendarPage() {
  return (
    <>
      <Head>
        <title>일정 캘린더 | 장지수용소</title>
        <meta name="description" content="장지수용소 멤버들의 방송 일정을 멤버별 월간 달력으로 확인하는 팬메이드 일정 캘린더" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrisonPageChrome wide>
        <ScheduleCalendarDashboard />
        <SiteFooter className="mt-8" />
      </PrisonPageChrome>
    </>
  );
}


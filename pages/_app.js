import '../styles/globals.css';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/next';
import PrisonLiveStatusHydrator from '../components/PrisonLiveStatusHydrator';
import CalendarYoutubeUiHydrator from '../components/CalendarYoutubeUiHydrator';
import PrisonMemberLiveGrid from '../components/PrisonMemberLiveGrid';
import UtilityLiveSidebar from '../components/UtilityLiveSidebar';

const SCHEDULE_POLLING_INTERVAL_MS = 30 * 60 * 1000;

if (typeof window !== 'undefined' && !window.__SOU_SCHEDULE_POLLING_PATCHED__) {
  window.__SOU_SCHEDULE_POLLING_PATCHED__ = true;
  const originalSetInterval = window.setInterval.bind(window);
  window.setInterval = (handler, timeout, ...args) => {
    const nextTimeout = Number(timeout) === 60 * 1000 ? SCHEDULE_POLLING_INTERVAL_MS : timeout;
    return originalSetInterval(handler, nextTimeout, ...args);
  };
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>JANGJISOU FAN ARCHIVE</title>
        <link rel="icon" type="image/png" href="/site-icon.png" />
        <link rel="apple-touch-icon" href="/site-icon.png" />
      </Head>
      <Component {...pageProps} />
      <PrisonLiveStatusHydrator />
      <CalendarYoutubeUiHydrator />
      <PrisonMemberLiveGrid />
      <UtilityLiveSidebar />
      <Analytics />
    </>
  );
}

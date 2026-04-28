import '../styles/globals.css';
import '../styles/sidebar-logo.css';
import '../styles/theme-soft-background.css';
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

function PrisonWideLayoutOverride() {
  return (
    <style jsx global>{`
      @media (min-width: 1280px) {
        .sou-prison-content {
          margin-left: 274px !important;
          width: calc(100vw - 274px) !important;
          max-width: calc(100vw - 274px) !important;
        }

        .sou-prison-main {
          width: calc(100vw - 276px) !important;
          max-width: none !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          overflow-x: visible !important;
        }

        .sou-prison-main > *,
        .sou-prison-main #members,
        .sou-prison-main #schedule,
        .sou-prison-main #recent-youtube,
        .sou-prison-main .sou-member-live-section,
        .sou-prison-main .sou-member-live-section > section,
        .sou-prison-main .sou-member-live-section > div {
          width: 100% !important;
          max-width: none !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        .sou-prison-main .sou-member-live-section > div.grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          column-gap: 26px !important;
          row-gap: 52px !important;
        }
      }

      @media (min-width: 2300px) {
        .sou-prison-main .sou-member-live-section > div.grid {
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          column-gap: 26px !important;
        }
      }
    `}</style>
  );
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
      <PrisonWideLayoutOverride />
      <PrisonLiveStatusHydrator />
      <CalendarYoutubeUiHydrator />
      <PrisonMemberLiveGrid />
      <UtilityLiveSidebar />
      <Analytics />
    </>
  );
}

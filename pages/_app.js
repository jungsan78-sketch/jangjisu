import '../styles/globals.css';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Analytics } from '@vercel/analytics/next';
import NewYoutubeDomToast from '../components/NewYoutubeDomToast';
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
  const router = useRouter();
  const routePath = router.asPath?.split('?')[0] || router.pathname || '';
  const isUtilityRoute = routePath === '/utility' || routePath.startsWith('/utility/');
  const isHomeRoute = routePath === '/';
  const isPrisonRoute = routePath === '/jangjisu-prison' || routePath === '/jangjisu-prison-v2';

  return (
    <>
      <Head>
        <title>JANGJISOU FAN ARCHIVE</title>
        <link rel="icon" type="image/png" href="/site-icon.png" />
        <link rel="apple-touch-icon" href="/site-icon.png" />
        <style>{`
          ${isUtilityRoute ? `
          @media (min-width: 1280px) {
            body header {
              display: none !important;
            }
            body main {
              width: calc(100% - 274px) !important;
              max-width: 1880px !important;
              margin-left: 274px !important;
              margin-right: 0 !important;
              padding-left: 36px !important;
              padding-right: 36px !important;
            }
          }
          ` : ''}
          ${isPrisonRoute ? `
          @media (min-width: 1280px) {
            body {
              overflow-x: hidden !important;
            }
            body main {
              width: calc(100vw - 274px) !important;
              max-width: none !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            body main > #members,
            body main #members,
            body main #schedule,
            body main #recent-youtube,
            body main .sou-member-live-section {
              width: 100% !important;
              max-width: none !important;
            }
          }
          ` : ''}
          ${isHomeRoute ? `
          header a[href="/utility"] {
            display: none !important;
          }
          ` : ''}
          video[src="/hero.mp4"],
          img[src="/jangjisu-prison-hero.png"],
          section[aria-label="장지수용소 대문"],
          body:not(:has(section[aria-label="장지수용소 대문"])) main > section:first-child:has(video[src="/hero.mp4"]),
          body:not(:has(section[aria-label="장지수용소 대문"])) main > section:first-child:has(.text-transparent) {
            display: none !important;
          }
          main > section:first-child:has(video[src="/hero.mp4"]) + #schedule,
          main > section:first-child:has(.text-transparent) + #schedule,
          section[aria-label="장지수용소 대문"] + #members,
          section[aria-label="장지수용소 대문"] + #schedule {
            margin-top: 0 !important;
          }
          #notice,
          #schedule,
          #youtube,
          #recent-youtube {
            position: relative !important;
          }
          #notice::after,
          #schedule::after,
          #youtube::after,
          #recent-youtube::after {
            position: absolute;
            right: 24px;
            top: 24px;
            z-index: 5;
            border: 1px solid rgba(255,255,255,.10);
            border-radius: 999px;
            background: rgba(0,0,0,.22);
            padding: 6px 11px;
            color: rgba(255,255,255,.62);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: -.01em;
            line-height: 1;
            backdrop-filter: blur(10px);
            pointer-events: none;
          }
          #notice::after {
            content: "30분마다 갱신";
          }
          #schedule::after {
            content: "30분마다 갱신";
          }
          #youtube::after,
          #recent-youtube::after {
            content: "15분마다 갱신";
          }
          body:has(section[aria-label="장지수용소 대문"]) #schedule button {
            border-color: rgba(251,191,36,.12) !important;
            background: linear-gradient(180deg, rgba(251,191,36,.075), rgba(15,23,42,.48)) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 0 18px rgba(251,191,36,.055), 0 10px 24px rgba(0,0,0,.18) !important;
          }
          body:has(section[aria-label="장지수용소 대문"]) #schedule button:hover {
            border-color: rgba(251,191,36,.20) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 0 24px rgba(251,191,36,.11), 0 12px 28px rgba(0,0,0,.22) !important;
          }
        `}</style>
      </Head>
      <Component {...pageProps} />
      <NewYoutubeDomToast />
      <PrisonLiveStatusHydrator />
      <CalendarYoutubeUiHydrator />
      <PrisonMemberLiveGrid />
      <UtilityLiveSidebar />
      <Analytics />
    </>
  );
}

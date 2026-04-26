import '../styles/globals.css';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/next';
import NewYoutubeDomToast from '../components/NewYoutubeDomToast';
import PrisonLiveStatusHydrator from '../components/PrisonLiveStatusHydrator';
import CalendarYoutubeUiHydrator from '../components/CalendarYoutubeUiHydrator';
import PrisonMemberLiveGrid from '../components/PrisonMemberLiveGrid';

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  if (location.pathname.indexOf('/jangjisu-prison') === 0) {
                    document.documentElement.classList.add('sou-prison-prepaint');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <style>{`
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
          #recent-youtube,
          #members.sou-member-live-section,
          section.sou-member-live-section {
            position: relative !important;
          }
          #notice::after,
          #schedule::after,
          #youtube::after,
          #recent-youtube::after,
          #members.sou-member-live-section::after,
          section.sou-member-live-section::after {
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
          #members.sou-member-live-section::after,
          section.sou-member-live-section::after {
            content: "5분마다 갱신";
          }
          html.sou-prison-prepaint main,
          body:has(section[aria-label="장지수용소 대문"]) main {
            width: 100% !important;
          }
          body:has(section[aria-label="장지수용소 대문"]) #members:not(.sou-member-live-section) {
            position: relative !important;
            min-height: 230px !important;
            overflow: hidden !important;
            border: 1px solid rgba(255,255,255,.10) !important;
            border-radius: 28px !important;
            background: radial-gradient(circle at top left, rgba(34,211,238,.12), transparent 34%), linear-gradient(180deg, rgba(17,24,39,.76), rgba(5,9,16,.97)) !important;
            box-shadow: 0 18px 44px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04) !important;
          }
          body:has(section[aria-label="장지수용소 대문"]) #members:not(.sou-member-live-section) > * {
            visibility: hidden !important;
          }
          body:has(section[aria-label="장지수용소 대문"]) #members:not(.sou-member-live-section)::before {
            content: "멤버표 개편 준비중";
            position: absolute;
            left: 28px;
            top: 28px;
            z-index: 2;
            color: #fff;
            font-size: clamp(24px, 3vw, 38px);
            font-weight: 950;
            letter-spacing: -.04em;
          }
          body:has(section[aria-label="장지수용소 대문"]) #members:not(.sou-member-live-section)::after {
            content: "TEST 브랜치에서는 기존 멤버표와 라이브 호출을 임시 중단했습니다.";
            position: absolute;
            left: 28px;
            right: 28px;
            top: 84px;
            z-index: 2;
            color: rgba(255,255,255,.62);
            font-size: 14px;
            font-weight: 800;
            line-height: 1.8;
          }
          body:has(section[aria-label="장지수용소 대문"]) #schedule .grid.grid-cols-7.gap-3 {
            animation: none !important;
          }
          body:has(section[aria-label="장지수용소 대문"]) #schedule .grid.grid-cols-7.gap-3 > div {
            transition: border-color .14s ease, background-color .14s ease, box-shadow .14s ease !important;
          }
        `}</style>
      </Head>
      <Component {...pageProps} />
      <NewYoutubeDomToast />
      <PrisonLiveStatusHydrator />
      <CalendarYoutubeUiHydrator />
      <PrisonMemberLiveGrid />
      <Analytics />
    </>
  );
}

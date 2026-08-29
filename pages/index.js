import Head from 'next/head';
import { useEffect, useState } from 'react';
import JangJisuFanSite from '../components/JangJisuFanSite';
import MainJangJisuNoticeSection from '../components/MainJangJisuNoticeSection';
import SiteFooter from '../components/SiteFooter';
import SOUCinematicHero from '../components/SOUCinematicHero';
import MobileAppDrawer from '../components/navigation/MobileAppDrawer';

export default function Home() {
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  useEffect(() => {
    const removeDreamServerModeLink = () => {
      document.querySelectorAll('a[href="/jisu-dream"], .sou-jisu-dream-mode-link').forEach((link) => link.remove());
    };

    const placeMainNoticeAfterSchedule = () => {
      const noticeSections = Array.from(document.querySelectorAll('section#notice'));
      const placeholder = noticeSections.find((section) => section.textContent?.includes('SOOP 탭은 점검 중'));
      if (placeholder) placeholder.remove();

      const scheduleSection = document.getElementById('schedule');
      const mainNotice = document.querySelector('section[data-main-notice="true"]');
      if (scheduleSection && mainNotice && scheduleSection.nextElementSibling !== mainNotice) {
        scheduleSection.insertAdjacentElement('afterend', mainNotice);
      }
    };

    const handleModeDirectNavigation = (event) => {
      const link = event.target?.closest?.('a[href="/jangjisu-prison"]');
      if (!link) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      window.location.href = link.getAttribute('href');
    };

    let didActivateShorts = false;
    const prioritizeYoutubeTabs = () => {
      const youtubeSection = document.getElementById('youtube');
      if (!youtubeSection) return false;

      const buttons = Array.from(youtubeSection.querySelectorAll('button'));
      const shortsButton = buttons.find((button) => button.textContent?.trim() === '쇼츠');
      const videoButton = buttons.find((button) => button.textContent?.trim() === '영상');
      const fullButton = buttons.find((button) => button.textContent?.trim() === '풀영상');

      if (!shortsButton) return false;

      shortsButton.style.order = '0';
      if (videoButton) videoButton.style.order = '1';
      if (fullButton) fullButton.style.order = '2';

      if (!didActivateShorts) {
        didActivateShorts = true;
        shortsButton.click();
      }

      return true;
    };

    const finalizeLayout = () => {
      removeDreamServerModeLink();
      placeMainNoticeAfterSchedule();
      prioritizeYoutubeTabs();
      setIsLayoutReady(true);
    };

    document.addEventListener('click', handleModeDirectNavigation, true);
    finalizeLayout();

    const dreamCleanupTimer = setTimeout(removeDreamServerModeLink, 300);
    const noticeTimer = setTimeout(placeMainNoticeAfterSchedule, 300);
    const readyTimer = setTimeout(() => {
      finalizeLayout();
    }, 520);
    const youtubeInterval = setInterval(() => {
      removeDreamServerModeLink();
      placeMainNoticeAfterSchedule();
      if (prioritizeYoutubeTabs() && didActivateShorts) {
        clearInterval(youtubeInterval);
      }
    }, 120);
    const youtubeTimeout = setTimeout(() => {
      clearInterval(youtubeInterval);
      finalizeLayout();
    }, 1800);

    return () => {
      document.removeEventListener('click', handleModeDirectNavigation, true);
      clearTimeout(dreamCleanupTimer);
      clearTimeout(noticeTimer);
      clearTimeout(readyTimer);
      clearInterval(youtubeInterval);
      clearTimeout(youtubeTimeout);
    };
  }, []);

  return (
    <>
      <Head>
        <title>장지수 팬 아카이브</title>
        <meta name="description" content="장지수 방송 상태, 공지, VOD, 팬카페를 한 곳에서 보는 팬메이드 허브" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={`sou-archive-ready-shell transition-opacity duration-200 ${isLayoutReady ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <MobileAppDrawer
          brand="SOU 아카이브"
          subtitle="JANGJISOU FAN ARCHIVE"
          logoSrc="/site-icon.png"
          logoAlt="SOU"
          homeHref="#"
          breakpoint="lg"
          items={[
            { href: '#schedule', label: '방송 일정', icon: '📅', tone: 'blue' },
            { href: '#notice', label: '최신 공지사항', icon: '!', tone: 'blue' },
            { href: '#youtube', label: 'YOUTUBE', icon: '▶', tone: 'red' },
            { href: 'https://cafe.naver.com/quaddurupfancafe', label: '팬카페', icon: 'N', tone: 'green', external: true },
            { href: '/jangjisu-prison', label: '장지수용소', icon: '🏛️', tone: 'gold' },
          ]}
        />
        <div className="jangjisu-left-nav-mode">
          <JangJisuFanSite />
        </div>
        <SOUCinematicHero />
        <MainJangJisuNoticeSection />
        <div className="lg:pl-[258px]">
          <SiteFooter />
        </div>
      </div>
      {!isLayoutReady ? <div className="fixed inset-0 z-[200] bg-[#05070c]" aria-hidden="true" /> : null}
      <style jsx global>{`
        body { background: #05070c; }
        .jangjisu-left-nav-mode footer { display: none !important; }
        @media (max-width: 1023px) {
          .jangjisu-left-nav-mode > div > header,
          .jangjisu-left-nav-mode header {
            display: none !important;
          }
          .jangjisu-left-nav-mode main {
            padding: 12px !important;
          }
          .jangjisu-left-nav-mode main > section {
            border-radius: 24px !important;
          }
          .jangjisu-left-nav-mode #schedule,
          .jangjisu-left-nav-mode #notice,
          .jangjisu-left-nav-mode #youtube {
            margin-top: 18px !important;
            padding: 14px !important;
          }
          .jangjisu-left-nav-mode #youtube [class*="grid-cols-2"] {
            gap: 12px !important;
          }
        }
        @media (min-width: 1024px) {
          .jangjisu-left-nav-mode {
            padding-left: 258px !important;
            width: 100% !important;
            max-width: none !important;
          }

          .jangjisu-left-nav-mode > div {
            width: 100% !important;
            max-width: none !important;
          }

          .jangjisu-left-nav-mode header {
            position: fixed !important;
            inset: 0 auto 0 0 !important;
            z-index: 70 !important;
            width: 258px !important;
            border-right: 1px solid rgba(255,255,255,0.12) !important;
            border-bottom: 0 !important;
            background: linear-gradient(180deg, rgba(3,7,18,0.98), rgba(5,10,20,0.94)) !important;
            box-shadow: 28px 0 78px rgba(0,0,0,0.36) !important;
          }

          .jangjisu-left-nav-mode header > div {
            height: 100vh !important;
            max-width: none !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 26px !important;
            padding: 24px 22px !important;
          }

          .jangjisu-left-nav-mode header a[href="#"] {
            margin: 0 auto 10px !important;
            height: 108px !important;
            width: 108px !important;
            min-height: 108px !important;
            padding: 0 !important;
          }

          .jangjisu-left-nav-mode header a[href="#"] img,
          .jangjisu-left-nav-mode header a[href="#"] > * {
            width: 108px !important;
            height: 108px !important;
            max-width: 108px !important;
            max-height: 108px !important;
          }

          .jangjisu-left-nav-mode header nav,
          .jangjisu-left-nav-mode header nav > div {
            width: 100% !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
          }

          .jangjisu-left-nav-mode header nav {
            flex: 1 !important;
            gap: 20px !important;
          }

          .jangjisu-left-nav-mode header nav::after {
            content: none !important;
            display: none !important;
          }

          .jangjisu-left-nav-mode header nav > div:first-child,
          .jangjisu-left-nav-mode header nav > div:last-child {
            display: flex !important;
            flex-direction: column !important;
            gap: 17px !important;
          }

          .jangjisu-left-nav-mode header nav > div:last-child {
            margin-top: auto !important;
            border-top: 1px solid rgba(255,255,255,0.12) !important;
            padding-top: 16px !important;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]) {
            position: relative !important;
            display: flex !important;
            width: 100% !important;
            min-height: 42px !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            padding: 6px 6px 6px 22px !important;
            color: rgba(232,241,255,0.82) !important;
            font-size: 17px !important;
            font-weight: 950 !important;
            letter-spacing: -0.012em !important;
            box-shadow: none !important;
            transform: none !important;
            transition: color 260ms ease, transform 260ms ease, text-shadow 260ms ease, letter-spacing 260ms ease !important;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"])::before {
            content: '';
            position: absolute;
            left: 2px;
            top: 50%;
            width: 5px;
            height: 5px;
            border-radius: 999px;
            background: rgba(125,211,252,0.48);
            box-shadow: 0 0 14px rgba(56,189,248,0.18);
            transform: translateY(-50%);
            transition: height 260ms ease, width 260ms ease, background 260ms ease, box-shadow 260ms ease, border-radius 260ms ease;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"])::after {
            content: '';
            position: absolute;
            left: 22px;
            right: 10px;
            bottom: 2px;
            height: 1px;
            background: linear-gradient(90deg, rgba(125,211,252,0.0), rgba(125,211,252,0.46), rgba(125,211,252,0.0));
            opacity: 0;
            transform: scaleX(0.18);
            transform-origin: left center;
            transition: opacity 260ms ease, transform 260ms ease;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]):hover {
            color: #ffffff !important;
            letter-spacing: 0.006em !important;
            transform: translateX(3px) !important;
            text-shadow: 0 0 18px rgba(147,197,253,0.26) !important;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]):hover::before {
            width: 4px;
            height: 24px;
            border-radius: 999px;
            background: #67e8f9;
            box-shadow: 0 0 18px rgba(103,232,249,0.62), 0 0 34px rgba(103,232,249,0.22);
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]):hover::after {
            opacity: 1;
            transform: scaleX(1);
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]) > span:first-child {
            display: none !important;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]) > span:nth-child(2),
          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]) > span:last-child {
            display: inline-flex !important;
            align-items: center !important;
            text-align: left !important;
            color: inherit !important;
            font-size: 17px !important;
            font-weight: 950 !important;
            line-height: 1.15 !important;
          }

          .jangjisu-left-nav-mode header nav a[href="#youtube"] {
            color: rgba(254,226,226,0.86) !important;
          }

          .jangjisu-left-nav-mode header nav a[href="#youtube"]::before {
            background: rgba(248,113,113,0.58);
            box-shadow: 0 0 14px rgba(248,113,113,0.22);
          }

          .jangjisu-left-nav-mode header nav a[href="#youtube"]:hover::before {
            background: #fb7185;
            box-shadow: 0 0 18px rgba(251,113,133,0.58), 0 0 34px rgba(251,113,133,0.20);
          }

          .jangjisu-left-nav-mode header nav a[href*="cafe.naver.com"] {
            color: rgba(209,250,229,0.86) !important;
          }

          .jangjisu-left-nav-mode header nav a[href*="cafe.naver.com"]::before {
            background: rgba(52,211,153,0.58);
            box-shadow: 0 0 14px rgba(52,211,153,0.22);
          }

          .jangjisu-left-nav-mode header nav a[href*="cafe.naver.com"]:hover::before {
            background: #34d399;
            box-shadow: 0 0 18px rgba(52,211,153,0.58), 0 0 34px rgba(52,211,153,0.20);
          }

          .jangjisu-left-nav-mode header nav a[href="/jangjisu-prison"] {
            width: 100% !important;
            min-height: 52px !important;
            justify-content: flex-start !important;
            gap: 12px !important;
            border-radius: 18px !important;
            border: 1px solid rgba(251,191,36,0.30) !important;
            background: linear-gradient(180deg, rgba(120,53,15,0.32), rgba(255,255,255,0.018)) !important;
            padding: 13px 16px !important;
            color: #fef3c7 !important;
            font-size: 15px !important;
            font-weight: 900 !important;
            letter-spacing: -0.015em !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.045), 0 14px 30px rgba(0,0,0,0.20) !important;
            transform: none !important;
          }

          .jangjisu-left-nav-mode header nav a[href="/jangjisu-prison"]:hover {
            transform: translateY(-2px) !important;
            background: linear-gradient(180deg, rgba(120,53,15,0.42), rgba(255,255,255,0.032)) !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 38px rgba(0,0,0,0.26), 0 0 24px rgba(245,158,11,0.12) !important;
          }

          .jangjisu-left-nav-mode header nav a[href="/jangjisu-prison"] > span:first-child {
            display: inline-flex !important;
            width: 32px !important;
            min-width: 32px !important;
            height: 32px !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 12px !important;
            background: rgba(0,0,0,0.30) !important;
            color: rgba(255,255,255,0.92) !important;
            text-align: center !important;
            font-size: 13px !important;
            font-weight: 900 !important;
            letter-spacing: 0.04em !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 18px rgba(0,0,0,0.18) !important;
          }

          .jangjisu-left-nav-mode header nav a[href="/jangjisu-prison"] > span:nth-child(2) {
            display: inline-flex !important;
            align-items: center !important;
            text-align: left !important;
            color: inherit !important;
            font-size: 15px !important;
            font-weight: 900 !important;
            line-height: 1.15 !important;
          }

          .jangjisu-left-nav-mode main {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding-left: 28px !important;
            padding-right: 28px !important;
          }

          .jangjisu-left-nav-mode #sou-cinematic-hero-host,
          .jangjisu-left-nav-mode main > section {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .jangjisu-left-nav-mode main > section:not(:first-of-type),
          .jangjisu-left-nav-mode section#notice,
          .jangjisu-left-nav-mode #schedule {
            border-color: transparent !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          .jangjisu-left-nav-mode section#notice,
          .jangjisu-left-nav-mode #schedule {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
      `}</style>
    </>
  );
}

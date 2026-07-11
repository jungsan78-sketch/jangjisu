import Head from 'next/head';
import { useEffect, useState } from 'react';
import JangJisuFanSite from '../components/JangJisuFanSite';
import MainJangJisuNoticeSection from '../components/MainJangJisuNoticeSection';
import SiteFooter from '../components/SiteFooter';
import SOUCinematicHero from '../components/SOUCinematicHero';

export default function Home() {
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  useEffect(() => {
    const moveUtilityMenu = () => {
      const links = Array.from(document.querySelectorAll('a[href="/utility"]'));
      const utilityLink = links.find((link) => link.textContent?.includes('유틸리티'));
      const fanCafeLink = Array.from(document.querySelectorAll('a')).find((link) => link.textContent?.includes('팬카페'));
      if (utilityLink && fanCafeLink && fanCafeLink.parentElement === utilityLink.parentElement) {
        fanCafeLink.insertAdjacentElement('afterend', utilityLink);
      }
    };

    const removeDreamServerModeLink = () => {
      document.querySelectorAll('a[href="/jisu-dream"], .sou-jisu-dream-mode-link').forEach((link) => link.remove());
    };

    const placeMainNoticeAfterSchedule = () => {
      const noticeSections = Array.from(document.querySelectorAll('section#notice'));
      const placeholder = noticeSections.find((section) => section.textContent?.includes('SOOP 탭은 점검 중'));
      if (placeholder) placeholder.remove();

      const scheduleSection = document.getElementById('schedule');
      const mainNotice = Array.from(document.querySelectorAll('section#notice')).find((section) => section.textContent?.includes('장지수 공지'));
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
      moveUtilityMenu();
      removeDreamServerModeLink();
      placeMainNoticeAfterSchedule();
      prioritizeYoutubeTabs();
      setIsLayoutReady(true);
    };

    document.addEventListener('click', handleModeDirectNavigation, true);
    finalizeLayout();

    const utilityTimer = setTimeout(moveUtilityMenu, 300);
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
      clearTimeout(utilityTimer);
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
        @media (min-width: 1024px) {
          .jangjisu-left-nav-mode {
            padding-left: 258px !important;
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
            gap: 24px !important;
            padding: 24px 21px !important;
          }

          .jangjisu-left-nav-mode header a[href="#"] {
            margin: 0 auto 2px !important;
            height: 80px !important;
            width: 80px !important;
          }

          .jangjisu-left-nav-mode header nav,
          .jangjisu-left-nav-mode header nav > div {
            width: 100% !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
          }

          .jangjisu-left-nav-mode header nav {
            flex: 1 !important;
            gap: 18px !important;
          }

          .jangjisu-left-nav-mode header nav::after {
            content: 'JANGJISU FAN HUB';
            display: block;
            margin: 8px 4px 0;
            border-top: 1px solid rgba(255,255,255,0.08);
            padding-top: 14px;
            color: rgba(180,205,235,0.46);
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.18em;
          }

          .jangjisu-left-nav-mode header nav > div:first-child,
          .jangjisu-left-nav-mode header nav > div:last-child {
            display: flex !important;
            flex-direction: column !important;
            gap: 15px !important;
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
            min-height: 34px !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            padding: 4px 4px 4px 18px !important;
            color: rgba(232,241,255,0.78) !important;
            font-size: 15px !important;
            font-weight: 900 !important;
            letter-spacing: -0.01em !important;
            box-shadow: none !important;
            transform: none !important;
            transition: color 220ms ease, transform 220ms ease, letter-spacing 220ms ease !important;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"])::before {
            content: '';
            position: absolute;
            left: 2px;
            top: 50%;
            width: 5px;
            height: 5px;
            border-radius: 999px;
            background: rgba(125,211,252,0.44);
            box-shadow: 0 0 14px rgba(56,189,248,0.18);
            transform: translateY(-50%);
            transition: width 220ms ease, background 220ms ease, box-shadow 220ms ease;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"])::after {
            content: '';
            position: absolute;
            left: 18px;
            right: 12px;
            bottom: -3px;
            height: 1px;
            background: linear-gradient(90deg, rgba(125,211,252,0.0), rgba(125,211,252,0.34), rgba(125,211,252,0.0));
            opacity: 0;
            transform: scaleX(0.2);
            transition: opacity 220ms ease, transform 220ms ease;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]):hover {
            color: #ffffff !important;
            letter-spacing: 0.01em !important;
            transform: translateX(5px) !important;
          }

          .jangjisu-left-nav-mode header nav a:not([href="/jangjisu-prison"]):hover::before {
            width: 16px;
            background: #67e8f9;
            box-shadow: 0 0 18px rgba(103,232,249,0.58);
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
            font-size: 15px !important;
            font-weight: 900 !important;
            line-height: 1.15 !important;
          }

          .jangjisu-left-nav-mode header nav a[href="#youtube"] {
            color: rgba(254,226,226,0.82) !important;
          }

          .jangjisu-left-nav-mode header nav a[href="#youtube"]::before {
            background: rgba(248,113,113,0.50);
            box-shadow: 0 0 14px rgba(248,113,113,0.18);
          }

          .jangjisu-left-nav-mode header nav a[href*="cafe.naver.com"] {
            color: rgba(209,250,229,0.82) !important;
          }

          .jangjisu-left-nav-mode header nav a[href*="cafe.naver.com"]::before {
            background: rgba(52,211,153,0.50);
            box-shadow: 0 0 14px rgba(52,211,153,0.18);
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
            max-width: 80rem !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>
    </>
  );
}

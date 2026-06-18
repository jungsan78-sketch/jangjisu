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

    const ensureDreamServerModeLink = () => {
      const prisonLink = document.querySelector('a[href="/jangjisu-prison"]');
      if (!prisonLink || document.querySelector('a[href="/jisu-dream"]')) return;

      const dreamLink = prisonLink.cloneNode(true);
      dreamLink.setAttribute('href', '/jisu-dream');
      dreamLink.classList.add('sou-jisu-dream-mode-link');
      dreamLink.removeAttribute('onclick');

      const spans = dreamLink.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = '◉';
      if (spans[1]) spans[1].textContent = '지수의꿈 서버';
      if (!spans.length) dreamLink.textContent = '◉ 지수의꿈 서버';

      prisonLink.insertAdjacentElement('beforebegin', dreamLink);
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
      const link = event.target?.closest?.('a[href="/jangjisu-prison"], a[href="/jisu-dream"]');
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
      ensureDreamServerModeLink();
      placeMainNoticeAfterSchedule();
      prioritizeYoutubeTabs();
      setIsLayoutReady(true);
    };

    document.addEventListener('click', handleModeDirectNavigation, true);
    finalizeLayout();

    const utilityTimer = setTimeout(moveUtilityMenu, 300);
    const dreamTimer = setTimeout(ensureDreamServerModeLink, 300);
    const noticeTimer = setTimeout(placeMainNoticeAfterSchedule, 300);
    const readyTimer = setTimeout(() => {
      finalizeLayout();
    }, 520);
    const youtubeInterval = setInterval(() => {
      ensureDreamServerModeLink();
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
      clearTimeout(dreamTimer);
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
        <div className="lg:pl-[218px]">
          <SiteFooter />
        </div>
      </div>
      {!isLayoutReady ? <div className="fixed inset-0 z-[200] bg-[#05070c]" aria-hidden="true" /> : null}
      <style jsx global>{`
        body { background: #05070c; }
        .jangjisu-left-nav-mode footer { display: none !important; }
        @media (min-width: 1024px) {
          .jangjisu-left-nav-mode {
            padding-left: 218px !important;
          }

          .jangjisu-left-nav-mode header {
            position: fixed !important;
            inset: 0 auto 0 0 !important;
            z-index: 70 !important;
            width: 218px !important;
            border-right: 1px solid rgba(255,255,255,0.10) !important;
            border-bottom: 0 !important;
            background: linear-gradient(180deg, rgba(3,7,18,0.96), rgba(5,10,20,0.92)) !important;
            box-shadow: 24px 0 70px rgba(0,0,0,0.34) !important;
          }

          .jangjisu-left-nav-mode header > div {
            height: 100vh !important;
            max-width: none !important;
            flex-direction: column !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 22px !important;
            padding: 22px 16px !important;
          }

          .jangjisu-left-nav-mode header a[href="#"] {
            margin: 0 auto !important;
            height: 72px !important;
            width: 72px !important;
          }

          .jangjisu-left-nav-mode header nav,
          .jangjisu-left-nav-mode header nav > div {
            width: 100% !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
          }

          .jangjisu-left-nav-mode header nav {
            flex: 1 !important;
            gap: 16px !important;
          }

          .jangjisu-left-nav-mode header nav > div:first-child,
          .jangjisu-left-nav-mode header nav > div:last-child {
            display: flex !important;
            flex-direction: column !important;
            gap: 9px !important;
          }

          .jangjisu-left-nav-mode header nav > div:last-child {
            margin-top: auto !important;
            border-top: 1px solid rgba(255,255,255,0.10) !important;
            padding-top: 14px !important;
          }

          .jangjisu-left-nav-mode header nav a {
            width: 100% !important;
            justify-content: flex-start !important;
            border-radius: 18px !important;
            padding: 12px 14px !important;
          }

          .jangjisu-left-nav-mode header nav a > span:first-child {
            display: inline-flex !important;
            width: 26px !important;
            min-width: 26px !important;
            justify-content: center !important;
            text-align: center !important;
            font-size: 10px !important;
            font-weight: 900 !important;
            letter-spacing: 0.04em !important;
          }

          .jangjisu-left-nav-mode header nav a > span:nth-child(2) {
            display: inline-flex !important;
            align-items: center !important;
            text-align: left !important;
          }

          .jangjisu-left-nav-mode .sou-jisu-dream-mode-link {
            border-color: rgba(103,232,249,0.24) !important;
            background: linear-gradient(135deg, rgba(34,211,238,0.17), rgba(139,92,246,0.12)) !important;
            color: #cffafe !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 0 26px rgba(34,211,238,0.08) !important;
          }

          .jangjisu-left-nav-mode .sou-jisu-dream-mode-link > span:first-child {
            height: 26px !important;
            width: 26px !important;
            min-width: 26px !important;
            align-items: center !important;
            border: 1px solid rgba(255,255,255,0.20) !important;
            border-radius: 999px !important;
            background: linear-gradient(180deg, rgba(103,232,249,0.28) 0 48%, rgba(255,255,255,0.08) 48% 52%, rgba(8,15,28,0.72) 52% 100%) !important;
            color: white !important;
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

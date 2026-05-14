import Head from 'next/head';
import { useEffect } from 'react';
import JangJisuFanSite from '../components/JangJisuFanSite';
import MainJangJisuNoticeSection from '../components/MainJangJisuNoticeSection';

export default function Home() {
  useEffect(() => {
    const moveUtilityMenu = () => {
      const links = Array.from(document.querySelectorAll('a[href="/utility"]'));
      const utilityLink = links.find((link) => link.textContent?.includes('유틸리티'));
      const fanCafeLink = Array.from(document.querySelectorAll('a')).find((link) => link.textContent?.includes('팬카페'));
      if (utilityLink && fanCafeLink && fanCafeLink.parentElement === utilityLink.parentElement) {
        fanCafeLink.insertAdjacentElement('afterend', utilityLink);
      }
    };

    const ensurePokemonCardModeLink = () => {
      const prisonLink = Array.from(document.querySelectorAll('a[href="/jangjisu-prison"]'))
        .find((link) => link.textContent?.includes('장지수용소 모드'));
      if (!prisonLink || document.querySelector('a[href="/pokemon-card"]')) return;

      const pokemonLink = prisonLink.cloneNode(true);
      pokemonLink.href = '/pokemon-card';
      pokemonLink.classList.add('sou-pokemon-card-mode-link');
      pokemonLink.removeAttribute('target');
      pokemonLink.removeAttribute('rel');
      pokemonLink.onclick = null;
      pokemonLink.innerHTML = '<span>TCG</span><span>포켓몬카드 모드</span>';
      prisonLink.insertAdjacentElement('afterend', pokemonLink);
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

    const handlePrisonDirectNavigation = (event) => {
      const prisonLink = event.target?.closest?.('a[href="/jangjisu-prison"]');
      if (!prisonLink) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      window.location.href = '/jangjisu-prison';
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

    document.addEventListener('click', handlePrisonDirectNavigation, true);
    moveUtilityMenu();
    ensurePokemonCardModeLink();
    placeMainNoticeAfterSchedule();
    prioritizeYoutubeTabs();

    const utilityTimer = setTimeout(moveUtilityMenu, 600);
    const pokemonTimer = setTimeout(ensurePokemonCardModeLink, 600);
    const noticeTimer = setTimeout(placeMainNoticeAfterSchedule, 600);
    const youtubeInterval = setInterval(() => {
      ensurePokemonCardModeLink();
      if (prioritizeYoutubeTabs() && didActivateShorts) {
        clearInterval(youtubeInterval);
      }
    }, 300);
    const youtubeTimeout = setTimeout(() => clearInterval(youtubeInterval), 4000);

    return () => {
      document.removeEventListener('click', handlePrisonDirectNavigation, true);
      clearTimeout(utilityTimer);
      clearTimeout(pokemonTimer);
      clearTimeout(noticeTimer);
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
      <div className="jangjisu-left-nav-mode">
        <JangJisuFanSite />
      </div>
      <MainJangJisuNoticeSection />
      <style jsx global>{`
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

          .jangjisu-left-nav-mode .sou-pokemon-card-mode-link {
            border-color: rgba(251,191,36,0.30) !important;
            background: linear-gradient(135deg, rgba(251,191,36,0.16), rgba(239,68,68,0.10)) !important;
            color: #fde68a !important;
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

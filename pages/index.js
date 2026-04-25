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

    moveUtilityMenu();
    placeMainNoticeAfterSchedule();
    prioritizeYoutubeTabs();

    const utilityTimer = setTimeout(moveUtilityMenu, 600);
    const noticeTimer = setTimeout(placeMainNoticeAfterSchedule, 600);
    const youtubeInterval = setInterval(() => {
      if (prioritizeYoutubeTabs() && didActivateShorts) {
        clearInterval(youtubeInterval);
      }
    }, 300);
    const youtubeTimeout = setTimeout(() => clearInterval(youtubeInterval), 4000);

    return () => {
      clearTimeout(utilityTimer);
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
      <JangJisuFanSite />
      <MainJangJisuNoticeSection />
    </>
  );
}

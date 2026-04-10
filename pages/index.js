import Head from 'next/head';
import { useEffect } from 'react';
import JangJisuFanSite from '../components/JangJisuFanSite';

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

    moveUtilityMenu();
    const timer = setTimeout(moveUtilityMenu, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>장지수 팬 아카이브</title>
        <meta name="description" content="장지수 방송 상태, 공지, VOD, 팬카페를 한 곳에서 보는 팬메이드 허브" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <JangJisuFanSite />
    </>
  );
}

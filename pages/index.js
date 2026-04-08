import Head from 'next/head';
import JangJisuFanSite from '../components/JangJisuFanSite';

export default function Home() {
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

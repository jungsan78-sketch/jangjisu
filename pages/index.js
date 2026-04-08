import Head from 'next/head';
import JangJisuFanSite from '../components/JangJisuFanSite';

export default function Home() {
  return (
    <>
      <Head>
        <title>장지수 팬 사이트</title>
        <meta name="description" content="장지수 팬 사이트 프리미엄 UI 시안" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <JangJisuFanSite />
    </>
  );
}

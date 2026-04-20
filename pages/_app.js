import '../styles/globals.css';
import Head from 'next/head';
import NewYoutubeDomToast from '../components/NewYoutubeDomToast';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>JANGJISOU FAN ARCHIVE</title>
        <link rel="icon" type="image/png" href="/site-icon.png" />
        <link rel="apple-touch-icon" href="/site-icon.png" />
      </Head>
      <Component {...pageProps} />
      <NewYoutubeDomToast />
    </>
  );
}

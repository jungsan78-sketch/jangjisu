import Head from 'next/head';
import PrisonPageContent from '../components/prison/PrisonPageContent';

export default function JangjisuPrisonV2Page() {
  return (
    <>
      <Head>
        <title>장지수용소 | SOU</title>
        <meta name="description" content="장지수용소 팬메이드 서브사이트" />
        <link rel="icon" href="/prison-logo.webp" />
        <link rel="apple-touch-icon" href="/prison-logo.webp" />
      </Head>
      <style jsx global>{`
        body:has(img[src="/jangjisu-prison-hero.png"]) section#members:not(.sou-member-live-section) {
          display: none !important;
        }
        @media (min-width: 1280px) {
          .sou-prison-page aside > a[href="#top"] {
            height: 264px !important;
            margin-bottom: 20px !important;
          }
          .sou-prison-page aside > a[href="#top"] img[alt="장지수용소"] {
            height: 264px !important;
            width: 260px !important;
          }
          .sou-prison-page aside nav a[href="#top"] span:first-child {
            font-size: 0 !important;
          }
          .sou-prison-page aside nav a[href="#top"] span:first-child::after {
            content: '🏆';
            font-size: 16px;
          }
          .sou-prison-page aside nav a[href="#top"] span:last-child {
            font-size: 0 !important;
          }
          .sou-prison-page aside nav a[href="#top"] span:last-child::after {
            content: '명예의 쇼츠';
            font-size: 14px;
          }
        }
        .sou-prison-page header nav a[href="#top"] {
          font-size: 0 !important;
        }
        .sou-prison-page header nav a[href="#top"]::before {
          content: '🏆 ';
          font-size: 12px;
        }
        .sou-prison-page header nav a[href="#top"]::after {
          content: '명예의 쇼츠';
          font-size: 12px;
        }
      `}</style>
      <div className="min-h-screen bg-[#05070c] text-white">
        <PrisonPageContent />
      </div>
    </>
  );
}

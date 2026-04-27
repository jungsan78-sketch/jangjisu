import Head from 'next/head';
import PrisonPageContent from '../components/prison/PrisonPageContent';

export default function JangjisuPrisonV2Page() {
  return (
    <>
      <Head>
        <title>장지수용소 모드 | 장지수용소 팬메이드</title>
        <meta name="description" content="장지수용소 팬메이드 서브사이트" />
      </Head>
      <style jsx global>{`
        body:has(img[src="/jangjisu-prison-hero.png"]) section#members:not(.sou-member-live-section) {
          display: none !important;
        }
      `}</style>
      <div className="min-h-screen bg-[#05070c] text-white">
        <PrisonPageContent />
      </div>
    </>
  );
}

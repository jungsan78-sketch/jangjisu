import Head from 'next/head';

function OverwatchPreview() {
  return (
    <div className="relative flex w-full items-center justify-center select-none">
      <div className="pointer-events-none absolute h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(255,140,58,0.18),rgba(34,42,58,0.10)_42%,transparent_72%)] blur-[2px]" />
      <img src="/logos/overwatch.png" alt="오버워치" className="relative h-[96px] w-[96px] object-contain" />
    </div>
  );
}

function SoopPreview() {
  return (
    <div className="relative flex w-full items-center justify-center select-none">
      <img src="/logos/SOOP.png" alt="SOOP" className="relative max-h-[82px]" />
    </div>
  );
}

function UtilityCard({ href, title }) {
  return (
    <a href={href} className="block rounded-[20px] border p-6 hover:opacity-80">
      <div className="text-xl font-bold">{title}</div>
    </a>
  );
}

export default function UtilityHomePage() {
  return (
    <>
      <Head>
        <title>유틸리티</title>
      </Head>
      <main className="p-10 grid gap-6">
        <UtilityCard href="/utility/overwatch-random" title="오버워치 랜덤뽑기" />
        <UtilityCard href="/utility/soop-funding-memo" title="SOOP 펀딩" />
        <UtilityCard href="/utility/soop-funding-new" title="SOOP 펀딩 New" />
      </main>
    </>
  );
}

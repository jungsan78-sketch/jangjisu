import Head from 'next/head';

function UtilityCard({ href, title, description, label }) {
  return (
    <a href={href} className="group block rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,15,23,0.98),rgba(8,12,20,0.98))] p-6 transition hover:-translate-y-1 hover:border-cyan-300/25 hover:shadow-[0_18px_40px_rgba(34,211,238,0.10)]">
      <div className="text-xs font-bold tracking-[0.28em] text-cyan-200/55">UTILITY</div>
      <div className="mt-3 text-[24px] font-extrabold tracking-tight text-white">{title}</div>
      <p className="mt-3 text-sm leading-7 text-white/58">{description}</p>
      <div className="mt-6 inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition group-hover:bg-cyan-300/18">{label}</div>
    </a>
  );
}

export default function UtilityHomePage() {
  return (
    <>
      <Head>
        <title>유틸리티 | 장지수 팬 아카이브</title>
        <meta name="description" content="장지수 팬 아카이브 유틸리티 페이지" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-white/25 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]">
              <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
            </a>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <a href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10">홈으로</a>
              <a href="/utility/overwatch-random" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/22">오버워치 랜덤뽑기</a>
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30 lg:p-9">
            <div className="text-xs font-bold tracking-[0.45em] text-white/38">UTILITY PAGE</div>
            <div className="mt-4 text-[36px] font-black tracking-tight text-white sm:text-[48px]">유틸리티</div>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-white/60">방송 중 바로 사용할 수 있는 보조 툴을 모아두는 전용 페이지입니다. 원하는 툴을 선택해서 별도 페이지에서 사용하면 됩니다.</p>
          </section>
          <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <UtilityCard href="/utility/overwatch-random" title="오버워치 랜덤뽑기" description="팀 수 2~10팀, 5:5/6:6 전환, 라인 잠금, 랜덤 섞기, 결과 복사까지 지원하는 방송용 팀 편성 툴" label="실행하기" />
          </section>
        </main>
      </div>
    </>
  );
}

import Head from 'next/head';

const SHEET_SOURCES = [
  {
    id: 'crew-sheet-1',
    title: 'SOOP 크루 시트 01',
    href: 'https://docs.google.com/spreadsheets/d/1zwIJjl2UTkPREkI37in9e0PAwX9xwFtEU3-ECAYYaeU/edit?gid=0#gid=0',
    description: '크루 정보와 방송국 링크를 관리하는 원본 시트입니다.',
  },
  {
    id: 'crew-sheet-2',
    title: 'SOOP 크루 시트 02',
    href: 'https://docs.google.com/spreadsheets/d/1-mACl-yykHphsqiSUNPkoC1GHydOYmWX-xHqdRz7DVM/edit?gid=344917607#gid=344917607',
    description: '추가 크루 데이터를 관리하는 두 번째 원본 시트입니다.',
  },
];

function SourceCard({ source, accent = 'blue' }) {
  const theme = accent === 'violet'
    ? 'border-violet-300/24 bg-[linear-gradient(180deg,rgba(32,20,49,0.96),rgba(11,10,19,0.98))]'
    : 'border-cyan-300/24 bg-[linear-gradient(180deg,rgba(10,27,46,0.96),rgba(8,11,18,0.98))]';

  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className={`group rounded-[28px] border p-6 transition hover:-translate-y-1 hover:border-cyan-200/35 hover:shadow-[0_20px_45px_rgba(20,184,166,0.12)] ${theme}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold tracking-[0.3em] text-white/40">GOOGLE SHEETS</div>
          <div className="mt-3 text-[24px] font-black tracking-tight text-white">{source.title}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition group-hover:bg-white/10 group-hover:text-white">원본 열기</div>
      </div>
      <p className="mt-4 text-sm leading-7 text-white/64">{source.description}</p>
      <div className="mt-6 inline-flex rounded-full border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100">독립 페이지 프리뷰</div>
    </a>
  );
}

function PlaceholderCrewCard({ title, subtitle }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,32,0.98),rgba(8,11,18,0.98))] p-5 shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black text-white">{title}</div>
          <div className="mt-2 text-sm text-white/54">{subtitle}</div>
        </div>
        <div className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">PREVIEW</div>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-[20px] border border-white/8 bg-white/[0.04] p-3 text-center">
            <div className="mx-auto h-14 w-14 rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(255,255,255,0.03)_58%,transparent_75%)]" />
            <div className="mt-3 h-3 rounded-full bg-white/8" />
            <div className="mt-2 h-3 rounded-full bg-white/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SoopCrewsPage() {
  return (
    <>
      <Head>
        <title>숲 크루 목록 | 장지수 팬 아카이브</title>
        <meta name="description" content="SOOP 크루 목록 독립 페이지 프리뷰" />
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
            <div className="flex-1 px-4 text-center text-[28px] font-black tracking-tight text-white">숲 크루 목록</div>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <a href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10">홈으로</a>
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/15 px-4 py-2 text-sm font-medium text-[#b8d8ff] transition hover:bg-[#3b82f6]/22">유틸리티</a>
            </nav>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30 lg:p-9">
            <div className="text-xs font-bold tracking-[0.45em] text-white/38">SOOP CREW PAGE</div>
            <div className="mt-4 text-[36px] font-black tracking-tight text-white sm:text-[48px]">숲 크루 목록</div>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/60">유틸리티처럼 독립 페이지로 들어오는 SOOP 크루 목록 프리뷰입니다. 현재는 두 개의 원본 시트를 기준으로 구조를 먼저 잡아둔 상태이며, 다음 단계에서 카드형 데이터 연동과 방송국 이동을 붙이는 방향으로 확장하면 됩니다.</p>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <SourceCard source={SHEET_SOURCES[0]} accent="blue" />
            <SourceCard source={SHEET_SOURCES[1]} accent="violet" />
          </section>

          <section className="mt-8 grid gap-6">
            <PlaceholderCrewCard title="크루 카드 레이아웃 프리뷰" subtitle="시트 데이터가 정리되면 이 영역에 방송국 링크가 연결된 멤버 카드들이 들어갑니다." />
          </section>
        </main>
      </div>
    </>
  );
}

import Head from 'next/head';

const CREW_GROUPS = [
  { name: '버캠퍼니', count: 8, accent: 'cyan', members: ['감스트', '혜리', '유설아', '유연서', '망고랑', '니니', '앨리스암', '킴나니'] },
  { name: '홍신소', count: 15, accent: 'rose', members: ['홍타쿠', '장결', '따소히', '고체리', '모아', '야농', '조아썻', '라율', '휘비', '하비', '또야옹', '왜나니', '의깨굴', '현단아', '연아리'] },
  { name: '지력사무소', count: 13, accent: 'amber', members: ['지피티', '라무', '모나양', '싱유', '물초코', '니니밍', '김병살', '한아련', '김퀴카', '목추리', '메루', '나옹', '린코'] },
  { name: '가무소', count: 15, accent: 'violet', members: ['가습기', '하티하터', '쩜도은', '하루아이', '젤율이', '기찬하', '단수아', '아뽀', '당곰', '라초', '연보라', '토쿠', '연치민', '정다니', '퍼너'] },
  { name: '꾸한성', count: 16, accent: 'emerald', members: ['꾸꾸까까', '애교용', '하은비', '오렌지', '푸른별', '도아린', '밤비', '마이카', '유호', '세리나', '도리', '라니', '체르', '솜비', '유닝', '코유'] },
  { name: '그린캠프', count: 15, accent: 'sky', members: ['굿바이', '헤른', '리엔', '도로시', '벨라', '카요', '노아', '유메', '하린', '리아', '루체', '연비', '하나', '다온', '린비'] },
];

const CREW_THEME = {
  cyan: { card: 'border-cyan-300/24 bg-[linear-gradient(180deg,rgba(10,27,46,0.96),rgba(8,11,18,0.98))]', title: 'text-cyan-100', badge: 'border-cyan-300/24 bg-cyan-300/12 text-cyan-100', member: 'border-cyan-300/18 bg-cyan-300/10 text-cyan-50' },
  rose: { card: 'border-rose-300/24 bg-[linear-gradient(180deg,rgba(48,20,34,0.96),rgba(14,10,16,0.98))]', title: 'text-rose-100', badge: 'border-rose-300/24 bg-rose-300/12 text-rose-100', member: 'border-rose-300/18 bg-rose-300/10 text-rose-50' },
  amber: { card: 'border-amber-300/24 bg-[linear-gradient(180deg,rgba(52,34,14,0.96),rgba(15,11,8,0.98))]', title: 'text-amber-100', badge: 'border-amber-300/24 bg-amber-300/12 text-amber-100', member: 'border-amber-300/18 bg-amber-300/10 text-amber-50' },
  violet: { card: 'border-violet-300/24 bg-[linear-gradient(180deg,rgba(34,20,49,0.96),rgba(11,10,19,0.98))]', title: 'text-violet-100', badge: 'border-violet-300/24 bg-violet-300/12 text-violet-100', member: 'border-violet-300/18 bg-violet-300/10 text-violet-50' },
  emerald: { card: 'border-emerald-300/24 bg-[linear-gradient(180deg,rgba(18,38,28,0.96),rgba(8,12,11,0.98))]', title: 'text-emerald-100', badge: 'border-emerald-300/24 bg-emerald-300/12 text-emerald-100', member: 'border-emerald-300/18 bg-emerald-300/10 text-emerald-50' },
  sky: { card: 'border-sky-300/24 bg-[linear-gradient(180deg,rgba(14,28,52,0.96),rgba(8,10,18,0.98))]', title: 'text-sky-100', badge: 'border-sky-300/24 bg-sky-300/12 text-sky-100', member: 'border-sky-300/18 bg-sky-300/10 text-sky-50' },
};

function NavChip({ href, label, icon = '' }) {
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/15 px-4 py-2 text-sm font-medium text-[#b8d8ff] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:bg-[#3b82f6]/22">
      {icon ? <span>{icon}</span> : null}
      <span>{label}</span>
    </a>
  );
}

function CrewCard({ crew }) {
  const theme = CREW_THEME[crew.accent] || CREW_THEME.cyan;
  return (
    <section className={`rounded-[28px] border p-5 shadow-[0_16px_36px_rgba(0,0,0,0.22)] ${theme.card}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className={`text-[26px] font-black tracking-tight ${theme.title}`}>{crew.name}</div>
          <p className="mt-2 text-sm text-white/56">장지수용소 종겜 크루 카드</p>
        </div>
        <div className={`rounded-full border px-4 py-2 text-sm font-bold ${theme.badge}`}>{crew.count}명</div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {crew.members.map((member) => (
          <div key={`${crew.name}-${member}`} className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3 transition hover:-translate-y-1 hover:border-white/20">
            <div className="mx-auto h-16 w-16 rounded-full border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(255,255,255,0.06)_55%,transparent_76%)]" />
            <div className="mt-4 text-center text-sm font-black text-white">{member}</div>
            <div className="mt-3 flex justify-center">
              <div className={`rounded-full border px-3 py-1 text-[11px] font-bold ${theme.member}`}>방송국 연동 예정</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function JangjisuPrisonCrewsPage() {
  return (
    <>
      <Head>
        <title>종겜 크루 목록 | 장지수용소 팬메이드</title>
        <meta name="description" content="장지수용소 종겜 크루 목록" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/jangjisu-prison" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-white/25 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]">
              <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
            </a>
            <div className="flex-1 px-4 text-center text-[28px] font-black tracking-tight text-white">종겜 크루 목록</div>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <NavChip href="/jangjisu-prison" label="장지수용소 홈" icon="↩" />
              <NavChip href="/" label="SOU 메인" icon="S" />
            </nav>
          </div>
        </header>
        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="grid gap-6">
            {CREW_GROUPS.map((crew) => (
              <CrewCard key={crew.name} crew={crew} />
            ))}
          </section>
        </main>
      </div>
    </>
  );
}

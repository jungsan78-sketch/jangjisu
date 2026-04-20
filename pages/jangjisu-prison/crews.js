import Head from 'next/head';

const CREW_GROUPS = [
  { name: '버컴퍼니', count: 8, accent: 'cyan', members: ['감스트', '혜리', '유설아', '유연서', '망구랑', '니니', '앨리스얌', '킴나니'] },
  { name: '홍신소', count: 15, accent: 'rose', members: ['홍타쿠', '잠결', '따소히', '고체리', '모아', '야농', '조아썻', '라율', '휘비', '하비', '또야옹', '왜나니', '의깨굴', '현단아', '연아리'] },
  { name: '지력사무소', count: 13, accent: 'amber', members: ['지피티', '라무', '모나양', '싱유', '물초코', '니니밍', '김병살', '한아련', '김퀴카', '목추리', '메루', '나옹', '린코'] },
  { name: '가무소', count: 15, accent: 'violet', members: ['가습기', '하티하터', '쩜도은', '하루아이', '젤율이', '기찬하', '단수아', '아뽀', '당곰', '라초', '연보라', '토쿠', '연치민', '정다니', '퍼너'] },
  { name: '꾸한성', count: 16, accent: 'emerald', members: ['꾸꾸까까', '애교용', '하은비', '오렌지', '푸른별', '도아린', '밤비', '마이카', '유호', '세리나', '도리', '라니', '체르', '솜비', '유닝', '코유'] },
  { name: '그린캠프', count: 15, accent: 'sky', members: ['굿바이', '헤른', '리엔', '도로시', '벨라', '카요', '노아', '유메', '하린', '리아', '루체', '연비', '하나', '다온', '린비'] },
];

const CREW_THEME = {
  cyan: { card: 'border-white/10 bg-[linear-gradient(180deg,rgba(11,26,40,0.96),rgba(7,10,16,0.99))]', title: 'text-cyan-50', glow: 'from-cyan-300/18', badge: 'border-white/10 bg-white/8 text-cyan-50', member: 'border-cyan-200/14 bg-cyan-200/8 text-cyan-50' },
  rose: { card: 'border-white/10 bg-[linear-gradient(180deg,rgba(40,18,28,0.96),rgba(12,8,13,0.99))]', title: 'text-rose-50', glow: 'from-rose-300/18', badge: 'border-white/10 bg-white/8 text-rose-50', member: 'border-rose-200/14 bg-rose-200/8 text-rose-50' },
  amber: { card: 'border-white/10 bg-[linear-gradient(180deg,rgba(42,30,14,0.96),rgba(13,10,7,0.99))]', title: 'text-amber-50', glow: 'from-amber-300/18', badge: 'border-white/10 bg-white/8 text-amber-50', member: 'border-amber-200/14 bg-amber-200/8 text-amber-50' },
  violet: { card: 'border-white/10 bg-[linear-gradient(180deg,rgba(31,22,45,0.96),rgba(10,8,16,0.99))]', title: 'text-violet-50', glow: 'from-violet-300/18', badge: 'border-white/10 bg-white/8 text-violet-50', member: 'border-violet-200/14 bg-violet-200/8 text-violet-50' },
  emerald: { card: 'border-white/10 bg-[linear-gradient(180deg,rgba(18,35,28,0.96),rgba(7,11,10,0.99))]', title: 'text-emerald-50', glow: 'from-emerald-300/18', badge: 'border-white/10 bg-white/8 text-emerald-50', member: 'border-emerald-200/14 bg-emerald-200/8 text-emerald-50' },
  sky: { card: 'border-white/10 bg-[linear-gradient(180deg,rgba(15,28,48,0.96),rgba(7,9,15,0.99))]', title: 'text-sky-50', glow: 'from-sky-300/18', badge: 'border-white/10 bg-white/8 text-sky-50', member: 'border-sky-200/14 bg-sky-200/8 text-sky-50' },
};

function NavChip({ href, label, icon = '' }) {
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:bg-white/10">
      {icon ? <span>{icon}</span> : null}
      <span>{label}</span>
    </a>
  );
}

function CrewCard({ crew }) {
  const theme = CREW_THEME[crew.accent] || CREW_THEME.cyan;
  return (
    <section className={`relative overflow-hidden rounded-[30px] border p-5 shadow-[0_18px_46px_rgba(0,0,0,0.26)] ${theme.card}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${theme.glow} to-transparent`} />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className={`text-[27px] font-black tracking-tight ${theme.title}`}>{crew.name}</div>
          <p className="mt-2 text-sm text-white/52">장지수용소 종겜 크루 카드</p>
        </div>
        <div className={`rounded-full border px-4 py-2 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${theme.badge}`}>{crew.count}명</div>
      </div>
      <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {crew.members.map((member) => (
          <div key={`${crew.name}-${member}`} className="group rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-300 hover:-translate-y-1 hover:border-white/16 hover:bg-white/[0.06]">
            <div className="mx-auto h-16 w-16 rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),rgba(255,255,255,0.055)_58%,rgba(255,255,255,0.015)_78%)] shadow-[0_10px_20px_rgba(0,0,0,0.20)]" />
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
          <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/8 blur-3xl" />
          <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/8 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" />
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

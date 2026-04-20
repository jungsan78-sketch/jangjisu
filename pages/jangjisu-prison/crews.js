import Head from 'next/head';
import { useMemo, useState } from 'react';

const CREW_GROUPS = [
  { name: '사자회', members: ['춘봉', '필메', '추르미', '또니', '쏭아야', '오봉구', '상득', '뚜닝', '채하', '차투리', '달묘', '오늘님', '쿠아', '감초'] },
  { name: '조적단', members: ['조디악', '쥐돌이', '설이', '뮤즈', '얼그레', '손진석', '리타', '황정민'] },
  { name: '오락실', members: ['오아', '멍지수', '치유', '새잎', '히뚜', '도맑음', '만조', '녹초', '빡룡', '후룽카카', '백하', '김옥독', '채윤아'] },
  { name: '천타버스', members: ['천양', '마다옴', '나나문', '임하밍', '문모모', '한아밍', '카푸', '캬앙', '김웰로', '모카', '달타', '파니'] },
  { name: '강씨세가', members: ['강만식', '깐숙', '깡담비', '두부랑', '망개', '모요'] },
  { name: '진드기', members: ['진호', '두칠', '슈슈슈앙', '지맘대로리나', '히키', '솔밍', '찰리씨'] },
  { name: 'ZZAM지트', members: ['짬타수아', '다키', '도월하', '루센', '숙봉이', '에이레네', '이유진', '햄쏘따', '호진맨', '꼬마거북이', '나솜', '한건수'] },
  { name: '버컴퍼니', members: ['감스트', '해리', '유설아', '유연서', '망구랑', '니니', '앨리스얌', '킴나니', '바밍'] },
  { name: '지력사무소', members: ['지피티', '라무', '모나양', '싱유', '물초코', '니니밍', '김병살', '한아련', '김쿼카', '목츄리', '메루', '나몽', '린코'] },
  { name: '꾸한성', members: ['꾸티뉴', '야무지', '엔쥬', '란다', '셀키', '리카', '철쑤', '구본좌', '영감', '난워니', '다뮤', '딴딴2당', '초귀요미', '밈먀', '밤먀', '서라0'] },
  { name: '버블란', members: ['박재박', '홍길순', '어쩜냥이', '에요에요', '다시바', '슈니', '공태연', '루루시', '초금비', '유태', '큐티섹시'] },
  { name: '고래상사', members: ['울산큰고래', '멜로딩딩', '김마렌', '온자두', '삐요코', '견자희', '쏭이', '조아라', '감자가비', '이지수', '밀크티냠', '빡쏘', '최은뽀', '희희덕', '채하나', '히무루'] },
  { name: '홍신소', members: ['홍타쿠', '잠결', '따스히', '고채린', '모야', '아눙', '죠아써', '라율', '힙비', '하비', '또야몽', '왜냐니', '이깨굴', '현단아', '연아리'] },
  { name: '가무소', members: ['가습기', '하티하티', '쨈도은', '하루아이', '잼율이', '기찬하', '단수아', '야뿌', '딩굴', '란쵸', '연보라', '토뤼', '연치민', '희꾸미', '정다니', '피너'] },
  { name: '로스타시티', members: ['로기다', '추멘'] },
  { name: '버인협회', members: ['조경훈', '아뚱', '해솔', '너보링', '송소미', '비숑', '뀨복', '표우', '부르', '김쁘피', '윤이샘'] },
].map((crew, index) => ({
  ...crew,
  leader: crew.members[0],
  accentIndex: index,
}));

const CARD_THEMES = [
  'from-cyan-300/12 via-slate-200/5 to-transparent',
  'from-rose-300/12 via-slate-200/5 to-transparent',
  'from-amber-300/12 via-slate-200/5 to-transparent',
  'from-violet-300/12 via-slate-200/5 to-transparent',
  'from-emerald-300/12 via-slate-200/5 to-transparent',
  'from-sky-300/12 via-slate-200/5 to-transparent',
];

function NavButton({ href, children }) {
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] px-4 py-2 text-sm font-bold text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/10 hover:text-white">
      {children}
    </a>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-4 py-2 text-sm font-black transition ${active ? 'border-amber-200/35 bg-[linear-gradient(180deg,rgba(245,158,11,0.20),rgba(255,255,255,0.055))] text-amber-50 shadow-[0_0_26px_rgba(245,158,11,0.13),inset_0_1px_0_rgba(255,255,255,0.10)]' : 'border-white/10 bg-white/[0.045] text-white/64 hover:border-white/18 hover:bg-white/[0.075] hover:text-white'}`}>
      {children}
    </button>
  );
}

function AvatarPlaceholder({ name, leader = false }) {
  return (
    <div className={`${leader ? 'h-20 w-20 text-xl' : 'h-14 w-14 text-sm'} mx-auto flex items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),rgba(255,255,255,0.075)_55%,rgba(255,255,255,0.02)_78%)] font-black text-white shadow-[0_12px_26px_rgba(0,0,0,0.26)]`}>
      {name.slice(0, 1)}
    </div>
  );
}

function CrewCard({ crew }) {
  const glow = CARD_THEMES[crew.accentIndex % CARD_THEMES.length];
  const normalMembers = crew.members.slice(1);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,27,0.98),rgba(6,8,13,0.99))] p-5 shadow-[0_20px_54px_rgba(0,0,0,0.32)]">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${glow}`} />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[28px] font-black tracking-tight text-white">{crew.name}</h2>
            <span className="rounded-full border border-amber-200/18 bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100">수장 {crew.leader}</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-white/52">메모장 기준 고정 데이터 · 프로필/방송국 링크 추후 연결</p>
        </div>
        <div className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-black text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">총 {crew.members.length}명</div>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="rounded-[28px] border border-amber-200/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(255,255,255,0.025))] p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
          <AvatarPlaceholder name={crew.leader} leader />
          <div className="mt-4 text-xl font-black text-white">{crew.leader}</div>
          <div className="mt-3 inline-flex rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-black text-amber-100">CREW LEADER</div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {normalMembers.map((member) => (
            <div key={`${crew.name}-${member}`} className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-300 hover:-translate-y-1 hover:border-white/16 hover:bg-white/[0.065]">
              <AvatarPlaceholder name={member} />
              <div className="mt-3 text-sm font-black text-white">{member}</div>
              <div className="mt-2 text-[11px] font-bold text-white/38">수용 멤버</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function JangjisuPrisonCrewsPage() {
  const [selectedCrew, setSelectedCrew] = useState('전체보기');
  const visibleCrews = useMemo(() => selectedCrew === '전체보기' ? CREW_GROUPS : CREW_GROUPS.filter((crew) => crew.name === selectedCrew), [selectedCrew]);
  const totalMembers = CREW_GROUPS.reduce((sum, crew) => sum + crew.members.length, 0);

  return (
    <>
      <Head>
        <title>종겜 크루 목록 | 장지수용소 팬메이드</title>
        <meta name="description" content="장지수용소 종겜 크루 목록" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-slate-500/10 blur-3xl" />
          <div className="absolute top-16 right-[-70px] h-80 w-80 rounded-full bg-amber-500/8 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-80 w-[34rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" />
        </div>

        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/jangjisu-prison" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.07] hover:border-white/25">
              <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
            </a>
            <div className="flex-1 px-4 text-center text-[28px] font-black tracking-tight text-white">종겜 크루 목록</div>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <NavButton href="/jangjisu-prison">↩ 장지수용소 홈</NavButton>
              <NavButton href="/">S SOU 메인</NavButton>
            </nav>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="mb-7 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_54px_rgba(0,0,0,0.28)]">
            <div className="text-xs font-black tracking-[0.42em] text-amber-100/45">CREW DIRECTORY</div>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-[36px] font-black tracking-tight text-white sm:text-[44px]">종겜 크루 목록</h1>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/58">메모장 기준으로 크루명/수장/멤버명을 그대로 반영했습니다. 프로필 링크와 방송국 링크는 이후 데이터 받으면 카드에 연결됩니다.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-black text-white/76">{CREW_GROUPS.length}개 크루 · {totalMembers}명</div>
            </div>
          </section>

          <section className="mb-7 rounded-[28px] border border-white/10 bg-black/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="flex flex-wrap gap-2">
              <FilterButton active={selectedCrew === '전체보기'} onClick={() => setSelectedCrew('전체보기')}>전체보기</FilterButton>
              {CREW_GROUPS.map((crew) => (
                <FilterButton key={crew.name} active={selectedCrew === crew.name} onClick={() => setSelectedCrew(crew.name)}>{crew.name}</FilterButton>
              ))}
            </div>
          </section>

          <section className="grid gap-6">
            {visibleCrews.map((crew) => (
              <CrewCard key={crew.name} crew={crew} />
            ))}
          </section>
        </main>
      </div>
    </>
  );
}

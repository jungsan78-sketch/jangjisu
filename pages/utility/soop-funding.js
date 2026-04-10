import Head from 'next/head';

const TODO_ITEMS = [
  'SOOP 아이디 입력 후 채널 식별',
  '실시간 펀딩 감지 및 소리 알림',
  '후원자 / 펀딩 개수 / 메시지 자동 입력',
  '기준 펀딩 수 대비 반복 횟수 계산',
  '후원자 복사 / 메시지 복사 선택',
  'SOOP API 승인 후 실제 데이터 연결',
];

function SoopWordmark() {
  return (
    <div className="flex items-center justify-center gap-4 select-none">
      <span className="text-[110px] font-black leading-none tracking-[-0.08em] text-white sm:text-[132px]">S</span>
      <span className="relative inline-flex items-center text-[110px] font-black leading-none tracking-[-0.12em] sm:text-[132px]">
        <span className="bg-[linear-gradient(90deg,#1780FF_0%,#19E2D8_100%)] bg-clip-text text-transparent">OO</span>
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-[92px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#1780FF_0%,#19E2D8_100%)]" />
      </span>
      <span className="text-[110px] font-black leading-none tracking-[-0.08em] text-white sm:text-[132px]">P</span>
    </div>
  );
}

export default function SoopFundingUtilityPage() {
  return (
    <>
      <Head>
        <title>SOOP 펀딩 복사 유틸리티 | 장지수 팬 아카이브</title>
        <meta name="description" content="SOOP 미완성 유틸리티 안내 페이지" />
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
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/15 px-4 py-2 text-sm font-medium text-[#b8d8ff] transition hover:bg-[#3b82f6]/22">유틸리티</a>
            </nav>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(13,18,28,0.98),rgba(8,12,20,0.98))] shadow-2xl shadow-black/30">
            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r lg:p-10">
                <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold tracking-[0.28em] text-cyan-100">UTILITY PREVIEW</div>
                <div className="mt-6 max-w-xl text-[34px] font-black tracking-tight text-white sm:text-[44px]">SOOP 펀딩 복사 유틸리티</div>
                <p className="mt-5 max-w-xl text-sm leading-8 text-white/62">
                  현재 미완성
                </p>

                <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="text-sm font-bold tracking-[0.18em] text-white/42">예정 기능</div>
                  <div className="mt-4 grid gap-3">
                    {TODO_ITEMS.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-[#0e1521] px-4 py-3 text-sm text-white/72">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-xs font-bold text-cyan-100">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative p-8 lg:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,129,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(18,224,216,0.12),transparent_28%)]" />
                <div className="relative rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,22,0.96),rgba(7,10,18,0.98))] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.26)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold tracking-[0.28em] text-white/36">SOOP PLATFORM</div>
                      <div className="mt-3 text-[28px] font-black tracking-tight text-white">현재 미완성</div>
                    </div>
                    <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100">미완성</div>
                  </div>

                  <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1119] p-4">
                    <div className="rounded-[24px] border border-white/8 bg-[#0f141d] px-4 py-8 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                      <SoopWordmark />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/10 bg-[#0d1420] p-5">
                      <div className="text-sm font-bold text-white">입력 예정</div>
                      <div className="mt-3 space-y-3 text-sm text-white/58">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">숲 아이디</div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">기준 펀딩 개수</div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">후원자 / 메시지 복사 선택</div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-[#0d1420] p-5">
                      <div className="text-sm font-bold text-white">출력 예정</div>
                      <div className="mt-3 space-y-3 text-sm text-white/58">
                        <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.06] px-4 py-3">후원자 자동입력</div>
                        <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.06] px-4 py-3">메시지 자동입력</div>
                        <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.06] px-4 py-3">복사 결과 미리보기</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

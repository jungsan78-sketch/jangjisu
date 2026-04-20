import Head from 'next/head';

function NavChip({ href, label, tone = 'blue', icon = '' }) {
  const toneClass = tone === 'red'
    ? 'border-[#ff4e45]/30 bg-[#ff4e45]/15 text-[#ffb2ae] hover:bg-[#ff4e45]/22'
    : tone === 'green'
      ? 'border-emerald-300/30 bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/18'
      : 'border-[#3b82f6]/30 bg-[#3b82f6]/15 text-[#b8d8ff] hover:bg-[#3b82f6]/22';

  return (
    <a href={href} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] ${toneClass}`}>
      {icon ? <span>{icon}</span> : null}
      <span>{label}</span>
    </a>
  );
}

function SectionTitle({ title, logo }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      {logo ? <span className="text-lg leading-none text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">{logo}</span> : null}
      <h3 className="text-[28px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[32px]">{title}</h3>
    </div>
  );
}

function CalendarPreview() {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
      <SectionTitle title="장지수용소 일정표" logo="🔵" />
      <div className="rounded-[30px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="text-[24px] font-extrabold tracking-tight text-white sm:text-[30px]">이번 달 달력</div>
          <div className="text-xs font-bold tracking-[0.45em] text-white/40 sm:text-sm">PRISON MODE</div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#05101d] p-4 sm:p-5">
          <div className="mb-4 grid grid-cols-7 gap-3 text-center text-sm font-extrabold text-white/60">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div key={day} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => (
              <div key={day} className={`min-h-[96px] rounded-[22px] border p-4 ${day === 15 ? 'border-cyan-300/50 bg-[linear-gradient(180deg,rgba(7,27,46,0.98),rgba(5,12,24,0.98))] shadow-[0_0_22px_rgba(34,211,238,0.12)]' : 'border-white/8 bg-[#07111f]'}`}>
                <div className="text-[15px] font-extrabold text-white">{day}</div>
                {day === 15 ? <div className="mt-4 text-sm font-semibold leading-6 text-white/92">장지수용소 방송</div> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function JangjisuPrisonPage() {
  return (
    <>
      <Head>
        <title>장지수용소 모드 | 장지수용소 팬메이드</title>
        <meta name="description" content="장지수용소 팬메이드 서브사이트" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all duration-300 hover:scale-[1.07] hover:border-white/25 hover:shadow-[0_0_36px_rgba(96,165,250,0.28)]">
              <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
            </a>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <NavChip href="/" label="SOU 메인" icon="↩" />
              <NavChip href="#schedule" label="일정표" icon="🔵" />
              <NavChip href="/jangjisu-prison/crews" label="종겜 크루 목록" icon="📋" />
            </nav>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
            <div className="relative min-h-[460px] overflow-hidden lg:min-h-[560px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(44,149,255,0.32),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.18),_transparent_20%),linear-gradient(180deg,_rgba(3,7,18,0.40)_0%,_rgba(3,7,18,0.62)_45%,_rgba(2,6,12,0.88)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.18),transparent_68%)] blur-2xl" />
              <div className="relative z-10 flex min-h-[460px] flex-col items-center justify-center px-6 text-center lg:min-h-[560px]">
                <div className="text-xs font-bold tracking-[0.52em] text-white/42">JANGJISU PRISON FANMADE</div>
                <div className="mt-7 select-none bg-[linear-gradient(90deg,#ffffff_0%,#dbeafe_25%,#ffffff_50%,#bae6fd_75%,#ffffff_100%)] bg-[length:200%_200%] bg-clip-text text-[54px] font-black leading-[1.02] tracking-[0.08em] text-transparent sm:text-[76px] md:text-[104px]">
                  장지수용소
                </div>
                <p className="mt-6 max-w-2xl text-sm font-medium leading-8 text-white/64">장지수가 운영하는 버추얼 동아리 전용 팬메이드 서브사이트입니다.</p>
              </div>
            </div>
          </section>

          <CalendarPreview />
        </main>
      </div>
    </>
  );
}

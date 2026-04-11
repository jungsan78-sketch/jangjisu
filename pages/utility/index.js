import Head from 'next/head';

function OverwatchPreview() {
  return (
    <div className="flex items-center justify-center select-none">
      <div className="relative flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),rgba(14,18,26,0.05)_56%,transparent_74%)] shadow-[0_16px_34px_rgba(0,0,0,0.26)]">
        <svg viewBox="0 0 256 256" className="h-[98px] w-[98px] object-contain" aria-label="Overwatch logo">
          <path d="M55 152A92 92 0 0 1 35 128C35 76.6 76.6 35 128 35C179.4 35 221 76.6 221 128A92 92 0 0 1 201 152" fill="none" stroke="#2E3A49" strokeWidth="20" strokeLinecap="round" />
          <path d="M76 73A70 70 0 0 1 180 73" fill="none" stroke="#F36F14" strokeWidth="22" strokeLinecap="round" />
          <path d="M128 86L151 154L128 139L105 154L128 86Z" fill="#2E3A49" />
          <path d="M83 134L118 166H138L173 134" fill="none" stroke="#2E3A49" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="128" cy="174" r="5" fill="#2E3A49" opacity="0.85" />
        </svg>
      </div>
    </div>
  );
}

function SoopPreview() {
  return (
    <div className="flex items-center justify-center select-none">
      <svg viewBox="0 0 860 320" className="w-[290px] max-w-full object-contain" aria-label="SOOP logo">
        <path d="M153.8 250.4C92.2 250.4 51.5 222 41.8 173.7H110.2C117.1 192.2 132.4 201.5 152.8 201.5C172.1 201.5 183.7 193.6 183.7 179.8C183.7 164.9 169.3 158.4 138.5 151L111.5 144.7C62.7 133.3 35.7 108.8 35.7 66.9C35.7 15.6 78.2 -19.4 146.9 -19.4C210.9 -19.4 250.7 8 259.5 55.1H194.3C187.5 38 173.5 29.6 153.1 29.6C134.6 29.6 123.4 37.1 123.4 50C123.4 63.3 135.4 69.3 163.7 75.8L190.9 82C245.9 94.8 271.9 118.6 271.9 163.8C271.9 217.8 226.1 250.4 153.8 250.4Z" fill="#F5F7FA" transform="translate(0 36)" />
        <path d="M698.8 -11.9H778.7C827.2 -11.9 858 12.8 858 53.5C858 94.9 827.2 119.2 778.7 119.2H747.1V248.8H698.8V-11.9ZM773.9 79.3C796.4 79.3 808.5 69.6 808.5 53.5C808.5 37.3 796.4 27.7 773.9 27.7H747.1V79.3H773.9Z" fill="#F5F7FA" transform="translate(0 36)" />
        <path fillRule="evenodd" clipRule="evenodd" d="M330 116C330 52.5 381.5 1 445 1C470.2 1 492.4 9.1 510 22.9C527.6 9.1 549.8 1 575 1C638.5 1 690 52.5 690 116C690 179.5 638.5 231 575 231C549.8 231 527.6 222.9 510 209.1C492.4 222.9 470.2 231 445 231C381.5 231 330 179.5 330 116ZM445 51.5C409.4 51.5 380.5 80.4 380.5 116C380.5 151.6 409.4 180.5 445 180.5C480.6 180.5 509.5 151.6 509.5 116C509.5 80.4 480.6 51.5 445 51.5ZM575 51.5C539.4 51.5 510.5 80.4 510.5 116C510.5 151.6 539.4 180.5 575 180.5C610.6 180.5 639.5 151.6 639.5 116C639.5 80.4 610.6 51.5 575 51.5Z" fill="url(#soopGradient)" transform="translate(0 36)" />
        <rect x="437" y="126" width="146" height="52" rx="26" fill="url(#soopGradient)" />
        <defs>
          <linearGradient id="soopGradient" x1="331.5" y1="142" x2="690" y2="142" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1780FF" />
            <stop offset="1" stopColor="#19E2D8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function UtilityCard({
  href = '',
  title,
  description,
  label,
  eyebrow = '',
  accent = 'orange',
  preview = null,
  status = '',
  disabled = false,
}) {
  const theme = accent === 'soop'
    ? {
        border: disabled
          ? 'border-cyan-300/18'
          : 'hover:border-cyan-300/35 hover:shadow-[0_24px_50px_rgba(14,123,255,0.14)]',
        glow: 'bg-[radial-gradient(circle_at_top,rgba(14,123,255,0.26),transparent_22%),radial-gradient(circle_at_top_left,rgba(22,224,216,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]',
        top: 'bg-[linear-gradient(180deg,rgba(14,123,255,0.22),transparent)]',
        badge: 'border-cyan-300/24 bg-cyan-300/10 text-cyan-100',
      }
    : {
        border: disabled
          ? 'border-orange-300/18'
          : 'hover:border-orange-300/35 hover:shadow-[0_24px_50px_rgba(249,115,22,0.14)]',
        glow: 'bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.30),transparent_22%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]',
        top: 'bg-[linear-gradient(180deg,rgba(255,160,64,0.26),transparent)]',
        badge: 'border-orange-300/30 bg-orange-300/12 text-orange-100',
      };

  const baseClassName = `group relative block overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(30,34,43,0.98),rgba(10,12,18,0.98))] p-6 transition duration-300 ${disabled ? 'cursor-not-allowed opacity-92' : 'hover:-translate-y-1'} ${theme.border}`;

  const content = (
    <>
      <div className={`pointer-events-none absolute inset-0 ${theme.glow}`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 opacity-90 ${theme.top}`} />
      {preview ? (
        <div className="relative mx-auto flex h-[168px] max-w-[360px] items-center justify-center rounded-[28px] border border-white/10 bg-[#0b1017] px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_48%)]" />
          {preview}
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute left-1/2 top-7 h-28 w-28 -translate-x-1/2 rounded-full border border-white/15 bg-[radial-gradient(circle_at_top,rgba(255,181,104,0.55),rgba(20,20,25,0.2)_55%,transparent_68%)] shadow-[0_0_36px_rgba(251,146,60,0.22)]" />
          <div className="pointer-events-none absolute left-1/2 top-12 h-16 w-16 -translate-x-1/2 rounded-full border-[10px] border-white/80 border-t-[12px] border-t-orange-300 border-b-transparent bg-transparent opacity-90" />
        </>
      )}
      <div className={`relative text-center ${preview ? 'pt-8' : 'pt-44'}`}>
        {eyebrow ? <div className="text-xs font-bold tracking-[0.35em] text-white/55">{eyebrow}</div> : null}
        <div className={`${eyebrow ? 'mt-3' : 'mt-1'} text-[30px] font-black tracking-[0.08em] text-white sm:text-[38px]`}>{title}</div>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/62">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className={`inline-flex rounded-full border px-5 py-2 text-sm font-semibold transition ${theme.badge}`}>{label}</div>
          {status ? <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/65">{status}</div> : null}
        </div>
      </div>
    </>
  );

  if (disabled) {
    return (
      <div aria-disabled="true" className={baseClassName}>
        {content}
      </div>
    );
  }

  return (
    <a href={href} className={baseClassName}>
      {content}
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
              <a href="/utility" className="inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/15 px-4 py-2 text-sm font-medium text-[#b8d8ff] transition hover:bg-[#3b82f6]/22">유틸리티</a>
            </nav>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30 lg:p-9">
            <div className="text-xs font-bold tracking-[0.45em] text-white/38">UTILITY PAGE</div>
            <div className="mt-4 text-[36px] font-black tracking-tight text-white sm:text-[48px]">유틸리티</div>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-white/60">방송 중 바로 열어 쓸 수 있는 도구들을 모아두는 전용 페이지입니다. 원하는 툴을 선택하면 독립 페이지에서 실행됩니다.</p>
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <UtilityCard
              href="/utility/overwatch-random"
              title="오버워치 랜덤뽑기"
              description="팀 수 2~10팀, 5:5·6:6 전환, 포지션 등록, 팀장 순서 추첨, 드래그 이동까지 포함한 방송용 팀 편성 툴"
              label="실행하기"
              preview={<OverwatchPreview />}
            />

            <UtilityCard
              title="SOOP 펀딩 복사"
              description="현재 미완성"
              label="현재 미완성"
              status="미완성"
              accent="soop"
              disabled
              preview={<SoopPreview />}
            />
          </section>
        </main>
      </div>
    </>
  );
}

import Head from 'next/head';

function OverwatchPreview() {
  return (
    <div className="relative flex w-full items-center justify-center select-none">
      <div className="pointer-events-none absolute h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle,rgba(255,140,58,0.18),rgba(34,42,58,0.10)_42%,transparent_72%)] blur-[2px]" />
      <img
        src="/logos/overwatch.png"
        alt="오버워치"
        className="relative h-[96px] w-[96px] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.28)]"
      />
    </div>
  );
}

function SoopPreview() {
  return (
    <div className="relative flex w-full items-center justify-center select-none">
      <div className="pointer-events-none absolute h-[96px] w-[250px] rounded-full bg-[radial-gradient(circle,rgba(25,226,216,0.16),rgba(23,128,255,0.16)_38%,transparent_72%)] blur-[8px]" />
      <img
        src="/logos/SOOP.png"
        alt="SOOP"
        className="relative max-h-[82px] w-auto max-w-[260px] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,0.26)]"
      />
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
          : 'hover:border-cyan-300/45 hover:shadow-[0_28px_70px_rgba(14,123,255,0.20)]',
        glow: 'bg-[radial-gradient(circle_at_top,rgba(14,123,255,0.30),transparent_22%),radial-gradient(circle_at_top_left,rgba(22,224,216,0.20),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.012))]',
        top: 'bg-[linear-gradient(180deg,rgba(14,123,255,0.26),transparent)]',
        badge: 'border-cyan-300/30 bg-cyan-300/12 text-cyan-50',
      }
    : {
        border: disabled
          ? 'border-orange-300/18'
          : 'hover:border-orange-300/35 hover:shadow-[0_24px_50px_rgba(249,115,22,0.14)]',
        glow: 'bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.30),transparent_22%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]',
        top: 'bg-[linear-gradient(180deg,rgba(255,160,64,0.26),transparent)]',
        badge: 'border-orange-300/30 bg-orange-300/12 text-orange-100',
      };

  const baseClassName = `group relative block overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(30,34,43,0.98),rgba(10,12,18,0.98))] p-6 transition duration-300 ${disabled ? 'cursor-not-allowed opacity-92' : 'hover:-translate-y-1 active:scale-[0.985]'} ${theme.border}`;

  const content = (
    <>
      <div className={`pointer-events-none absolute inset-0 ${theme.glow}`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 opacity-90 ${theme.top}`} />
      {preview ? (
        <div className="relative mx-auto flex h-[168px] max-w-[360px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,24,0.98),rgba(7,11,18,0.98))] px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition duration-300 group-hover:scale-[1.015]">
          <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_48%)]" />
          {preview}
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute left-1/2 top-7 h-28 w-28 -translate-x-1/2 rounded-full border border-white/15 bg-[radial-gradient(circle_at_top,rgba(255,181,104,0.55),rgba(20,20,25,0.2)_55%,transparent_68%)] shadow-[0_0_36px_rgba(251,146,60,0.22)]" />
          <div className="pointer-events-none absolute left-1/2 top-12 h-16 w-16 -translate-x-1/2 rounded-full border-[10px] border-white/80 border-t-[12px] border-t-orange-300 border-b-transparent bg-transparent opacity-90" />
        </>
      )}
      <div className={`relative text-center ${preview ? 'pt-8' : 'pt-44'}`}>
        {eyebrow ? <div className="text-xs font-black tracking-[0.32em] text-white/58">{eyebrow}</div> : null}
        <div className={`${eyebrow ? 'mt-3' : 'mt-1'} text-[30px] font-black tracking-[0.04em] text-white sm:text-[38px]`}>{title}</div>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-white/62">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className={`inline-flex rounded-full border px-5 py-2 text-sm font-black transition ${theme.badge}`}>{label}</div>
          {status ? <div className="inline-flex rounded-full border border-emerald-200/20 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100/85">{status}</div> : null}
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
              href="/utility/soop-funding-memo"
              title="SOOP 펀딩 자동 메모장"
              description="스트리머 전용 SOOP 파트너 프로그램입니다. 별풍선 후원을 핀볼 복붙용 메모로 자동 변환하고, 후원자 순위까지 한 화면에서 관리합니다."
              label="스트리머 전용 열기"
              status="SOOP 파트너"
              accent="soop"
              preview={<SoopPreview />}
            />
          </section>
        </main>
      </div>
    </>
  );
}

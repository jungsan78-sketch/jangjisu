import Head from 'next/head';
import { PrisonPageChrome } from '../../components/prison/PrisonPageContent';

const TOOLS = [
  {
    href: '/utility/overwatch-random',
    eyebrow: 'OVERWATCH',
    title: '오버워치 랜덤뽑기',
    description: '5대5·6대6 포지션 기반 팀 편성',
    accent: 'from-sky-400/24 via-blue-400/10 to-orange-400/18',
    border: 'border-sky-300/20 hover:border-sky-200/42',
    badge: 'bg-sky-300/12 text-sky-100',
  },
  {
    href: '/utility/lol-random',
    eyebrow: 'LEAGUE OF LEGENDS',
    title: '롤 랜덤뽑기',
    description: '탑·정글·미드·원딜·서포터 5대5 팀 편성',
    accent: 'from-amber-400/24 via-yellow-400/8 to-cyan-400/18',
    border: 'border-amber-300/20 hover:border-amber-200/42',
    badge: 'bg-amber-300/12 text-amber-100',
  },
];

export default function UtilityIndexPage() {
  return (
    <>
      <Head>
        <title>유틸리티 | 장지수용소</title>
        <meta name="description" content="장지수용소 방송용 팀 편성 유틸리티" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrisonPageChrome wide>
        <section className="relative mx-auto w-full max-w-[1500px] overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -left-20 top-[-100px] h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 bottom-[-120px] h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-black tracking-[0.32em] text-teal-100/55">SOU UTILITY</p>
            <h1 className="mt-3 text-[34px] font-black tracking-[-0.045em] text-white sm:text-[46px]">유틸리티</h1>
            <p className="mt-3 text-sm font-bold leading-6 text-white/52 sm:text-base">사용할 랜덤 팀 편성 도구를 선택하세요.</p>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {TOOLS.map((tool) => (
                <a
                  key={tool.href}
                  href={tool.href}
                  className={`group relative min-h-[250px] overflow-hidden rounded-[28px] border bg-[#090f19] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:p-8 ${tool.border}`}
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition duration-300 group-hover:opacity-100 ${tool.accent}`} />
                  <div className="relative flex h-full flex-col justify-between gap-10">
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-black tracking-[0.16em] ${tool.badge}`}>{tool.eyebrow}</span>
                      <h2 className="mt-5 text-[28px] font-black tracking-[-0.035em] text-white sm:text-[34px]">{tool.title}</h2>
                      <p className="mt-3 text-sm font-bold leading-6 text-white/58 sm:text-base">{tool.description}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/10 pt-5 text-sm font-black text-white/82">
                      <span>선택하기</span>
                      <span className="text-xl transition duration-300 group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </PrisonPageChrome>
    </>
  );
}


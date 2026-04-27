import CalendarPreview from './CalendarPreview';
import RecentYoutubeSection from './RecentYoutubeSection';
import { PrisonMemberLiveGridContent } from '../PrisonMemberLiveGrid';

export default function PrisonPageContent() {
  return (
    <>
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        @keyframes youtubeTabIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.985); filter: blur(3px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-50px] h-56 w-56 rounded-full bg-slate-500/10 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute top-20 right-[-70px] h-64 w-64 rounded-full bg-amber-500/8 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute bottom-0 left-1/2 h-56 w-[18rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl sm:h-72 sm:w-[30rem]" />
      </div>

      <main className="relative mx-auto max-w-[1700px] px-4 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[26px] border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:rounded-[36px]" aria-label="장지수용소 대문">
          <div className="relative overflow-hidden">
            <img src="/jangjisu-prison-hero.png" alt="장지수용소" className="block h-auto w-full object-contain" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,12,0.18),transparent_16%,transparent_84%,rgba(5,7,12,0.18)),linear-gradient(180deg,rgba(0,0,0,0.015),transparent_52%,rgba(5,7,12,0.14))]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#05070c]/45 to-transparent sm:h-16" />
          </div>
        </section>

        <PrisonMemberLiveGridContent />
        <CalendarPreview />
        <RecentYoutubeSection />
      </main>
    </>
  );
}

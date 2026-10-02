import { useEffect, useState } from 'react';
import { isDepartureNoticeActive, PRISON_DEPARTURE_NOTICE } from '../../data/prisonDepartureNotice';

export default function PrisonDepartureNotice() {
  const [visible, setVisible] = useState(false);
  const notice = PRISON_DEPARTURE_NOTICE;

  useEffect(() => {
    let timer;
    const sync = () => {
      clearTimeout(timer);
      const now = Date.now();
      setVisible(isDepartureNoticeActive(notice, now));
      const next = now < Date.parse(notice.startsAt) ? Date.parse(notice.startsAt) : Date.parse(notice.expiresAt);
      if (next > now) timer = setTimeout(sync, Math.min(next - now, 2147483647));
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, [notice]);

  if (!visible) return null;
  return (
    <section data-sou-prison-prepaint-visible="true" aria-label={notice.heading} className="relative mb-6 overflow-hidden rounded-[28px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(196,181,253,0.16),transparent_65%),linear-gradient(145deg,#151629,#101725_55%,#111522)] px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(196,181,253,0.12),0_18px_56px_rgba(0,0,0,0.22)] sm:mb-8 sm:rounded-[34px] sm:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-200/30 to-transparent" />
      <h2 className="text-lg font-bold tracking-[0.12em] text-violet-100/80 sm:text-xl">{notice.heading}</h2>
      <div className="mx-auto mt-6 w-fit rounded-full bg-violet-200/[0.08] p-2 shadow-[0_0_45px_rgba(196,181,253,0.12)] sm:mt-8 sm:p-2.5">
        <img src={notice.image} alt={`${notice.nickname} 프로필`} className="h-28 w-28 rounded-full object-cover sm:h-36 sm:w-36" />
      </div>
      <p className="mt-7 text-[clamp(1.65rem,4.2vw,3.5rem)] font-black leading-tight tracking-[-0.045em] text-violet-50 sm:mt-9">{notice.message}</p>
    </section>
  );
}

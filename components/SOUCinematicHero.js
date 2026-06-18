import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function SOUCinematicHero() {
  const [host, setHost] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const mount = () => {
      if (cancelled) return;

      const main = document.querySelector('.jangjisu-left-nav-mode main');
      if (!main) {
        timer = window.setTimeout(mount, 80);
        return;
      }

      let portalHost = document.getElementById('sou-cinematic-hero-host');
      if (!portalHost) {
        portalHost = document.createElement('div');
        portalHost.id = 'sou-cinematic-hero-host';
        main.prepend(portalHost);
      }

      const originalHero = Array.from(main.children).find(
        (element) => element.tagName === 'SECTION' && element.querySelector('video')
      );
      if (originalHero) originalHero.style.display = 'none';

      setHost(portalHost);
    };

    mount();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setHost(null);
      document.getElementById('sou-cinematic-hero-host')?.remove();
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <section className="relative mb-8 overflow-hidden rounded-[34px] border border-white/[0.07] bg-[#02050a] shadow-[0_30px_100px_rgba(0,0,0,0.50),inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="relative aspect-video min-h-[280px] overflow-hidden bg-black sm:min-h-[420px] lg:min-h-[560px]">
        <video
          className="absolute inset-0 block h-full w-full object-cover"
          src="/sou-archive-cinematic.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={(event) => {
            event.currentTarget.muted = true;
            event.currentTarget.play().catch(() => {});
          }}
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.16)_68%,rgba(0,0,0,0.72)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.50)_0%,transparent_15%,transparent_81%,rgba(0,0,0,0.70)_100%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[12%] bg-gradient-to-l from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[5%] bg-black/55" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[5%] bg-black/65" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.055]" />

        <div className="absolute bottom-6 right-6 z-10 flex flex-wrap items-center justify-end gap-3 sm:bottom-8 sm:right-8">
          <a href="https://www.sooplive.com/station/iamquaddurup" target="_blank" rel="noreferrer" className="rounded-full border border-[#3b82f6]/35 bg-[#3b82f6]/15 px-4 py-2 text-sm font-semibold text-[#d5e8ff] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-[#60a5fa]/45 hover:bg-[#3b82f6]/24 hover:shadow-[0_0_24px_rgba(59,130,246,0.24)]">
            🔵 SOOP 방송국
          </a>
          <a href="https://www.youtube.com/@jisoujang" target="_blank" rel="noreferrer" className="rounded-full border border-[#ff4e45]/35 bg-[#ff4e45]/15 px-4 py-2 text-sm font-semibold text-[#ffd0cb] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-[#ff7d74]/45 hover:bg-[#ff4e45]/24 hover:shadow-[0_0_24px_rgba(255,78,69,0.24)]">
            ▶ YouTube
          </a>
        </div>
      </div>
    </section>,
    host
  );
}

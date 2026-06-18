import { useEffect } from 'react';

export default function SOUCinematicHero() {
  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    const mountHero = () => {
      if (cancelled) return;

      const main = document.querySelector('.jangjisu-left-nav-mode main');
      if (!main) {
        retryTimer = window.setTimeout(mountHero, 80);
        return;
      }

      const oldInjectedHero = document.getElementById('sou-cinematic-hero');
      if (oldInjectedHero) oldInjectedHero.remove();

      const originalHero = Array.from(main.querySelectorAll(':scope > section')).find((section) => section.querySelector('video'));
      if (originalHero) originalHero.style.display = 'none';

      const section = document.createElement('section');
      section.id = 'sou-cinematic-hero';
      section.className = 'relative mb-8 overflow-hidden rounded-[34px] border border-white/[0.07] bg-[#02050a] shadow-[0_30px_100px_rgba(0,0,0,0.50),inset_0_1px_0_rgba(255,255,255,0.025)]';

      section.innerHTML = `
        <div class="relative min-h-[460px] overflow-hidden lg:min-h-[560px]">
          <video class="absolute inset-0 h-full w-full object-cover" src="/sou-archive-cinematic.mp4" autoplay muted loop playsinline preload="auto"></video>
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.18)_70%,rgba(0,0,0,0.74)_100%)]"></div>
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.48)_0%,transparent_16%,transparent_80%,rgba(0,0,0,0.70)_100%)]"></div>
          <div class="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-black/60 to-transparent"></div>
          <div class="pointer-events-none absolute inset-y-0 right-0 w-[12%] bg-gradient-to-l from-black/60 to-transparent"></div>
          <div class="pointer-events-none absolute inset-x-0 top-0 h-[5%] bg-black/54"></div>
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[5%] bg-black/62"></div>
          <div class="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.055]"></div>
          <div class="absolute bottom-6 right-6 z-10 flex flex-wrap items-center justify-end gap-3 sm:bottom-8 sm:right-8">
            <a href="https://www.sooplive.com/station/iamquaddurup" target="_blank" rel="noreferrer" class="rounded-full border border-[#3b82f6]/35 bg-[#3b82f6]/15 px-4 py-2 text-sm font-semibold text-[#d5e8ff] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-[#60a5fa]/45 hover:bg-[#3b82f6]/24 hover:shadow-[0_0_24px_rgba(59,130,246,0.24)]">🔵 SOOP 방송국</a>
            <a href="https://www.youtube.com/@jisoujang" target="_blank" rel="noreferrer" class="rounded-full border border-[#ff4e45]/35 bg-[#ff4e45]/15 px-4 py-2 text-sm font-semibold text-[#ffd0cb] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] hover:border-[#ff7d74]/45 hover:bg-[#ff4e45]/24 hover:shadow-[0_0_24px_rgba(255,78,69,0.24)]">▶ YouTube</a>
          </div>
        </div>
      `;

      main.insertAdjacentElement('afterbegin', section);

      const video = section.querySelector('video');
      if (video) {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        const startPlayback = () => {
          const result = video.play();
          if (result && typeof result.catch === 'function') result.catch(() => {});
        };
        video.addEventListener('canplay', startPlayback, { once: true });
        startPlayback();
      }
    };

    mountHero();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      document.getElementById('sou-cinematic-hero')?.remove();
      const main = document.querySelector('.jangjisu-left-nav-mode main');
      const originalHero = Array.from(main?.querySelectorAll(':scope > section') || []).find((section) => section.querySelector('video'));
      if (originalHero) originalHero.style.display = '';
    };
  }, []);

  return null;
}

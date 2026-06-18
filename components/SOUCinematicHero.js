import { useEffect } from 'react';

export default function SOUCinematicHero() {
  useEffect(() => {
    const main = document.querySelector('.jangjisu-left-nav-mode main');
    if (!main || document.getElementById('sou-cinematic-hero')) return undefined;

    const section = document.createElement('section');
    section.id = 'sou-cinematic-hero';
    section.className = 'sou-cinematic-hero relative mb-8 overflow-hidden rounded-[34px] border border-white/[0.07] bg-[#02050a] p-1 shadow-[0_30px_100px_rgba(0,0,0,0.52)] sm:p-1.5';
    section.innerHTML = `<div class="relative aspect-video overflow-hidden rounded-[29px] bg-black"><video class="absolute inset-0 h-full w-full object-cover" src="/sou-archive-cinematic.mp4" autoplay muted loop playsinline preload="metadata"></video><div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.18)_70%,rgba(0,0,0,0.72)_100%)]"></div><div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.56)_0%,transparent_14%,transparent_82%,rgba(0,0,0,0.68)_100%)]"></div><div class="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-black/65 to-transparent"></div><div class="pointer-events-none absolute inset-y-0 right-0 w-[12%] bg-gradient-to-l from-black/65 to-transparent"></div><div class="pointer-events-none absolute inset-x-0 top-0 h-[5.5%] bg-black/60"></div><div class="pointer-events-none absolute inset-x-0 bottom-0 h-[5.5%] bg-black/68"></div><div class="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.055]"></div></div>`;
    main.insertAdjacentElement('afterbegin', section);

    return () => section.remove();
  }, []);

  return null;
}

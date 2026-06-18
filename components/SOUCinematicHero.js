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

      const existing = document.getElementById('sou-cinematic-hero');
      if (existing) existing.remove();

      const legacyHero = main.querySelector('section');
      if (legacyHero) legacyHero.remove();

      const section = document.createElement('section');
      section.id = 'sou-cinematic-hero';
      section.style.position = 'relative';
      section.style.marginBottom = '2rem';
      section.style.overflow = 'hidden';
      section.style.borderRadius = '34px';
      section.style.border = '1px solid rgba(255,255,255,0.07)';
      section.style.background = '#02050a';
      section.style.padding = '4px';
      section.style.boxShadow = '0 30px 100px rgba(0,0,0,0.52)';

      const frame = document.createElement('div');
      frame.style.position = 'relative';
      frame.style.aspectRatio = '16 / 9';
      frame.style.overflow = 'hidden';
      frame.style.borderRadius = '29px';
      frame.style.background = '#000';

      const video = document.createElement('video');
      video.src = '/sou-archive-cinematic.mp4';
      video.autoplay = true;
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.style.position = 'absolute';
      video.style.inset = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.display = 'block';

      const vignette = document.createElement('div');
      vignette.style.position = 'absolute';
      vignette.style.inset = '0';
      vignette.style.pointerEvents = 'none';
      vignette.style.background = 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.16) 68%, rgba(0,0,0,0.74) 100%), linear-gradient(180deg, rgba(0,0,0,0.58) 0%, transparent 14%, transparent 82%, rgba(0,0,0,0.72) 100%)';

      const topBar = document.createElement('div');
      topBar.style.position = 'absolute';
      topBar.style.inset = '0 0 auto 0';
      topBar.style.height = '5.5%';
      topBar.style.background = 'rgba(0,0,0,0.58)';
      topBar.style.pointerEvents = 'none';

      const bottomBar = document.createElement('div');
      bottomBar.style.position = 'absolute';
      bottomBar.style.inset = 'auto 0 0 0';
      bottomBar.style.height = '5.5%';
      bottomBar.style.background = 'rgba(0,0,0,0.66)';
      bottomBar.style.pointerEvents = 'none';

      frame.appendChild(video);
      frame.appendChild(vignette);
      frame.appendChild(topBar);
      frame.appendChild(bottomBar);
      section.appendChild(frame);
      main.insertAdjacentElement('afterbegin', section);

      const startPlayback = () => {
        const result = video.play();
        if (result && typeof result.catch === 'function') result.catch(() => {});
      };
      video.addEventListener('canplay', startPlayback, { once: true });
      startPlayback();
    };

    mountHero();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      document.getElementById('sou-cinematic-hero')?.remove();
    };
  }, []);

  return null;
}

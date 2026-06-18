import { useEffect } from 'react';

export default function SOUCinematicHero() {
  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    const applyHero = () => {
      if (cancelled) return;

      const main = document.querySelector('.jangjisu-left-nav-mode main');
      if (!main) {
        retryTimer = window.setTimeout(applyHero, 80);
        return;
      }

      document.getElementById('sou-cinematic-hero')?.remove();

      const heroSection = Array.from(main.children).find((element) => element.tagName === 'SECTION' && element.querySelector('video'));
      const heroVideo = heroSection?.querySelector('video');

      if (!heroSection || !heroVideo) {
        retryTimer = window.setTimeout(applyHero, 80);
        return;
      }

      heroSection.style.display = '';
      heroSection.style.visibility = 'visible';
      heroSection.style.opacity = '1';
      heroSection.style.borderColor = 'rgba(255,255,255,0.07)';
      heroSection.style.boxShadow = '0 30px 100px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.025)';

      const heroFrame = heroVideo.parentElement;
      if (heroFrame) {
        heroFrame.style.minHeight = '';
        heroFrame.style.aspectRatio = '16 / 9';
      }

      heroVideo.src = '/sou-archive-cinematic.mp4';
      heroVideo.autoplay = true;
      heroVideo.muted = true;
      heroVideo.defaultMuted = true;
      heroVideo.loop = true;
      heroVideo.playsInline = true;
      heroVideo.preload = 'auto';
      heroVideo.setAttribute('muted', '');
      heroVideo.setAttribute('playsinline', '');
      heroVideo.style.animation = 'none';
      heroVideo.style.opacity = '1';
      heroVideo.style.objectFit = 'cover';
      heroVideo.style.display = 'block';

      const souTitle = Array.from(heroSection.querySelectorAll('div')).find((node) => node.children.length === 0 && node.textContent?.trim() === 'SOU');
      if (souTitle) souTitle.style.display = 'none';

      if (!heroSection.querySelector('.sou-cinematic-vignette')) {
        const vignette = document.createElement('div');
        vignette.className = 'sou-cinematic-vignette';
        vignette.style.position = 'absolute';
        vignette.style.inset = '0';
        vignette.style.pointerEvents = 'none';
        vignette.style.zIndex = '5';
        vignette.style.background = 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,0.16) 70%, rgba(0,0,0,0.68) 100%), linear-gradient(180deg, rgba(0,0,0,0.42) 0%, transparent 15%, transparent 82%, rgba(0,0,0,0.66) 100%)';
        heroFrame?.appendChild(vignette);
      }

      const startPlayback = () => {
        const result = heroVideo.play();
        if (result && typeof result.catch === 'function') result.catch(() => {});
      };

      heroVideo.addEventListener('canplay', startPlayback, { once: true });
      heroVideo.load();
      startPlayback();
    };

    applyHero();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, []);

  return null;
}

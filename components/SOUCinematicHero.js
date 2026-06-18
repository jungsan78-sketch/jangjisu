import { useEffect } from 'react';

export default function SOUCinematicHero() {
  useEffect(() => {
    let cancelled = false;
    let retryTimer;

    const applyCinematicVideo = () => {
      if (cancelled) return;

      const main = document.querySelector('.jangjisu-left-nav-mode main');
      if (!main) {
        retryTimer = window.setTimeout(applyCinematicVideo, 80);
        return;
      }

      document.getElementById('sou-cinematic-hero')?.remove();

      const heroSection = main.querySelector('section');
      const heroVideo = heroSection?.querySelector('video');
      if (!heroSection || !heroVideo) {
        retryTimer = window.setTimeout(applyCinematicVideo, 80);
        return;
      }

      heroSection.classList.add('sou-cinematic-original-hero');
      heroSection.style.borderColor = 'rgba(255,255,255,0.07)';
      heroSection.style.boxShadow = '0 30px 100px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.025)';

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

      const souTitle = Array.from(heroSection.querySelectorAll('div')).find((node) => node.textContent?.trim() === 'SOU');
      if (souTitle) souTitle.style.display = 'none';

      const playVideo = () => {
        const result = heroVideo.play();
        if (result && typeof result.catch === 'function') result.catch(() => {});
      };

      heroVideo.addEventListener('canplay', playVideo, { once: true });
      heroVideo.load();
      playVideo();
    };

    applyCinematicVideo();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, []);

  return null;
}

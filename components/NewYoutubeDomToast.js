import { useEffect, useMemo, useState } from 'react';

const STORAGE_PREFIX = 'sou-youtube-dom-toast:';

function detectNewYoutubeTabs() {
  if (typeof document === 'undefined') return null;
  const sections = [...document.querySelectorAll('section')].filter((section) => {
    const title = section.textContent || '';
    return title.includes('YOUTUBE') || section.id === 'youtube' || section.id === 'recent-youtube';
  });

  const source = sections[sections.length - 1];
  if (!source) return null;

  const buttons = [...source.querySelectorAll('button')];
  const hasVideoNew = buttons.some((button) => {
    const text = button.textContent || '';
    return text.includes('영상') && !text.includes('풀영상') && text.toLowerCase().includes('new');
  });
  const hasShortsNew = buttons.some((button) => {
    const text = button.textContent || '';
    return text.includes('쇼츠') && text.toLowerCase().includes('new');
  });

  if (!hasVideoNew && !hasShortsNew) return null;
  const message = hasVideoNew && hasShortsNew
    ? '새로운 편집 영상과 쇼츠가 업로드되었습니다'
    : hasShortsNew
      ? '새로운 쇼츠가 업로드되었습니다'
      : '새로운 편집 영상이 업로드되었습니다';
  const scope = window.location.pathname.includes('jangjisu-prison') ? 'prison' : 'main';
  return { message, scope, hash: `${scope}:${hasVideoNew ? 'video' : ''}:${hasShortsNew ? 'shorts' : ''}:${new Date().toISOString().slice(0, 10)}` };
}

export default function NewYoutubeDomToast() {
  const [notice, setNotice] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let closed = false;
    let timer = null;
    let observer = null;

    const tryShow = () => {
      if (closed) return;
      const detected = detectNewYoutubeTabs();
      if (!detected) return;
      const storageKey = `${STORAGE_PREFIX}${detected.hash}`;
      try {
        if (window.localStorage.getItem(storageKey)) return;
        window.localStorage.setItem(storageKey, '1');
      } catch {}
      setNotice(detected);
      setVisible(true);
      timer = window.setTimeout(() => setVisible(false), 3800);
      closed = true;
      if (observer) observer.disconnect();
    };

    const delays = [400, 1200, 2500, 5000];
    const timeouts = delays.map((delay) => window.setTimeout(tryShow, delay));
    observer = new MutationObserver(tryShow);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      closed = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      if (timer) window.clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, []);

  const targetId = useMemo(() => (notice?.scope === 'prison' ? 'recent-youtube' : 'youtube'), [notice]);
  if (!visible || !notice) return null;

  const scrollToYoutube = () => {
    const target = document.getElementById(targetId) || document.querySelector('#youtube, #recent-youtube');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setVisible(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[92px] z-[130] flex justify-center px-4">
      <div className="relative pointer-events-auto max-w-[92vw] overflow-hidden rounded-[26px] border border-red-200/20 bg-[linear-gradient(180deg,rgba(18,23,35,0.95),rgba(8,10,16,0.97))] px-6 py-5 text-center shadow-[0_24px_70px_rgba(0,0,0,0.50),0_0_34px_rgba(239,68,68,0.14)] backdrop-blur-xl animate-[newYoutubeToastIn_360ms_ease-out]">
        <div className="absolute -left-7 -top-7 h-24 w-24 rounded-full bg-red-500/22 blur-2xl" />
        <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-amber-300/14 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-red-200/80 animate-[youtubeSpark_1500ms_ease-out_infinite]" style={{ left: `${14 + i * 11}%`, top: `${18 + (i % 3) * 18}%`, animationDelay: `${i * 115}ms` }} />
          ))}
        </div>
        <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200/20 bg-red-500/16 text-xl shadow-[0_0_24px_rgba(239,68,68,0.18)]">🎉</div>
          <div>
            <div className="text-base font-black text-white sm:text-lg">{notice.message}</div>
            <button onClick={scrollToYoutube} className="mt-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/[0.12] hover:text-white">YOUTUBE 탭에서 확인하기</button>
          </div>
          <button onClick={() => setVisible(false)} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/30 text-xs font-black text-white/55 transition hover:text-white" aria-label="닫기">×</button>
        </div>
      </div>
    </div>
  );
}

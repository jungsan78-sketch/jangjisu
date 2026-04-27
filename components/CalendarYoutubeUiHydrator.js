import { useEffect } from 'react';

const STYLE_ID = 'sou-youtube-ui-style';
const YOUTUBE_LIMIT_HIDDEN_CLASS = 'sou-youtube-limit-hidden';
const YOUTUBE_DONE_ATTR = 'data-sou-youtube-carousel-ready';
const YOUTUBE_LIMIT = 10;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body:has(section[aria-label="장지수용소 대문"]) #schedule {
      border-color: rgba(255,255,255,.055) !important;
      box-shadow: 0 24px 70px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.035) !important;
    }

    body:has(section[aria-label="장지수용소 대문"]) #schedule > div {
      border-color: rgba(148,163,184,.13) !important;
      box-shadow: 0 22px 58px rgba(0,0,0,.32), 0 0 34px rgba(30,64,175,.06), inset 0 1px 0 rgba(255,255,255,.045) !important;
    }

    body:has(section[aria-label="장지수용소 대문"]) #schedule > div > div:nth-child(2),
    body:has(section[aria-label="장지수용소 대문"]) #schedule > div > div:nth-child(3) {
      border-color: rgba(255,255,255,.045) !important;
      background: linear-gradient(180deg, rgba(5,16,29,.82), rgba(3,10,20,.74)) !important;
      box-shadow: 0 18px 42px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.035), inset 0 0 0 1px rgba(148,163,184,.025) !important;
    }

    body:has(section[aria-label="장지수용소 대문"]) #schedule .sou-hidden-schedule-nav,
    body:has(section[aria-label="장지수용소 대문"]) .sou-legacy-member-posts-hidden {
      display: none !important;
    }

    #youtube.sou-youtube-compact,
    #recent-youtube.sou-youtube-compact {
      padding-top: 22px !important;
      padding-bottom: 22px !important;
    }

    #youtube.sou-youtube-compact .sou-youtube-panel-shell,
    #recent-youtube.sou-youtube-compact .sou-youtube-panel-shell {
      position: relative;
    }

    #youtube.sou-youtube-compact .sou-youtube-carousel,
    #recent-youtube.sou-youtube-compact .sou-youtube-carousel {
      display: grid !important;
      grid-auto-flow: column !important;
      grid-auto-columns: minmax(250px, 31%) !important;
      grid-template-columns: none !important;
      gap: 16px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      scroll-behavior: smooth !important;
      scroll-snap-type: x proximity !important;
      padding-left: 4px !important;
      padding-right: 58px !important;
      padding-bottom: 6px !important;
      scrollbar-width: none;
    }

    #youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel,
    #recent-youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel {
      grid-auto-columns: minmax(170px, 18%) !important;
      gap: 18px !important;
    }

    #youtube.sou-youtube-compact .sou-youtube-carousel::-webkit-scrollbar,
    #recent-youtube.sou-youtube-compact .sou-youtube-carousel::-webkit-scrollbar { display: none; }

    #youtube.sou-youtube-compact .sou-youtube-carousel > *,
    #recent-youtube.sou-youtube-compact .sou-youtube-carousel > * {
      scroll-snap-align: start;
      min-width: 0;
    }

    #youtube.sou-youtube-compact .sou-youtube-carousel > * > div:first-child,
    #recent-youtube.sou-youtube-compact .sou-youtube-carousel > * > div:first-child {
      max-height: 176px;
    }

    #youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel > * {
      border-radius: 24px !important;
    }

    #youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel > * > div:first-child,
    #recent-youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel > * > div:first-child {
      aspect-ratio: 9 / 16 !important;
      max-height: none !important;
      min-height: 260px !important;
    }

    #youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel > * > div:first-child img,
    #recent-youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel > * > div:first-child img {
      height: 100% !important;
      width: 100% !important;
      object-fit: cover !important;
      object-position: center center !important;
    }

    #youtube.sou-youtube-compact .sou-youtube-carousel > * h4,
    #recent-youtube.sou-youtube-compact .sou-youtube-carousel > * h4 {
      min-height: 42px !important;
      font-size: 14px !important;
      line-height: 1.45 !important;
    }

    #youtube.sou-youtube-compact .sou-youtube-carousel > * > div:last-child,
    #recent-youtube.sou-youtube-compact .sou-youtube-carousel > * > div:last-child {
      padding: 13px !important;
    }

    #youtube.sou-youtube-compact .${YOUTUBE_LIMIT_HIDDEN_CLASS},
    #recent-youtube.sou-youtube-compact .${YOUTUBE_LIMIT_HIDDEN_CLASS} {
      display: none !important;
    }

    .sou-youtube-nav-button {
      position: absolute;
      top: 50%;
      z-index: 8;
      display: inline-flex;
      height: 46px;
      width: 46px;
      transform: translateY(-50%);
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(5,7,12,.82);
      color: white;
      font-size: 24px;
      font-weight: 950;
      line-height: 1;
      box-shadow: 0 14px 36px rgba(0,0,0,.38), 0 0 22px rgba(239,68,68,.14);
      backdrop-filter: blur(12px);
      transition: transform .18s ease, background .18s ease, border-color .18s ease, opacity .18s ease;
    }

    .sou-youtube-prev-button { left: 6px; }
    .sou-youtube-next-button { right: 6px; }

    .sou-youtube-nav-button:hover {
      transform: translateY(-50%) scale(1.06);
      border-color: rgba(248,113,113,.45);
      background: rgba(127,29,29,.72);
    }

    .sou-youtube-nav-button:disabled {
      opacity: .28;
      pointer-events: none;
    }

    @media (max-width: 900px) {
      #youtube.sou-youtube-compact .sou-youtube-carousel,
      #recent-youtube.sou-youtube-compact .sou-youtube-carousel {
        grid-auto-columns: minmax(220px, 44%) !important;
      }
      #youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel,
      #recent-youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel {
        grid-auto-columns: minmax(160px, 31%) !important;
      }
    }

    @media (max-width: 640px) {
      #youtube.sou-youtube-compact .sou-youtube-carousel,
      #recent-youtube.sou-youtube-compact .sou-youtube-carousel {
        grid-auto-columns: minmax(210px, 82%) !important;
      }
      #youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel,
      #recent-youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel {
        grid-auto-columns: minmax(152px, 58%) !important;
      }
      #youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel > * > div:first-child,
      #recent-youtube.sou-youtube-compact.sou-youtube-shorts-mode .sou-youtube-carousel > * > div:first-child {
        min-height: 240px !important;
      }
      .sou-youtube-nav-button {
        height: 42px;
        width: 42px;
      }
      .sou-youtube-prev-button { left: 2px; }
      .sou-youtube-next-button { right: 2px; }
    }
  `;
  document.head.appendChild(style);
}

function isElement(value) {
  return value instanceof HTMLElement;
}

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function findYoutubeGrid(section) {
  const candidates = [...section.querySelectorAll('div')].filter((element) => {
    const children = [...element.children].filter(isElement);
    if (children.length < 2) return false;
    const linkCards = children.filter((child) => child.tagName === 'A' || child.querySelector('a[href*="youtu"]'));
    if (linkCards.length < 2) return false;
    const className = String(element.className || '');
    return /grid|gap-|cols|sou-youtube-carousel/i.test(className) || window.getComputedStyle(element).display === 'grid';
  });
  return candidates.sort((a, b) => b.children.length - a.children.length)[0] || null;
}

function getActiveYoutubeTab(section) {
  const buttons = [...section.querySelectorAll('button')];
  const activeButton = buttons.find((button) => {
    const className = String(button.className || '');
    return /bg-red-500\/20|border-red-400\/40|shadow-\[0_0_15px_rgba\(255,0,0,0\.4\)\]/.test(className);
  });
  return normalizeText(activeButton?.textContent || '');
}

function isShortsSection(section) {
  return getActiveYoutubeTab(section).includes('쇼츠');
}

function limitYoutubeCards(grid) {
  const cards = [...grid.children].filter(isElement);
  cards.forEach((card, index) => {
    if (index >= YOUTUBE_LIMIT) card.classList.add(YOUTUBE_LIMIT_HIDDEN_CLASS);
    else card.classList.remove(YOUTUBE_LIMIT_HIDDEN_CLASS);
  });
}

function updateNavState(grid, prevButton, nextButton) {
  const canScroll = grid.scrollWidth > grid.clientWidth + 10;
  const atStart = grid.scrollLeft <= 8;
  const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 12;
  prevButton.disabled = !canScroll || atStart;
  nextButton.disabled = !canScroll || atEnd;
}

function compactYoutubeSection(section) {
  const grid = findYoutubeGrid(section);
  if (!grid) return;

  section.classList.add('sou-youtube-compact');
  section.classList.toggle('sou-youtube-shorts-mode', isShortsSection(section));
  grid.classList.add('sou-youtube-carousel');
  limitYoutubeCards(grid);

  const shell = grid.parentElement;
  if (!shell || !isElement(shell)) return;
  shell.classList.add('sou-youtube-panel-shell');

  let prevButton = shell.querySelector(':scope > .sou-youtube-prev-button');
  let nextButton = shell.querySelector(':scope > .sou-youtube-next-button');

  if (!prevButton) {
    prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'sou-youtube-nav-button sou-youtube-prev-button';
    prevButton.setAttribute('aria-label', '이전 유튜브 영상 보기');
    prevButton.textContent = '‹';
    shell.appendChild(prevButton);
  }

  if (!nextButton) {
    nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'sou-youtube-nav-button sou-youtube-next-button';
    nextButton.setAttribute('aria-label', '다음 유튜브 영상 보기');
    nextButton.textContent = '›';
    shell.appendChild(nextButton);
  }

  if (grid.getAttribute(YOUTUBE_DONE_ATTR) !== 'true') {
    prevButton.addEventListener('click', () => {
      const amount = Math.max(260, Math.floor(grid.clientWidth * 0.85));
      grid.scrollTo({ left: Math.max(0, grid.scrollLeft - amount), behavior: 'smooth' });
      window.setTimeout(() => updateNavState(grid, prevButton, nextButton), 240);
    });
    nextButton.addEventListener('click', () => {
      const amount = Math.max(260, Math.floor(grid.clientWidth * 0.85));
      grid.scrollTo({ left: grid.scrollLeft + amount, behavior: 'smooth' });
      window.setTimeout(() => updateNavState(grid, prevButton, nextButton), 240);
    });
    grid.addEventListener('scroll', () => updateNavState(grid, prevButton, nextButton), { passive: true });
    grid.setAttribute(YOUTUBE_DONE_ATTR, 'true');
  }

  updateNavState(grid, prevButton, nextButton);
}

function compactYoutubeSections() {
  ['youtube', 'recent-youtube'].forEach((id) => {
    const section = document.getElementById(id);
    if (section) compactYoutubeSection(section);
  });
}

function hideScheduleDateNavButtons() {
  const schedule = document.getElementById('schedule');
  if (!schedule) return;

  [...schedule.querySelectorAll('button, a')].forEach((element) => {
    const label = normalizeText(`${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`);
    if (/이전\s*날짜|다음\s*날짜/.test(label)) {
      element.classList.add('sou-hidden-schedule-nav');
      element.setAttribute('aria-hidden', 'true');
      if ('tabIndex' in element) element.tabIndex = -1;
    }
  });
}

function hideLegacyMemberPostsSections() {
  const legacyTextPattern = /최근\s*1\s*주일\s*멤버\s*글|최근\s*일주일\s*멤버\s*글|최근\s*1\s*주일|멤버\s*글/i;
  const legacyAttrPattern = /recent.*member.*post|member.*recent.*post|weekly.*member.*post|member.*weekly.*post|member-board|member-post/i;
  const roots = [...document.querySelectorAll('main section, main article, main > div, [data-section], [id], [class]')].filter(isElement);

  roots.forEach((element) => {
    if (element.id === 'schedule' || element.id === 'recent-youtube' || element.id === 'youtube' || element.id === 'members') return;
    if (element.closest('#schedule, #recent-youtube, #youtube, #members')) return;

    const marker = `${element.id || ''} ${element.getAttribute('data-section') || ''} ${element.className || ''}`;
    const text = normalizeText(element.textContent || '').slice(0, 180);
    if (legacyAttrPattern.test(marker) || legacyTextPattern.test(text)) {
      element.classList.add('sou-legacy-member-posts-hidden');
      element.setAttribute('aria-hidden', 'true');
    }
  });
}

function hydrateUi() {
  injectStyle();
  compactYoutubeSections();
  hideScheduleDateNavButtons();
  hideLegacyMemberPostsSections();
}

export default function CalendarYoutubeUiHydrator() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let disposed = false;

    const run = () => {
      if (!disposed) hydrateUi();
    };

    run();
    [120, 350, 800, 1500, 2600].forEach((delay) => window.setTimeout(run, delay));

    const interval = window.setInterval(run, 1200);
    const clickHandler = (event) => {
      if (event.target?.closest?.('#schedule, #youtube, #recent-youtube')) {
        [0, 120, 360].forEach((delay) => window.setTimeout(run, delay));
      }
    };
    const youtubeLoadedHandler = () => window.setTimeout(run, 80);

    document.addEventListener('click', clickHandler, true);
    window.addEventListener('sou-youtube-loaded', youtubeLoadedHandler);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener('click', clickHandler, true);
      window.removeEventListener('sou-youtube-loaded', youtubeLoadedHandler);
    };
  }, []);

  return null;
}

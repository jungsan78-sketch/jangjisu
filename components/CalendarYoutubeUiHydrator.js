import { useEffect } from 'react';

const STYLE_ID = 'sou-calendar-youtube-ui-style';
const DAY_RANGE_HIDDEN_CLASS = 'sou-calendar-compact-hidden';
const YOUTUBE_LIMIT_HIDDEN_CLASS = 'sou-youtube-limit-hidden';
const YOUTUBE_DONE_ATTR = 'data-sou-youtube-carousel-ready';
const YOUTUBE_LIMIT = 10;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #schedule .${DAY_RANGE_HIDDEN_CLASS} { display: none !important; }
    #schedule [data-sou-compact-day-row="true"] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    #schedule [data-sou-compact-day-row="true"] > * { min-width: 0 !important; }

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
      #schedule [data-sou-compact-day-row="true"] { grid-template-columns: 1fr !important; }
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

function isWholeScheduleView(schedule) {
  return [...schedule.querySelectorAll('button')].some((button) => {
    const text = normalizeText(button.textContent).replace(/\s/g, '');
    const className = String(button.className || '');
    const selected = /border-amber|bg-amber|text-white|active|selected/i.test(className) || button.getAttribute('aria-pressed') === 'true';
    return text.includes('전체보기') && selected;
  });
}

function isDayCard(element) {
  const text = normalizeText(element.textContent || '');
  const rect = element.getBoundingClientRect();
  if (rect.width < 70 || rect.height < 90) return false;
  if (element.querySelector('button')) return false;
  if (!/(^|\s)(TODAY|\d{1,2}일|\d{1,2}\s*일|[월화수목금토일])/.test(text)) return false;
  return /rounded|border|bg-|shadow|min-h|overflow/i.test(String(element.className || ''));
}

function resetScheduleCompact(schedule) {
  schedule.querySelectorAll(`.${DAY_RANGE_HIDDEN_CLASS}`).forEach((element) => element.classList.remove(DAY_RANGE_HIDDEN_CLASS));
  schedule.querySelectorAll('[data-sou-compact-day-row="true"]').forEach((element) => {
    element.removeAttribute('data-sou-compact-day-row');
    element.style.gridTemplateColumns = '';
  });
}

function compactScheduleRange() {
  const schedule = document.getElementById('schedule');
  if (!schedule) return;
  resetScheduleCompact(schedule);
  if (!isWholeScheduleView(schedule)) return;

  const groups = [...schedule.querySelectorAll('div')].filter((group) => {
    const children = [...group.children].filter(isElement);
    if (children.length !== 5) return false;
    if (!children.every(isDayCard)) return false;
    const groupRect = group.getBoundingClientRect();
    if (groupRect.width < 420) return false;
    return /grid|flex/i.test(String(group.className || '')) || window.getComputedStyle(group).display === 'grid';
  });

  groups.forEach((group) => {
    const children = [...group.children].filter(isElement);
    children[0].classList.add(DAY_RANGE_HIDDEN_CLASS);
    children[4].classList.add(DAY_RANGE_HIDDEN_CLASS);
    group.setAttribute('data-sou-compact-day-row', 'true');
    group.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  });
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

function isShortsSection(section) {
  const selectedButton = [...section.querySelectorAll('button')].find((button) => {
    const className = String(button.className || '');
    return /red-500|red-400|shadow|active|selected/i.test(className);
  });
  const selectedText = normalizeText(selectedButton?.textContent || '');
  const headingText = normalizeText(section.querySelector('h3, h4, [class*="text-"]')?.textContent || '');
  const sectionText = normalizeText(section.textContent || '').slice(0, 160);
  return selectedText.includes('쇼츠') || headingText.includes('쇼츠') || sectionText.includes('쇼츠');
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

  let shell = grid.parentElement;
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

function hydrateUi() {
  injectStyle();
  compactScheduleRange();
  compactYoutubeSections();
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

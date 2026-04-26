import { useEffect, useLayoutEffect } from 'react';

const STYLE_ID = 'sou-member-live-grid-style';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function injectStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
    main { width: 100% !important; }
    #notice, a[href="#notice"] { display: none !important; }
    #schedule button { transform: none !important; min-height: 40px; min-width: 96px; position: relative; z-index: 2; }
    #schedule button:hover { transform: none !important; }
    #schedule .grid.grid-cols-7.gap-3 { animation: none !important; }
    #schedule .grid.grid-cols-7.gap-3 > div {
      transform: none !important;
      transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
    }
    #schedule .grid.grid-cols-7.gap-3 > div:hover { transform: none !important; }
    #schedule .grid.grid-cols-7.gap-3 > div > .pointer-events-none { display: none !important; }
    #schedule .sou-schedule-range-hidden { display: none !important; }
    #schedule [data-sou-schedule-compact-row="true"] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    #members.sou-member-live-section {
      margin-top: 30px !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    .sou-member-live-paused {
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 28px;
      background: radial-gradient(circle at top left, rgba(34,211,238,.12), transparent 34%), linear-gradient(180deg, rgba(17,24,39,.76), rgba(5,9,16,.97));
      padding: 28px;
      box-shadow: 0 18px 44px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04);
      color: #fff;
      min-height: 230px;
    }
    .sou-member-live-paused-eyebrow {
      color: rgba(125,211,252,.78);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: .24em;
      text-transform: uppercase;
    }
    .sou-member-live-paused-title {
      margin-top: 10px;
      font-size: clamp(24px, 3vw, 38px);
      font-weight: 950;
      letter-spacing: -.04em;
    }
    .sou-member-live-paused-desc {
      margin-top: 10px;
      max-width: 720px;
      color: rgba(255,255,255,.62);
      font-size: 14px;
      font-weight: 800;
      line-height: 1.8;
    }
    .sou-member-live-paused-list {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .sou-member-live-paused-item {
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 18px;
      background: rgba(255,255,255,.045);
      padding: 13px 14px;
      color: rgba(255,255,255,.72);
      font-size: 13px;
      font-weight: 900;
    }
    @media (max-width: 760px) {
      .sou-member-live-paused-list { grid-template-columns: 1fr; }
    }
  `;
}

function hideNotice() {
  document.getElementById('notice')?.style.setProperty('display', 'none', 'important');
  document.querySelectorAll('a[href="#notice"]').forEach((anchor) => anchor.style.setProperty('display', 'none', 'important'));
}

function getSelectedScheduleText(schedule) {
  const selected = [...schedule.querySelectorAll('button')].find((button) => {
    const className = String(button.className || '');
    return /border-amber|bg-amber|text-white|active|selected/.test(className) || button.getAttribute('aria-pressed') === 'true';
  });
  return String(selected?.textContent || '').replace(/\s+/g, '').trim();
}

function isWholeViewSelected(schedule) {
  return getSelectedScheduleText(schedule) === '전체보기';
}

function hideSchedulePagingButtons(schedule) {
  schedule.querySelectorAll('button').forEach((button) => {
    const text = String(button.textContent || '').replace(/\s+/g, '').trim();
    if (/^(이전|다음)(날짜|일정)?$/.test(text) || text.includes('이전날짜') || text.includes('다음날짜')) {
      button.style.setProperty('display', 'none', 'important');
    }
  });
}

function getDayNumber(element) {
  const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
  const first = text.match(/^(\d{1,2})(?:\s*일)?(?:\s|$)/);
  if (first) return Number(first[1]);
  const labeled = text.match(/(\d{1,2})\s*일/);
  return labeled ? Number(labeled[1]) : null;
}

function compactScheduleRange() {
  const schedule = document.getElementById('schedule');
  if (!schedule) return;
  hideSchedulePagingButtons(schedule);
  schedule.querySelectorAll('.sou-schedule-range-hidden').forEach((element) => element.classList.remove('sou-schedule-range-hidden'));
  schedule.querySelectorAll('[data-sou-schedule-compact-row="true"]').forEach((element) => {
    element.style.gridTemplateColumns = '';
    element.removeAttribute('data-sou-schedule-compact-row');
  });
  if (!isWholeViewSelected(schedule)) return;

  const today = new Date();
  const startDay = today.getDate();
  const endDay = startDay + 2;
  const cards = [...schedule.querySelectorAll('div')].filter((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 70 || rect.height < 90 || element.querySelector('button')) return false;
    const day = getDayNumber(element);
    return Number.isInteger(day) && ![...schedule.querySelectorAll('div')].some((other) => other !== element && other.contains(element) && Number.isInteger(getDayNumber(other)));
  });

  const targetCards = cards.filter((card) => {
    const day = getDayNumber(card);
    return day >= startDay && day <= endDay;
  });

  if (targetCards.length >= 1) {
    cards.forEach((card) => {
      const day = getDayNumber(card);
      if (day < startDay || day > endDay) card.classList.add('sou-schedule-range-hidden');
    });
    const parent = targetCards[0].parentElement;
    if (parent && targetCards.every((card) => card.parentElement === parent)) {
      parent.setAttribute('data-sou-schedule-compact-row', 'true');
      parent.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
    }
  }
}

function stabilizeSchedule() {
  const schedule = document.getElementById('schedule');
  if (!schedule) return;
  schedule.querySelectorAll('button').forEach((button) => {
    button.style.transform = 'none';
    button.style.minHeight = '40px';
    button.style.minWidth = button.textContent?.includes('전체보기') ? '104px' : '86px';
  });
  compactScheduleRange();
}

function renderPausedMembers() {
  const section = document.getElementById('members');
  if (!section) return;
  if (section.getAttribute('data-sou-members-paused') === 'true') return;
  section.className = 'sou-member-live-section';
  section.setAttribute('data-sou-members-paused', 'true');
  section.innerHTML = `
    <section class="sou-member-live-paused" aria-label="수용소 멤버표 개편 준비중">
      <div class="sou-member-live-paused-eyebrow">SOOP MEMBER GRID</div>
      <div class="sou-member-live-paused-title">멤버표 개편 준비중</div>
      <p class="sou-member-live-paused-desc">
        TEST 브랜치에서는 기존 멤버표와 라이브/게시글 자동 호출을 임시 중단했습니다.
        F12로 확인한 SOOP 라이브·게시글 API 기준으로 새 카드 구조를 다시 적용할 예정입니다.
      </p>
      <div class="sou-member-live-paused-list">
        <div class="sou-member-live-paused-item">라이브 API 호출 중단</div>
        <div class="sou-member-live-paused-item">게시글 API 호출 중단</div>
        <div class="sou-member-live-paused-item">새 멤버 카드 설계 예정</div>
      </div>
    </section>
  `;
}

function paint() {
  injectStyle();
  hideNotice();
  stabilizeSchedule();
  renderPausedMembers();
  stabilizeSchedule();
}

export default function PrisonLiveStatusHydrator() {
  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined' || !window.location.pathname.startsWith('/jangjisu-prison')) return undefined;
    let disposed = false;
    let observer = null;
    let applying = false;

    const runSchedule = () => {
      if (disposed || applying) return;
      applying = true;
      try {
        stabilizeSchedule();
      } finally {
        window.requestAnimationFrame(() => {
          applying = false;
        });
      }
    };

    const runScheduleBurst = () => {
      runSchedule();
      window.requestAnimationFrame(runSchedule);
      [0, 16, 32, 60, 120, 220].forEach((delay) => window.setTimeout(runSchedule, delay));
    };

    const attachScheduleObserver = () => {
      if (observer || disposed) return;
      const schedule = document.getElementById('schedule');
      if (!schedule) return;
      observer = new MutationObserver(runScheduleBurst);
      observer.observe(schedule, { childList: true, subtree: true, characterData: true });
    };

    const run = () => {
      if (disposed) return;
      paint();
      attachScheduleObserver();
    };

    run();
    [60, 160, 360].forEach((delay) => window.setTimeout(run, delay));

    const onClick = (event) => {
      if (event.target?.closest?.('#schedule')) {
        runScheduleBurst();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => {
      disposed = true;
      observer?.disconnect?.();
      document.removeEventListener('click', onClick, true);
    };
  }, []);
  return null;
}

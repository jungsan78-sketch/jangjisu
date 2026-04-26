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
    header > div, main { max-width: 1120px !important; }
    main { width: 100% !important; }
    #notice, a[href="#notice"] { display: none !important; }
    #schedule { overflow: hidden !important; contain: paint; }
    #schedule button { transform: none !important; min-height: 40px; min-width: 96px; position: relative; z-index: 2; }
    #schedule button:hover, #schedule button:active { transform: none !important; animation: none !important; }
    #schedule .grid.grid-cols-7.gap-3 { animation: none !important; overflow: hidden !important; contain: paint; }
    #schedule .grid.grid-cols-7.gap-3 > div {
      transform: none !important;
      animation: none !important;
      transition: border-color .12s ease, background-color .12s ease, box-shadow .12s ease !important;
      overflow: hidden !important;
      contain: paint;
    }
    #schedule .grid.grid-cols-7.gap-3 > div:hover { transform: none !important; filter: none !important; }
    #schedule .grid.grid-cols-7.gap-3 > div * { animation: none !important; }
    #schedule.sou-schedule-switching,
    #schedule.sou-schedule-switching * {
      animation: none !important;
      transition: none !important;
      transform: none !important;
      scroll-behavior: auto !important;
    }
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
      header > div, main { max-width: 100% !important; }
      .sou-member-live-paused-list { grid-template-columns: 1fr; }
    }
  `;
}

function hideNotice() {
  document.getElementById('notice')?.style.setProperty('display', 'none', 'important');
  document.querySelectorAll('a[href="#notice"]').forEach((anchor) => anchor.style.setProperty('display', 'none', 'important'));
}

function isWholeViewSelected(schedule) {
  return [...schedule.querySelectorAll('button')].some((button) => String(button.textContent || '').replace(/\s+/g, '').trim() === '전체보기' && /border-amber|bg-amber|text-white|active|selected/.test(String(button.className || '')));
}

function compactScheduleRange() {
  const schedule = document.getElementById('schedule');
  if (!schedule) return;
  schedule.querySelectorAll('.sou-schedule-range-hidden').forEach((element) => element.classList.remove('sou-schedule-range-hidden'));
  schedule.querySelectorAll('[data-sou-schedule-compact-row="true"]').forEach((element) => {
    element.style.gridTemplateColumns = '';
    element.removeAttribute('data-sou-schedule-compact-row');
  });
  if (!isWholeViewSelected(schedule)) return;
  const cards = [...schedule.querySelectorAll('div')].filter((element) => {
    const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
    const rect = element.getBoundingClientRect();
    return /\d{1,2}\s*일/.test(text) && rect.width >= 100 && rect.height >= 130 && !element.querySelector('button');
  }).filter((element, index, array) => !array.some((other) => other !== element && other.contains(element)));
  const rows = new Map();
  cards.forEach((card) => {
    const rowKey = Math.round(card.getBoundingClientRect().top / 20) * 20;
    rows.set(rowKey, [...(rows.get(rowKey) || []), card]);
  });
  const row = [...rows.values()].filter((items) => items.length >= 5).sort((a, b) => b.length - a.length)[0];
  if (!row) return;
  row.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  row[0].classList.add('sou-schedule-range-hidden');
  row[row.length - 1].classList.add('sou-schedule-range-hidden');
  const parent = row[0].parentElement;
  if (parent && parent === row[row.length - 1].parentElement) {
    parent.setAttribute('data-sou-schedule-compact-row', 'true');
    parent.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  }
}

function resetScheduleScroll(schedule) {
  schedule.querySelectorAll('*').forEach((element) => {
    if (element.scrollTop) element.scrollTop = 0;
  });
}

function stabilizeSchedule() {
  const schedule = document.getElementById('schedule');
  if (!schedule) return;
  resetScheduleScroll(schedule);
  schedule.querySelectorAll('button').forEach((button) => {
    button.style.transform = 'none';
    button.style.minHeight = '40px';
    button.style.minWidth = button.textContent?.includes('전체보기') ? '104px' : '86px';
  });
  compactScheduleRange();
}

function markScheduleSwitching() {
  const schedule = document.getElementById('schedule');
  if (!schedule) return;
  schedule.classList.add('sou-schedule-switching');
  resetScheduleScroll(schedule);
  window.setTimeout(() => schedule.classList.remove('sou-schedule-switching'), 240);
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
        TEST 브랜치에서는 Vercel 사용량을 줄이기 위해 기존 멤버표와 라이브/게시글 자동 호출을 임시 중단했습니다.
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

    const attachScheduleObserver = () => {
      if (observer || disposed) return;
      const schedule = document.getElementById('schedule');
      if (!schedule) return;
      observer = new MutationObserver(runSchedule);
      observer.observe(schedule, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
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
        markScheduleSwitching();
        runSchedule();
        [40, 90, 160, 260].forEach((delay) => window.setTimeout(runSchedule, delay));
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

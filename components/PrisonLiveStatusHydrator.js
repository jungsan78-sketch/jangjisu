import { useEffect, useLayoutEffect } from 'react';
import { ALL_PRISON_MEMBERS } from '../data/prisonMembers';

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
    .sou-member-live-wrap {
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 32px;
      background: radial-gradient(circle at top left, rgba(34,211,238,.10), transparent 34%), linear-gradient(180deg, rgba(17,24,39,.76), rgba(5,9,16,.97));
      padding: 26px;
      box-shadow: 0 18px 44px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04);
      color: #fff;
    }
    .sou-member-live-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .sou-member-live-eyebrow { color: rgba(125,211,252,.78); font-size: 12px; font-weight: 950; letter-spacing: .24em; text-transform: uppercase; }
    .sou-member-live-title { margin-top: 8px; font-size: clamp(24px, 3vw, 38px); font-weight: 950; letter-spacing: -.04em; }
    .sou-member-live-meta { color: rgba(255,255,255,.52); font-size: 12px; font-weight: 850; }
    .sou-member-live-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .sou-member-card {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025));
      min-height: 330px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 16px 36px rgba(0,0,0,.18);
    }
    .sou-member-card.is-live { border-color: rgba(248,113,113,.44); box-shadow: 0 0 0 1px rgba(248,113,113,.08), 0 20px 42px rgba(127,29,29,.22); }
    .sou-member-card.is-unknown { border-color: rgba(251,191,36,.28); }
    .sou-member-media { display: block; position: relative; height: 136px; overflow: hidden; background: rgba(15,23,42,.86); }
    .sou-member-media img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(1.04); }
    .sou-member-media::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent, rgba(0,0,0,.42)); }
    .sou-member-avatar { position: absolute; left: 14px; top: 92px; z-index: 2; width: 70px; height: 70px; border-radius: 999px; border: 3px solid rgba(5,7,12,.9); object-fit: cover; background: #111827; box-shadow: 0 12px 24px rgba(0,0,0,.32); }
    .sou-member-badge { position: absolute; right: 12px; top: 12px; z-index: 3; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 7px 10px; font-size: 11px; font-weight: 950; background: rgba(0,0,0,.72); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.78); backdrop-filter: blur(10px); }
    .sou-member-badge-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(148,163,184,.9); }
    .sou-member-card.is-live .sou-member-badge { color: white; background: rgba(127,29,29,.86); border-color: rgba(248,113,113,.34); }
    .sou-member-card.is-live .sou-member-badge-dot { background: #fb7185; box-shadow: 0 0 16px rgba(251,113,133,.75); }
    .sou-member-card.is-unknown .sou-member-badge-dot { background: #fbbf24; box-shadow: 0 0 12px rgba(251,191,36,.55); }
    .sou-member-body { padding: 38px 15px 15px; }
    .sou-member-name { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 19px; font-weight: 950; letter-spacing: -.03em; }
    .sou-member-warden { border-radius: 999px; border: 1px solid rgba(251,191,36,.24); background: rgba(251,191,36,.10); padding: 4px 8px; font-size: 10px; color: #fde68a; letter-spacing: .12em; }
    .sou-member-live-title-text { margin-top: 8px; min-height: 40px; color: rgba(255,255,255,.74); font-size: 13px; font-weight: 850; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .sou-member-stats { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
    .sou-member-stat { border-radius: 999px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.045); padding: 5px 8px; color: rgba(255,255,255,.68); font-size: 11px; font-weight: 900; }
    .sou-member-links { margin-top: 12px; display: flex; gap: 8px; }
    .sou-member-link { display: inline-flex; width: 42px; height: 38px; align-items: center; justify-content: center; border-radius: 14px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.06); transition: transform .16s ease, border-color .16s ease, background .16s ease; }
    .sou-member-link:hover { transform: translateY(-1px); border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.10); }
    .sou-member-link.is-disabled { opacity: .28; filter: grayscale(1); pointer-events: none; }
    .sou-member-link img { max-width: 28px; max-height: 24px; object-fit: contain; }
    .sou-member-post { margin-top: 12px; border-top: 1px solid rgba(255,255,255,.08); padding-top: 12px; }
    .sou-member-post-label { color: rgba(125,211,252,.72); font-size: 10px; font-weight: 950; letter-spacing: .18em; }
    .sou-member-post-title { display: block; margin-top: 6px; color: rgba(255,255,255,.88); font-size: 13px; font-weight: 900; line-height: 1.5; text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .sou-member-post-title:hover { color: white; text-decoration: underline; }
    .sou-member-post-summary { margin-top: 5px; color: rgba(255,255,255,.48); font-size: 12px; font-weight: 750; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .sou-member-post-counts { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; color: rgba(255,255,255,.46); font-size: 11px; font-weight: 850; }
    @media (max-width: 1120px) { .sou-member-live-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 820px) { .sou-member-live-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sou-member-live-head { align-items: flex-start; flex-direction: column; } }
    @media (max-width: 560px) { .sou-member-live-wrap { padding: 18px; border-radius: 26px; } .sou-member-live-grid { grid-template-columns: 1fr; } }
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function stationIdFromUrl(url) {
  return String(url || '').match(/station\/([^/?#]+)/i)?.[1] || '';
}

function formatCount(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '0';
  if (number >= 10000) return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}만`;
  return number.toLocaleString('ko-KR');
}

function getStatusRank(status) {
  if (status?.isLive) return 0;
  if (String(status?.liveState || '').includes('unknown')) return 1;
  return 2;
}

function sortMembers(members, statuses) {
  return [...members].sort((a, b) => {
    const aStatus = statuses[a.nickname];
    const bStatus = statuses[b.nickname];
    const statusDiff = getStatusRank(aStatus) - getStatusRank(bStatus);
    if (statusDiff) return statusDiff;
    if (a.nickname === '장지수') return -1;
    if (b.nickname === '장지수') return 1;
    return 0;
  });
}

function makeLink(href, type, label) {
  const disabled = !href;
  const safeHref = disabled ? '#' : escapeHtml(href);
  return `<a class="sou-member-link ${disabled ? 'is-disabled' : ''}" href="${safeHref}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><img src="/${type}-logo.svg" alt="${escapeHtml(label)}" /></a>`;
}

function renderMemberCard(member, status = {}, post = null) {
  const stationId = stationIdFromUrl(member.station);
  const stateClass = status.isLive ? 'is-live' : String(status.liveState || '').includes('unknown') ? 'is-unknown' : 'is-offline';
  const stateText = status.isLive ? 'ON AIR' : stateClass === 'is-unknown' ? '확인중' : 'OFF AIR';
  const thumbnail = status.thumbnailUrl || member.image;
  const mediaUrl = status.isLive && status.liveUrl ? status.liveUrl : member.station;
  const liveTitle = status.title || (status.isLive ? '방송 중' : '방송 정보 없음');
  const postCounts = post ? `조회 ${formatCount(post.viewCount)} · 업 ${formatCount(post.okCount)} · 댓글 ${formatCount(post.commentCount)}` : '';

  return `
    <article class="sou-member-card ${stateClass}">
      <a class="sou-member-media" href="${escapeHtml(mediaUrl || member.station || '#')}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(member.nickname)} 방송 이미지" loading="lazy" />
      </a>
      <img class="sou-member-avatar" src="${escapeHtml(member.image)}" alt="${escapeHtml(member.nickname)} 프로필" loading="lazy" />
      <div class="sou-member-badge"><span class="sou-member-badge-dot"></span>${stateText}</div>
      <div class="sou-member-body">
        <div class="sou-member-name"><span>${escapeHtml(member.nickname)}</span>${member.nickname === '장지수' ? '<span class="sou-member-warden">WARDEN</span>' : ''}</div>
        <div class="sou-member-live-title-text">${escapeHtml(liveTitle)}</div>
        <div class="sou-member-stats">
          <span class="sou-member-stat">시청 ${formatCount(status.viewerCount)}</span>
          ${status.categoryName ? `<span class="sou-member-stat">${escapeHtml(status.categoryName)}</span>` : ''}
          ${stationId ? `<span class="sou-member-stat">#${escapeHtml(stationId)}</span>` : ''}
        </div>
        <div class="sou-member-links">
          ${makeLink(member.station, 'soop', `${member.nickname} SOOP 방송국`)}
          ${makeLink(member.youtube, 'youtube', `${member.nickname} YouTube`)}
          ${makeLink(member.cafe, 'naver-cafe', `${member.nickname} 팬카페`)}
        </div>
        <div class="sou-member-post">
          <div class="sou-member-post-label">RECENT POST</div>
          ${post ? `<a class="sou-member-post-title" href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">${escapeHtml(post.title)}</a>` : '<div class="sou-member-post-title">최근 본인 게시글 확인중</div>'}
          ${post?.summary ? `<div class="sou-member-post-summary">${escapeHtml(post.summary)}</div>` : ''}
          ${post ? `<div class="sou-member-post-counts"><span>${escapeHtml(postCounts)}</span></div>` : ''}
        </div>
      </div>
    </article>
  `;
}

async function fetchJsonSafe(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

async function renderMembersGrid() {
  const section = document.getElementById('members');
  if (!section) return;
  section.className = 'sou-member-live-section';
  section.setAttribute('data-sou-members-paused', 'false');
  section.innerHTML = `
    <section class="sou-member-live-wrap" aria-label="수용소 멤버 라이브 카드">
      <div class="sou-member-live-head">
        <div>
          <div class="sou-member-live-eyebrow">SOOP MEMBER GRID</div>
          <div class="sou-member-live-title">멤버 라이브 카드</div>
        </div>
        <div class="sou-member-live-meta">라이브/게시글 불러오는 중</div>
      </div>
      <div class="sou-member-live-grid">
        ${ALL_PRISON_MEMBERS.map((member) => renderMemberCard(member)).join('')}
      </div>
    </section>
  `;

  try {
    const [livePayload, postsPayload] = await Promise.all([
      fetchJsonSafe('/api/soop-live-status'),
      fetchJsonSafe('/api/soop-station-posts'),
    ]);
    const statuses = livePayload?.statuses || {};
    const posts = postsPayload?.posts || {};
    const sorted = sortMembers(ALL_PRISON_MEMBERS, statuses);
    const liveCount = sorted.filter((member) => statuses[member.nickname]?.isLive).length;
    const fetchedAt = livePayload?.fetchedAt ? new Date(livePayload.fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
    section.innerHTML = `
      <section class="sou-member-live-wrap" aria-label="수용소 멤버 라이브 카드">
        <div class="sou-member-live-head">
          <div>
            <div class="sou-member-live-eyebrow">SOOP MEMBER GRID</div>
            <div class="sou-member-live-title">멤버 라이브 카드</div>
          </div>
          <div class="sou-member-live-meta">ON ${liveCount}명 · ${fetchedAt || '방금'} 갱신</div>
        </div>
        <div class="sou-member-live-grid">
          ${sorted.map((member) => {
            const stationId = stationIdFromUrl(member.station);
            return renderMemberCard(member, statuses[member.nickname], posts[stationId]);
          }).join('')}
        </div>
      </section>
    `;
  } catch (error) {
    section.querySelector('.sou-member-live-meta')?.replaceChildren(document.createTextNode('이전 카드 기준 표시 · 일부 API 확인 실패'));
  }
}

function paint() {
  injectStyle();
  hideNotice();
  stabilizeSchedule();
  renderMembersGrid();
  stabilizeSchedule();
}

export default function PrisonLiveStatusHydrator() {
  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined' || !window.location.pathname.startsWith('/jangjisu-prison')) return undefined;
    let disposed = false;
    let observer = null;
    let applying = false;
    let refreshTimer = null;

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
    refreshTimer = window.setInterval(() => {
      if (!disposed) renderMembersGrid();
    }, 2 * 60 * 1000);

    const onClick = (event) => {
      if (event.target?.closest?.('#schedule')) {
        runScheduleBurst();
      }
    };
    document.addEventListener('click', onClick, true);
    return () => {
      disposed = true;
      observer?.disconnect?.();
      if (refreshTimer) window.clearInterval(refreshTimer);
      document.removeEventListener('click', onClick, true);
    };
  }, []);
  return null;
}

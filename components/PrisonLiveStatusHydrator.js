import { useEffect } from 'react';
import { PRISON_MEMBERS } from '../data/prisonMembers';

function extractStationId(href = '') {
  const match = String(href).match(/\/station\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]).toLowerCase() : '';
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 10000) return `${Math.floor(count / 1000) / 10}만`;
  if (count >= 1000) return `${Math.floor(count / 100) / 10}천`;
  return count.toLocaleString('ko-KR');
}

function makeStatusMap(payload) {
  const map = new Map();
  Object.values(payload?.statuses || {}).forEach((status) => {
    const stationId = String(status?.stationId || '').toLowerCase();
    if (stationId) map.set(stationId, status);
  });
  return map;
}

function makePostMap(payload) {
  const map = new Map();
  Object.values(payload?.posts || {}).forEach((post) => {
    const stationId = String(post?.stationId || '').toLowerCase();
    if (stationId) map.set(stationId, post);
  });
  return map;
}

function resolveLiveHref(member, status) {
  const stationId = extractStationId(member.station);
  const broadNo = String(status?.broadNo || '').trim();
  if (status?.isLive && /^\d+$/.test(broadNo)) return `https://play.sooplive.com/${stationId}/${broadNo}`;
  if (status?.isLive) return `https://play.sooplive.com/${stationId}`;
  return member.station;
}

function injectStyle() {
  let style = document.getElementById('sou-member-live-grid-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'sou-member-live-grid-style';
    document.head.appendChild(style);
  }
  style.textContent = `
    header > div, main { max-width: 1120px !important; }
    main { width: 100% !important; }
    #notice, a[href="#notice"] { display: none !important; }
    #schedule button { transform: none !important; min-height: 40px; min-width: 96px; position: relative; z-index: 2; }
    #schedule button:hover { transform: none !important; }
    #schedule .sou-schedule-range-hidden { display: none !important; }
    #members.sou-member-live-section { margin-top: 30px !important; border: 0 !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
    .sou-member-live-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .sou-member-live-card { min-height: 300px; overflow: hidden; border: 1px solid rgba(255,255,255,.10); border-radius: 24px; background: linear-gradient(180deg, rgba(17,24,39,.72), rgba(5,9,16,.97)); box-shadow: 0 16px 38px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.04); transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease; }
    .sou-member-live-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.20); box-shadow: 0 20px 46px rgba(0,0,0,.36), 0 0 22px rgba(56,189,248,.08); }
    .sou-member-live-card.is-live { border-color: rgba(248,113,113,.34); background: radial-gradient(circle at top, rgba(239,68,68,.18), transparent 44%), linear-gradient(180deg, rgba(24,13,18,.90), rgba(5,9,16,.97)); }
    .sou-member-live-media { position: relative; display: block; aspect-ratio: 16 / 9; overflow: hidden; background: #080d17; text-decoration: none; }
    .sou-member-live-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
    .sou-member-live-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.70); font-size: 15px; font-weight: 950; text-align: center; background: radial-gradient(circle at top, rgba(56,189,248,.08), transparent 46%), linear-gradient(180deg, #0a1020, #060a12); }
    .sou-member-live-viewers { position: absolute; left: 10px; top: 10px; border-radius: 999px; background: rgba(0,0,0,.74); padding: 6px 9px; color: #fff; font-size: 12px; font-weight: 950; }
    .sou-member-live-body { padding: 13px 13px 14px; }
    .sou-member-live-profile { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .sou-member-live-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(34,211,238,.90); box-shadow: 0 0 15px rgba(34,211,238,.16); flex: 0 0 auto; }
    .sou-member-live-name { color: #fff; font-size: 16px; font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sou-member-live-topic { min-height: 44px; margin-top: 10px; color: #fff; font-size: 14px; font-weight: 900; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .sou-member-live-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
    .sou-member-live-action { display: inline-flex; align-items: center; justify-content: center; min-height: 35px; border: 1px solid rgba(255,255,255,.11); border-radius: 13px; background: rgba(255,255,255,.055); color: rgba(255,255,255,.86); font-size: 12px; font-weight: 950; text-decoration: none; }
    .sou-member-live-action:hover { background: rgba(255,255,255,.10); }
    .sou-member-live-action.soop { color: #7dd3fc; }
    .sou-member-live-action.youtube { color: #fecaca; }
    .sou-member-live-action.cafe { color: #bbf7d0; }
    .sou-member-live-recent { margin-top: 12px; border-top: 1px solid rgba(255,255,255,.08); padding-top: 10px; color: rgba(255,255,255,.64); font-size: 12px; font-weight: 900; line-height: 1.45; min-height: 35px; display: block; text-decoration: none; overflow: hidden; }
    .sou-member-live-recent-title { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .sou-member-live-recent-meta { margin-top: 3px; color: rgba(255,255,255,.42); font-size: 11px; }
    @media (max-width: 1180px) { .sou-member-live-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 760px) { header > div, main { max-width: 100% !important; } .sou-member-live-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 460px) { .sou-member-live-grid { grid-template-columns: 1fr; } }
  `;
}

function renderRecentPost(post) {
  if (!post?.title) return '<div class="sou-member-live-recent"><div class="sou-member-live-recent-title">최근 방송국게시글 확인중</div></div>';
  const meta = [post.viewCount ? `조회 ${formatCount(post.viewCount)}` : '', post.okCount ? `업 ${formatCount(post.okCount)}` : ''].filter(Boolean).join(' · ');
  const inner = `<div class="sou-member-live-recent-title">최근글 · ${escapeHtml(post.title)}</div>${meta ? `<div class="sou-member-live-recent-meta">${escapeHtml(meta)}</div>` : ''}`;
  if (!post.url) return `<div class="sou-member-live-recent">${inner}</div>`;
  return `<a class="sou-member-live-recent" href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">${inner}</a>`;
}

function renderMemberCard(member, statusMap, postMap) {
  const stationId = extractStationId(member.station);
  const status = statusMap.get(stationId);
  const post = postMap.get(stationId);
  const isLive = Boolean(status?.isLive);
  const href = resolveLiveHref(member, status);
  const title = String(status?.title || '').trim();
  const thumb = String(status?.thumbnailUrl || '').trim();
  const viewerCount = Number(status?.viewerCount || 0);
  const topicText = isLive ? (title || '방송 정보 확인중입니다') : '방송을 하지 않고 있습니다';
  const media = isLive && thumb ? `<img class="sou-member-live-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(topicText)}" loading="lazy" />` : `<div class="sou-member-live-empty">${escapeHtml(topicText)}</div>`;
  return `<article class="sou-member-live-card ${isLive ? 'is-live' : 'is-off'}" data-station-id="${escapeHtml(stationId)}"><a class="sou-member-live-media" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${member.nickname} 방송 바로가기`)}">${media}${isLive && viewerCount > 0 ? `<span class="sou-member-live-viewers">${formatCount(viewerCount)}명</span>` : ''}</a><div class="sou-member-live-body"><div class="sou-member-live-profile"><img class="sou-member-live-avatar" src="${escapeHtml(member.image)}" alt="${escapeHtml(member.nickname)}" loading="lazy" /><div class="sou-member-live-name">${escapeHtml(member.nickname)}</div></div><div class="sou-member-live-topic">${escapeHtml(topicText)}</div><div class="sou-member-live-actions"><a class="sou-member-live-action soop" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">SOOP</a>${member.youtube ? `<a class="sou-member-live-action youtube" href="${escapeHtml(member.youtube)}" target="_blank" rel="noreferrer">유튜브</a>` : '<span class="sou-member-live-action">유튜브</span>'}${member.cafe ? `<a class="sou-member-live-action cafe" href="${escapeHtml(member.cafe)}" target="_blank" rel="noreferrer">팬카페</a>` : '<span class="sou-member-live-action">팬카페</span>'}</div>${renderRecentPost(post)}</div></article>`;
}

function renderGrid(statusMap = new Map(), postMap = new Map()) {
  const section = document.getElementById('members');
  if (!section) return;
  injectStyle();
  section.className = 'sou-member-live-section';
  section.innerHTML = `<div class="sou-member-live-grid">${PRISON_MEMBERS.map((member) => renderMemberCard(member, statusMap, postMap)).join('')}</div>`;
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

export default function PrisonLiveStatusHydrator() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.pathname.startsWith('/jangjisu-prison')) return undefined;
    let disposed = false;
    let statusMap = new Map();
    let postMap = new Map();
    const paint = () => { hideNotice(); stabilizeSchedule(); renderGrid(statusMap, postMap); stabilizeSchedule(); };
    const load = async () => {
      try {
        injectStyle();
        paint();
        const [liveResult, postResult] = await Promise.allSettled([
          fetch(`/api/soop-live-status?t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`/api/soop-station-posts?t=${Date.now()}`, { cache: 'no-store' }),
        ]);
        if (liveResult.status === 'fulfilled') statusMap = makeStatusMap(await liveResult.value.json());
        if (postResult.status === 'fulfilled') postMap = makePostMap(await postResult.value.json());
        if (!disposed) paint();
      } catch {
        if (!disposed) paint();
      }
    };
    const onClick = (event) => {
      if (event.target?.closest?.('#schedule')) [0, 120, 360, 700].forEach((delay) => window.setTimeout(stabilizeSchedule, delay));
    };
    document.addEventListener('click', onClick, true);
    load();
    const timer = window.setInterval(load, 60000);
    const scheduleTimer = window.setInterval(stabilizeSchedule, 800);
    return () => {
      disposed = true;
      document.removeEventListener('click', onClick, true);
      window.clearInterval(timer);
      window.clearInterval(scheduleTimer);
    };
  }, []);
  return null;
}

import { useEffect } from 'react';

const PRISON_MEMBERS = [
  { nickname: '냥냥두둥', image: 'https://stimg.sooplive.com/LOGO/do/doodong/doodong.jpg', station: 'https://www.sooplive.com/station/doodong', youtube: 'https://www.youtube.com/channel/UCCAaGF_vfM6QygNRCp4x1dw', cafe: 'https://cafe.naver.com/meowdoodong' },
  { nickname: '치치', image: 'https://stimg.sooplive.com/LOGO/lo/lomioeov/m/lomioeov.webp', station: 'https://www.sooplive.com/station/lomioeov', youtube: 'https://www.youtube.com/@chichi0e0' },
  { nickname: '시몽', image: 'https://stimg.sooplive.com/LOGO/xi/ximong/ximong.jpg', station: 'https://www.sooplive.com/station/ximong' },
  { nickname: '유오늘', image: 'https://stimg.sooplive.com/LOGO/yo/youoneul/youoneul.jpg', station: 'https://www.sooplive.com/station/youoneul' },
  { nickname: '아야네세나', image: 'https://stimg.sooplive.com/LOGO/ay/ayanesena/ayanesena.jpg', station: 'https://www.sooplive.com/station/ayanesena', youtube: 'https://www.youtube.com/@%EC%95%84%EC%95%BC%EB%84%A4%EC%84%B8%EB%82%98', cafe: 'https://cafe.naver.com/ayanesena' },
  { nickname: '포포', image: 'https://stimg.sooplive.com/LOGO/su/sunza1122/sunza1122.jpg', station: 'https://www.sooplive.com/station/sunza1122', youtube: 'https://www.youtube.com/@%EB%B2%84%ED%8A%9C%EB%B2%84%ED%8F%AC%ED%8F%AC' },
  { nickname: '채니', image: 'https://stimg.sooplive.com/LOGO/k1/k1baaa/k1baaa.jpg', station: 'https://www.sooplive.com/station/k1baaa' },
  { nickname: '코로미', image: 'https://stimg.sooplive.com/LOGO/bx/bxroong/bxroong.jpg', station: 'https://www.sooplive.com/station/bxroong', cafe: 'https://cafe.naver.com/koromieie' },
  { nickname: '구월이', image: 'https://stimg.sooplive.com/LOGO/is/isq1158/isq1158.jpg', station: 'https://www.sooplive.com/station/isq1158', youtube: 'https://www.youtube.com/@%EA%B5%AC%EC%9B%94%EC%9D%B4', cafe: 'https://cafe.naver.com/guweol' },
  { nickname: '린링', image: 'https://stimg.sooplive.com/LOGO/mi/mini1212/mini1212.jpg', station: 'https://www.sooplive.com/station/mini1212' },
  { nickname: '띠꾸', image: 'https://stimg.sooplive.com/LOGO/dd/ddikku0714/ddikku0714.jpg', station: 'https://www.sooplive.com/station/ddikku0714', youtube: 'https://www.youtube.com/@ddikku_0714', cafe: 'https://cafe.naver.com/ddikku' },
];

function extractStationId(href = '') {
  const match = String(href).match(/\/station\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]).toLowerCase() : '';
}

function makeStatusMap(payload) {
  const map = new Map();
  Object.values(payload?.statuses || {}).forEach((status) => {
    const stationId = String(status?.stationId || '').toLowerCase();
    if (stationId) map.set(stationId, status);
  });
  return map;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 10000) return `${Math.floor(count / 1000) / 10}만`;
  if (count >= 1000) return `${Math.floor(count / 100) / 10}천`;
  return count.toLocaleString('ko-KR');
}

function resolveLiveHref(member, status) {
  const stationId = extractStationId(member.station);
  const broadNo = String(status?.broadNo || '').trim();
  if (status?.isLive && /^\d+$/.test(broadNo)) return `https://play.sooplive.com/${stationId}/${broadNo}`;
  if (status?.isLive) return `https://play.sooplive.com/${stationId}`;
  return member.station;
}

function injectLiveGridStyle() {
  if (document.getElementById('sou-member-live-grid-style')) return;
  const style = document.createElement('style');
  style.id = 'sou-member-live-grid-style';
  style.textContent = `
    #notice { display: none !important; }
    a[href="#notice"] { display: none !important; }
    #members.sou-member-live-section { margin-top: 30px !important; border: 0 !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
    .sou-member-live-head { display: none !important; }
    .sou-member-live-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .sou-member-live-card { min-height: 300px; border: 1px solid rgba(255,255,255,.10); border-radius: 24px; background: linear-gradient(180deg, rgba(17,24,39,.72), rgba(5,9,16,.97)); overflow: hidden; box-shadow: 0 16px 38px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.04); transition: border-color .2s ease, transform .2s ease, box-shadow .2s ease; }
    .sou-member-live-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.20); box-shadow: 0 20px 46px rgba(0,0,0,.36), 0 0 22px rgba(56,189,248,.08); }
    .sou-member-live-card.is-live { border-color: rgba(248,113,113,.34); background: radial-gradient(circle at top, rgba(239,68,68,.18), transparent 44%), linear-gradient(180deg, rgba(24,13,18,.90), rgba(5,9,16,.97)); }
    .sou-member-live-media { position: relative; aspect-ratio: 16 / 9; display: block; background: #080d17; overflow: hidden; text-decoration: none; }
    .sou-member-live-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
    .sou-member-live-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.70); font-size: 15px; font-weight: 950; text-align: center; background: radial-gradient(circle at top, rgba(56,189,248,.08), transparent 46%), linear-gradient(180deg, #0a1020, #060a12); }
    .sou-member-live-viewers { position: absolute; left: 10px; top: 10px; border-radius: 999px; background: rgba(0,0,0,.74); padding: 6px 9px; color: #fff; font-size: 12px; font-weight: 950; box-shadow: 0 8px 18px rgba(0,0,0,.32); }
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
    .sou-member-live-recent { margin-top: 12px; border-top: 1px solid rgba(255,255,255,.08); padding-top: 10px; color: rgba(255,255,255,.64); font-size: 12px; font-weight: 900; line-height: 1.45; min-height: 35px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    @media (max-width: 1180px) { .sou-member-live-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 760px) { .sou-member-live-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 460px) { .sou-member-live-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function renderMemberCard(member, statusMap) {
  const stationId = extractStationId(member.station);
  const status = statusMap.get(stationId);
  const isLive = Boolean(status?.isLive);
  const href = resolveLiveHref(member, status);
  const title = String(status?.title || '').trim();
  const thumb = String(status?.thumbnailUrl || '').trim();
  const viewerCount = Number(status?.viewerCount || 0);
  const topicText = isLive ? (title || '방송 정보 확인중입니다') : '방송을 하지 않고 있습니다';
  const media = isLive && thumb
    ? `<img class="sou-member-live-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(topicText)}" loading="lazy" />`
    : `<div class="sou-member-live-empty">${escapeHtml(topicText)}</div>`;

  return `
    <article class="sou-member-live-card ${isLive ? 'is-live' : 'is-off'}" data-station-id="${escapeHtml(stationId)}">
      <a class="sou-member-live-media" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${member.nickname} 방송 바로가기`)}">
        ${media}
        ${isLive && viewerCount > 0 ? `<span class="sou-member-live-viewers">${formatCount(viewerCount)}명</span>` : ''}
      </a>
      <div class="sou-member-live-body">
        <div class="sou-member-live-profile">
          <img class="sou-member-live-avatar" src="${escapeHtml(member.image)}" alt="${escapeHtml(member.nickname)}" loading="lazy" />
          <div class="sou-member-live-name">${escapeHtml(member.nickname)}</div>
        </div>
        <div class="sou-member-live-topic">${escapeHtml(topicText)}</div>
        <div class="sou-member-live-actions">
          <a class="sou-member-live-action soop" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">SOOP</a>
          ${member.youtube ? `<a class="sou-member-live-action youtube" href="${escapeHtml(member.youtube)}" target="_blank" rel="noreferrer">유튜브</a>` : '<span class="sou-member-live-action">유튜브</span>'}
          ${member.cafe ? `<a class="sou-member-live-action cafe" href="${escapeHtml(member.cafe)}" target="_blank" rel="noreferrer">팬카페</a>` : '<span class="sou-member-live-action">팬카페</span>'}
        </div>
        <div class="sou-member-live-recent">최근 방송국게시글 확인중</div>
      </div>
    </article>
  `;
}

function renderMemberLiveGrid(statusMap = new Map()) {
  const section = document.getElementById('members');
  if (!section) return;
  injectLiveGridStyle();
  section.className = 'sou-member-live-section';
  section.innerHTML = `<div class="sou-member-live-grid">${PRISON_MEMBERS.map((member) => renderMemberCard(member, statusMap)).join('')}</div>`;
}

function hideNoticeSection() {
  const notice = document.getElementById('notice');
  if (notice) notice.style.display = 'none';
  document.querySelectorAll('a[href="#notice"]').forEach((anchor) => { anchor.style.display = 'none'; });
}

export default function PrisonLiveStatusHydrator() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!window.location.pathname.startsWith('/jangjisu-prison')) return undefined;

    let disposed = false;
    let timer = null;

    const load = async () => {
      try {
        hideNoticeSection();
        renderMemberLiveGrid(new Map());
        const response = await fetch(`/api/soop-live-status?t=${Date.now()}`, { cache: 'no-store' });
        const payload = await response.json();
        if (disposed) return;
        renderMemberLiveGrid(makeStatusMap(payload));
      } catch {
        if (!disposed) renderMemberLiveGrid(new Map());
      }
    };

    load();
    timer = window.setInterval(load, 60000);

    return () => {
      disposed = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return null;
}

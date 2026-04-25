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
    #members.sou-member-live-section {
      margin-top: 32px !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    .sou-member-live-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }
    .sou-member-live-title {
      margin: 0;
      color: #fff;
      font-size: clamp(30px, 4vw, 44px);
      font-weight: 950;
      letter-spacing: -0.055em;
    }
    .sou-member-live-count {
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 999px;
      background: rgba(255,255,255,.075);
      padding: 10px 16px;
      color: rgba(255,255,255,.86);
      font-size: 14px;
      font-weight: 950;
      white-space: nowrap;
    }
    .sou-member-live-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 16px;
    }
    .sou-member-live-card {
      min-height: 360px;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 26px;
      background: linear-gradient(180deg, rgba(17, 24, 39, .78), rgba(5, 9, 16, .96));
      overflow: hidden;
      box-shadow: 0 18px 44px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.04);
      transition: border-color .22s ease, transform .22s ease, box-shadow .22s ease;
    }
    .sou-member-live-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255,255,255,.20);
      box-shadow: 0 22px 50px rgba(0,0,0,.36), 0 0 26px rgba(56,189,248,.08);
    }
    .sou-member-live-card.is-live {
      border-color: rgba(248,113,113,.38);
      background: radial-gradient(circle at top, rgba(239,68,68,.20), transparent 42%), linear-gradient(180deg, rgba(24, 13, 18, .92), rgba(5, 9, 16, .96));
    }
    .sou-member-live-media {
      position: relative;
      aspect-ratio: 16 / 9;
      background: #080d17;
      overflow: hidden;
    }
    .sou-member-live-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .sou-member-live-empty {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: rgba(255,255,255,.52);
      font-weight: 950;
      letter-spacing: -0.03em;
      text-align: center;
      background: radial-gradient(circle at top, rgba(56,189,248,.09), transparent 46%), linear-gradient(180deg, #0a1020, #060a12);
    }
    .sou-member-live-empty strong { color: rgba(255,255,255,.82); font-size: 18px; }
    .sou-member-live-empty span { font-size: 13px; color: rgba(255,255,255,.52); }
    .sou-member-live-badge {
      position: absolute;
      left: 12px;
      top: 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      background: rgba(239, 68, 68, .96);
      padding: 7px 10px;
      color: #fff;
      font-size: 11px;
      font-weight: 950;
      box-shadow: 0 8px 18px rgba(0,0,0,.32);
    }
    .sou-member-live-viewers {
      position: absolute;
      right: 12px;
      top: 12px;
      border-radius: 999px;
      background: rgba(0,0,0,.72);
      padding: 7px 10px;
      color: #fff;
      font-size: 12px;
      font-weight: 950;
      box-shadow: 0 8px 18px rgba(0,0,0,.32);
    }
    .sou-member-live-body { padding: 14px 14px 16px; }
    .sou-member-live-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .sou-member-live-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(34,211,238,.92);
      box-shadow: 0 0 16px rgba(34,211,238,.18);
      flex: 0 0 auto;
    }
    .sou-member-live-name {
      color: #fff;
      font-size: 16px;
      font-weight: 950;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sou-member-live-state {
      margin-top: 4px;
      color: rgba(255,255,255,.48);
      font-size: 12px;
      font-weight: 850;
    }
    .sou-member-live-topic {
      min-height: 48px;
      margin-top: 12px;
      color: #fff;
      font-size: 14px;
      font-weight: 900;
      line-height: 1.55;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sou-member-live-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-height: 27px;
      margin-top: 12px;
    }
    .sou-member-live-tag {
      border-radius: 999px;
      background: rgba(255,255,255,.09);
      padding: 5px 9px;
      color: rgba(255,255,255,.74);
      font-size: 11px;
      font-weight: 850;
    }
    .sou-member-live-actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
    }
    .sou-member-live-action {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255,255,255,.11);
      border-radius: 14px;
      background: rgba(255,255,255,.055);
      padding: 9px 8px;
      color: rgba(255,255,255,.86);
      font-size: 12px;
      font-weight: 950;
      text-decoration: none;
    }
    .sou-member-live-action:hover { background: rgba(255,255,255,.10); }
    .sou-member-live-action.soop { color: #7dd3fc; }
    .sou-member-live-action.youtube { color: #fecaca; }
    .sou-member-live-action.cafe { color: #bbf7d0; }
    @media (max-width: 1180px) { .sou-member-live-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @media (max-width: 900px) { .sou-member-live-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 680px) { .sou-member-live-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sou-member-live-card { min-height: 340px; } }
    @media (max-width: 420px) { .sou-member-live-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function renderMemberCard(member, statusMap) {
  const stationId = extractStationId(member.station);
  const status = statusMap.get(stationId);
  const isLive = Boolean(status?.isLive);
  const isUnknown = status?.liveState === 'unknown' || status?.liveState === 'unknown_previous';
  const href = resolveLiveHref(member, status);
  const title = String(status?.title || '').trim();
  const thumb = String(status?.thumbnailUrl || '').trim();
  const viewerCount = Number(status?.viewerCount || 0);
  const visitCount = Number(status?.totalVisitCount || 0);
  const okCount = Number(status?.totalOkCount || 0);
  const fanCount = Number(status?.fanCount || 0);
  const stateText = isLive ? '방송중' : isUnknown ? '방송 상태 확인중' : '방송을 하지 않고 있습니다';
  const topicText = isLive ? (title || '방송 정보 확인중입니다') : '방송을 하지 않고 있습니다';
  const media = isLive && thumb
    ? `<img class="sou-member-live-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(topicText)}" loading="lazy" />`
    : `<div class="sou-member-live-empty"><strong>${isLive ? 'LIVE' : 'OFF AIR'}</strong><span>${escapeHtml(stateText)}</span></div>`;

  return `
    <article class="sou-member-live-card ${isLive ? 'is-live' : 'is-off'}" data-station-id="${escapeHtml(stationId)}">
      <a class="sou-member-live-media" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${member.nickname} 방송 바로가기`)}">
        ${media}
        ${isLive ? '<span class="sou-member-live-badge">● LIVE</span>' : ''}
        ${isLive && viewerCount > 0 ? `<span class="sou-member-live-viewers">${formatCount(viewerCount)}명</span>` : ''}
      </a>
      <div class="sou-member-live-body">
        <div class="sou-member-live-profile">
          <img class="sou-member-live-avatar" src="${escapeHtml(member.image)}" alt="${escapeHtml(member.nickname)}" loading="lazy" />
          <div class="min-w-0">
            <div class="sou-member-live-name">${escapeHtml(member.nickname)}</div>
            <div class="sou-member-live-state">${escapeHtml(stateText)}</div>
          </div>
        </div>
        <div class="sou-member-live-topic">${escapeHtml(topicText)}</div>
        <div class="sou-member-live-tags">
          ${visitCount > 0 ? `<span class="sou-member-live-tag">조회 ${formatCount(visitCount)}</span>` : ''}
          ${okCount > 0 ? `<span class="sou-member-live-tag">업 ${formatCount(okCount)}</span>` : ''}
          ${fanCount > 0 ? `<span class="sou-member-live-tag">애청자 ${formatCount(fanCount)}</span>` : ''}
        </div>
        <div class="sou-member-live-actions">
          <a class="sou-member-live-action soop" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">SOOP</a>
          ${member.youtube ? `<a class="sou-member-live-action youtube" href="${escapeHtml(member.youtube)}" target="_blank" rel="noreferrer">YouTube</a>` : '<span class="sou-member-live-action">YouTube</span>'}
          ${member.cafe ? `<a class="sou-member-live-action cafe" href="${escapeHtml(member.cafe)}" target="_blank" rel="noreferrer">Cafe</a>` : '<span class="sou-member-live-action">Cafe</span>'}
        </div>
      </div>
    </article>
  `;
}

function renderMemberLiveGrid(statusMap = new Map()) {
  const section = document.getElementById('members');
  if (!section) return;
  injectLiveGridStyle();
  section.className = 'sou-member-live-section';
  section.innerHTML = `
    <div class="sou-member-live-head">
      <h2 class="sou-member-live-title">수감생</h2>
      <div class="sou-member-live-count">${PRISON_MEMBERS.length}명</div>
    </div>
    <div class="sou-member-live-grid">
      ${PRISON_MEMBERS.map((member) => renderMemberCard(member, statusMap)).join('')}
    </div>
  `;
}

function hideNoticeSection() {
  const notice = document.getElementById('notice');
  if (notice) notice.style.display = 'none';
  document.querySelectorAll('a[href="#notice"]').forEach((anchor) => {
    anchor.style.display = 'none';
  });
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

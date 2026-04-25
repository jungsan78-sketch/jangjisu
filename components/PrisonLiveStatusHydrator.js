import { useEffect } from 'react';

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

function findMemberCard(anchor) {
  let node = anchor?.parentElement;
  for (let i = 0; node && i < 8; i += 1) {
    const hasAvatar = Boolean(node.querySelector('img[alt]'));
    const cardLike = /rounded|border|shadow|group/.test(node.className || '');
    if (hasAvatar && cardLike) return node;
    node = node.parentElement;
  }
  return anchor?.parentElement || null;
}

function findLivePill(card) {
  if (!card) return null;
  const candidates = [...card.querySelectorAll('span, div, button')];
  return candidates.find((element) => /LIVE\s*(ON|OFF)/i.test(String(element.textContent || '').trim()));
}

function clearOldLogoBadge(anchor) {
  anchor.querySelectorAll(':scope > .sou-live-badge').forEach((badge) => badge.remove());
}

function removeLiveSnapshot(card) {
  card?.querySelectorAll('.sou-live-snapshot').forEach((snapshot) => snapshot.remove());
}

function formatViewerCount(value) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return '';
  if (count >= 10000) return `${Math.floor(count / 1000) / 10}만`;
  if (count >= 1000) return `${Math.floor(count / 100) / 10}천`;
  return `${count}명`;
}

function makeLiveSnapshot(status) {
  const href = status?.liveUrl || status?.stationUrl || '#';
  const thumbnailUrl = status?.thumbnailUrl || '';
  const title = String(status?.title || '방송 제목을 불러오는 중입니다').trim();
  const viewers = formatViewerCount(status?.viewerCount);

  const wrapper = document.createElement('a');
  wrapper.className = 'sou-live-snapshot';
  wrapper.href = href;
  wrapper.target = '_blank';
  wrapper.rel = 'noreferrer';
  wrapper.setAttribute('aria-label', title);

  const media = document.createElement('div');
  media.className = 'sou-live-snapshot-media';

  if (thumbnailUrl) {
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = title;
    img.loading = 'lazy';
    media.appendChild(img);
  } else {
    const empty = document.createElement('div');
    empty.className = 'sou-live-snapshot-empty';
    empty.textContent = 'LIVE';
    media.appendChild(empty);
  }

  const top = document.createElement('div');
  top.className = 'sou-live-snapshot-top';

  const live = document.createElement('span');
  live.className = 'sou-live-snapshot-live';
  live.textContent = '● LIVE';
  top.appendChild(live);

  if (viewers) {
    const viewer = document.createElement('span');
    viewer.className = 'sou-live-snapshot-viewers';
    viewer.textContent = viewers;
    top.appendChild(viewer);
  }

  const bottom = document.createElement('div');
  bottom.className = 'sou-live-snapshot-bottom';
  bottom.textContent = title;

  media.appendChild(top);
  media.appendChild(bottom);
  wrapper.appendChild(media);
  return wrapper;
}

function updateLiveSnapshot(card, status, isLive) {
  if (!card) return;
  removeLiveSnapshot(card);
  if (!isLive) return;

  const snapshot = makeLiveSnapshot(status);
  const platformRow = card.querySelector('a[href*="sooplive.com/station/"]')?.parentElement;
  if (platformRow?.parentElement) {
    platformRow.parentElement.insertBefore(snapshot, platformRow);
    return;
  }
  card.appendChild(snapshot);
}

function applyCardState(anchor, status) {
  const isLive = Boolean(status?.isLive);
  const stationId = extractStationId(anchor.getAttribute('href'));
  const card = findMemberCard(anchor);
  const livePill = findLivePill(card);
  const avatar = card?.querySelector('img[alt]');

  clearOldLogoBadge(anchor);

  anchor.style.position = '';
  anchor.setAttribute('data-sou-station-id', stationId);
  anchor.setAttribute('data-sou-live-status', isLive ? 'on' : 'off');
  anchor.setAttribute('title', isLive ? `방송중${status?.title ? ` · ${status.title}` : ''}` : '방송 OFF');

  if (card) {
    card.setAttribute('data-sou-live-card', isLive ? 'on' : 'off');
    card.classList.toggle('sou-live-card-on', isLive);
    card.classList.toggle('sou-live-card-off', !isLive);
    updateLiveSnapshot(card, status, isLive);
  }

  if (avatar) {
    avatar.classList.toggle('sou-live-avatar-on', isLive);
  }

  if (livePill) {
    livePill.textContent = isLive ? '● LIVE ON' : '● LIVE OFF';
    livePill.setAttribute('data-sou-live-pill', isLive ? 'on' : 'off');
    livePill.classList.add('sou-live-status-pill');
  }
}

function hydrateLiveState(statusMap) {
  const anchors = [...document.querySelectorAll('a[href*="sooplive.com/station/"]')];
  anchors.forEach((anchor) => {
    const stationId = extractStationId(anchor.getAttribute('href'));
    if (!stationId) return;
    applyCardState(anchor, statusMap.get(stationId));
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
        const response = await fetch(`/api/soop-live-status?t=${Date.now()}`, { cache: 'no-store' });
        const payload = await response.json();
        if (disposed) return;
        hydrateLiveState(makeStatusMap(payload));
      } catch {}
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

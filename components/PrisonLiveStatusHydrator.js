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

function styleBadge(badge, isLive) {
  badge.textContent = isLive ? 'ON' : 'OFF';
  badge.setAttribute('data-sou-live-badge', isLive ? 'on' : 'off');
  badge.className = [
    'sou-live-badge',
    'absolute',
    '-right-1',
    '-top-1',
    'z-20',
    'rounded-full',
    'border',
    'px-2',
    'py-0.5',
    'text-[10px]',
    'font-black',
    'tracking-[0.12em]',
    'shadow-[0_8px_18px_rgba(0,0,0,0.28)]',
    isLive
      ? 'border-emerald-200/70 bg-emerald-400 text-[#04110a] shadow-[0_0_18px_rgba(52,211,153,0.42)]'
      : 'border-white/18 bg-slate-700 text-white/70',
  ].join(' ');
}

function hydrateLiveBadges(statusMap) {
  const anchors = [...document.querySelectorAll('a[href*="sooplive.com/station/"]')];
  anchors.forEach((anchor) => {
    const stationId = extractStationId(anchor.getAttribute('href'));
    if (!stationId) return;

    const status = statusMap.get(stationId);
    const isLive = Boolean(status?.isLive);

    anchor.style.position = anchor.style.position || 'relative';
    anchor.setAttribute('data-sou-station-id', stationId);
    anchor.setAttribute('data-sou-live-status', isLive ? 'on' : 'off');
    anchor.setAttribute('title', isLive ? `방송중${status?.title ? ` · ${status.title}` : ''}` : '방송 OFF');

    let badge = anchor.querySelector(':scope > .sou-live-badge');
    if (!badge) {
      badge = document.createElement('span');
      anchor.appendChild(badge);
    }
    styleBadge(badge, isLive);
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
        hydrateLiveBadges(makeStatusMap(payload));
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_PRISON_MEMBERS } from '../../../data/prisonMembers';
import MultiviewStreamPicker from './MultiviewStreamPicker';
import SoopChatPanel from './SoopChatPanel';
import SoopEmbedTile from './SoopEmbedTile';

const STORAGE_KEY = 'sou-prison-multiview-members-v2';
const MAX_STREAMS = 4;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const LAYOUTS = [
  { key: 'auto', label: '자동', icon: '▣' },
  { key: 'stack', label: '세로', icon: '▤' },
  { key: 'focus', label: '강조', icon: '◫' },
  { key: 'grid', label: '격자', icon: '▦' },
];

function statusRank(member, statuses) {
  const status = statuses[member.nickname];
  if (status?.isLive) return 0;
  if (String(status?.liveState || '').includes('unknown')) return 1;
  return 2;
}

function sortMembers(members, statuses) {
  return [...members].sort((a, b) => {
    const rank = statusRank(a, statuses) - statusRank(b, statuses);
    if (rank) return rank;
    const viewers = Number(statuses[b.nickname]?.viewerCount || 0) - Number(statuses[a.nickname]?.viewerCount || 0);
    if (viewers) return viewers;
    if (a.nickname === '장지수') return -1;
    if (b.nickname === '장지수') return 1;
    return 0;
  });
}

function getGridClass(layout, count) {
  if (layout === 'stack') return 'grid-cols-1';
  if (layout === 'grid') return 'grid-cols-1 lg:grid-cols-2 lg:grid-rows-2';
  if (layout === 'focus') return count >= 3 ? 'grid-cols-1 lg:grid-cols-2 lg:grid-rows-2' : 'grid-cols-1 lg:grid-cols-2';
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 lg:grid-cols-2';
  return 'grid-cols-1 lg:grid-cols-2 lg:grid-rows-2';
}

export default function PrisonMultiview() {
  const [statuses, setStatuses] = useState({});
  const [loadState, setLoadState] = useState('loading');
  const [selectedNames, setSelectedNames] = useState([]);
  const [chatName, setChatName] = useState('');
  const [layout, setLayout] = useState('auto');
  const [notice, setNotice] = useState('');
  const playerAreaRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      const knownNames = new Set(ALL_PRISON_MEMBERS.map((member) => member.nickname));
      if (Array.isArray(saved)) setSelectedNames(saved.filter((name) => knownNames.has(name)).slice(0, MAX_STREAMS));
    } catch {}
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedNames));
  }, [selectedNames]);

  useEffect(() => {
    let mounted = true;
    async function loadLive() {
      try {
        const response = await fetch('/api/live-status?members=20260729');
        if (!response.ok) throw new Error(`live status ${response.status}`);
        const payload = await response.json();
        if (!mounted) return;
        setStatuses(payload?.statuses || {});
        setLoadState('ready');
      } catch {
        if (mounted) setLoadState('error');
      }
    }
    loadLive();
    const timer = window.setInterval(loadLive, REFRESH_INTERVAL_MS);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const members = useMemo(() => sortMembers(ALL_PRISON_MEMBERS, statuses), [statuses]);
  const selectedMembers = useMemo(() => selectedNames.map((name) => ALL_PRISON_MEMBERS.find((member) => member.nickname === name)).filter(Boolean), [selectedNames]);
  const liveCount = members.filter((member) => statuses[member.nickname]?.isLive).length;

  useEffect(() => {
    if (loadState !== 'ready') return;
    setSelectedNames((current) => current.filter((name) => {
      const status = statuses[name];
      return !status || status.isLive || String(status.liveState || '').includes('unknown');
    }));
  }, [loadState, statuses]);

  useEffect(() => {
    setChatName((current) => selectedNames.includes(current) ? current : selectedNames[0] || '');
  }, [selectedNames]);

  function addMember(member) {
    if (!statuses[member.nickname]?.isLive) {
      setNotice('현재 방송 중인 멤버만 멀티뷰에 추가할 수 있습니다.');
      return;
    }
    if (selectedNames.includes(member.nickname)) return;
    if (selectedNames.length >= MAX_STREAMS) {
      setNotice('멀티뷰는 최대 4개 방송까지 볼 수 있습니다.');
      return;
    }
    setSelectedNames((current) => [...current, member.nickname]);
    setNotice(selectedNames.length >= 2 && window.innerWidth < 768 ? '모바일에서 3개 이상 재생하면 기기 발열과 데이터 사용량이 커질 수 있습니다.' : '');
  }

  async function openFullscreen() {
    try {
      await playerAreaRef.current?.requestFullscreen?.();
    } catch {
      setNotice('브라우저에서 전체화면을 허용하지 않았습니다.');
    }
  }

  return (
    <section data-sou-prison-prepaint-visible="true" className="min-h-[calc(100vh-64px)] w-full">
      <div className="mb-4 grid gap-4 rounded-[26px] bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_50px_rgba(0,0,0,0.24)] sm:px-6 xl:grid-cols-[260px_minmax(360px,1fr)_auto] xl:items-center">
        <div className="shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-black tracking-[-0.04em] text-white sm:text-[30px]">수용소 멀티뷰</h1>
            <span className="rounded-full bg-rose-500/12 px-3 py-1 text-[11px] font-black text-rose-100">● {liveCount}명 방송 중</span>
          </div>
          <p className="mt-1.5 text-xs font-bold text-white/48">한 번에 최대 4개까지 시청할 수 있어요.</p>
        </div>

        <MultiviewStreamPicker members={members} statuses={statuses} selectedNames={selectedNames} maxStreams={MAX_STREAMS} loadState={loadState} onAdd={addMember} />

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="flex rounded-2xl bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            {LAYOUTS.map((item) => <button key={item.key} type="button" title={item.label} onClick={() => setLayout(item.key)} className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-black transition ${layout === item.key ? 'bg-white text-slate-950 shadow-lg' : 'text-white/55 hover:bg-white/8 hover:text-white'}`}>{item.icon}</button>)}
          </div>
          <button type="button" onClick={openFullscreen} className="rounded-2xl bg-white/[0.065] px-4 py-2.5 text-xs font-black text-white/80 transition hover:bg-white/12 hover:text-white">⛶ 전체화면</button>
          <button type="button" onClick={() => setSelectedNames([])} className="rounded-2xl bg-white/[0.065] px-4 py-2.5 text-xs font-black text-white/65 transition hover:bg-rose-500/14 hover:text-rose-100">선택 초기화</button>
        </div>
      </div>

      {notice ? <div className="mb-4 rounded-2xl bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-50">{notice}</div> : null}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div ref={playerAreaRef} className="min-h-[560px] rounded-[26px] bg-[#090c12] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.30)] sm:p-3">
          {selectedMembers.length ? (
            <div className={`grid h-full min-h-[540px] gap-2 sm:gap-3 ${getGridClass(layout, selectedMembers.length)}`}>
              {selectedMembers.map((member, index) => <SoopEmbedTile key={member.nickname} member={member} status={statuses[member.nickname]} featured={index === 0 && selectedMembers.length >= 3 && (layout === 'focus' || (layout === 'auto' && selectedMembers.length === 3))} onRemove={() => setSelectedNames((current) => current.filter((name) => name !== member.nickname))} />)}
            </div>
          ) : (
            <div className="flex min-h-[540px] flex-col items-center justify-center rounded-[22px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_42%),#0b0e14] px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/[0.055] text-3xl text-white/55">▣</div>
              <div className="mt-5 text-lg font-black text-white/75">방송을 선택해주세요</div>
              <div className="mt-2 text-sm font-bold text-white/38">상단 스트림 목록의 + 버튼으로 추가할 수 있습니다.</div>
            </div>
          )}
        </div>

        <SoopChatPanel selectedMembers={selectedMembers} statuses={statuses} chatName={chatName} onSelect={setChatName} />
      </div>
      <p className="mt-4 text-center text-[11px] font-bold leading-5 text-white/30">모바일에서는 2개 이하 시청을 권장합니다.</p>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_PRISON_MEMBERS } from '../../../data/prisonMembers';
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

function formatViewers(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '';
  return new Intl.NumberFormat('ko-KR').format(number);
}

export default function PrisonMultiview() {
  const [statuses, setStatuses] = useState({});
  const [loadState, setLoadState] = useState('loading');
  const [selectedNames, setSelectedNames] = useState([]);
  const [layout, setLayout] = useState('auto');
  const [chatName, setChatName] = useState('');
  const [notice, setNotice] = useState('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
  const chatMember = selectedMembers.find((member) => member.nickname === chatName) || selectedMembers[0] || null;

  useEffect(() => {
    if (loadState !== 'ready') return;
    setSelectedNames((current) => current.filter((name) => {
      const status = statuses[name];
      return !status || status.isLive || String(status.liveState || '').includes('unknown');
    }));
  }, [loadState, statuses]);

  useEffect(() => {
    if (!selectedNames.length) setChatName('');
    else if (!selectedNames.includes(chatName)) setChatName(selectedNames[0]);
  }, [chatName, selectedNames]);

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
    if (!chatName) setChatName(member.nickname);
    setNotice(selectedNames.length >= 2 && window.innerWidth < 768 ? '모바일에서 3개 이상 재생하면 기기 발열과 데이터 사용량이 커질 수 있습니다.' : '');
  }

  function openChat(member) {
    const liveUrl = statuses[member.nickname]?.liveUrl || member.station;
    const chatWindow = window.open(liveUrl, 'sou_prison_multiview_chat', 'popup=yes,width=520,height=860,resizable=yes,scrollbars=yes');
    if (!chatWindow) {
      setNotice('브라우저가 채팅 창을 차단했습니다. 팝업을 허용한 뒤 다시 눌러주세요.');
      return;
    }
    setChatName(member.nickname);
    chatWindow.focus?.();
    setNotice('');
  }

  async function openFullscreen() {
    try {
      await playerAreaRef.current?.requestFullscreen?.();
    } catch {
      setNotice('브라우저에서 전체화면을 허용하지 않았습니다.');
    }
  }

  function reloadPlayers() {
    setReloadKey((current) => current + 1);
    setNotice('플레이어를 다시 불러왔습니다. 설정에서 원본화질을 선택한 뒤 권한 요청이 나타나면 허용을 눌러주세요.');
  }

  return (
    <section data-sou-prison-prepaint-visible="true" className="min-h-[calc(100vh-64px)] w-full">
      <div className="mb-4 flex flex-col gap-4 rounded-[26px] bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_50px_rgba(0,0,0,0.24)] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-black tracking-[-0.04em] text-white sm:text-[30px]">수용소 멀티뷰</h1>
            <span className="rounded-full bg-rose-500/12 px-3 py-1 text-[11px] font-black text-rose-100">● {liveCount}명 방송 중</span>
          </div>
          <p className="mt-1.5 text-xs font-bold text-white/48">한 번에 최대 4개까지 시청할 수 있어요.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]">
            {LAYOUTS.map((item) => <button key={item.key} type="button" title={item.label} onClick={() => setLayout(item.key)} className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-black transition ${layout === item.key ? 'bg-white text-slate-950 shadow-lg' : 'text-white/55 hover:bg-white/8 hover:text-white'}`}>{item.icon}</button>)}
          </div>
          <button type="button" disabled={!selectedMembers.length} onClick={() => chatMember && openChat(chatMember)} className={`rounded-2xl px-4 py-2.5 text-xs font-black transition ${selectedMembers.length ? 'bg-sky-300/12 text-sky-50 hover:bg-sky-300/20' : 'cursor-not-allowed bg-white/[0.035] text-white/20'}`}>▢ 채팅 창</button>
          <button type="button" onClick={openFullscreen} className="rounded-2xl bg-white/[0.065] px-4 py-2.5 text-xs font-black text-white/80 transition hover:bg-white/12 hover:text-white">⛶ 전체화면</button>
          <button type="button" onClick={() => setSelectedNames([])} className="rounded-2xl bg-white/[0.065] px-4 py-2.5 text-xs font-black text-white/65 transition hover:bg-rose-500/14 hover:text-rose-100">선택 초기화</button>
        </div>
      </div>

      <div className="mb-4 rounded-[22px] bg-sky-400/[0.085] p-4 shadow-[inset_0_1px_0_rgba(125,211,252,0.10)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black text-sky-50">1080p 원본화질 연결 안내</div>
            <p className="mt-1 text-xs font-bold leading-5 text-sky-50/60">각 플레이어의 설정에서 원본화질을 선택하고, 로컬 네트워크 액세스 요청이 나타나면 허용을 눌러주세요.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setShowPermissionHelp((value) => !value)} className="rounded-xl bg-white/[0.075] px-3 py-2 text-xs font-black text-white/75 hover:bg-white/12">{showPermissionHelp ? '안내 닫기' : '권한 해결 방법'}</button>
            <button type="button" disabled={!selectedMembers.length} onClick={reloadPlayers} className="rounded-xl bg-sky-300/15 px-3 py-2 text-xs font-black text-sky-50 disabled:cursor-not-allowed disabled:opacity-35">플레이어 다시 불러오기</button>
          </div>
        </div>
        {showPermissionHelp ? <div className="mt-3 rounded-2xl bg-black/20 px-4 py-3 text-xs font-bold leading-6 text-white/60"><span className="text-white">① 플레이어 설정 → 원본화질 선택</span><br />② 브라우저의 로컬 네트워크 액세스 요청 허용<br />③ 고화질 스트리머가 설치·실행 중인지 확인<br />④ 연결이 안 되면 플레이어 다시 불러오기<br /><span className="mt-1 block text-white/42">이미 거절했다면 주소창 왼쪽의 사이트 설정에서 로컬 네트워크 액세스를 허용하거나 사이트 권한을 초기화해주세요.</span></div> : null}
      </div>

      {notice ? <div className="mb-4 rounded-2xl bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-50">{notice}</div> : null}

      <div className="grid min-h-[680px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div ref={playerAreaRef} className="min-h-[560px] rounded-[26px] bg-[#090c12] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_70px_rgba(0,0,0,0.30)] sm:p-3">
          {selectedMembers.length ? (
            <div className={`grid h-full min-h-[540px] gap-2 sm:gap-3 ${getGridClass(layout, selectedMembers.length)}`}>
              {selectedMembers.map((member, index) => <SoopEmbedTile key={member.nickname} member={member} status={statuses[member.nickname]} featured={index === 0 && selectedMembers.length >= 3 && (layout === 'focus' || (layout === 'auto' && selectedMembers.length === 3))} chatSelected={chatName === member.nickname} reloadKey={reloadKey} onSelectChat={() => openChat(member)} onRemove={() => setSelectedNames((current) => current.filter((name) => name !== member.nickname))} />)}
            </div>
          ) : (
            <div className="flex min-h-[540px] flex-col items-center justify-center rounded-[22px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_42%),#0b0e14] px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/[0.055] text-3xl text-white/55">▣</div>
              <div className="mt-5 text-lg font-black text-white/75">방송을 선택해주세요</div>
              <div className="mt-2 text-sm font-bold text-white/38">오른쪽 방송 목록의 + 버튼으로 추가할 수 있습니다.</div>
            </div>
          )}
        </div>

        <aside className="min-h-0 rounded-[26px] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_50px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-lg font-black text-white">스트림 추가</h2><p className="mt-1 text-[11px] font-bold text-white/40">{selectedNames.length}/{MAX_STREAMS} 선택</p></div>
            <span className="rounded-full bg-white/[0.055] px-3 py-1.5 text-[10px] font-black text-white/48">5분 갱신</span>
          </div>
          <div className="mt-4 max-h-[610px] space-y-1.5 overflow-y-auto pr-1 scrollbar-hide">
            {members.map((member) => {
              const status = statuses[member.nickname] || {};
              const isLive = Boolean(status.isLive);
              const selected = selectedNames.includes(member.nickname);
              const viewers = formatViewers(status.viewerCount);
              const statusText = isLive ? `${viewers ? `${viewers}명 · ` : ''}${status.title || '방송 중'}` : loadState === 'error' || String(status.liveState || '').includes('unknown') ? '상태 확인 불가' : loadState === 'ready' ? '오프라인' : '상태 확인 중';
              return <button key={member.nickname} type="button" disabled={selected} onClick={() => addMember(member)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${selected ? 'bg-sky-400/12 ring-1 ring-sky-300/20' : isLive ? 'hover:bg-white/[0.075]' : 'opacity-42 hover:bg-white/[0.04]'}`}><span className="relative shrink-0"><img src={member.image} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" loading="lazy" /><span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#11151d] ${isLive ? 'bg-rose-500' : 'bg-slate-500'}`} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-white/88">{member.nickname}</span><span className="mt-0.5 block truncate text-[11px] font-bold text-white/38">{statusText}</span></span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${selected ? 'bg-sky-300/15 text-sky-100' : isLive ? 'bg-white/[0.065] text-white/65' : 'bg-white/[0.035] text-white/25'}`}>{selected ? '✓' : '+'}</span></button>;
            })}
          </div>
        </aside>
      </div>
      <p className="mt-4 text-center text-[11px] font-bold leading-5 text-white/30">채팅 버튼은 공식 SOOP 방송 창 하나를 재사용합니다. 모바일에서는 2개 이하 시청을 권장합니다.</p>
    </section>
  );
}

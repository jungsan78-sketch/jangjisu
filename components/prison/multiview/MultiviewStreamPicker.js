function formatViewers(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return '';
  return new Intl.NumberFormat('ko-KR').format(number);
}

export default function MultiviewStreamPicker({ members, statuses, selectedNames, maxStreams, loadState, onAdd }) {
  return (
    <div className="min-w-0 rounded-[20px] bg-black/20 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <div className="text-[11px] font-black text-white/72">스트림 추가 <span className="ml-1 text-white/35">{selectedNames.length}/{maxStreams}</span></div>
        <span className="text-[10px] font-bold text-white/30">5분 갱신</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {members.map((member) => {
          const status = statuses[member.nickname] || {};
          const isLive = Boolean(status.isLive);
          const selected = selectedNames.includes(member.nickname);
          const viewers = formatViewers(status.viewerCount);
          const stateText = isLive ? (viewers ? `${viewers}명` : '방송 중') : loadState === 'error' || String(status.liveState || '').includes('unknown') ? '확인 불가' : loadState === 'ready' ? '오프라인' : '확인 중';
          return (
            <button key={member.nickname} type="button" disabled={selected} onClick={() => onAdd(member)} className={`flex w-[142px] shrink-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition ${selected ? 'bg-sky-400/14 ring-1 ring-sky-300/25' : isLive ? 'bg-white/[0.055] hover:bg-white/[0.095]' : 'bg-white/[0.025] opacity-45 hover:opacity-65'}`}>
              <span className="relative shrink-0">
                <img src={member.image} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/12" loading="lazy" />
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#111722] ${isLive ? 'bg-rose-500' : 'bg-slate-500'}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black text-white/88">{member.nickname}</span>
                <span className="mt-0.5 block truncate text-[10px] font-bold text-white/38">{stateText}</span>
              </span>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sm font-black ${selected ? 'bg-sky-300/15 text-sky-100' : 'bg-white/[0.055] text-white/48'}`}>{selected ? '✓' : '+'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

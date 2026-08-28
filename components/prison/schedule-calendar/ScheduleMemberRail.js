function MemberButton({ entry, active, onClick }) {
  const hasItems = entry.items.length > 0;
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition ${active ? 'bg-cyan-300/12 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18),0_10px_24px_rgba(0,0,0,0.16)]' : 'bg-white/[0.035] text-white/68 hover:bg-white/[0.065] hover:text-white'}`}>
      {entry.image ? <img src={entry.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover shadow-[0_8px_18px_rgba(0,0,0,0.22)]" loading="lazy" referrerPolicy="no-referrer" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.065] text-xs font-black">{entry.member.slice(0, 1)}</span>}
      <span className="min-w-0 flex-1 truncate text-[14px] font-black">{entry.member}</span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${entry.failed ? 'bg-amber-300' : hasItems ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.72)]' : 'bg-slate-600'}`} />
    </button>
  );
}

export default function ScheduleMemberRail({ entries, selected, onSelect }) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-5 rounded-[24px] bg-[#07111f] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_48px_rgba(0,0,0,0.24)]">
        <div className="px-2 pb-3 pt-1 text-[12px] font-black tracking-[0.12em] text-white/45">멤버 일정</div>
        <button type="button" onClick={() => onSelect('all')} className={`mb-2 flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left text-[14px] font-black transition ${selected === 'all' ? 'bg-cyan-300/12 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.18)]' : 'bg-white/[0.035] text-white/68 hover:bg-white/[0.065] hover:text-white'}`}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-[10px]">ALL</span>전체보기</button>
        <div className="max-h-[calc(100vh-180px)] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {entries.map((entry) => <MemberButton key={entry.key} entry={entry} active={selected === entry.key} onClick={() => onSelect(entry.key)} />)}
        </div>
      </div>
    </aside>
  );
}

export function ScheduleMemberChips({ entries, selected, onSelect }) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2 xl:hidden">
      <button type="button" onClick={() => onSelect('all')} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${selected === 'all' ? 'bg-cyan-300/16 text-cyan-50' : 'bg-white/[0.055] text-white/62'}`}>전체보기</button>
      {entries.map((entry) => <button type="button" key={entry.key} onClick={() => onSelect(entry.key)} className={`flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-black ${selected === entry.key ? 'bg-cyan-300/16 text-white' : 'bg-white/[0.055] text-white/62'}`}>{entry.image ? <img src={entry.image} alt="" className="h-6 w-6 rounded-full object-cover" loading="lazy" /> : null}{entry.member}</button>)}
    </div>
  );
}



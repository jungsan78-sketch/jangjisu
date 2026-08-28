function MemberButton({ entry, active, onClick }) {
  const hasItems = entry.items.length > 0;
  return (
    <button type="button" data-active={active ? 'true' : 'false'} onClick={onClick} className={`sou-calendar-member-button flex shrink-0 items-center gap-2 rounded-[15px] border px-2.5 py-1.5 text-left transition ${active ? 'border-cyan-200/25 bg-cyan-300/12 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.12),0_8px_20px_rgba(0,0,0,0.12)]' : 'border-white/[0.06] bg-white/[0.035] text-white/68 hover:bg-white/[0.065] hover:text-white'}`}>
      {entry.image ? <img src={entry.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover shadow-[0_8px_18px_rgba(0,0,0,0.18)]" loading="lazy" referrerPolicy="no-referrer" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.065] text-xs font-black">{entry.member.slice(0, 1)}</span>}
      <span className="whitespace-nowrap text-[13px] font-black">{entry.member}</span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${entry.failed ? 'bg-amber-300' : !entry.loaded ? 'bg-cyan-200/35' : hasItems ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.72)]' : 'bg-slate-600'}`} />
    </button>
  );
}

export default function ScheduleMemberBar({ entries, selected, onSelect }) {
  return (
    <div className="sou-calendar-member-bar mb-3 rounded-[20px] bg-[#07111f] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_12px_32px_rgba(0,0,0,0.16)] sm:p-3">
      <div className="mb-2 px-1 text-[11px] font-black tracking-[-0.01em] text-white/44">멤버 일정 선택</div>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => <MemberButton key={entry.key} entry={entry} active={selected === entry.key} onClick={() => onSelect(entry.key)} />)}
      </div>
    </div>
  );
}

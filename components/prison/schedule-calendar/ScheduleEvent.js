const EVENT_TONES = [
  'bg-cyan-300/14 text-cyan-50 shadow-[inset_3px_0_0_rgba(103,232,249,0.72)]',
  'bg-rose-300/13 text-rose-50 shadow-[inset_3px_0_0_rgba(253,164,175,0.72)]',
  'bg-amber-300/14 text-amber-50 shadow-[inset_3px_0_0_rgba(252,211,77,0.72)]',
  'bg-violet-300/14 text-violet-50 shadow-[inset_3px_0_0_rgba(196,181,253,0.72)]',
  'bg-emerald-300/13 text-emerald-50 shadow-[inset_3px_0_0_rgba(110,231,183,0.72)]',
  'bg-sky-300/14 text-sky-50 shadow-[inset_3px_0_0_rgba(125,211,252,0.72)]',
  'bg-fuchsia-300/13 text-fuchsia-50 shadow-[inset_3px_0_0_rgba(240,171,252,0.72)]',
  'bg-orange-300/14 text-orange-50 shadow-[inset_3px_0_0_rgba(253,186,116,0.72)]',
  'bg-teal-300/14 text-teal-50 shadow-[inset_3px_0_0_rgba(94,234,212,0.72)]',
];

export function getEventTone(index = 0) {
  return EVENT_TONES[Math.abs(Number(index || 0)) % EVENT_TONES.length];
}

export default function ScheduleEvent({ event, showMember = true, compact = false }) {
  const segments = event.segments?.length ? event.segments : [{ time: '', title: event.title }];
  const off = segments.every((segment) => String(segment.title).includes('휴방'));
  return (
    <div className={`overflow-hidden rounded-[12px] ${off ? 'bg-white/[0.045] text-white/48 shadow-[inset_3px_0_0_rgba(148,163,184,0.45)]' : getEventTone(event.colorIndex)}`}>
      {showMember ? (
        <div className="flex items-center gap-1.5 border-b border-white/[0.065] px-2.5 py-1.5">
          {event.memberImage ? <img src={event.memberImage} alt="" className="h-5 w-5 rounded-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : null}
          <span className="truncate text-[10px] font-black text-white/62">{event.member}</span>
        </div>
      ) : null}
      <div className={compact ? 'space-y-1 px-2 py-1.5' : 'space-y-1.5 px-2.5 py-2'}>
        {segments.map((segment, index) => (
          <div key={`${segment.time}-${segment.title}-${index}`} className="grid grid-cols-[38px_minmax(0,1fr)] items-start gap-1.5">
            <span className="pt-px text-[9px] font-black tabular-nums text-white/52">{segment.time}</span>
            <span className={`${compact ? 'text-[10px] leading-4' : 'text-[11px] leading-[1.45]'} min-w-0 break-keep font-bold`}>{segment.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}



const EVENT_TONES = [
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
  'bg-white/[0.025] text-white',
];

const SEGMENT_TONES = [
  'border-cyan-200/15 bg-cyan-300/12 text-cyan-50',
  'border-amber-200/15 bg-amber-300/12 text-amber-50',
  'border-violet-200/15 bg-violet-300/12 text-violet-50',
  'border-rose-200/15 bg-rose-300/12 text-rose-50',
  'border-emerald-200/15 bg-emerald-300/12 text-emerald-50',
];

export function getEventTone(index = 0) {
  return EVENT_TONES[Math.abs(Number(index || 0)) % EVENT_TONES.length];
}

export default function ScheduleEvent({ event, showMember = true, compact = false }) {
  const segments = event.segments?.length ? event.segments : [{ time: '', title: event.title }];
  const off = segments.every((segment) => String(segment.title).includes('휴방'));
  return (
    <div className={`sou-calendar-event overflow-hidden rounded-[14px] ${off ? 'bg-white/[0.035] text-white/48' : getEventTone(event.colorIndex)}`}>
      {showMember ? (
        <div className="flex items-center gap-1.5 border-b border-white/[0.065] px-2.5 py-1.5">
          {event.memberImage ? <img src={event.memberImage} alt="" className="h-5 w-5 rounded-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : null}
          <span className="truncate text-[12px] font-black text-white/62">{event.member}</span>
        </div>
      ) : null}
      <div className={compact ? 'space-y-1 px-2 py-1.5' : 'space-y-1.5 px-2.5 py-2'}>
        {segments.map((segment, index) => (
          <div key={`${segment.time}-${segment.title}-${index}`} className={`rounded-[11px] border px-2 py-1.5 ${off ? 'border-slate-400/10 bg-slate-300/[0.07] text-white/56' : SEGMENT_TONES[index % SEGMENT_TONES.length]}`}>
            <div className={segment.time ? 'grid grid-cols-[45px_minmax(0,1fr)] items-start gap-1.5' : 'block'}>
              {segment.time ? <span className="inline-flex min-h-5 items-center justify-center rounded-full bg-black/15 px-1 text-[10px] font-black tabular-nums text-white/64">{segment.time}</span> : null}
              <span className={`${compact ? 'text-[12px] leading-[1.48]' : 'text-[14px] leading-[1.55]'} min-w-0 break-keep font-extrabold tracking-[-0.018em]`}>{segment.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

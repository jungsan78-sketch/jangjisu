const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const SCHEDULE_SEGMENT_TONES = [
  'border-sky-200/25 bg-sky-300/[0.22]',
  'border-amber-200/25 bg-amber-300/[0.22]',
  'border-violet-200/25 bg-violet-300/[0.22]',
  'border-rose-200/25 bg-rose-300/[0.22]',
  'border-emerald-200/25 bg-emerald-300/[0.22]',
];

function formatCellHeading(date) {
  return `${date.getDate()}일`;
}

function MemberIdentity({ item, off }) {
  const content = (
    <>
      <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-[10px] font-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ${off ? 'text-rose-100' : 'text-cyan-100'}`}>
        {String(item.member || '?').slice(0, 1)}
        {item.memberImage ? <img src={item.memberImage} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
      </span>
      <span className={`min-w-0 truncate text-[16px] font-black ${off ? 'text-rose-100' : 'text-cyan-100'}`}>{item.member}</span>
    </>
  );

  if (!item.memberStation) return <div className="flex items-center gap-2">{content}</div>;
  return <a href={item.memberStation} target="_blank" rel="noreferrer" aria-label={`${item.member} SOOP 방송국 열기`} className="group/member inline-flex max-w-full items-center gap-2 rounded-full pr-2 transition hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50">{content}<span aria-hidden="true" className="text-[10px] font-black text-white/22 transition group-hover/member:text-white/55">↗</span></a>;
}

function ScheduleLineList({ item, off }) {
  const segments = item.segments?.length ? item.segments : [{ time: '', title: item.title }];
  return (
    <div className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
      {segments.map((segment, index) => (
        <div key={`${segment.time}-${segment.title}-${index}`} className={segment.time ? 'grid grid-cols-[48px_minmax(0,1fr)] items-start gap-2' : 'block'}>
          {segment.time ? <span className="sou-prison-schedule-time inline-flex min-h-8 items-center text-[11px] font-black tabular-nums text-white/64">{segment.time}</span> : null}
          <div className={`sou-prison-schedule-segment min-w-0 rounded-[10px] border px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${off ? 'border-orange-200/20 bg-orange-300/[0.12]' : SCHEDULE_SEGMENT_TONES[index % SCHEDULE_SEGMENT_TONES.length]}`}>
            <span className={`block min-w-0 break-keep text-[14px] font-extrabold leading-6 ${off ? 'text-rose-50' : 'text-white'}`}>{segment.title}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WeeklyAllScheduleView({ dates, groupedSchedules }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="w-full max-w-none rounded-[22px] bg-[linear-gradient(180deg,rgba(4,11,22,0.98),rgba(3,8,18,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_48px_rgba(0,0,0,0.20)] sm:rounded-[28px] sm:p-5">
      <div className="overflow-x-auto">
        <div className="grid min-w-[620px] grid-cols-3 gap-3 xl:min-w-0 xl:w-full xl:gap-4 2xl:gap-5">
          {dates.map((date) => {
            const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            const dayItems = groupedSchedules.get(key) || [];
            const isToday = today.getTime() === date.getTime();
            return (
              <section key={key} className={`rounded-[22px] ${isToday ? 'bg-[linear-gradient(180deg,rgba(7,31,49,0.92),rgba(5,12,24,0.98))] shadow-[inset_0_0_0_1px_rgba(103,232,249,0.08),0_10px_28px_rgba(8,145,178,0.08)]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.006))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'}`}>
                <div className="border-b border-white/5 px-4 py-4">
                  <div className={`text-sm font-black ${date.getDay() === 0 ? 'text-[#ff8e8e]' : date.getDay() === 6 ? 'text-[#89b4ff]' : 'text-white/62'}`}>{WEEKDAY_LABELS[date.getDay()]}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-[28px] font-black text-white">{formatCellHeading(date)}</div>
                    {isToday ? <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] font-black tracking-[0.18em] text-cyan-100">TODAY</span> : null}
                  </div>
                </div>

                <div className="min-h-[360px] max-h-[360px] space-y-3 overflow-y-auto px-4 py-4 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 sm:min-h-[390px] sm:max-h-[390px] 2xl:min-h-[420px] 2xl:max-h-[420px]">
                  {dayItems.length === 0 ? <div className="text-sm font-bold text-white/36">등록된 일정이 없습니다.</div> : dayItems.map((item, index) => {
                    const off = String(item.title || '').includes('휴방');
                    return (
                      <div key={`${item.member}-${item.title}-${index}`} className={`rounded-[18px] px-3 py-3 ${off ? 'bg-[linear-gradient(180deg,rgba(251,146,60,0.08),rgba(120,53,15,0.05))] shadow-[inset_0_0_0_1px_rgba(251,146,60,0.10)]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.01))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'}`}>
                        <MemberIdentity item={item} off={off} />
                        <ScheduleLineList item={item} off={off} />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const numberFormat = new Intl.NumberFormat('ko-KR');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function calendarCells(monthKey, days) {
  const [year, month] = monthKey.split('-').map(Number);
  const count = new Date(year, month, 0).getDate();
  const leading = new Date(year, month - 1, 1).getDay();
  const byDay = new Map((days || []).map((item) => [item.day, item]));
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: count }, (_, index) => ({ day: index + 1, data: byDay.get(index + 1) || null })),
  ];
}

function Metric({ label, value, suffix, tone, pending = false }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2.5">
      <div className="text-[10px] font-black tracking-[0.08em] text-white/35">{label}</div>
      <div className={`mt-1 text-sm font-black ${pending ? 'animate-pulse text-white/45' : tone}`}>
        {pending ? '확인 중' : `${numberFormat.format(value || 0)}${suffix}`}
      </div>
    </div>
  );
}

export default function BroadcastDataCalendar({ monthKey, member, verifying }) {
  if (!member) return null;
  const cells = calendarCells(monthKey, member.days);

  return (
    <section className="rounded-[26px] border border-white/[0.07] bg-[#07111f] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <a href={`https://www.sooplive.com/station/${member.id}`} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={member.image} alt={`${member.nickname} 프로필`} className="h-12 w-12 rounded-full border border-cyan-200/25 object-cover shadow-[0_0_24px_rgba(34,211,238,0.12)]" />
          </a>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-white">{member.nickname} 방송 데이터</h2>
          </div>
        </div>
        <div className={`rounded-full px-3 py-2 text-xs font-black ${verifying ? 'bg-cyan-300/10 text-cyan-100' : 'bg-emerald-300/10 text-emerald-100'}`}>
          {verifying ? '데이터 확인 중' : '업데이트 완료'}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[760px] grid-cols-7 gap-2 text-center">
          {WEEKDAYS.map((weekday, index) => (
            <div key={weekday} className={`py-2 text-xs font-black ${index === 0 ? 'text-rose-300' : index === 6 ? 'text-sky-300' : 'text-white/40'}`}>{weekday}</div>
          ))}
          {cells.map((cell, index) => {
          if (!cell) return <div key={`blank-${index}`} className="min-h-[112px] rounded-2xl bg-white/[0.012] sm:min-h-[148px]" />;
          const data = cell.data;
          const active = Boolean(data && (data.donations || data.peakViewers));
          return (
            <article key={cell.day} className={`relative min-h-[112px] overflow-hidden rounded-2xl border p-2 text-left sm:min-h-[148px] sm:p-3 ${active ? 'border-white/[0.09] bg-white/[0.045]' : 'border-white/[0.035] bg-black/10'}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-black text-white/80">{cell.day}</span>
              </div>
              {active ? (
                <div className="mt-3 grid gap-2">
                  <Metric label="별풍선" value={data.donations} suffix="개" tone="text-cyan-200" />
                  <Metric label="최고 시청자" value={data.peakViewers} suffix="명" tone="text-violet-200" pending={verifying && !data.peakViewers} />
                </div>
              ) : <div className="mt-7 text-center text-[11px] font-bold text-white/20">기록 없음</div>}
            </article>
          );
          })}
        </div>
      </div>
    </section>
  );
}

import ReplayDayPopover from './ReplayDayPopover';

const numberFormat = new Intl.NumberFormat('ko-KR');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function calendarCells(monthKey, days, replayDays) {
  const [year, month] = monthKey.split('-').map(Number);
  const count = new Date(year, month, 0).getDate();
  const leading = new Date(year, month - 1, 1).getDay();
  const dataByDay = new Map((days || []).map((item) => [Number(item.day), item]));
  const replayByDay = new Map((replayDays || []).map((item) => [Number(item.dayNumber), item.broadcasts || []]));
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: count }, (_, index) => ({
      day: index + 1,
      data: dataByDay.get(index + 1) || null,
      replays: replayByDay.get(index + 1) || [],
    })),
  ];
}

function formatBroadcastTime(minutes) {
  const total = Math.max(0, Math.floor(Number(minutes || 0)));
  const hours = Math.floor(total / 60);
  const remain = total % 60;
  if (hours && remain) return `${hours}시간 ${remain}분`;
  if (hours) return `${hours}시간`;
  if (remain) return `${remain}분`;
  return '0분';
}

function replayMinutes(replays) {
  return Math.floor((replays || []).reduce((sum, replay) => sum + Number(replay.durationSeconds || 0), 0) / 60);
}

function Metric({ label, value, suffix, tone, displayValue, pending = false }) {
  return (
    <div className="sou-data-metric rounded-xl bg-black/20 px-2.5 py-2">
      <div className="text-[9px] font-black tracking-[0.06em] text-white/35 sm:text-[10px]">{label}</div>
      <div className={`mt-1 truncate text-xs font-black sm:text-sm ${pending ? 'animate-pulse text-white/45' : tone}`}>
        {pending ? '확인 중' : (displayValue || `${numberFormat.format(value || 0)}${suffix}`)}
      </div>
    </div>
  );
}

export default function BroadcastDataCalendar({ monthKey, member, verifying, replayPayload, replayLoading }) {
  if (!member) return null;
  const cells = calendarCells(monthKey, member.days, replayPayload?.items);

  return (
    <section className="rounded-[26px] border border-white/[0.07] bg-[#07111f] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <a href={`https://www.sooplive.com/station/${member.id}`} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={member.image} alt={`${member.nickname} 프로필`} className="h-12 w-12 rounded-full border border-cyan-200/25 object-cover shadow-[0_0_24px_rgba(34,211,238,0.12)]" />
          </a>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="truncate text-xl font-black text-white">{member.nickname} 방송 데이터</h2>
              <span className="text-[11px] font-bold text-teal-100/45">(다시보기 제목에 마우스를 올리거나 누르면 목록이 나타납니다)</span>
            </div>
          </div>
        </div>
        <div className={`rounded-full px-3 py-2 text-xs font-black ${verifying || replayLoading ? 'bg-cyan-300/10 text-cyan-100' : 'bg-emerald-300/10 text-emerald-100'}`}>
          {verifying || replayLoading ? '데이터 확인 중' : '업데이트 완료'}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[850px] grid-cols-7 gap-2 text-center">
          {WEEKDAYS.map((weekday, index) => (
            <div key={weekday} className={`py-2 text-xs font-black ${index === 0 ? 'text-rose-300' : index === 6 ? 'text-sky-300' : 'text-white/40'}`}>{weekday}</div>
          ))}
          {cells.map((cell, index) => {
            if (!cell) return <div key={`blank-${index}`} className="min-h-[176px] rounded-2xl bg-white/[0.012]" />;
            const data = cell.data;
            const replays = cell.replays || [];
            const dailyBroadcastMinutes = Number(data?.broadcastMinutes || 0) || replayMinutes(replays);
            const active = Boolean(data && (data.donations || data.peakViewers || dailyBroadcastMinutes)) || replays.length > 0;
            return (
              <article key={cell.day} className={`sou-data-day relative min-h-[176px] rounded-2xl border p-2 text-left sm:p-3 ${active ? 'border-white/[0.09] bg-white/[0.045]' : 'border-white/[0.035] bg-black/10'}`}>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="shrink-0 text-sm font-black text-white/80">{cell.day}일</span>
                  <ReplayDayPopover replays={replays} />
                </div>
                {active ? (
                  <div className="mt-3 grid gap-1.5">
                    <Metric label="별풍선" value={data?.donations} suffix="개" tone="text-cyan-200" />
                    <Metric label="최고 시청자" value={data?.peakViewers} suffix="명" tone="text-violet-200" pending={verifying && !data?.peakViewers} />
                    <Metric label="방송시간" displayValue={formatBroadcastTime(dailyBroadcastMinutes)} tone="text-amber-100" />
                  </div>
                ) : <div className="mt-14 text-center text-[11px] font-bold text-white/20">기록 없음</div>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}


const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatWeeklyHeading(date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_LABELS[date.getDay()]})`;
}

export default function WeeklyAllScheduleView({ dates, onMoveWeek, groupedSchedules }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#05101d] p-3 sm:rounded-[28px] sm:p-5">
      <div className="mb-4 flex flex-col gap-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:rounded-[24px] sm:p-4">
        <div>
          <div className="text-[11px] font-black tracking-[0.2em] text-cyan-200/65 sm:text-xs">ALL MEMBERS · WEEKLY VIEW</div>
          <div className="mt-1 text-[18px] font-black text-white sm:text-[24px]">최근 7일 전체 일정</div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={() => onMoveWeek(-7)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/78 transition hover:bg-white/[0.08] hover:text-white sm:px-4 sm:text-xs">← 이전 7일</button>
          <button type="button" onClick={() => onMoveWeek(7)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/78 transition hover:bg-white/[0.08] hover:text-white sm:px-4 sm:text-xs">다음 7일 →</button>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-5">
        {dates.map((date) => {
          const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          const dayItems = groupedSchedules.get(key) || [];
          const isToday = today.getTime() === date.getTime();
          return (
            <section key={key} className={`rounded-[20px] border px-4 py-4 sm:rounded-[24px] sm:px-5 sm:py-5 ${isToday ? 'border-cyan-300/30 bg-[linear-gradient(180deg,rgba(6,30,48,0.88),rgba(5,12,24,0.96))] shadow-[0_0_0_1px_rgba(103,232,249,0.10)]' : 'border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]'}`}>
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/8 pb-3 sm:mb-4 sm:pb-4">
                <div className="text-[18px] font-black text-white sm:text-[24px]">{formatWeeklyHeading(date)}</div>
                {isToday ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-cyan-100 sm:text-[11px]">TODAY</span> : null}
              </div>

              {dayItems.length === 0 ? <div className="text-sm font-bold text-white/42">등록된 일정이 없습니다.</div> : <div className="divide-y divide-white/8">{dayItems.map((item, index) => {
                const off = String(item.title || '').includes('휴방');
                return <div key={`${item.member}-${item.title}-${index}`} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-5">
                  <div className={`min-w-[88px] text-[16px] font-black sm:min-w-[110px] sm:text-[19px] ${off ? 'text-rose-100' : 'text-cyan-100'}`}>{item.member}</div>
                  <div className={`flex-1 border-l border-white/8 pl-3 text-[15px] font-semibold leading-7 break-keep sm:pl-4 sm:text-[17px] ${off ? 'text-rose-50' : 'text-white/92'}`}>{item.title}</div>
                </div>;
              })}</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

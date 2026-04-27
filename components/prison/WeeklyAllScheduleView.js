const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatCellHeading(date) {
  return `${date.getDate()}일`;
}

export default function WeeklyAllScheduleView({ dates, groupedSchedules }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="w-full max-w-none rounded-[22px] bg-[linear-gradient(180deg,rgba(4,11,22,0.98),rgba(3,8,18,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_18px_48px_rgba(0,0,0,0.20)] sm:rounded-[28px] sm:p-5">
      <div className="mb-4 rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.008))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:mb-5 sm:rounded-[24px] sm:p-4">
        <div className="text-[11px] font-black tracking-[0.2em] text-cyan-200/55 sm:text-xs">ALL MEMBERS · WEEKLY CALENDAR</div>
        <div className="mt-1 text-[18px] font-black text-white sm:text-[24px]">전체 일정 주간 보기</div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-5 gap-3 xl:min-w-0 xl:w-full xl:gap-4 2xl:gap-5">
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
                        <div className={`text-[16px] font-black ${off ? 'text-rose-100' : 'text-cyan-100'}`}>{item.member}</div>
                        <div className={`mt-2 border-t border-white/5 pt-2 text-[15px] font-semibold leading-6 break-keep ${off ? 'text-rose-50' : 'text-white/92'}`}>{item.title}</div>
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

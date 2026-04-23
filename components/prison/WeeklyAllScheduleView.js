const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatCellHeading(date) {
  return `${date.getDate()}일`;
}

export default function WeeklyAllScheduleView({ dates, onMoveDay, groupedSchedules }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#05101d] p-3 sm:rounded-[28px] sm:p-5">
      <div className="mb-4 rounded-[20px] border border-white/8 bg-white/[0.03] p-3 sm:mb-5 sm:rounded-[24px] sm:p-4">
        <div className="text-[11px] font-black tracking-[0.2em] text-cyan-200/65 sm:text-xs">ALL MEMBERS · WEEKLY CALENDAR</div>
        <div className="mt-1 text-[18px] font-black text-white sm:text-[24px]">전체 일정 주간 보기</div>
        <div className="mt-4 flex items-center justify-center gap-3 sm:mt-5 sm:gap-4">
          <button type="button" onClick={() => onMoveDay(-1)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black text-white/78 transition hover:bg-white/[0.08] hover:text-white sm:px-5 sm:text-xs">← 이전 날짜</button>
          <div className="text-[11px] font-black tracking-[0.16em] text-white/34 sm:text-xs sm:tracking-[0.22em]">TODAY CENTER</div>
          <button type="button" onClick={() => onMoveDay(1)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black text-white/78 transition hover:bg-white/[0.08] hover:text-white sm:px-5 sm:text-xs">다음 날짜 →</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-7 gap-3">
          {dates.map((date) => {
            const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            const dayItems = groupedSchedules.get(key) || [];
            const isToday = today.getTime() === date.getTime();
            return (
              <section key={key} className={`rounded-[22px] border ${isToday ? 'border-cyan-300/35 bg-[linear-gradient(180deg,rgba(8,31,49,0.96),rgba(5,12,24,0.98))] shadow-[0_0_0_1px_rgba(103,232,249,0.12)]' : 'border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]'}`}>
                <div className="border-b border-white/8 px-4 py-4">
                  <div className={`text-sm font-black ${date.getDay() === 0 ? 'text-[#ff8e8e]' : date.getDay() === 6 ? 'text-[#89b4ff]' : 'text-white/72'}`}>{WEEKDAY_LABELS[date.getDay()]}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-[28px] font-black text-white">{formatCellHeading(date)}</div>
                    {isToday ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-2 py-1 text-[10px] font-black tracking-[0.18em] text-cyan-100">TODAY</span> : null}
                  </div>
                </div>

                <div className="min-h-[360px] space-y-3 px-4 py-4">
                  {dayItems.length === 0 ? <div className="text-sm font-bold text-white/38">등록된 일정이 없습니다.</div> : dayItems.map((item, index) => {
                    const off = String(item.title || '').includes('휴방');
                    return (
                      <div key={`${item.member}-${item.title}-${index}`} className={`rounded-[18px] border px-3 py-3 ${off ? 'border-orange-300/18 bg-orange-300/8' : 'border-white/8 bg-white/[0.03]'}`}>
                        <div className={`text-[16px] font-black ${off ? 'text-rose-100' : 'text-cyan-100'}`}>{item.member}</div>
                        <div className={`mt-2 border-t border-white/8 pt-2 text-[15px] font-semibold leading-6 break-keep ${off ? 'text-rose-50' : 'text-white/92'}`}>{item.title}</div>
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

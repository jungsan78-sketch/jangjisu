const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function formatCellHeading(date) {
  return `${date.getDate()}일`;
}

export default function WeeklyAllScheduleView({ dates, onMoveDay, groupedSchedules }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(4,12,24,0.98),rgba(3,9,19,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_22px_60px_rgba(0,0,0,0.22)] sm:rounded-[28px] sm:p-5">
      <div className="mb-4 rounded-[20px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:mb-5 sm:rounded-[24px] sm:p-4">
        <div className="text-[11px] font-black tracking-[0.2em] text-cyan-200/65 sm:text-xs">ALL MEMBERS · WEEKLY CALENDAR</div>
        <div className="mt-1 text-[18px] font-black text-white sm:text-[24px]">전체 일정 주간 보기</div>
        <div className="mt-4 hidden items-center justify-center gap-3 sm:mt-5 sm:flex sm:gap-4">
          <div className="text-[11px] font-black tracking-[0.16em] text-white/34 sm:text-xs sm:tracking-[0.22em]">TODAY CENTER</div>
        </div>
      </div>

      <div className="relative">
        <button type="button" onClick={() => onMoveDay(-1)} className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(17,27,42,0.96),rgba(10,18,30,0.96))] px-4 py-3 text-[12px] font-black text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:border-white/12 hover:bg-[linear-gradient(180deg,rgba(26,39,60,0.96),rgba(13,22,36,0.96))] hover:text-white lg:inline-flex">← 이전 날짜</button>
        <button type="button" onClick={() => onMoveDay(1)} className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(17,27,42,0.96),rgba(10,18,30,0.96))] px-4 py-3 text-[12px] font-black text-white/82 shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:border-white/12 hover:bg-[linear-gradient(180deg,rgba(26,39,60,0.96),rgba(13,22,36,0.96))] hover:text-white lg:inline-flex">다음 날짜 →</button>

        <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
          <button type="button" onClick={() => onMoveDay(-1)} className="rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(17,27,42,0.96),rgba(10,18,30,0.96))] px-4 py-2.5 text-[11px] font-black text-white/82 transition hover:border-white/12 hover:text-white">← 이전 날짜</button>
          <div className="text-[10px] font-black tracking-[0.16em] text-white/34">TODAY CENTER</div>
          <button type="button" onClick={() => onMoveDay(1)} className="rounded-full border border-white/8 bg-[linear-gradient(180deg,rgba(17,27,42,0.96),rgba(10,18,30,0.96))] px-4 py-2.5 text-[11px] font-black text-white/82 transition hover:border-white/12 hover:text-white">다음 날짜 →</button>
        </div>

        <div className="overflow-x-auto lg:px-6">
          <div className="grid min-w-[980px] grid-cols-7 gap-3">
            {dates.map((date) => {
              const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
              const dayItems = groupedSchedules.get(key) || [];
              const isToday = today.getTime() === date.getTime();
              return (
                <section key={key} className={`rounded-[22px] border ${isToday ? 'border-cyan-300/22 bg-[linear-gradient(180deg,rgba(7,32,51,0.94),rgba(5,12,24,0.98))] shadow-[inset_0_0_0_1px_rgba(103,232,249,0.06),0_12px_30px_rgba(8,145,178,0.10)]' : 'border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.008))] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'}`}>
                  <div className="border-b border-white/6 px-4 py-4">
                    <div className={`text-sm font-black ${date.getDay() === 0 ? 'text-[#ff8e8e]' : date.getDay() === 6 ? 'text-[#89b4ff]' : 'text-white/68'}`}>{WEEKDAY_LABELS[date.getDay()]}</div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-[28px] font-black text-white">{formatCellHeading(date)}</div>
                      {isToday ? <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black tracking-[0.18em] text-cyan-100">TODAY</span> : null}
                    </div>
                  </div>

                  <div className="min-h-[360px] max-h-[360px] space-y-3 overflow-y-auto px-4 py-4 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {dayItems.length === 0 ? <div className="text-sm font-bold text-white/38">등록된 일정이 없습니다.</div> : dayItems.map((item, index) => {
                      const off = String(item.title || '').includes('휴방');
                      return (
                        <div key={`${item.member}-${item.title}-${index}`} className={`rounded-[18px] border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] ${off ? 'border-orange-300/12 bg-[linear-gradient(180deg,rgba(251,146,60,0.09),rgba(120,53,15,0.06))]' : 'border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0.012))]'}`}>
                          <div className={`text-[16px] font-black ${off ? 'text-rose-100' : 'text-cyan-100'}`}>{item.member}</div>
                          <div className={`mt-2 border-t border-white/6 pt-2 text-[15px] font-semibold leading-6 break-keep ${off ? 'text-rose-50' : 'text-white/92'}`}>{item.title}</div>
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
    </div>
  );
}

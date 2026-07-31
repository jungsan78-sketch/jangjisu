export default function BroadcastSummaryMonthTabs({ months, selectedMonthKey, onSelect, loadingMonthKey }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="다시보기 달력 월 선택">
      {months.map((month) => {
        const active = month.monthKey === selectedMonthKey;
        const loading = month.monthKey === loadingMonthKey;
        return (
          <button
            key={month.monthKey}
            type="button"
            onClick={() => onSelect(month.monthKey)}
            aria-pressed={active}
            className={`rounded-full border px-4 py-2 text-[13px] font-black transition-all duration-200 sm:text-[14px] ${
              active
                ? 'border-teal-200/45 bg-teal-300/18 text-teal-50 shadow-[0_0_20px_rgba(45,212,191,0.10)]'
                : 'border-white/10 bg-white/[0.045] text-white/58 hover:border-teal-200/25 hover:bg-teal-300/[0.08] hover:text-white/85'
            }`}
          >
            {month.buttonLabel}{loading ? ' · 불러오는 중' : ''}
          </button>
        );
      })}
    </div>
  );
}

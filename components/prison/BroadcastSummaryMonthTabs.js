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
            className={`min-w-[112px] rounded-2xl border px-5 py-3 text-base font-black transition-all duration-200 sm:min-w-[128px] ${
              active
                ? 'border-cyan-100/55 bg-cyan-300 text-[#06111a] shadow-[0_10px_30px_rgba(103,232,249,0.2)]'
                : 'border-white/10 bg-white/[0.06] text-white/65 hover:border-white/20 hover:bg-white/[0.1] hover:text-white'
            }`}
          >
            {month.buttonLabel}{loading ? ' · 불러오는 중' : ''}
          </button>
        );
      })}
    </div>
  );
}

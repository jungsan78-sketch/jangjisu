import React from 'react';

function clsx(...items) {
  return items.filter(Boolean).join(' ');
}

function parseDateParts(dateText = '') {
  const monthMatch = String(dateText).match(/(\d+)월/);
  const dayMatch = String(dateText).match(/(\d+)일/);
  return {
    month: monthMatch ? Number(monthMatch[1]) : null,
    day: dayMatch ? Number(dayMatch[1]) : null,
  };
}

function isTodayItem(item) {
  const { month, day } = parseDateParts(item?.date || '');
  const now = new Date();
  return month === now.getMonth() + 1 && day === now.getDate();
}

function isOffItem(item) {
  return String(item?.title || '').includes('휴방');
}

function buildMonthMatrix(items, monthLabel = '') {
  const parsedMonth = monthLabel.match(/(\d+)월/);
  const month = parsedMonth ? Number(parsedMonth[1]) : new Date().getMonth() + 1;
  const yearMatch = monthLabel.match(/(\d{4})/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();

  const itemMap = new Map();
  items.forEach((item) => {
    const parts = parseDateParts(item.date || '');
    if (parts.month === month && parts.day) {
      itemMap.set(parts.day, item);
    }
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ empty: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, item: itemMap.get(day) || null });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { month, year, weeks };
}

function BigScheduleCard({ item }) {
  const today = isTodayItem(item);
  const off = isOffItem(item);
  const { month, day } = parseDateParts(item.date || '');

  return (
    <div
      className={clsx(
        'rounded-[28px] border p-6 transition duration-300',
        today
          ? 'border-cyan-300/35 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(11,15,23,0.96))] shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_18px_40px_rgba(14,165,233,0.12)]'
          : off
            ? 'border-orange-300/20 bg-[linear-gradient(180deg,rgba(251,146,60,0.10),rgba(11,15,23,0.96))]'
            : 'border-white/10 bg-[#0b0f17] hover:border-white/20'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-black leading-none text-white sm:text-5xl">
              {day || '--'}
            </div>
            <div className="pb-1 text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
              {month ? `${month}월` : ''}
            </div>
          </div>
          <div className="mt-2 text-sm text-white/40">{item.day || ''}</div>
        </div>

        <div
          className={clsx(
            'rounded-full border px-3 py-1 text-xs font-semibold',
            off
              ? 'border-orange-300/25 bg-orange-400/15 text-orange-100'
              : today
                ? 'border-cyan-300/25 bg-cyan-300/15 text-cyan-100'
                : 'border-white/10 bg-white/5 text-white/60'
          )}
        >
          {off ? '휴방' : today ? 'TODAY' : item.day || '일정'}
        </div>
      </div>

      <div className="mt-6 text-xl font-semibold leading-8 text-white sm:text-2xl">
        {item.title}
      </div>
    </div>
  );
}

function CalendarCell({ cell }) {
  if (cell.empty) {
    return <div className="min-h-[96px] rounded-2xl border border-white/5 bg-white/[0.02]" />;
  }

  const { day, item } = cell;
  const today = item ? isTodayItem(item) : false;
  const off = item ? isOffItem(item) : false;

  return (
    <div
      className={clsx(
        'min-h-[96px] rounded-2xl border p-3 transition',
        today
          ? 'border-cyan-300/30 bg-cyan-300/10'
          : off
            ? 'border-orange-300/20 bg-orange-400/10'
            : item
              ? 'border-white/10 bg-white/[0.04]'
              : 'border-white/5 bg-white/[0.02]'
      )}
    >
      <div className="text-lg font-black text-white">{day}</div>
      {item ? (
        <div className="mt-2 line-clamp-2 text-xs leading-5 text-white/75">
          {item.title}
        </div>
      ) : (
        <div className="mt-2 text-xs text-white/18">비어 있음</div>
      )}
    </div>
  );
}

export default function ScheduleHybridSection({ monthLabel = '일정', sourceUrl = '', items = [] }) {
  const featured = [...items]
    .sort((a, b) => {
      const aToday = isTodayItem(a) ? 1 : 0;
      const bToday = isTodayItem(b) ? 1 : 0;
      if (aToday !== bToday) return bToday - aToday;
      const aParts = parseDateParts(a.date || '');
      const bParts = parseDateParts(b.date || '');
      return (aParts.day || 999) - (bParts.day || 999);
    })
    .slice(0, 4);

  const matrix = buildMonthMatrix(items, monthLabel);
  const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <section
      id="schedule"
      className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-xl shadow-black/20 lg:p-8"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#3b82f6] text-sm font-bold text-white">
              ●
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              장지수 일정
            </h2>
          </div>
          <p className="mt-3 text-sm text-white/45">{monthLabel}</p>
        </div>

        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            시트 보기
          </a>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1.2fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">핵심 일정</h3>
            <span className="text-xs uppercase tracking-[0.25em] text-white/30">featured</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((item) => (
              <BigScheduleCard key={`${item.date}-${item.title}`} item={item} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">달력 보기</h3>
            <span className="text-xs uppercase tracking-[0.25em] text-white/30">
              {matrix.year}.{String(matrix.month).padStart(2, '0')}
            </span>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0b0f17] p-4">
            <div className="mb-3 grid grid-cols-7 gap-2">
              {weekdayNames.map((day) => (
                <div
                  key={day}
                  className={clsx(
                    'px-2 py-1 text-center text-xs font-semibold',
                    day === '일'
                      ? 'text-rose-300/80'
                      : day === '토'
                        ? 'text-cyan-300/80'
                        : 'text-white/40'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              {matrix.weeks.map((week, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2">
                  {week.map((cell, i) => (
                    <CalendarCell key={`${idx}-${i}`} cell={cell} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

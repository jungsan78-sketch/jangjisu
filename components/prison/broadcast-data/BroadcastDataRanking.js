const numberFormat = new Intl.NumberFormat('ko-KR');

function formatBroadcastTime(minutes) {
  const totalMinutes = Number(minutes || 0);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (!hours) return `${remainingMinutes}분`;
  if (!remainingMinutes) return `${hours}시간`;
  return `${hours}시간 ${remainingMinutes}분`;
}

export default function BroadcastDataRanking({ rankings, mode, onModeChange, selectedMemberId, onSelectMember }) {
  const items = rankings?.[mode] || [];
  const donationMode = mode === 'donations';
  const cumulativeMode = mode === 'cumulativeViewers';
  const broadcastTimeMode = mode === 'broadcastMinutes';

  return (
    <section className="rounded-[26px] border border-white/[0.07] bg-[#07111f] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">이번 달 방송 순위</h2>
          <p className="mt-2 text-sm font-bold text-white/45">멤버를 누르면 아래 달력이 해당 멤버 기준으로 바뀝니다.</p>
        </div>
        <div className="flex rounded-2xl border border-white/8 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => onModeChange('peakViewers')}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${!donationMode && !cumulativeMode && !broadcastTimeMode ? 'bg-violet-300 text-[#0b0814] shadow-[0_8px_24px_rgba(196,181,253,0.18)]' : 'text-white/55 hover:text-white'}`}
          >
            최고 시청자 순위
          </button>
          <button
            type="button"
            onClick={() => onModeChange('cumulativeViewers')}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${cumulativeMode ? 'bg-emerald-300 text-[#06110d] shadow-[0_8px_24px_rgba(110,231,183,0.18)]' : 'text-white/55 hover:text-white'}`}
          >
            누적 시청자 순위
          </button>
          <button
            type="button"
            onClick={() => onModeChange('broadcastMinutes')}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${broadcastTimeMode ? 'bg-amber-300 text-[#160f03] shadow-[0_8px_24px_rgba(252,211,77,0.18)]' : 'text-white/55 hover:text-white'}`}
          >
            방송시간 순위
          </button>
          <button
            type="button"
            onClick={() => onModeChange('donations')}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${donationMode ? 'bg-cyan-300 text-[#06111a] shadow-[0_8px_24px_rgba(103,232,249,0.18)]' : 'text-white/55 hover:text-white'}`}
          >
            별풍선 순위
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((member, index) => {
          const selected = member.id === selectedMemberId;
          const value = donationMode
            ? member.donations
            : cumulativeMode
              ? member.cumulativeViewers
              : broadcastTimeMode
                ? member.broadcastMinutes
                : member.peakViewers;
          return (
            <button
              type="button"
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className={`sou-data-rank group flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${selected ? 'border-cyan-200/35 bg-cyan-300/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'border-white/[0.06] bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.06]'}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${index < 3 ? 'bg-amber-300/15 text-amber-100' : 'bg-white/[0.05] text-white/45'}`}>{index + 1}</span>
              <img src={member.image} alt="" className="h-10 w-10 shrink-0 rounded-full border border-white/15 object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-white">{member.nickname}</span>
                <span className={`mt-1 block truncate text-xs font-black ${donationMode ? 'text-cyan-200' : cumulativeMode ? 'text-emerald-200' : broadcastTimeMode ? 'text-amber-200' : 'text-violet-200'}`}>
                  {!member.monthlyReady
                    ? '집계 중'
                    : broadcastTimeMode
                      ? formatBroadcastTime(value)
                      : `${numberFormat.format(value)}${donationMode ? '개' : '명'}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}


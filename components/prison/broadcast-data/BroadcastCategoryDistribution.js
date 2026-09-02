import { useMemo } from 'react';

const COLORS = ['#67e8f9', '#c4b5fd', '#fcd34d', '#6ee7b7', '#fda4af', '#93c5fd', '#fdba74', '#d8b4fe'];
const numberFormat = new Intl.NumberFormat('ko-KR');

function formatDuration(totalSeconds) {
  const seconds = Number(totalSeconds || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (!hours) return `${minutes}분`;
  if (!minutes) return `${numberFormat.format(hours)}시간`;
  return `${numberFormat.format(hours)}시간 ${minutes}분`;
}

function makeDisplayItems(payload) {
  const items = [...(payload?.items || [])];
  if (payload?.adultSec > 0) items.push({ category: '성인 방송', totalSec: payload.adultSec, broadcastCount: 0 });
  if (payload?.passwordSec > 0) items.push({ category: '비밀번호 방송', totalSec: payload.passwordSec, broadcastCount: 0 });
  items.sort((a, b) => b.totalSec - a.totalSec);
  if (items.length <= 8) return items;
  return [
    ...items.slice(0, 7),
    {
      category: '기타',
      totalSec: items.slice(7).reduce((sum, item) => sum + Number(item.totalSec || 0), 0),
      broadcastCount: items.slice(7).reduce((sum, item) => sum + Number(item.broadcastCount || 0), 0),
    },
  ];
}

function makeGradient(items) {
  const total = items.reduce((sum, item) => sum + Number(item.totalSec || 0), 0);
  if (!total) return '#152235';
  let cursor = 0;
  const stops = items.map((item, index) => {
    const start = cursor;
    cursor += (Number(item.totalSec || 0) / total) * 100;
    return `${COLORS[index % COLORS.length]} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export default function BroadcastCategoryDistribution({ member, payload, loading }) {
  const items = useMemo(() => makeDisplayItems(payload), [payload]);
  const total = items.reduce((sum, item) => sum + Number(item.totalSec || 0), 0);
  const gradient = useMemo(() => makeGradient(items), [items]);

  return (
    <section className="rounded-[26px] border border-white/[0.07] bg-[#07111f] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.22)] sm:p-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-white">카테고리 분포</h2>
        <p className="mt-2 text-sm font-bold text-white/45">
          {member?.nickname || '선택한 멤버'}의 {payload?.monthLabel || '선택한 달'} 방송시간 기준입니다.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 grid animate-pulse gap-5 lg:grid-cols-[260px_1fr]">
          <div className="mx-auto h-52 w-52 rounded-full bg-white/[0.05]" />
          <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-[74px] rounded-2xl bg-white/[0.05]" />)}</div>
        </div>
      ) : !items.length ? (
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-12 text-center text-sm font-black text-white/40">
          {payload?.unavailable ? '카테고리 분포를 잠시 불러오지 못했습니다.' : '이 달에 집계된 카테고리 데이터가 없습니다.'}
        </div>
      ) : (
        <div className="mt-6 grid items-center gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
          <div className="relative mx-auto h-52 w-52 sm:h-56 sm:w-56">
            <div className="absolute inset-0 rounded-full shadow-[0_20px_55px_rgba(0,0,0,0.35)]" style={{ background: gradient }} />
            <div className="absolute inset-[24%] flex flex-col items-center justify-center rounded-full border border-white/[0.08] bg-[#07111f] text-center shadow-[0_0_35px_rgba(7,17,31,0.8)]">
              <span className="text-[11px] font-black text-white/35">총 방송시간</span>
              <strong className="mt-1 px-2 text-lg font-black text-white sm:text-xl">{formatDuration(payload?.totalSec || total)}</strong>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {items.map((item, index) => {
              const share = total ? (Number(item.totalSec || 0) / total) * 100 : 0;
              return (
                <div key={`${item.category}-${index}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <strong className="truncate text-sm font-black text-white">{item.category}</strong>
                    </span>
                    <strong className="shrink-0 text-sm font-black text-white">{share.toFixed(1)}%</strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-white/38">
                    <span>{formatDuration(item.totalSec)}</span>
                    {item.broadcastCount > 0 ? <span>{numberFormat.format(item.broadcastCount)}회 방송</span> : <span />}
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, share)}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {payload?.stale ? <p className="mt-4 text-right text-[11px] font-bold text-amber-200/45">이전 캐시를 표시하고 있습니다.</p> : null}
    </section>
  );
}


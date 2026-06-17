import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import DreamServerLayout from '../components/dream/DreamServerLayout';

const POST_URL = 'https://www.sooplive.com/station/chaenna02/post/196058089';
const POLL_INTERVAL_MS = 30 * 1000;

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function formatFetchedAt(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-300/15 text-lg font-black text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.16)]">1</span>;
  if (rank === 2) return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/25 bg-slate-200/10 text-lg font-black text-slate-100">2</span>;
  if (rank === 3) return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200/25 bg-orange-300/10 text-lg font-black text-orange-100">3</span>;
  return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white/55">{rank}</span>;
}

function RankingRow({ item }) {
  return (
    <div className="grid gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:border-cyan-200/20 sm:grid-cols-[52px_1fr_auto] sm:items-center sm:p-5">
      <RankBadge rank={item.rank} />
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {item.profileImage ? <img src={item.profileImage} alt="" className="h-10 w-10 rounded-full border border-white/10 object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm font-black text-cyan-100">{String(item.nickname || '?').slice(0, 1)}</div>}
          <div className="min-w-0"><div className="truncate text-base font-black text-white">{item.nickname}</div><div className="mt-0.5 text-xs font-bold text-white/35">댓글 {formatNumber(item.commentCount)}개</div></div>
        </div>
        {item.latestComment ? <div className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-white/50">{item.latestComment}</div> : null}
      </div>
      <div className="rounded-[20px] border border-cyan-200/15 bg-cyan-300/10 px-5 py-3 text-right">
        <div className="text-[10px] font-black tracking-[0.18em] text-cyan-100/45">TOTAL UP</div>
        <div className="mt-1 whitespace-nowrap text-2xl font-black tabular-nums text-cyan-200">{formatNumber(item.upCount)}</div>
      </div>
    </div>
  );
}

export default function JisuDreamPage() {
  const [state, setState] = useState({ loading: true, error: '', ranking: [], participantCount: 0, commentCount: 0, totalUpCount: 0, fetchedAt: '' });
  const [refreshing, setRefreshing] = useState(false);

  const loadRanking = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch(`/api/jisu-dream-up-ranking?t=${Date.now()}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'UP 순위를 불러오지 못했습니다.');
      setState({
        loading: false,
        error: '',
        ranking: Array.isArray(payload.ranking) ? payload.ranking : [],
        participantCount: Number(payload.participantCount || 0),
        commentCount: Number(payload.commentCount || 0),
        totalUpCount: Number(payload.totalUpCount || 0),
        fetchedAt: payload.fetchedAt || '',
      });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error?.message || 'UP 순위를 불러오지 못했습니다.' }));
    } finally {
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRanking();
    const timer = setInterval(() => loadRanking(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const topThree = useMemo(() => state.ranking.slice(0, 3), [state.ranking]);

  return (
    <>
      <Head>
        <title>지수의꿈 서버 | 장지수 팬 아카이브</title>
        <meta name="description" content="지수의꿈 서버 실시간 UP 순위" />
      </Head>
      <DreamServerLayout>
        <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-32 left-[18%] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" /><div className="absolute right-[-100px] top-16 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl" /><div className="absolute bottom-[-160px] left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" /></div>
        <div className="relative mx-auto max-w-[1380px]">
          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_32%),linear-gradient(135deg,rgba(10,17,31,0.98),rgba(7,10,19,0.98))] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.34)] lg:p-9">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black/25 text-[8px]">UP</span> LIVE RANKING</div>
                <h1 className="mt-5 text-[38px] font-black tracking-tight text-white sm:text-[52px]">지수의꿈 UP순</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/52 sm:text-base">지정된 SOOP 게시글 댓글 참여자들의 UP 합계를 30초 간격으로 갱신합니다.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a href={POST_URL} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/70 transition hover:bg-white/10">SOOP 원본 게시글</a>
                <button onClick={() => loadRanking(true)} disabled={refreshing} className="rounded-full border border-cyan-200/20 bg-cyan-300/12 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/18 disabled:opacity-50">{refreshing ? '갱신중' : '지금 갱신'}</button>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-5"><div className="text-xs font-black text-white/38">참여자</div><div className="mt-2 text-3xl font-black tabular-nums text-white">{formatNumber(state.participantCount)}</div></div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-5"><div className="text-xs font-black text-white/38">댓글</div><div className="mt-2 text-3xl font-black tabular-nums text-white">{formatNumber(state.commentCount)}</div></div>
              <div className="rounded-[22px] border border-cyan-200/15 bg-cyan-300/10 p-5"><div className="text-xs font-black text-cyan-100/45">전체 UP</div><div className="mt-2 text-3xl font-black tabular-nums text-cyan-200">{formatNumber(state.totalUpCount)}</div></div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-5"><div className="text-xs font-black text-white/38">최근 동기화</div><div className="mt-2 text-xl font-black tabular-nums text-white">{formatFetchedAt(state.fetchedAt)}</div></div>
            </div>
          </section>

          <section id="up-ranking" className="mt-7 rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.26)] sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-black tracking-[0.26em] text-cyan-100/35">REALTIME BOARD</div><h2 className="mt-2 text-3xl font-black text-white">UP 순위표</h2></div><div className="text-xs font-bold text-white/35">30초 자동 갱신</div></div>

            {state.loading ? <div className="mt-6 rounded-[26px] border border-white/10 bg-black/20 px-6 py-14 text-center text-sm font-black text-white/45">SOOP 댓글과 UP 데이터를 불러오는 중입니다.</div> : null}
            {!state.loading && state.error ? <div className="mt-6 rounded-[26px] border border-red-200/15 bg-red-400/10 px-6 py-8"><div className="text-base font-black text-red-100">연동 확인이 필요합니다</div><div className="mt-2 text-sm font-semibold leading-6 text-red-100/65">{state.error}</div><div className="mt-3 text-xs font-bold text-white/35">SOOP 댓글 API 경로가 확인되면 이 화면에서 바로 순위가 표시됩니다.</div></div> : null}

            {!state.loading && !state.error && topThree.length > 0 ? <div className="mt-6 grid gap-4 lg:grid-cols-3">{topThree.map((item) => <div key={`top-${item.userId || item.nickname}`} className="rounded-[28px] border border-cyan-200/15 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(255,255,255,0.025))] p-5"><div className="flex items-center justify-between"><RankBadge rank={item.rank} /><div className="text-2xl font-black tabular-nums text-cyan-200">{formatNumber(item.upCount)} UP</div></div><div className="mt-5 text-xl font-black text-white">{item.nickname}</div><div className="mt-2 text-xs font-bold text-white/38">댓글 {formatNumber(item.commentCount)}개</div></div>)}</div> : null}

            {!state.loading && !state.error ? <div className="mt-6 space-y-3">{state.ranking.map((item) => <RankingRow key={`${item.userId || item.nickname}-${item.rank}`} item={item} />)}{state.ranking.length === 0 ? <div className="rounded-[26px] border border-white/10 bg-black/20 px-6 py-14 text-center text-sm font-black text-white/45">아직 집계된 참여자가 없습니다.</div> : null}</div> : null}
          </section>
        </div>
      </DreamServerLayout>
    </>
  );
}

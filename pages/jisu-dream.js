import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import DreamServerLayout from '../components/dream/DreamServerLayout';
import DreamRankingRow, { CutoffDivider } from '../components/dream/DreamRankingRow';

const POST_URL = 'https://www.sooplive.com/station/iamquaddurup/post/198923295';
const POLL_INTERVAL_MS = 30000;
const CUTOFF_RANK = 70;

const formatNumber = (value) => Number(value || 0).toLocaleString('ko-KR');
const participantKey = (item) => String(item?.userId || item?.nickname || '').trim().toLowerCase();

function formatFetchedAt(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function JisuDreamPage() {
  const [state, setState] = useState({ loading: true, error: '', ranking: [], participantCount: 0, commentCount: 0, totalUpCount: 0, fetchedAt: '' });
  const [refreshing, setRefreshing] = useState(false);
  const previousRankingRef = useRef([]);

  const loadRanking = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch(`/api/jisu-dream-up-ranking?t=${Date.now()}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'UP 순위를 불러오지 못했습니다.');

      const rawRanking = Array.isArray(payload.ranking) ? payload.ranking : [];
      const previousMap = new Map(previousRankingRef.current.map((item) => [participantKey(item), item]));
      const changeId = Date.now();
      const ranking = rawRanking.map((item) => {
        const previous = previousMap.get(participantKey(item));
        if (!previous) return { ...item, rankDelta: 0, upDelta: 0, changeId: 0 };
        const rankDelta = Number(previous.rank || 0) - Number(item.rank || 0);
        const upDelta = Number(item.upCount || 0) - Number(previous.upCount || 0);
        return { ...item, rankDelta, upDelta, changeId: rankDelta || upDelta ? changeId : 0 };
      });

      previousRankingRef.current = rawRanking;
      setState({
        loading: false,
        error: '',
        ranking,
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
    const timer = setInterval(loadRanking, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const cutoffUpCount = Number(state.ranking.find((item) => Number(item.rank) === CUTOFF_RANK)?.upCount || 0);

  return (
    <>
      <Head>
        <title>지수의꿈 서버 | 장지수 팬 아카이브</title>
        <meta name="description" content="지수의꿈 서버 실시간 UP 순위" />
      </Head>
      <DreamServerLayout>
        <style jsx global>{`
          @keyframes rankRise { 0% { opacity:.45; transform:translateY(34px) scale(.985) } 55% { opacity:1; transform:translateY(-4px) scale(1.006) } 100% { transform:none } }
          @keyframes rankDrop { 0% { opacity:.45; transform:translateY(-34px) scale(.985) } 55% { opacity:1; transform:translateY(4px) scale(1.006) } 100% { transform:none } }
          @keyframes upPulse { 40% { box-shadow:0 0 0 1px rgba(103,232,249,.22),0 0 40px rgba(34,211,238,.17) } }
        `}</style>

        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 left-[18%] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute right-[-100px] top-16 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1380px]">
          <section className="overflow-hidden rounded-[36px] border border-cyan-200/14 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_38%),linear-gradient(135deg,rgba(10,17,31,0.98),rgba(7,10,19,0.98))] p-4 shadow-[0_28px_100px_rgba(0,0,0,0.38)] sm:p-6 lg:p-8">
            <div className="relative mx-auto max-w-[1040px] overflow-hidden rounded-[30px] border border-white/12 bg-[#06101d] p-2 shadow-[0_20px_70px_rgba(0,0,0,0.42)] sm:p-3">
              <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#07111f]">
                <img src="/jisu-dream-hero.png" alt="지수의꿈" className="block h-auto w-full object-contain" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold leading-7 text-white/58 sm:text-base">지수의꿈 서버 신청자들의 UP을 30초 간격으로 갱신합니다.</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200/15 bg-amber-300/8 px-3 py-2 text-xs font-black text-amber-100/80">현재 합격 커트라인은 70위입니다.</div>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={POST_URL} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/72">SOOP 신청 게시글</a>
                <button onClick={() => loadRanking(true)} disabled={refreshing} className="rounded-full border border-cyan-200/20 bg-cyan-300/12 px-5 py-3 text-sm font-black text-cyan-100 disabled:opacity-50">{refreshing ? '순위 갱신중' : '지금 갱신'}</button>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[['신청자', state.participantCount], ['집계 댓글', state.commentCount], ['누적 UP', state.totalUpCount]].map(([label, value]) => <div key={label} className="rounded-[22px] border border-white/10 bg-black/20 p-5"><div className="text-[11px] font-black text-white/38">{label}</div><div className="mt-2 text-3xl font-black tabular-nums text-white">{formatNumber(value)}</div></div>)}
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-5"><div className="text-[11px] font-black text-white/38">최근 갱신</div><div className="mt-2 text-xl font-black text-white">{formatFetchedAt(state.fetchedAt)}</div></div>
            </div>
          </section>

          <section id="up-ranking" className="mt-7 overflow-hidden rounded-[34px] border border-cyan-200/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.08),transparent_34%),linear-gradient(135deg,rgba(9,20,36,0.98),rgba(8,14,28,0.98))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-7">
            <div className="pointer-events-none absolute inset-x-[18%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(103,232,249,0.28),transparent)]" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="text-3xl font-black text-white">지수의꿈 서버 신청자 순위</h2><p className="mt-2 text-sm font-semibold text-white/50">UP 기준 순위이며, 크루 멤버는 프리패스로 표시됩니다.</p></div>
              <div className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/48">30초 자동 갱신</div>
            </div>

            {state.loading ? <div className="relative mt-6 rounded-[26px] border border-white/[0.07] bg-black/20 px-6 py-14 text-center text-sm font-black text-white/45">순위를 불러오는 중입니다.</div> : null}
            {!state.loading && state.error ? <div className="relative mt-6 rounded-[26px] border border-red-200/15 bg-red-400/10 px-6 py-8 text-red-100">{state.error}</div> : null}
            {!state.loading && !state.error ? <div className="relative mt-6 space-y-3">
              {state.ranking.map((item) => <div key={`${participantKey(item)}-${item.changeId || 0}`}>{item.rank === CUTOFF_RANK + 1 ? <CutoffDivider /> : null}<DreamRankingRow item={item} cutoffUpCount={cutoffUpCount} /></div>)}
              {state.ranking.length === 0 ? <div className="rounded-[26px] border border-white/[0.07] bg-black/20 px-6 py-14 text-center text-white/45">아직 집계된 신청자가 없습니다.</div> : null}
            </div> : null}
          </section>
        </div>
      </DreamServerLayout>
    </>
  );
}

import { getDreamFreePassGroup } from '../../lib/dreamFreePass';

const CUTOFF_RANK = 70;

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function RankBadge({ rank, eliminated = false }) {
  if (eliminated) return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200/15 bg-red-400/10 text-sm font-black text-red-100/55">{rank}</span>;
  if (rank === 1) return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-300/15 text-lg font-black text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.16)]">1</span>;
  if (rank === 2) return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/25 bg-slate-200/10 text-lg font-black text-slate-100">2</span>;
  if (rank === 3) return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200/25 bg-orange-300/10 text-lg font-black text-orange-100">3</span>;
  return <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-black text-white/55">{rank}</span>;
}

function CrewBadge({ group }) {
  const className = group.key === 'hades'
    ? 'border-violet-200/20 bg-[linear-gradient(135deg,rgba(139,92,246,0.22),rgba(76,29,149,0.20))] text-violet-100 shadow-[0_0_16px_rgba(139,92,246,0.12)]'
    : group.key === 'musu'
      ? 'border-cyan-200/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.20),rgba(14,116,144,0.18))] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.11)]'
      : 'border-amber-200/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.20),rgba(180,83,9,0.18))] text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.10)]';
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${className}`}>{group.label}</span>;
}

function ChangeBadge({ item }) {
  const hasRankChange = Number(item.rankDelta || 0) !== 0;
  const hasUpChange = Number(item.upDelta || 0) !== 0;
  if (!hasRankChange && !hasUpChange) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {hasRankChange ? <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${item.rankDelta > 0 ? 'border-emerald-200/20 bg-emerald-300/10 text-emerald-100' : 'border-red-200/18 bg-red-400/10 text-red-100'}`}>{item.rankDelta > 0 ? `+${item.rankDelta} UP` : `-${Math.abs(item.rankDelta)} DOWN`}</span> : null}
      {hasUpChange ? <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${item.upDelta > 0 ? 'border-cyan-200/20 bg-cyan-300/10 text-cyan-100' : 'border-red-200/18 bg-red-400/10 text-red-100'}`}>{item.upDelta > 0 ? `+${formatNumber(item.upDelta)} UP` : `${formatNumber(item.upDelta)} DOWN`}</span> : null}
    </div>
  );
}

export function CutoffDivider() {
  return (
    <div className="relative py-5">
      <div className="absolute inset-x-0 top-1/2 h-px bg-[linear-gradient(90deg,transparent,rgba(248,113,113,0.55),transparent)]" />
      <div className="relative mx-auto flex w-fit items-center gap-3 rounded-full border border-red-200/20 bg-[#160b10] px-5 py-2.5 shadow-[0_0_30px_rgba(239,68,68,0.12)]">
        <span className="h-2 w-2 rounded-full bg-red-300 shadow-[0_0_12px_rgba(248,113,113,0.9)]" />
        <span className="text-[11px] font-black tracking-[0.18em] text-red-100">TOP 70 CUTLINE</span>
        <span className="text-[11px] font-bold text-red-100/55">71위부터 탈락 예정</span>
      </div>
    </div>
  );
}

export default function DreamRankingRow({ item, cutoffUpCount = 0, displayRank }) {
  const group = getDreamFreePassGroup(item);
  const freePass = Boolean(group);
  const effectiveRank = Number(displayRank || item.rank || 0);
  const eliminated = effectiveRank > CUTOFF_RANK && !freePass;
  const isCutoff = effectiveRank === CUTOFF_RANK;
  const extraCommentCount = Math.max(0, Number(item.commentCount || 0) - 1);
  const cutoffGap = eliminated && cutoffUpCount > 0 ? Math.max(1, Number(cutoffUpCount) - Number(item.upCount || 0) + 1) : 0;
  const motionClass = item.rankDelta > 0 ? 'animate-[rankRise_700ms_cubic-bezier(0.22,1,0.36,1)]' : item.rankDelta < 0 ? 'animate-[rankDrop_700ms_cubic-bezier(0.22,1,0.36,1)]' : item.upDelta > 0 ? 'animate-[upPulse_850ms_ease-out]' : '';
  const cardClass = freePass
    ? 'border-emerald-200/16 bg-[radial-gradient(circle_at_16%_0%,rgba(52,211,153,0.10),transparent_34%),linear-gradient(180deg,rgba(16,45,41,0.24),rgba(255,255,255,0.018))]'
    : eliminated
      ? 'border-red-200/10 bg-[linear-gradient(180deg,rgba(239,68,68,0.055),rgba(255,255,255,0.012))] opacity-65 hover:opacity-90'
      : isCutoff
        ? 'border-amber-200/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.10),rgba(255,255,255,0.02))]'
        : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] hover:-translate-y-0.5 hover:border-cyan-200/20';

  return (
    <div className={`relative grid gap-4 overflow-hidden rounded-[24px] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.20)] transition sm:grid-cols-[52px_1fr_auto] sm:items-center sm:p-5 ${motionClass} ${cardClass}`}>
      {freePass ? <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(110,231,183,0.72),transparent)]" /> : isCutoff ? <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.85),transparent)]" /> : null}
      <RankBadge rank={effectiveRank} eliminated={eliminated} />
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {item.profileImage ? <img src={item.profileImage} alt="" className="h-11 w-11 rounded-full border border-white/10 object-cover" /> : <div className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base font-black ${eliminated ? 'text-red-100/45' : 'text-cyan-100'}`}>{String(item.nickname || '?').slice(0, 1)}</div>}
          <div className="min-w-0">
            <div className={`truncate text-lg font-black tracking-[-0.02em] sm:text-xl ${eliminated ? 'text-white/55' : 'text-white'}`}>{item.nickname}</div>
            {(group || extraCommentCount > 0) ? <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{group ? <><CrewBadge group={group} /><span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">프리패스</span></> : null}{extraCommentCount > 0 ? <span className="rounded-full border border-fuchsia-200/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] font-black text-fuchsia-100">추가댓글작성 {extraCommentCount}개</span> : null}</div> : null}
            {(isCutoff || eliminated) ? <div className="mt-1.5 flex flex-wrap items-center gap-2">{isCutoff ? <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black text-amber-100">현재 커트라인</span> : null}{eliminated ? <span className="rounded-full border border-red-200/15 bg-red-400/10 px-2 py-0.5 text-[10px] font-black text-red-100/65">탈락 예정</span> : null}</div> : null}
            {cutoffGap > 0 ? <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-200/15 bg-red-400/8 px-2.5 py-1 text-[11px] font-black text-red-100/70"><span className="h-1.5 w-1.5 rounded-full bg-red-300/80" />커트라인까지 {formatNumber(cutoffGap)} UP 부족</div> : null}
            <ChangeBadge item={item} />
          </div>
        </div>
        {item.latestComment ? <div className={`mt-3 line-clamp-2 text-sm font-semibold leading-6 ${eliminated ? 'text-white/28' : 'text-white/50'}`}>{item.latestComment}</div> : null}
      </div>
      <div className={`rounded-[20px] border px-5 py-3 text-right ${freePass ? 'border-emerald-200/14 bg-emerald-300/8' : eliminated ? 'border-red-200/10 bg-red-400/8' : isCutoff ? 'border-amber-200/20 bg-amber-300/10' : 'border-cyan-200/15 bg-cyan-300/10'}`}>
        <div className={`text-[10px] font-black tracking-[0.18em] ${freePass ? 'text-emerald-100/45' : eliminated ? 'text-red-100/35' : isCutoff ? 'text-amber-100/45' : 'text-cyan-100/45'}`}>UP</div>
        <div className={`mt-1 whitespace-nowrap text-2xl font-black tabular-nums ${freePass ? 'text-emerald-100' : eliminated ? 'text-red-100/50' : isCutoff ? 'text-amber-100' : 'text-cyan-200'}`}>{formatNumber(item.upCount)}</div>
        {item.upDelta > 0 ? <div className="mt-1 text-[11px] font-black text-cyan-100/70">+{formatNumber(item.upDelta)} UP</div> : item.upDelta < 0 ? <div className="mt-1 text-[11px] font-black text-red-100/70">-{formatNumber(Math.abs(item.upDelta))} DOWN</div> : null}
      </div>
    </div>
  );
}

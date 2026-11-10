export const PENALTY_METRICS = [
  { key: 'cumulativeViewers', label: '누적 시청자', weight: 35 },
  { key: 'donations', label: '별풍선', weight: 30 },
  { key: 'peakViewers', label: '최고 시청자', weight: 20 },
  { key: 'broadcastMinutes', label: '방송시간', weight: 15 },
];

export const PENALTY_MAX_SCORE = PENALTY_METRICS.reduce((sum, { weight }) => sum + weight, 0);

function isReady(member) {
  return member?.monthlyReady === true && member.cumulativeReady !== false
    && PENALTY_METRICS.every(({ key }) => typeof member[key] === 'number'
      && Number.isFinite(member[key]) && member[key] >= 0);
}

// Compare each metric independently: existing list tie-breakers must not add weight.
export function buildPenaltyRankings(members = []) {
  const ready = members.filter(isReady);
  const count = ready.length;
  const scored = ready.map((member) => {
    const denominator = 2 * (count - 1);
    let weightedPoints = 0;
    const penaltyBreakdown = PENALTY_METRICS.map(({ key, label, weight }) => {
      const greater = ready.filter((other) => other[key] > member[key]).length;
      const equal = ready.filter((other) => other[key] === member[key]).length;
      const twiceRank = 2 * (1 + greater) + equal - 1;
      const points = weight * (2 * count - twiceRank);
      weightedPoints += points;
      return {
        key, label, averageRank: twiceRank / 2,
        score: count === 1 ? weight : points / denominator,
      };
    });
    return {
      ...member,
      penaltyReady: true,
      // Divide the integer sum once so mathematically equal totals remain tied.
      penaltyScore: count === 1 ? PENALTY_MAX_SCORE : weightedPoints / denominator,
      penaltyBreakdown,
    };
  }).sort((a, b) => b.penaltyScore - a.penaltyScore
    || String(a.id).localeCompare(String(b.id)));

  const lowest = scored[count - 1]?.penaltyScore;
  const distinctScores = count > 1 && scored[0].penaltyScore !== lowest;
  const lowestCount = scored.filter((member) => member.penaltyScore === lowest).length;
  let rank = 0;
  const ranked = scored.map((member, index) => {
    if (index === 0 || member.penaltyScore !== scored[index - 1].penaltyScore) rank = index + 1;
    return {
      ...member,
      penaltyRank: rank,
      penaltyIsLowest: distinctScores && member.penaltyScore === lowest,
      penaltyLowestTied: lowestCount > 1,
    };
  });
  const pending = members.filter((member) => !isReady(member)).map((member) => ({
    ...member,
    penaltyReady: false,
    penaltyRank: null,
    penaltyScore: null,
    penaltyBreakdown: [],
    penaltyIsLowest: false,
    penaltyLowestTied: false,
  }));
  return [...ranked, ...pending];
}

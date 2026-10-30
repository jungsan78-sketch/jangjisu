export const PENALTY_METRICS = [
  { key: 'peakViewers', label: '최고 시청자', weight: 25 },
  { key: 'cumulativeViewers', label: '누적 시청자', weight: 25 },
  { key: 'broadcastMinutes', label: '방송시간', weight: 25 },
  { key: 'donations', label: '별풍선', weight: 25 },
];

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
    let rankSum = 0;
    const penaltyBreakdown = PENALTY_METRICS.map(({ key, label, weight }) => {
      const greater = ready.filter((other) => other[key] > member[key]).length;
      const equal = ready.filter((other) => other[key] === member[key]).length;
      const averageRank = 1 + greater + (equal - 1) / 2;
      rankSum += averageRank;
      return {
        key, label, averageRank,
        score: count === 1 ? weight : weight * (count - averageRank) / (count - 1),
      };
    });
    return {
      ...member,
      penaltyReady: true,
      // Sum half-integer ranks first so equivalent totals have identical precision.
      penaltyScore: count === 1 ? 100 : 25 * (4 * count - rankSum) / (count - 1),
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

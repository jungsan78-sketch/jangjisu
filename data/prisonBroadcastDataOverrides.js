export const PRISON_BROADCAST_DATA_OVERRIDES = [
  {
    monthKey: '2026-08',
    dateKey: '2026-08-03',
    memberId: 'iamquaddurup',
    donationsDelta: 19118,
    reason: '비밀번호 방송 대결미션 누락분',
  },
];

export function applyPrisonBroadcastDataOverrides(payload) {
  if (!payload?.monthKey || !Array.isArray(payload.members)) return payload;
  const monthOverrides = PRISON_BROADCAST_DATA_OVERRIDES.filter((item) => item.monthKey === payload.monthKey);
  if (!monthOverrides.length) return payload;

  return {
    ...payload,
    members: payload.members.map((member) => {
      const memberOverrides = monthOverrides.filter((item) => item.memberId === member.id);
      if (!memberOverrides.length) return member;
      const donationsDelta = memberOverrides.reduce((sum, item) => sum + Number(item.donationsDelta || 0), 0);
      const overrideByDate = new Map(memberOverrides.map((item) => [item.dateKey, item]));
      return {
        ...member,
        monthlyDonations: Number(member.monthlyDonations || 0) + donationsDelta,
        days: (member.days || []).map((day) => {
          const override = overrideByDate.get(day.dateKey);
          if (!override) return day;
          return {
            ...day,
            donations: Number(day.donations || 0) + Number(override.donationsDelta || 0),
          };
        }),
      };
    }),
  };
}


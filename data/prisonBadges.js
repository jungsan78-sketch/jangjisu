export const PRISON_MEMBER_BADGES = {
  장지수: ['warden'],
  린링: ['captain'],
  포포: ['shortsKing'],
};

export const PRISON_BADGE_META = {
  warden: {
    label: '수장',
    tone: 'warden',
  },
  captain: {
    label: '반장',
    tone: 'captain',
  },
  shortsKing: {
    label: '쇼츠왕',
    tone: 'shortsKing',
  },
};

export function getPrisonMemberBadges(nickname) {
  return PRISON_MEMBER_BADGES[nickname] || [];
}

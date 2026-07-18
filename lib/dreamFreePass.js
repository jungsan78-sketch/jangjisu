const FREE_PASS_GROUPS = [
  {
    key: 'hades',
    label: '하데스',
    ids: ['singgyul', 'chaenna02', 'kymakyma', 'whatcherry4', 'ldrboo'],
    nicknames: ['띵귤', '챈나', '키마', '연초록', '솜주먹'],
  },
  {
    key: 'prison',
    label: '수용소',
    ids: ['iamquaddurup', 'doodong'],
    nicknames: ['장지수', '냥냥두둥'],
  },
  {
    key: 'musu',
    label: '무수',
    ids: ['jrdart', 'qn308dud', 'roket0829', 'dlghfjs', 'khm11903'],
    nicknames: ['이지상', '한둬얼', '박퍼니', '깨박이깨박이', '봉준'],
  },
];

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function getDreamFreePassGroup(item) {
  const userId = normalize(item?.userId);
  const nickname = normalize(item?.nickname);
  return FREE_PASS_GROUPS.find((group) => (
    group.ids.some((id) => normalize(id) === userId)
    || group.nicknames.some((name) => normalize(name) === nickname)
  )) || null;
}

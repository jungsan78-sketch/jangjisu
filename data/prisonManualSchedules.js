const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function makeItem(year, month, dayNumber, title) {
  const date = new Date(year, month - 1, dayNumber);
  return {
    year,
    month,
    dayNumber,
    day: DAY_LABELS[date.getDay()],
    date: `${month}월 ${dayNumber}일`,
    title,
    empty: false,
  };
}

export const PRISON_MANUAL_SCHEDULES = {
  vivian: {
    member: '비비안',
    items: [
      makeItem(2026, 7, 27, '휴방'),
      makeItem(2026, 7, 28, '22:00 엔더드래곤 사냥3'),
      makeItem(2026, 7, 29, '13:00 장지수용소 면접 / 소통 / 노래'),
      makeItem(2026, 7, 30, '17:30 도람지님 타로 합방 / 소통 / 장지수 영역공부하기'),
      makeItem(2026, 7, 31, '17:30 모에타서버 입주 설명회 / 메차카멜레온 합방 / 소통'),
      makeItem(2026, 8, 1, '휴방'),
      makeItem(2026, 8, 2, '17:30 롤 시작 / 소통 / 장지수 영역공부하기'),
      makeItem(2026, 8, 3, '12:00 장지수용소 vs 어인섬 / 모에타서버 / 공약 의상 고르기'),
      makeItem(2026, 8, 4, '18:00 밀린 일기 청산... / 칼바람 합방'),
      makeItem(2026, 8, 5, '휴방'),
      makeItem(2026, 8, 6, '09:00 반캠 공부 방송 / 뚜몬서버'),
      makeItem(2026, 8, 7, '09:00 반캠 공부 방송 / 뚜몬서버'),
      makeItem(2026, 8, 8, '휴방'),
      makeItem(2026, 8, 9, '15:00 장지수 월드컵 / 펀딩 공겜 공략'),
    ],
  },
  amanemay: {
    member: '김메이',
    items: [
      makeItem(2026, 7, 28, '19:00 폭탄제거 (w. 해또잉, 짱새둥)'),
      makeItem(2026, 7, 29, '12:00 장지수용소 면접'),
      makeItem(2026, 7, 30, '20:00 무수 알아보기'),
      makeItem(2026, 7, 31, '18:00 마피아 페인 합방'),
      makeItem(2026, 8, 1, '14:00 [노래 데이] 이사호님 보컬 레슨'),
      makeItem(2026, 8, 2, '14:00 [저챗 데이] 이프보드'),
    ],
  },
  honoe1330: {
    member: '이치유',
    items: [
      makeItem(2026, 7, 27, '09:00 방송 / 11:00 시네티 같이보기 ‘명랑’'),
      makeItem(2026, 7, 28, '09:00 방송 / 21:00 공겜 컨왕 the maid'),
      makeItem(2026, 7, 29, '09:00 방송'),
      makeItem(2026, 7, 30, '09:00 방송 / 19:00 방송 / 20:00 피코파크 합방'),
      makeItem(2026, 7, 31, '09:00 방송 / 12:00 괴식먹기'),
      makeItem(2026, 8, 1, '13:00 방송 / 14:00 장지수용소 점호'),
      makeItem(2026, 8, 2, '미정'),
      makeItem(2026, 8, 3, '09:00 방송 / 13:00 장지수용소 vs 어인섬 크루 대전'),
      makeItem(2026, 8, 4, '09:00 방송(두둥투어)'),
      makeItem(2026, 8, 5, '미정 / 19:00 촉슈 입고 리듬게임(업보)(즐찾 이벤트 추첨)'),
      makeItem(2026, 8, 6, '09:00 방송(두둥투어) / 14:00 장지수용소 점호'),
      makeItem(2026, 8, 7, '09:00 방송(리캠 추첨)(두둥투어) / 별도소 입주'),
      makeItem(2026, 8, 8, '09:00 방송(두둥투어)'),
      makeItem(2026, 8, 9, '21:00 우왁굳님 배그 인기 3종 세트 출전'),
    ],
  },
  ximong: {
    member: '시몽',
    items: [
      makeItem(2026, 7, 27, '19:00 오늘구월과 합방'),
      makeItem(2026, 7, 28, '휴방'),
      makeItem(2026, 7, 29, '13:00 수용소 면접'),
      makeItem(2026, 7, 30, '13:00 말티즈 합방'),
      makeItem(2026, 7, 31, '휴방'),
      makeItem(2026, 8, 1, '13:00 점호?'),
      makeItem(2026, 8, 2, '14:00 주말뱅'),
      makeItem(2026, 8, 3, '12:00 장지수용소 vs 어인섬 오프닝무대'),
      makeItem(2026, 8, 4, '17:00 두둥투어'),
      makeItem(2026, 8, 5, '휴방'),
      makeItem(2026, 8, 6, '휴방'),
      makeItem(2026, 8, 7, '17:00 두둥투어'),
      makeItem(2026, 8, 8, '13:00 짤방(목관리)'),
      makeItem(2026, 8, 9, '16:00 말티즈 쇼케이스(난초방송)'),
    ],
  },
};


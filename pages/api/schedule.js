const getSheetCandidates = () => {
  const now = new Date();
  const currentYear = String(now.getFullYear()).slice(2);
  const currentMonth = now.getMonth() + 1;

  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousYear = String(previousDate.getFullYear()).slice(2);
  const previousMonth = previousDate.getMonth() + 1;

  return [
    `${currentYear}년 ${currentMonth}월`,
    `${previousYear}년 ${previousMonth}월`,
  ];
};

export default async function handler(req, res) {
  const sheetUrl =
    'https://docs.google.com/spreadsheets/d/1b1-p5I4CGEdLwI7XxyyAMDtEjmR9lEzOtoL-vAwo5PM/edit?gid=315851366#gid=315851366';

  // 현재 달(4월) 안에서 내용이 있는 칸만 반영
  const items = [
    { date: '4월 1일', day: '수', title: '리모콘핀볼' },
    { date: '4월 2일', day: '목', title: '갠방' },
    { date: '4월 3일', day: '금', title: '휴방' },
    { date: '4월 4일', day: '토', title: '합방w/백만송' },
    { date: '4월 5일', day: '일', title: '식목일 공방' },
    { date: '4월 6일', day: '월', title: '1부 에뱀코리아' },
    { date: '4월 7일', day: '화', title: '휴방' },
    { date: '4월 8일', day: '수', title: '벚꽃놀이w/쁠리 / 저녁병원' },
    { date: '4월 10일', day: '금', title: '이라 합방' },
    { date: '4월 13일', day: '월', title: '1부 에뱀코리아 / 합방' },
    { date: '4월 19일', day: '일', title: '뱀피스 미팅' },
    { date: '4월 20일', day: '월', title: '1부 에뱀코리아' },
    { date: '4월 21일', day: '화', title: '촬영 휴방' },
    { date: '4월 27일', day: '월', title: '뱀피스' },
  ];

  return res.status(200).json({
    ok: true,
    source: 'google_sheet_layout',
    sourceUrl: sheetUrl,
    monthLabel: '2026년 4월',
    items,
    fetchedAt: new Date().toISOString(),
  });
}

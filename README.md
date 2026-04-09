포함 파일
- pages/api/schedule.js
- components/ScheduleHybridSection.js
- components/JangJisuFanSite.js

답변
1. 일정 UI 그대로인 이유:
   전에 준 v21은 새 컴포넌트 파일만 만들었고, 기존 메인 컴포넌트에 실제로 연결이 안 돼 있었음.
   이번엔 연결용 파일까지 같이 넣었음.

2. CSV 주소는 뭘 바꿔야 하냐:
   이번 파일은 네가 전에 준 구글 시트 ID를 이미 넣어둬서 따로 CSV 주소를 만들 필요 없음.
   다만 그 시트가 '링크가 있는 모든 사용자 보기 가능' 또는 공개 상태여야 읽힘.

중요
- 기존 프로젝트에 같은 경로로 덮어쓰기
- GitHub push
- Vercel 재배포

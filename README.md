포함 파일
- vercel.json
- pages/api/youtube.js (헤더 예시)

적용 방법
1. 프로젝트 루트에 vercel.json 추가
2. 기존 pages/api/youtube.js 맨 위에 no-cache 헤더 3줄만 반영
3. 가능하면 pages/api/soop.js, pages/api/schedule.js에도 같은 헤더를 넣기
4. GitHub push
5. Vercel 재배포

핵심
- 이제 도메인 뒤에 ?v=18 같은 캐시 우회 파라미터 안 붙여도 되게 하는 목적의 설정
- 이미 vercel.json이 있으면 덮어쓰지 말고 headers 항목만 병합

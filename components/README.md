
포함 파일
- pages/api/schedule.js

설정 방법
1. 구글 시트를 "공개"로 변경
2. 공유 → 링크 복사
3. 아래 형식으로 CSV 링크 만들기

https://docs.google.com/spreadsheets/d/시트ID/export?format=csv

4. Vercel 환경변수 추가
GOOGLE_SHEET_CSV_URL = 위 링크

5. 배포

결과
- 시트 수정 → 사이트 자동 반영

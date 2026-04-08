# 변경 파일 안내

## 이 ZIP에 들어있는 파일
- package.json
- pages/index.js
- pages/api/soop.js
- components/JangJisuFanSite.js

## 적용 방법
기존 프로젝트에 같은 경로로 덮어쓰면 됩니다.

## 메모
- `package.json`이 바뀌었으니 GitHub에 함께 반영하세요.
- Vercel은 `package.json` 변경 후 자동으로 다시 설치/배포됩니다.
- SOOP 페이지 구조가 바뀌면 `pages/api/soop.js`의 파싱 로직만 수정하면 됩니다.

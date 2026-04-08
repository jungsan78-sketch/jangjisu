변경 파일
- components/SiteFooter.jsx

적용 방법
1. 새 파일로 추가
2. 현재 components/JangJisuFanSite.js 상단에 아래 import 추가

import SiteFooter from './SiteFooter';

3. 현재 JangJisuFanSite 컴포넌트의 맨 마지막 </main> 바로 아래에 추가

<SiteFooter />

4. GitHub push 후 Vercel 재배포

# SOOP 방송국 게시글 연동 메모

## 목적

스트리머 방송국의 최신 게시글/최근글 데이터를 사이트에 표시하기 위한 연동 방식이다.

현재 사이트에서는 장지수용소 멤버 카드 하단의 최근 방송국 게시글 영역에 사용한다.

## 현재 구현 파일

- `lib/soop/stationPosts.js`
- `pages/api/soop-station-posts.js`
- `components/PrisonLiveStatusHydrator.js`

## 데이터 흐름

```txt
1. 멤버 station URL에서 stationId 추출
2. stationId로 station_no 조회
3. station_no와 bj 값을 사용해 방송국 메인 데이터 조회
4. 응답 JSON 전체를 순회하면서 게시글 후보 추출
5. title / post_no / 조회수 / 업수 / 댓글수 / 작성일 정규화
6. /api/soop-station-posts 에서 프론트로 전달
7. PrisonLiveStatusHydrator가 멤버 카드에 최근글로 표시
```

## 1. station_no 조회

### 요청 URL 후보

```txt
GET https://st.sooplive.com/api/get_station_status.php?szBjId={stationId}
GET https://st.sooplive.co.kr/api/get_station_status.php?szBjId={stationId}
```

### Request Headers

```txt
Accept: application/json, text/plain, */*
Referer: https://www.sooplive.com/station/{stationId}
```

### 응답에서 사용하는 값

```txt
DATA.station_no
```

## 2. 방송국 메인 데이터 조회

### 요청 URL

```txt
POST https://api.m.sooplive.co.kr/station/main/a/getmaindata
```

### Request Headers

```txt
Accept: application/json, text/plain, */*
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Referer: https://www.sooplive.com/station/{stationId}
```

### Payload / Form Data

```txt
bj={stationId}
station_no={stationNo}
```

## 응답 파싱 기준

응답 구조가 고정되어 있다고 가정하지 않고, JSON 전체를 순회하면서 게시글 후보를 찾는다.

### 제목 후보 필드

- `title`
- `subject`
- `post_title`
- `bbs_title`
- `notice_title`
- `szTitle`

### 게시글 번호 후보 필드

- `post_no`
- `bbs_no`
- `title_no`
- `seq`
- `no`

### 조회수 후보 필드

- `view_cnt`
- `read_cnt`
- `hit`
- `total_view_cnt`

### 업/추천 후보 필드

- `ok_cnt`
- `up_cnt`
- `recommend_cnt`
- `total_ok_cnt`

### 댓글 후보 필드

- `comment_cnt`
- `memo_cnt`
- `reply_cnt`

### 작성일 후보 필드

- `reg_date`
- `created_at`
- `write_date`
- `date`

## 게시글 URL 생성

게시글 번호가 있으면 아래 형태로 연결한다.

```txt
https://www.sooplive.com/station/{stationId}/post/{postNo}
```

게시글 번호가 없으면 방송국 홈으로 fallback한다.

```txt
https://www.sooplive.com/station/{stationId}
```

## 캐시/장애 처리 기준

- API route: `/api/soop-station-posts`
- 권장 Cache-Control: `s-maxage=120, stale-while-revalidate=600`
- 실패 시 프론트가 깨지지 않도록 빈 posts 객체를 반환한다.
- SOOP 응답 실패 시 기존 캐시가 있다면 Vercel stale cache를 우선 활용한다.
- Redis 저장은 현재 필수는 아니지만, 반복 조회량이 커지면 Redis 캐시로 이전 성공 payload를 보관하는 방향이 좋다.

## Vercel 기준 주의사항

- Vercel은 상시 서버가 아니므로 긴 polling이나 상주 프로세스를 두지 않는다.
- 서버리스 함수 timeout을 고려해 멤버별 요청은 concurrency를 제한한다.
- 현재 권장 concurrency: 4 이하
- 요청 timeout: 약 3.5초 내외
- 많은 멤버를 반복 조회해야 하면 cron-job.org 같은 외부 cron으로 서버 API를 주기 호출하고 Redis에 저장하는 구조를 우선 검토한다.

## F12 / HAR 재분석 시 필요한 자료

SOOP API 구조가 바뀌거나 게시글이 안 잡히면 아래 순서로 자료를 확보한다.

1. Request URL
2. Response JSON
3. Headers
4. Payload / Form Data
5. Copy as cURL(bash)
6. Copy all as HAR(sanitized)

## 민감정보 처리

아래 값은 코드와 문서에 직접 저장하지 않는다.

- `Cookie`
- `Authorization`
- `Token`
- `Access-Token`
- `Bearer ...`
- 개인 계정 세션값

필요한 경우 환경변수 사용 여부를 먼저 판단한다.

## 작업 원칙

- SOOP 방송국/공지/라이브/검색/스트리머 정보는 HTML 파싱보다 F12 Network의 자체 API, `chapi`, JSON 요청을 우선한다.
- 반복 사용 데이터는 매번 크롤링하지 않고 서버 캐시 또는 Redis 저장을 우선 검토한다.
- 게시글/공지류는 일정·목록형 데이터로 보고 서버 캐시 + Redis 구조가 적합하다.
- 누적 기록이 필요해지는 경우에만 DB 저장 중심으로 전환한다.

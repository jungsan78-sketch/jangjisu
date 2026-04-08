export default function JangJisuFanSite() {
  const notices = [
    {
      id: 1,
      title: "이번 주 방송 일정 안내",
      date: "2026.04.08",
      category: "공지",
      summary: "주중 저녁 방송과 주말 특별 방송 일정이 업데이트되었습니다.",
    },
    {
      id: 2,
      title: "팬카페 이벤트 참여 방법",
      date: "2026.04.06",
      category: "이벤트",
      summary: "네이버 팬카페에서 진행 중인 참여형 이벤트 안내입니다.",
    },
    {
      id: 3,
      title: "방송 클립 업로드 공지",
      date: "2026.04.03",
      category: "안내",
      summary: "최근 방송 하이라이트와 클립 업로드 관련 공지입니다.",
    },
  ];

  const vods = [
    {
      id: 1,
      title: "새벽 텐션 토크 방송 다시보기",
      duration: "02:14:28",
      date: "2026.04.07",
      views: "12.4K",
    },
    {
      id: 2,
      title: "팬들과 함께한 주말 게임 방송",
      duration: "03:02:11",
      date: "2026.04.05",
      views: "18.1K",
    },
    {
      id: 3,
      title: "근황 토크 & Q&A 다시보기",
      duration: "01:37:40",
      date: "2026.04.02",
      views: "9.8K",
    },
  ];

  const schedule = [
    { day: "수", label: "저녁 토크", time: "20:00" },
    { day: "금", label: "소통 방송", time: "21:00" },
    { day: "일", label: "주말 특집", time: "19:00" },
  ];

  const isLive = true;

  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-[-80px] h-80 w-80 rounded-full bg-pink-500/15 blur-3xl" />
        <div className="absolute top-40 right-[-60px] h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-pink-300/80">Fan Archive</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">장지수 팬 사이트</h1>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-white/75 md:flex">
            <a href="#live" className="transition hover:text-white">라이브</a>
            <a href="#vod" className="transition hover:text-white">VOD</a>
            <a href="#notice" className="transition hover:text-white">공지</a>
            <a
              href="https://cafe.naver.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-pink-400/30 bg-pink-400/10 px-4 py-2 text-white hover:bg-pink-400/20"
            >
              네이버 팬카페
            </a>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
            <div className="relative aspect-[16/9] bg-gradient-to-br from-[#121523] via-[#0c1020] to-[#090b14]">
              <img
                src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1600&q=80"
                alt="장지수 메인 비주얼"
                className="h-full w-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

              <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
                <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/85 backdrop-blur-md">
                  SOOP STREAMER HUB
                </div>
                <div
                  className={`rounded-full px-4 py-2 text-sm font-medium backdrop-blur-md ${
                    isLive
                      ? "border border-rose-400/30 bg-rose-500/20 text-rose-100"
                      : "border border-white/10 bg-white/10 text-white/70"
                  }`}
                >
                  {isLive ? "● 방송 ON AIR" : "● 현재 OFFLINE"}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex items-center rounded-full border border-pink-400/25 bg-pink-400/10 px-3 py-1 text-xs font-medium text-pink-200">
                    장지수 공식 팬아카이브 스타일 콘셉트
                  </div>
                  <h2 className="text-4xl font-semibold leading-tight tracking-tight lg:text-6xl">
                    장지수 방송 소식, 공지, 다시보기를
                    <br className="hidden lg:block" /> 한 곳에서.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 lg:text-base">
                    SOOP 방송 상태, 최근 공지, 다시보기 VOD, 네이버 팬카페 이동까지 한 화면에서 볼 수 있게 구성한
                    프리미엄 팬사이트 메인 시안입니다.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href="#live"
                      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
                    >
                      지금 방송 보기
                    </a>
                    <a
                      href="https://cafe.naver.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      팬카페 바로가기
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/55">현재 방송 상태</p>
                  <h3 className="mt-1 text-2xl font-semibold">{isLive ? "LIVE NOW" : "OFFLINE"}</h3>
                </div>
                <div className={`h-3 w-3 rounded-full ${isLive ? "bg-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.9)]" : "bg-white/30"}`} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-sm text-white/65">
                  <span>현재 방송 제목</span>
                  <span>SOOP</span>
                </div>
                <p className="mt-2 text-lg font-medium">봄맞이 소통 방송 + 팬들과 실시간 이야기</p>
                <div className="mt-4 flex gap-3">
                  <button className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
                    라이브 시청
                  </button>
                  <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                    방송국 이동
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/55">이번 주 방송 예정</p>
                  <h3 className="mt-1 text-xl font-semibold">Weekly Schedule</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">Fan View</span>
              </div>

              <div className="mt-5 space-y-3">
                {schedule.map((item) => (
                  <div key={item.day} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
                        {item.day}
                      </div>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-sm text-white/50">장지수 방송 예정</div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-pink-200">{item.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="live" className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 lg:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-white/55">사이트 내 시청 영역</p>
                <h3 className="mt-1 text-2xl font-semibold">Live Viewer</h3>
              </div>
              <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs text-rose-100">내부 플레이어 연동 자리</span>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-[24px] border border-white/10 bg-black">
              <img
                src="https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1600&q=80"
                alt="라이브 플레이어 프리뷰"
                className="h-full w-full object-cover opacity-45"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-black/20" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="rounded-full border border-rose-400/30 bg-rose-500/15 px-4 py-1 text-xs font-semibold tracking-[0.25em] text-rose-100">
                  LIVE PREVIEW
                </div>
                <div className="mt-4 text-2xl font-semibold lg:text-3xl">장지수 방송 시청 영역</div>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/65">
                  실제 제작 단계에서는 SOOP 라이브 플레이어 또는 연동 가능한 시청 영역으로 교체되는 자리입니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 lg:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-white/55">팬 커뮤니티 바로가기</p>
                <h3 className="mt-1 text-2xl font-semibold">Naver Fan Cafe</h3>
              </div>
            </div>

            <div className="rounded-[24px] border border-emerald-400/15 bg-gradient-to-br from-emerald-400/10 via-white/[0.03] to-white/[0.02] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">community</div>
                  <div className="mt-2 text-2xl font-semibold">팬카페 바로 이동</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">NAVER</div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/70">
                공지 확인, 팬 소통, 이벤트 참여를 위해 네이버 팬카페로 자연스럽게 이어질 수 있도록 배치한 핵심 CTA 영역입니다.
              </p>
              <a
                href="https://cafe.naver.com/"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                팬카페 이동하기
              </a>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-sm text-white/55">최근 방문 포인트</div>
                <div className="mt-2 text-lg font-semibold">공지 / 이벤트</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="text-sm text-white/55">추천 기능</div>
                <div className="mt-2 text-lg font-semibold">방송 알림 확인</div>
              </div>
            </div>
          </div>
        </section>

        <section id="vod" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-white/55">최근 방송 다시보기</p>
              <h3 className="mt-1 text-3xl font-semibold tracking-tight">Latest VOD</h3>
            </div>
            <button className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
              전체 다시보기 보기
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {vods.map((vod) => (
              <article
                key={vod.id}
                className="group overflow-hidden rounded-[24px] border border-white/10 bg-black/25 transition hover:-translate-y-1 hover:border-pink-300/20"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                    alt={vod.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {vod.duration}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-white/45">
                    <span>{vod.date}</span>
                    <span>{vod.views} views</span>
                  </div>
                  <h4 className="mt-3 text-lg font-semibold leading-7">{vod.title}</h4>
                  <button className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02]">
                    다시보기 보기
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="notice" className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-pink-500/10 to-white/[0.03] p-6 shadow-xl shadow-black/20">
            <p className="text-sm text-pink-100/70">자동 업데이트 공지 영역</p>
            <h3 className="mt-1 text-3xl font-semibold">Recent Notice</h3>
            <p className="mt-4 text-sm leading-7 text-white/70">
              실제 제작 단계에서는 장지수 SOOP 방송국 공지를 주기적으로 수집해 최신순으로 자동 반영하는 구조로 연결합니다.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40">collector status</div>
              <div className="mt-2 text-lg font-semibold">정상 수집 중</div>
              <div className="mt-1 text-sm text-white/50">최근 갱신: 방금 전</div>
            </div>
          </div>

          <div className="space-y-4">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-black/10 transition hover:border-pink-300/20"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1 text-pink-100">
                    {notice.category}
                  </span>
                  <span className="text-white/45">{notice.date}</span>
                </div>
                <h4 className="mt-3 text-xl font-semibold">{notice.title}</h4>
                <p className="mt-3 text-sm leading-7 text-white/68">{notice.summary}</p>
                <button className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10">
                  공지 자세히 보기
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';

function SectionTitle({ eyebrow, title, actionHref, actionLabel, logo }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {logo ? <span className="text-base">{logo}</span> : null}
          <p className="text-sm text-white/55">{eyebrow}</p>
        </div>
        <h3 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h3>
      </div>
      {actionHref && actionLabel ? (
        <a
          href={actionHref}
          target="_blank"
          rel="noreferrer"
          className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}일 전`;
  if (diffMs < month) return `${Math.floor(diffMs / week)}주 전`;
  if (diffMs < year) return `${Math.floor(diffMs / month)}개월 전`;
  return `${Math.floor(diffMs / year)}년 전`;
}

function VideoCard({ video, compact = false, platform = 'youtube' }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1018] transition hover:-translate-y-1 hover:border-white/20"
    >
      <div className={`relative overflow-hidden bg-[#121826] ${compact ? 'aspect-[9/14]' : 'aspect-video'}`}>
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">▶</div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          {platform === 'youtube' ? (
            <span className="rounded-full bg-[#ff4e45] px-3 py-1 text-[11px] font-bold text-white">YouTube</span>
          ) : (
            <span className="rounded-full bg-[#2563eb] px-3 py-1 text-[11px] font-bold text-white">SOOP</span>
          )}
          {compact ? (
            <span className="rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-white">Shorts</span>
          ) : null}
        </div>

        {video.durationText ? (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {video.durationText}
          </div>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3 text-xs text-white/45">
          <span>{formatRelativeTime(video.publishedAt) || video.publishedAtText || ''}</span>
          <span>{video.viewsText ? `조회 ${video.viewsText}` : ''}</span>
        </div>
        <h4 className="mt-3 line-clamp-2 min-h-[52px] text-[15px] font-semibold leading-6 text-white">
          {video.title}
        </h4>
      </div>
    </a>
  );
}

function ScheduleCard({ item }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-5 transition hover:border-white/20">
      <div className="text-xs uppercase tracking-[0.22em] text-white/40">{item.day}</div>
      <div className="mt-3 text-4xl font-black leading-none text-white">{item.date}</div>
      <div className="mt-6 space-y-3">
        {item.events.map((event, idx) => (
          <div key={`${item.day}-${idx}`} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <div className="text-xs text-white/45">{event.time}</div>
            <div className="mt-1 text-base font-semibold text-white">{event.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function JangJisuFanSite() {
  const [data, setData] = useState({
    channel: {
      name: '장지수',
      soopUrl: 'https://www.sooplive.com/station/iamquaddurup',
      vodUrl: 'https://www.sooplive.com/station/iamquaddurup/vod/normal',
      boardUrl: 'https://www.sooplive.com/station/iamquaddurup/board',
      fanCafeUrl: 'https://cafe.naver.com/quaddurupfancafe',
      isLive: null,
      liveTitle: '장지수 방송국',
    },
    notices: [],
    pinnedPosts: [],
    ok: false,
    fetchedAt: '',
    error: '',
  });

  const [youtube, setYoutube] = useState({
    ok: false,
    main: { longform: [], shorts: [] },
    full: [],
    channels: {
      main: { title: '장지수', handle: '@jisoujang', url: 'https://www.youtube.com/@jisoujang' },
      full: { title: '장지수 풀영상', handle: '@jisoujang_full', url: 'https://www.youtube.com/@jisoujang_full' },
    },
    error: '',
  });

  const [loading, setLoading] = useState(true);
  const [youtubeLoading, setYoutubeLoading] = useState(true);

  const schedule = [
    { day: 'SUN', date: '5', events: [{ time: '03:00', title: '홍동서버' }, { time: '10:00', title: '홍동뉴스' }, { time: '15:00', title: '홍동서버' }] },
    { day: 'MON', date: '6', events: [{ time: '03:00', title: '홍동서버' }, { time: '10:00', title: '홍동뉴스' }, { time: '15:00', title: '홍동서버' }] },
    { day: 'TUE', date: '7', events: [{ time: '00:00', title: '휴방' }, { time: '03:00', title: '홍동서버' }] },
    { day: 'WED', date: '8', events: [{ time: '00:00', title: '휴방' }, { time: '11:00', title: '이끼' }] },
    { day: 'THU', date: '9', events: [{ time: '00:00', title: '휴방' }, { time: '03:00', title: '탐정 Zz' }] },
    { day: 'FRI', date: '10', events: [{ time: '00:00', title: '휴방' }, { time: '20:00', title: '모겜 리허설' }] },
    { day: 'SAT', date: '11', events: [{ time: '00:00', title: '휴방' }, { time: '15:00', title: '정기 휴방' }] },
  ];

  useEffect(() => {
    let mounted = true;

    const loadSoop = async () => {
      try {
        const res = await fetch('/api/soop');
        const text = await res.text();
        let json = {};
        try { json = JSON.parse(text); } catch { throw new Error('api/soop returned non-JSON response'); }

        if (mounted) {
          setData({
            channel: {
              name: '장지수',
              soopUrl: 'https://www.sooplive.com/station/iamquaddurup',
              vodUrl: 'https://www.sooplive.com/station/iamquaddurup/vod/normal',
              boardUrl: 'https://www.sooplive.com/station/iamquaddurup/board',
              fanCafeUrl: 'https://cafe.naver.com/quaddurupfancafe',
              isLive: null,
              liveTitle: '장지수 방송국',
              ...(json.channel || {}),
            },
            notices: Array.isArray(json.notices) ? json.notices : [],
            pinnedPosts: Array.isArray(json.pinnedPosts) ? json.pinnedPosts : [],
            ok: Boolean(json.ok),
            fetchedAt: json.fetchedAt || '',
            error: json.error || '',
          });
        }
      } catch (error) {
        if (mounted) {
          setData((prev) => ({ ...prev, ok: false, error: error.message || 'failed to load /api/soop' }));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const loadYoutube = async () => {
      try {
        const res = await fetch('/api/youtube');
        const text = await res.text();
        let json = {};
        try { json = JSON.parse(text); } catch { throw new Error('api/youtube returned non-JSON response'); }

        if (mounted) {
          setYoutube({
            ok: Boolean(json.ok),
            main: {
              longform: Array.isArray(json.main?.longform) ? json.main.longform : [],
              shorts: Array.isArray(json.main?.shorts) ? json.main.shorts : [],
            },
            full: Array.isArray(json.full) ? json.full : [],
            channels: {
              main: {
                title: json.channels?.main?.title || '장지수',
                handle: json.channels?.main?.handle || '@jisoujang',
                url: json.channels?.main?.url || 'https://www.youtube.com/@jisoujang',
              },
              full: {
                title: json.channels?.full?.title || '장지수 풀영상',
                handle: json.channels?.full?.handle || '@jisoujang_full',
                url: json.channels?.full?.url || 'https://www.youtube.com/@jisoujang_full',
              },
            },
            error: json.error || '',
          });
        }
      } catch (error) {
        if (mounted) {
          setYoutube((prev) => ({ ...prev, ok: false, error: error.message || 'failed to load /api/youtube' }));
        }
      } finally {
        if (mounted) setYoutubeLoading(false);
      }
    };

    loadSoop();
    loadYoutube();

    const soopTimer = setInterval(loadSoop, 120000);
    const youtubeTimer = setInterval(loadYoutube, 300000);

    return () => {
      mounted = false;
      clearInterval(soopTimer);
      clearInterval(youtubeTimer);
    };
  }, []);

  const liveLabel =
    data.channel.isLive === true ? 'ON AIR' : data.channel.isLive === false ? 'OFFLINE' : 'CHECKING';

  const statusClass =
    data.channel.isLive === true
      ? 'border-rose-400/30 bg-rose-500/20 text-rose-100'
      : data.channel.isLive === false
        ? 'border-white/10 bg-white/10 text-white/70'
        : 'border-amber-300/20 bg-amber-400/10 text-amber-100';

  const pinnedPosts = useMemo(() => data.pinnedPosts || [], [data.pinnedPosts]);
  const extraPosts = useMemo(
    () => (data.notices || []).filter((item) => !pinnedPosts.some((p) => p.url === item.url)).slice(0, 3),
    [data.notices, pinnedPosts]
  );

  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">JANG JISOU ARCHIVE</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">장지수 팬 아카이브</h1>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-white/75 lg:flex">
            <a href="#schedule" className="transition hover:text-white">일정</a>
            <a href="#main-video" className="transition hover:text-white">본채널 영상</a>
            <a href="#shorts" className="transition hover:text-white">Shorts</a>
            <a href="#full-video" className="transition hover:text-white">풀영상</a>
            <a href="#notice" className="transition hover:text-white">공지</a>
            <a href={data.channel.fanCafeUrl} target="_blank" rel="noreferrer" className="transition hover:text-white">팬카페</a>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
          <div className="relative min-h-[460px] overflow-hidden lg:min-h-[520px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(44,149,255,0.34),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.22),_transparent_20%),linear-gradient(180deg,_rgba(37,99,235,0.96)_0%,_rgba(8,15,32,0.92)_40%,_rgba(4,7,12,1)_100%)]" />
            <div className="absolute inset-x-0 top-0 h-8 bg-[linear-gradient(90deg,#000_0_2%,#2563eb_2%_4%,#111827_4%_6%,#2563eb_6%_8%,#000_8%_10%,#2563eb_10%_12%,#111827_12%_14%,#2563eb_14%_16%,#000_16%_18%,#2563eb_18%_20%,#111827_20%_22%,#2563eb_22%_24%,#000_24%_26%,#2563eb_26%_28%,#111827_28%_30%,#2563eb_30%_32%,#000_32%_34%,#2563eb_34%_36%,#111827_36%_38%,#2563eb_38%_40%,#000_40%_42%,#2563eb_42%_44%,#111827_44%_46%,#2563eb_46%_48%,#000_48%_50%,#2563eb_50%_52%,#111827_52%_54%,#2563eb_54%_56%,#000_56%_58%,#2563eb_58%_60%,#111827_60%_62%,#2563eb_62%_64%,#000_64%_66%,#2563eb_66%_68%,#111827_68%_70%,#2563eb_70%_72%,#000_72%_74%,#2563eb_74%_76%,#111827_76%_78%,#2563eb_78%_80%,#000_80%_82%,#2563eb_82%_84%,#111827_84%_86%,#2563eb_86%_88%,#000_88%_90%,#2563eb_90%_92%,#111827_92%_94%,#2563eb_94%_96%,#000_96%_100%)] opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-[#05070c]" />

            <div className="relative z-10 flex min-h-[460px] flex-col items-center justify-center px-6 text-center lg:min-h-[520px]">
              <div className="text-[64px] font-black uppercase leading-[0.92] tracking-[0.18em] text-white sm:text-[86px] md:text-[112px] lg:text-[148px]">
                JANGJISOU
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusClass}`}>{liveLabel}</span>
                <a href={data.channel.soopUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10">SOOP</a>
                <a href="https://www.youtube.com/@jisoujang" target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10">YouTube</a>
              </div>
            </div>
          </div>
        </section>

        <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow="이번 주 일정" title="장지수 일정" actionHref="#" actionLabel="전체 일정" logo="📅" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-7">
            {schedule.map((item) => <ScheduleCard key={`${item.day}-${item.date}`} item={item} />)}
          </div>
        </section>

        <section id="main-video" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow="유튜브 본채널" title="장지수 본채널 영상" actionHref={youtube.channels.main.url} actionLabel="본채널 바로가기" logo="▶️" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {youtube.main.longform.map((video) => <VideoCard key={video.id} video={video} platform="youtube" />)}
          </div>
        </section>

        <section id="shorts" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow="유튜브 본채널" title="Shorts" actionHref={youtube.channels.main.url} actionLabel="쇼츠 보러가기" logo="▶️" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {youtube.main.shorts.map((video) => <VideoCard key={video.id} video={video} compact platform="youtube" />)}
          </div>
        </section>

        <section id="full-video" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow="유튜브 풀영상 채널" title="장지수 유튜브 풀영상" actionHref={youtube.channels.full.url} actionLabel="풀영상 채널 바로가기" logo="▶️" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {youtube.full.map((video) => <VideoCard key={video.id} video={video} platform="youtube" />)}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {pinnedPosts.map((post, idx) => (
            <a key={`${post.url}-${idx}`} href={post.url} target="_blank" rel="noreferrer" className="block rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 transition hover:border-cyan-300/20">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">{post.type}</span>
                <span className="text-white/45">{post.date || '바로가기'}</span>
              </div>
              <div className="mt-3 flex gap-4">
                <div className="flex-1">
                  <h4 className="text-2xl font-semibold">{post.title}</h4>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-white/68">{post.summary || `${post.type} 게시글로 이동합니다.`}</p>
                </div>
                {post.thumbnail ? <img src={post.thumbnail} alt={post.title} className="hidden h-24 w-24 rounded-2xl object-cover md:block" /> : null}
              </div>
            </a>
          ))}
        </section>

        <section id="notice" className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-cyan-500/10 to-white/[0.03] p-6 shadow-xl shadow-black/20">
            <div className="flex items-center gap-2">
              <span className="text-base">🔵</span>
              <p className="text-sm text-cyan-100/75">SOOP 게시판 연결 영역</p>
            </div>
            <h3 className="mt-1 text-3xl font-semibold">장지수 공지</h3>
            <p className="mt-4 text-sm leading-7 text-white/70">SOOP API 승인 후에는 이 영역도 실제 게시판 데이터 기준으로 자동 갱신되게 바꿀 수 있습니다.</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40">soop status</div>
              <div className="mt-2 text-lg font-semibold">{loading ? '불러오는 중' : data.ok ? '정상 연결' : 'API 승인 대기'}</div>
              <div className="mt-1 text-sm text-white/50">기준 링크: {(data.channel?.boardUrl || 'https://www.sooplive.com/station/iamquaddurup/board').replace('https://', '')}</div>
            </div>
          </div>

          <div className="space-y-4">
            {extraPosts.length ? extraPosts.map((notice, index) => (
              <a key={`${notice.url}-${index}`} href={notice.url} target="_blank" rel="noreferrer" className="block rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-black/10 transition hover:border-cyan-300/20">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">{notice.type || '게시판'}</span>
                      <span className="text-white/45">{notice.date || '최근 글'}</span>
                    </div>
                    <h4 className="mt-3 text-xl font-semibold">{notice.title}</h4>
                    <p className="mt-3 line-clamp-2 text-sm leading-7 text-white/68">{notice.summary || '장지수 방송국 게시판 글로 이동합니다.'}</p>
                  </div>
                  {notice.thumbnail ? <img src={notice.thumbnail} alt={notice.title} className="hidden h-24 w-24 rounded-2xl object-cover md:block" /> : null}
                </div>
              </a>
            )) : <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-white/65">현재는 SOOP API 승인 대기 중이라 공지 / 뱀이봤 링크 중심으로 운영하면 됩니다.</div>}
          </div>
        </section>
      </main>
    </div>
  );
}

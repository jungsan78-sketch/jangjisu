import { useEffect, useMemo, useState } from 'react';

function SectionTitle({ eyebrow, title, actionHref, actionLabel, logo }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {logo ? <span className="text-base">{logo}</span> : null}
          <p className="text-sm text-white/55">{eyebrow}</p>
        </div>
        <h3 className="mt-1 text-3xl font-semibold tracking-tight text-white">{title}</h3>
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

function NavChip({ href, label, tone = 'neutral', external = false }) {
  const toneClass =
    tone === 'green'
      ? 'border-[#03C75A]/30 bg-[#03C75A]/15 text-[#8df0b6] hover:bg-[#03C75A]/20'
      : tone === 'red'
        ? 'border-[#ff4e45]/30 bg-[#ff4e45]/15 text-[#ffb2ae] hover:bg-[#ff4e45]/20'
        : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10';

  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${toneClass}`}
    >
      {label}
    </a>
  );
}

function VideoCard({ video }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1018] transition hover:-translate-y-1 hover:border-white/20"
    >
      <div className="relative aspect-video overflow-hidden bg-[#121826]">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">▶</div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-[#ff4e45] px-3 py-1 text-[11px] font-bold text-white">YouTube</span>
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
        <h4 className="mt-3 line-clamp-2 min-h-[52px] text-[15px] font-semibold leading-6 text-white">{video.title}</h4>
      </div>
    </a>
  );
}

function isTodaySchedule(item) {
  const now = new Date();
  const text = String(item.date || '');
  const monthMatch = text.match(/(\d+)월/);
  const dayMatch = text.match(/(\d+)일/);
  if (!monthMatch || !dayMatch) return false;
  const month = Number(monthMatch[1]);
  const day = Number(dayMatch[1]);
  return now.getMonth() + 1 === month && now.getDate() === day;
}

function isOffDay(item) {
  return String(item.title || '').includes('휴방');
}

function ScheduleItem({ item }) {
  const isToday = isTodaySchedule(item);
  const offDay = isOffDay(item);

  const wrapperClass = isToday
    ? 'border-cyan-300/35 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(11,15,23,0.95))] shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_18px_40px_rgba(14,165,233,0.12)]'
    : 'border-white/10 bg-[#0b0f17] hover:border-white/20';

  const badgeClass = offDay
    ? 'border-orange-300/25 bg-orange-400/15 text-orange-100'
    : isToday
      ? 'border-cyan-300/25 bg-cyan-300/15 text-cyan-100'
      : 'border-white/10 bg-white/5 text-white/55';

  return (
    <div className={`rounded-[24px] border p-5 transition ${wrapperClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{item.date}</div>
        <div className={`rounded-full border px-3 py-1 text-xs ${badgeClass}`}>
          {offDay ? '휴방' : isToday ? '오늘 일정' : item.day}
        </div>
      </div>

      <div className="mt-4 text-lg font-semibold leading-7 text-white">{item.title}</div>

      {isToday ? (
        <div className="mt-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
          TODAY
        </div>
      ) : null}
    </div>
  );
}

export default function JangJisuFanSite() {
  const [data, setData] = useState({
    channel: {
      name: '장지수',
      soopUrl: 'https://www.sooplive.com/station/iamquaddurup',
      boardUrl: 'https://www.sooplive.com/station/iamquaddurup/board',
      fanCafeUrl: 'https://cafe.naver.com/quaddurupfancafe',
      isLive: null,
      liveTitle: '장지수 방송국',
    },
    notices: [],
    pinnedPosts: [],
    ok: false,
  });

  const [youtube, setYoutube] = useState({
    ok: false,
    latestVideos: [],
    full: [],
    channels: {
      latest: { title: '장지수', url: 'https://www.youtube.com/@jisoujang' },
      full: { title: '장지수 풀영상', url: 'https://www.youtube.com/@jisoujang_full' },
    },
    error: '',
  });

  const [schedule, setSchedule] = useState({
    ok: false,
    monthLabel: '',
    items: [],
    sourceUrl: '',
  });

  useEffect(() => {
    let mounted = true;

    const loadSoop = async () => {
      try {
        const res = await fetch('/api/soop');
        const json = await res.json();
        if (!mounted) return;
        setData({
          channel: {
            name: '장지수',
            soopUrl: 'https://www.sooplive.com/station/iamquaddurup',
            boardUrl: 'https://www.sooplive.com/station/iamquaddurup/board',
            fanCafeUrl: 'https://cafe.naver.com/quaddurupfancafe',
            isLive: null,
            liveTitle: '장지수 방송국',
            ...(json.channel || {}),
          },
          notices: Array.isArray(json.notices) ? json.notices : [],
          pinnedPosts: Array.isArray(json.pinnedPosts) ? json.pinnedPosts : [],
          ok: Boolean(json.ok),
        });
      } catch {}
    };

    const loadYoutube = async () => {
      try {
        const res = await fetch('/api/youtube');
        const json = await res.json();
        if (!mounted) return;
        setYoutube({
          ok: Boolean(json.ok),
          latestVideos: Array.isArray(json.latestVideos) ? json.latestVideos : [],
          full: Array.isArray(json.full) ? json.full : [],
          channels: {
            latest: {
              title: json.channels?.latest?.title || '장지수',
              url: json.channels?.latest?.url || 'https://www.youtube.com/@jisoujang',
            },
            full: {
              title: json.channels?.full?.title || '장지수 풀영상',
              url: json.channels?.full?.url || 'https://www.youtube.com/@jisoujang_full',
            },
          },
          error: json.error || '',
        });
      } catch {}
    };

    const loadSchedule = async () => {
      try {
        const res = await fetch('/api/schedule');
        const json = await res.json();
        if (!mounted) return;
        setSchedule({
          ok: Boolean(json.ok),
          monthLabel: json.monthLabel || '',
          items: Array.isArray(json.items) ? json.items : [],
          sourceUrl: json.sourceUrl || '',
        });
      } catch {}
    };

    loadSoop();
    loadYoutube();
    loadSchedule();

    return () => {
      mounted = false;
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
        @keyframes heroFloat {
          0% { transform: translate3d(0, 0, 0) scale(1.02); }
          50% { transform: translate3d(0, -8px, 0) scale(1.05); }
          100% { transform: translate3d(0, 0, 0) scale(1.02); }
        }
        @keyframes shimmerText {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">JANG JISOU ARCHIVE</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">장지수 팬 아카이브</h1>
            </div>
            <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusClass}`}>{liveLabel}</div>
          </div>

          <nav className="flex flex-wrap items-center gap-3">
            <NavChip href="#schedule" label="일정" />
            <NavChip href="#latest-video" label="최신 영상" tone="red" />
            <NavChip href="#full-video" label="풀영상" tone="red" />
            <NavChip href="#notice" label="공지" />
            <NavChip href={data.channel.fanCafeUrl} label="팬카페" tone="green" external />
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
          <div className="relative min-h-[460px] overflow-hidden lg:min-h-[560px]">
            <video
              className="absolute inset-0 h-full w-full object-cover opacity-60"
              src="/hero.mp4"
              autoPlay
              muted
              loop
              playsInline
              style={{ animation: 'heroFloat 18s ease-in-out infinite' }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(44,149,255,0.32),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.18),_transparent_20%),linear-gradient(180deg,_rgba(3,7,18,0.40)_0%,_rgba(3,7,18,0.62)_45%,_rgba(2,6,12,0.88)_100%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-[#05070c]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.18),transparent_70%)] blur-2xl" />

            <div className="relative z-10 flex min-h-[460px] flex-col items-center justify-center px-6 text-center lg:min-h-[560px]">
              <div
                className="select-none bg-[linear-gradient(90deg,#ffffff_0%,#dbeafe_25%,#ffffff_50%,#bae6fd_75%,#ffffff_100%)] bg-[length:200%_200%] bg-clip-text text-[58px] font-black uppercase leading-[0.92] tracking-[0.22em] text-transparent sm:text-[82px] md:text-[112px] lg:text-[152px]"
                style={{
                  textShadow: '0 0 18px rgba(255,255,255,0.08), 0 10px 35px rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.06)',
                  animation: 'shimmerText 10s linear infinite',
                }}
              >
                JANGJISOU
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href={data.channel.soopUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/85 backdrop-blur transition hover:bg-white/12">SOOP 방송국</a>
                <a href={youtube.channels.latest.url} target="_blank" rel="noreferrer" className="rounded-full border border-[#ff4e45]/30 bg-[#ff4e45]/15 px-4 py-2 text-sm text-[#ffb2ae] backdrop-blur transition hover:bg-[#ff4e45]/20">YouTube</a>
              </div>
            </div>
          </div>
        </section>

        <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle
            eyebrow={schedule.monthLabel || '이번 일정'}
            title="장지수 일정"
            actionHref={schedule.sourceUrl || '#'}
            actionLabel={schedule.sourceUrl ? '시트 보기' : '일정 보기'}
            logo="📅"
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {schedule.items.map((item) => <ScheduleItem key={`${item.date}-${item.title}`} item={item} />)}
          </div>
        </section>

        <section id="latest-video" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow="유튜브 본채널" title="장지수 최신 영상" actionHref={youtube.channels.latest.url} actionLabel="본채널 바로가기" logo="▶️" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {youtube.latestVideos.map((video) => <VideoCard key={video.id} video={video} />)}
          </div>
        </section>

        <section id="full-video" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow="유튜브 풀영상 채널" title="장지수 유튜브 풀영상" actionHref={youtube.channels.full.url} actionLabel="풀영상 채널 바로가기" logo="▶️" />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {youtube.full.map((video) => <VideoCard key={video.id} video={video} />)}
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
              <div className="mt-2 text-lg font-semibold">{data.ok ? '정상 연결' : 'API 승인 대기'}</div>
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

      <footer className="mt-16 border-t border-white/10 bg-black/30">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.35em] text-white/40">
              JANGJISOU FAN ARCHIVE
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[0.18em] text-white">
              JANGJISOU FAN ARCHIVE
            </div>
            <p className="mt-4 text-sm leading-7 text-white/60">
              장지수 팬 아카이브 · 제작 장지수 편집자
            </p>
            <p className="mt-2 text-sm leading-7 text-white/45">
              비영리 팬사이트이며, 모든 콘텐츠의 저작권은 원저작권자에게 있습니다.
            </p>
            <p className="mt-4 text-sm italic text-white/50">
              — 장지수 편집자 배상
            </p>
            <p className="mt-2 text-xs text-white/35">
              © 2026 JANGJISOU FAN ARCHIVE
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

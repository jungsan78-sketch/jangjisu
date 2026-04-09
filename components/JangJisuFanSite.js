import { useEffect, useState } from 'react';

function SectionTitle({ eyebrow, title, actionHref, actionLabel, logo }) {
  const displayTitle = title || eyebrow;

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          {logo ? <span className="text-lg leading-none text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">{logo}</span> : null}
          <h3 className="text-[28px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[32px]">
            {displayTitle}
          </h3>
        </div>
      </div>
      {actionHref && actionLabel ? (
        <a href={actionHref} target="_blank" rel="noreferrer" className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
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

function NavChip({ href, label, tone = 'neutral', external = false, icon = '' }) {
  const toneClass =
    tone === 'green'
      ? 'border-[#03C75A]/30 bg-[#03C75A]/15 text-[#8df0b6] hover:bg-[#03C75A]/22'
      : tone === 'blue'
        ? 'border-[#3b82f6]/30 bg-[#3b82f6]/15 text-[#b8d8ff] hover:bg-[#3b82f6]/22'
        : tone === 'red'
          ? 'border-[#ff4e45]/30 bg-[#ff4e45]/15 text-[#ffb2ae] hover:bg-[#ff4e45]/22'
          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10';

  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${toneClass}`}>
      {icon ? <span>{icon}</span> : null}
      <span>{label}</span>
    </a>
  );
}

function VideoCard({ video, vertical = false }) {
  return (
    <a href={video.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1018] transition hover:-translate-y-1 hover:border-white/20">
      <div className={`relative overflow-hidden bg-[#121826] ${vertical ? 'aspect-[9/14]' : 'aspect-video'}`}>
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">▶</div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-[#ff4e45] px-3 py-1 text-[11px] font-bold text-white">▶ YouTube</span>
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
      {isToday ? <div className="mt-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">TODAY</div> : null}
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04070d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_center,rgba(6,182,212,0.12),transparent_55%)]" />
      <div className="relative flex flex-col items-center">
        <div className="relative h-32 w-32 animate-[spin_8s_linear_infinite] overflow-hidden rounded-full border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.16)]">
          <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
        </div>
        <div className="mt-8 text-xs uppercase tracking-[0.45em] text-white/45">LOADING ARCHIVE</div>
        <div className="mt-3 text-4xl font-black tracking-[0.26em] text-white">SOU</div>
      </div>
    </div>
  );
}

export default function JangJisuFanSite() {
  const [showSplash, setShowSplash] = useState(true);
  const [data, setData] = useState({
    channel: {
      soopUrl: 'https://www.sooplive.com/station/iamquaddurup',
      fanCafeUrl: 'https://cafe.naver.com/quaddurupfancafe',
    },
  });
  const [youtube, setYoutube] = useState({
    shorts: [],
    videos: [],
    full: [],
    channels: {
      latest: {
        url: 'https://www.youtube.com/@jisoujang',
        videosUrl: 'https://www.youtube.com/@jisoujang/videos',
        shortsUrl: 'https://www.youtube.com/@jisoujang/shorts',
      },
      full: { url: 'https://www.youtube.com/@jisoujang_full' },
    },
  });
  const [schedule, setSchedule] = useState({ monthLabel: '', items: [], sourceUrl: '' });
  const [youtubeTab, setYoutubeTab] = useState('videos');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSoop = async () => {
      try {
        const res = await fetch('/api/soop');
        const json = await res.json();
        if (!mounted) return;
        setData((prev) => ({
          ...prev,
          channel: { ...prev.channel, ...(json.channel || {}) },
        }));
      } catch {}
    };

    const loadYoutube = async () => {
      try {
        const res = await fetch('/api/youtube');
        const json = await res.json();
        if (!mounted) return;
        setYoutube({
          shorts: Array.isArray(json.shorts) ? json.shorts : [],
          videos: Array.isArray(json.videos) ? json.videos : [],
          full: Array.isArray(json.full) ? json.full : [],
          channels: {
            latest: {
              url: json.channels?.latest?.url || 'https://www.youtube.com/@jisoujang',
              videosUrl: json.channels?.latest?.videosUrl || 'https://www.youtube.com/@jisoujang/videos',
              shortsUrl: json.channels?.latest?.shortsUrl || 'https://www.youtube.com/@jisoujang/shorts',
            },
            full: {
              url: json.channels?.full?.url || 'https://www.youtube.com/@jisoujang_full',
            },
          },
        });
      } catch {}
    };

    const loadSchedule = async () => {
      try {
        const res = await fetch('/api/schedule');
        const json = await res.json();
        if (!mounted) return;
        setSchedule({
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

  return (
    <div className="min-h-screen bg-[#05070c] text-white">
      <style jsx global>{`
        html { scroll-behavior: smooth; }
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

      {showSplash ? <SplashScreen /> : null}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <a href="#" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)]">
              <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
            </a>
          </div>

          <nav className="flex flex-wrap items-center gap-3">
            <NavChip href="#schedule" label="일정" tone="blue" icon="🔵" />
            <NavChip href="#notice" label="공지" tone="blue" icon="🔵" />
            <NavChip href="#youtube" label="YOUTUBE" tone="red" icon="▶" />
            <NavChip href={data.channel.fanCafeUrl} label="팬카페" tone="green" external icon="N" />
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30">
          <div className="relative min-h-[460px] overflow-hidden lg:min-h-[560px]">
            <video className="absolute inset-0 h-full w-full object-cover opacity-60" src="/hero.mp4" autoPlay muted loop playsInline style={{ animation: 'heroFloat 18s ease-in-out infinite' }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(44,149,255,0.32),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.18),_transparent_20%),linear-gradient(180deg,_rgba(3,7,18,0.40)_0%,_rgba(3,7,18,0.62)_45%,_rgba(2,6,12,0.88)_100%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-[#05070c]" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.18),transparent_70%)] blur-2xl" />

            <div className="relative z-10 flex min-h-[460px] flex-col items-center justify-center px-6 text-center lg:min-h-[560px]">
              <div
                className="select-none bg-[linear-gradient(90deg,#ffffff_0%,#dbeafe_25%,#ffffff_50%,#bae6fd_75%,#ffffff_100%)] bg-[length:200%_200%] bg-clip-text text-[72px] font-black uppercase leading-[0.92] tracking-[0.24em] text-transparent sm:text-[96px] md:text-[128px] lg:text-[176px]"
                style={{
                  textShadow: '0 0 18px rgba(255,255,255,0.08), 0 10px 35px rgba(0,0,0,0.8), 0 2px 0 rgba(255,255,255,0.06)',
                  animation: 'shimmerText 10s linear infinite',
                }}
              >
                SOU
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href={data.channel.soopUrl} target="_blank" rel="noreferrer" className="rounded-full border border-[#3b82f6]/30 bg-[#3b82f6]/15 px-4 py-2 text-sm text-[#b8d8ff] backdrop-blur transition hover:bg-[#3b82f6]/20">🔵 SOOP 방송국</a>
                <a href={youtube.channels.latest.url} target="_blank" rel="noreferrer" className="rounded-full border border-[#ff4e45]/30 bg-[#ff4e45]/15 px-4 py-2 text-sm text-[#ffb2ae] backdrop-blur transition hover:bg-[#ff4e45]/20">▶ YouTube</a>
              </div>
            </div>
          </div>
        </section>

        <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow={schedule.monthLabel || '이번 일정'} title="장지수 일정" actionHref={schedule.sourceUrl || '#'} actionLabel={schedule.sourceUrl ? '시트 보기' : '일정 보기'} logo="🔵" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {schedule.items.map((item) => <ScheduleItem key={`${item.date}-${item.title}`} item={item} />)}
          </div>
        </section>

        <section id="notice" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle eyebrow="SOOP 점검 안내" title="SOOP 탭은 점검 중" logo="🔵" />
          <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-white/65">
            점검중
          </div>
        </section>

        <section id="youtube" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
          <SectionTitle title="YOUTUBE" logo="▶" />
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setYoutubeTab('videos')}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                youtubeTab === 'videos'
                  ? 'border-[#ff4e45]/40 bg-[#ff4e45]/18 text-white shadow-[0_0_20px_rgba(255,78,69,0.18)]'
                  : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
              }`}
            >
              영상
            </button>
            <button
              type="button"
              onClick={() => setYoutubeTab('shorts')}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                youtubeTab === 'shorts'
                  ? 'border-[#ff4e45]/40 bg-[#ff4e45]/18 text-white shadow-[0_0_20px_rgba(255,78,69,0.18)]'
                  : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
              }`}
            >
              SHORTS
            </button>
            <button
              type="button"
              onClick={() => setYoutubeTab('full')}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                youtubeTab === 'full'
                  ? 'border-[#ff4e45]/40 bg-[#ff4e45]/18 text-white shadow-[0_0_20px_rgba(255,78,69,0.18)]'
                  : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
              }`}
            >
              풀영상
            </button>
          </div>

          {youtubeTab === 'videos' ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="text-[24px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[28px]">최신영상</div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {longVideos.map((video) => <VideoCard key={video.id} video={video} />)}
              </div>
            </>
          ) : null}

          {youtubeTab === 'shorts' ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="text-[24px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[28px]">SHORTS</div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(youtube?.shorts || []).map((video) => <VideoCard key={video.id} video={video} vertical />)}
              </div>
            </>
          ) : null}

          {youtubeTab === 'full' ? (
            <>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="text-[24px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[28px]">풀영상</div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {(youtube?.full || []).map((video) => <VideoCard key={video.id} video={video} />)}
              </div>
            </>
          ) : null}
        </section>
      </main>

      <footer className="mt-16 border-t border-white/10 bg-black/30">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.35em] text-white/40">JANGJISOU FAN ARCHIVE</div>
            <div className="mt-3 text-2xl font-semibold tracking-[0.18em] text-white">JANGJISOU FAN ARCHIVE</div>
            <p className="mt-4 text-sm leading-7 text-white/60">장지수 팬 아카이브 · 제작 장지수 편집자</p>
            <p className="mt-2 text-sm leading-7 text-white/45">비영리 팬사이트이며, 모든 콘텐츠의 저작권은 원저작권자에게 있습니다.</p>
            <p className="mt-4 text-sm italic text-white/50">— 장지수 편집자 배상</p>
            <p className="mt-2 text-xs text-white/35">© 2026 JANGJISOU FAN ARCHIVE</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

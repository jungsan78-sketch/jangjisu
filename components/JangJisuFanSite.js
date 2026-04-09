import { useEffect, useState } from 'react';

function SectionTitle({ title, actionHref, actionLabel }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <h3 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-white">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ff4e45] text-sm font-bold text-white">
          ▶
        </span>
        <span>{title}</span>
      </h3>
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

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0b0f17] p-6 text-white/55">
      {text}
    </div>
  );
}

function VideoCard({ video, vertical = false }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-[26px] border border-white/10 bg-[#0c1018] transition hover:-translate-y-1 hover:border-white/20"
    >
      <div className={`relative overflow-hidden bg-[#121826] ${vertical ? 'aspect-[9/14]' : 'aspect-video'}`}>
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-white/50">▶</div>
        )}
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

export default function JangJisuFanSite() {
  const [youtube, setYoutube] = useState({
    shorts: [],
    videos: [],
    full: [],
    channels: {
      latest: {
        videosUrl: 'https://www.youtube.com/@jisoujang/videos',
        shortsUrl: 'https://www.youtube.com/@jisoujang/shorts',
      },
      full: { url: 'https://www.youtube.com/@jisoujang_full' },
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadYoutube = async () => {
      try {
        const res = await fetch('/api/youtube', { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;

        setYoutube({
          shorts: Array.isArray(json.shorts) ? json.shorts : [],
          videos: Array.isArray(json.videos) ? json.videos : [],
          full: Array.isArray(json.full) ? json.full : [],
          channels: {
            latest: {
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

    loadYoutube();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <section id="notice" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
        <div className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-white">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#3b82f6] text-sm font-bold text-white">
            ●
          </span>
          <span>점검중</span>
        </div>
      </section>

      <section id="latest-video" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
        <SectionTitle title="최신영상" actionHref={youtube.channels.latest.videosUrl} actionLabel="더보기" />
        {youtube.videos.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {youtube.videos.map((video) => <VideoCard key={video.id} video={video} />)}
          </div>
        ) : (
          <EmptyState text="최신영상을 불러오는 중입니다." />
        )}
      </section>

      <section id="shorts" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
        <SectionTitle title="Shorts" actionHref={youtube.channels.latest.shortsUrl} actionLabel="더보기" />
        {youtube.shorts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {youtube.shorts.map((video) => <VideoCard key={video.id} video={video} vertical />)}
          </div>
        ) : (
          <EmptyState text="Shorts를 불러오는 중입니다." />
        )}
      </section>

      <section id="full-video" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
        <SectionTitle title="풀영상" actionHref={youtube.channels.full.url} actionLabel="풀영상 채널 바로가기" />
        {youtube.full.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {youtube.full.map((video) => <VideoCard key={video.id} video={video} />)}
          </div>
        ) : (
          <EmptyState text="풀영상을 불러오는 중입니다." />
        )}
      </section>
    </>
  );
}

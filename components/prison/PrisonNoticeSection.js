import { useEffect, useMemo, useState } from 'react';
import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';

const INITIAL_VISIBLE_COUNT = 9;
const ALL_MEMBERS = '전체';
const MEMBER_ORDER = [WARDEN, ...PRISON_MEMBERS];
const MEMBER_IMAGE_MAP = Object.fromEntries(MEMBER_ORDER.map((member) => [member.nickname, member.image]));

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return '방금 전';
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}분 전`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))}시간 전`;
  return `${Math.floor(diffMs / day)}일 전`;
}

function MemberFilterButton({ member, image, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-black transition sm:py-2 sm:pl-2 sm:pr-4 sm:text-sm ${active ? 'border-cyan-100/35 bg-cyan-100/16 text-cyan-50 shadow-[0_0_24px_rgba(103,232,249,0.10)]' : 'border-white/10 bg-black/16 text-white/58 hover:border-white/18 hover:bg-white/[0.06] hover:text-white/82'}`}>
      {image ? <img src={image} alt="" className="h-6 w-6 rounded-full border border-white/12 object-cover sm:h-7 sm:w-7" loading="lazy" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-[11px] sm:h-7 sm:w-7">{member === ALL_MEMBERS ? 'ALL' : member.slice(0, 1)}</span>}
      <span>{member}</span>
    </button>
  );
}

function NoticeCard({ item }) {
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="group relative block min-h-[210px] overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.20)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/35 hover:bg-white/[0.07] hover:shadow-[0_28px_90px_rgba(0,0,0,0.32)]">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-cyan-200/[0.035] transition group-hover:bg-cyan-200/[0.07]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-lg shadow-black/20">
            {item.profileImage ? (
              <img src={item.profileImage} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-black text-white/60">{String(item.member || '?').slice(0, 1)}</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-black text-white/90">{item.member}</div>
            <div className="mt-0.5 text-[11px] font-bold tracking-[0.08em] text-cyan-100/45">SOOP STATION</div>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black text-white/65">{formatRelativeTime(item.createdAt)}</span>
      </div>

      <div className="relative mt-5 line-clamp-2 text-[17px] font-black leading-7 text-white">{item.title}</div>
      <div className="relative mt-3 line-clamp-3 min-h-[66px] rounded-[18px] border border-white/[0.07] bg-black/15 px-4 py-3 text-[13px] font-semibold leading-[22px] text-white/65">
        {item.summary || '본문 요약을 불러오는 중입니다.'}
      </div>

      <div className="relative mt-4 flex items-center justify-between">
        <span className="text-xs font-black text-cyan-100/85">글 열기</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-100/15 bg-cyan-100/10 text-sm text-cyan-50 transition group-hover:translate-x-0.5 group-hover:border-cyan-100/30">↗</span>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 hidden w-[330px] -translate-x-1/2 overflow-hidden rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,12,22,0.98),rgba(4,8,15,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.46)] group-hover:block">
        <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
          {item.profileImage ? <img src={item.profileImage} alt="" className="h-8 w-8 rounded-xl object-cover" loading="lazy" /> : null}
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] text-cyan-100/70">{item.member} 최근 글 요약</div>
            <div className="mt-0.5 text-[11px] font-bold text-white/40">{formatRelativeTime(item.createdAt)}</div>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <div className="text-sm font-black leading-6 text-white">{item.title}</div>
          <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-4 py-3 text-[13px] font-semibold leading-6 text-white/75">{item.summary || '요약 준비중'}</div>
        </div>
      </div>
    </a>
  );
}

export default function PrisonNoticeSection() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedMember, setSelectedMember] = useState(ALL_MEMBERS);

  useEffect(() => {
    let mounted = true;
    const loadNotices = async () => {
      try {
        const res = await fetch('/api/prison-notices');
        const json = await res.json();
        if (!mounted) return;
        setNotices(Array.isArray(json.notices) ? json.notices : []);
      } catch {
        if (mounted) setNotices([]);
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    loadNotices();
    const timer = setInterval(loadNotices, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const members = useMemo(() => {
    const available = new Set(notices.map((item) => item.member).filter(Boolean));
    const ordered = MEMBER_ORDER.map((member) => member.nickname).filter((nickname) => available.has(nickname));
    const extras = Array.from(available).filter((nickname) => !ordered.includes(nickname));
    return [...ordered, ...extras];
  }, [notices]);

  const filteredNotices = useMemo(() => {
    if (selectedMember === ALL_MEMBERS) return notices;
    return notices.filter((item) => item.member === selectedMember);
  }, [notices, selectedMember]);

  const visibleNotices = useMemo(() => {
    const items = filteredNotices.slice(0, 36);
    return expanded ? items : items.slice(0, INITIAL_VISIBLE_COUNT);
  }, [expanded, filteredNotices]);

  const hiddenCount = Math.max(0, Math.min(filteredNotices.length, 36) - INITIAL_VISIBLE_COUNT);

  const handleFilterClick = (member) => {
    setSelectedMember(member);
    setExpanded(false);
  };

  return (
    <section id="notice" className="mt-6 overflow-visible rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.028))] p-4 shadow-xl shadow-black/20 sm:mt-8 sm:rounded-[32px] sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-pink-200/20 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.35),rgba(236,72,153,0.08))] text-base text-pink-100 sm:h-11 sm:w-11 sm:text-lg">📢</span>
          <div>
            <h3 className="text-[24px] font-black tracking-tight text-white sm:text-[34px]">최근 1주일 멤버 글</h3>
            <p className="mt-1 text-xs font-semibold text-white/45 sm:text-sm">멤버들이 직접 올린 최근 글만 모아 보여줍니다.</p>
          </div>
        </div>
        {notices.length ? (
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white/55">총 {notices.length}개 수집</div>
        ) : null}
      </div>

      {members.length ? (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <MemberFilterButton member={ALL_MEMBERS} active={selectedMember === ALL_MEMBERS} onClick={() => handleFilterClick(ALL_MEMBERS)} />
          {members.map((member) => (
            <MemberFilterButton key={member} member={member} image={MEMBER_IMAGE_MAP[member] || notices.find((item) => item.member === member)?.profileImage || ''} active={selectedMember === member} onClick={() => handleFilterClick(member)} />
          ))}
        </div>
      ) : null}

      {!loaded ? (
        <div className="rounded-[20px] border border-white/10 bg-[#0b0f17] p-5 text-sm font-semibold text-white/65 sm:rounded-[24px] sm:p-6">최근 게시글을 불러오는 중입니다.</div>
      ) : visibleNotices.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleNotices.map((item) => <NoticeCard key={item.id} item={item} />)}
          </div>
          {hiddenCount > 0 ? (
            <div className="mt-6 flex justify-center">
              <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-full border border-cyan-100/18 bg-cyan-100/10 px-6 py-3 text-sm font-black text-cyan-50 shadow-[0_16px_45px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-100/35 hover:bg-cyan-100/15">
                {expanded ? '접기' : `더보기 ${hiddenCount}개`}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-[20px] border border-white/10 bg-[#0b0f17] p-5 text-sm font-semibold text-white/65 sm:rounded-[24px] sm:p-6">최근 1주일 기준으로 수집된 멤버 글이 없습니다.</div>
      )}
    </section>
  );
}

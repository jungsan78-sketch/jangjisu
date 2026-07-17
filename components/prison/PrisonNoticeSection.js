import { useEffect, useMemo, useState } from 'react';
import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';
import LatestNoticeGrid from '../notices/LatestNoticeGrid';

const INITIAL_VISIBLE_COUNT = 8;
const MAX_VISIBLE_COUNT = 32;
const NOTICE_REFRESH_MS = 30 * 60 * 1000;
const ALL_MEMBERS = '전체';
const MEMBER_ORDER = [WARDEN, ...PRISON_MEMBERS];
const MEMBER_IMAGE_MAP = Object.fromEntries(MEMBER_ORDER.map((member) => [member.nickname, member.image]));
const PRISON_BOARD_URL = 'https://www.sooplive.com/station/iamquaddurup/board';

function MemberFilterButton({ member, image, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-xs font-black transition sm:py-2 sm:pl-2 sm:pr-4 sm:text-sm ${active ? 'border-cyan-100/35 bg-cyan-100/16 text-cyan-50 shadow-[0_0_24px_rgba(103,232,249,0.10)]' : 'border-white/10 bg-black/16 text-white/58 hover:border-white/18 hover:bg-white/[0.06] hover:text-white/82'}`}>
      {image ? <img src={image} alt="" className="h-6 w-6 rounded-full border border-white/12 object-cover sm:h-7 sm:w-7" loading="lazy" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-[10px] sm:h-7 sm:w-7">ALL</span>}
      <span>{member}</span>
    </button>
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
        if (mounted) setNotices(Array.isArray(json.notices) ? json.notices : []);
      } catch {
        if (mounted) setNotices([]);
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    loadNotices();
    const timer = setInterval(loadNotices, NOTICE_REFRESH_MS);
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

  const filteredNotices = useMemo(() => selectedMember === ALL_MEMBERS
    ? notices
    : notices.filter((item) => item.member === selectedMember), [notices, selectedMember]);
  const limit = expanded ? MAX_VISIBLE_COUNT : INITIAL_VISIBLE_COUNT;
  const visibleNotices = filteredNotices.slice(0, limit);
  const hiddenCount = Math.max(0, Math.min(filteredNotices.length, MAX_VISIBLE_COUNT) - INITIAL_VISIBLE_COUNT);

  const handleFilterClick = (member) => {
    setSelectedMember(member);
    setExpanded(false);
  };

  return (
    <section id="notice" className="mt-6 bg-transparent px-4 py-8 text-white sm:mt-8 sm:px-5 lg:px-7 lg:py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black tracking-[0.38em] text-cyan-300/60 sm:text-[11px]">LATEST UPDATES</div>
          <h3 className="mt-2 text-[30px] font-black tracking-[-0.045em] text-white sm:text-[38px]">최신 공지소식</h3>
        </div>
        <a href={PRISON_BOARD_URL} target="_blank" rel="noreferrer" className="shrink-0 pb-1 text-xs font-bold text-white/58 transition hover:translate-x-0.5 hover:text-white sm:text-sm">더보기 →</a>
      </div>

      {members.length ? (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          <MemberFilterButton member={ALL_MEMBERS} active={selectedMember === ALL_MEMBERS} onClick={() => handleFilterClick(ALL_MEMBERS)} />
          {members.map((member) => (
            <MemberFilterButton key={member} member={member} image={MEMBER_IMAGE_MAP[member] || notices.find((item) => item.member === member)?.profileImage || ''} active={selectedMember === member} onClick={() => handleFilterClick(member)} />
          ))}
        </div>
      ) : null}

      <LatestNoticeGrid
        notices={visibleNotices}
        loaded={loaded}
        emptyMessage="최근 1주일 기준으로 수집된 멤버 글이 없습니다."
      />

      {hiddenCount > 0 ? (
        <div className="mt-7 flex justify-center">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-full border border-cyan-100/18 bg-cyan-100/10 px-6 py-3 text-sm font-black text-cyan-50 shadow-[0_16px_45px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-100/35 hover:bg-cyan-100/15">
            {expanded ? '접기' : `더보기 ${hiddenCount}개`}
          </button>
        </div>
      ) : null}
    </section>
  );
}

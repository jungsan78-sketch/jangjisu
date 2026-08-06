import { useEffect, useMemo, useState } from 'react';
import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';
import LatestNoticeGrid from '../notices/LatestNoticeGrid';

const NOTICE_REFRESH_MS = 30 * 60 * 1000;
const MEMBER_ORDER = PRISON_MEMBERS.map((member) => member.nickname);

function noticeTime(notice) {
  const time = new Date(notice?.createdAt || notice?.rawCreatedAt || '').getTime();
  return Number.isFinite(time) ? time : 0;
}

export default function PrisonNoticeSection() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadNotices = async () => {
      try {
        const res = await fetch('/api/prison-notices?v=6');
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

  const latestByMember = useMemo(() => {
    const wardenNotice = notices.find((item) => item.member === WARDEN.nickname);
    const memberNotices = MEMBER_ORDER
      .map((member) => notices.find((item) => item.member === member))
      .filter(Boolean)
      .sort((a, b) => noticeTime(b) - noticeTime(a));

    return wardenNotice ? [wardenNotice, ...memberNotices] : memberNotices;
  }, [notices]);

  return (
    <section id="notice" className="sou-prison-notice-section mt-6 bg-transparent px-4 py-8 text-white sm:mt-8 sm:px-5 lg:px-7 lg:py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-[30px] font-black tracking-[-0.045em] text-white sm:text-[38px]">최신 공지사항</h3>
        </div>
      </div>

      <LatestNoticeGrid
        notices={latestByMember}
        loaded={loaded}
        emptyMessage="멤버들의 최신 공지사항을 불러오는 중입니다."
      />
    </section>
  );
}

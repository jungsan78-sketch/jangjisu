import { useEffect, useMemo, useState } from 'react';
import { PRISON_MEMBERS } from '../../data/prisonMembers';
import LatestNoticeGrid from '../notices/LatestNoticeGrid';

const NOTICE_REFRESH_MS = 30 * 60 * 1000;
const MEMBER_ORDER = PRISON_MEMBERS.map((member) => member.nickname);

export default function PrisonNoticeSection() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

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

  const latestByMember = useMemo(() => MEMBER_ORDER
    .map((member) => notices.find((item) => item.member === member))
    .filter(Boolean), [notices]);

  return (
    <section id="notice" className="mt-6 bg-transparent px-4 py-8 text-white sm:mt-8 sm:px-5 lg:px-7 lg:py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black tracking-[0.38em] text-cyan-300/60 sm:text-[11px]">LATEST UPDATES</div>
          <h3 className="mt-2 text-[30px] font-black tracking-[-0.045em] text-white sm:text-[38px]">최신 공지사항</h3>
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

import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const WARDEN = {
  nickname: '장지수',
  role: '교도소장',
  image: 'https://stimg.sooplive.com/LOGO/ia/iamquaddurup/iamquaddurup.jpg',
  station: 'https://www.sooplive.com/station/iamquaddurup',
};

const PRISON_MEMBERS = [
  { nickname: '냥냥두둥', image: 'https://stimg.sooplive.com/LOGO/do/doodong/doodong.jpg', station: 'https://www.sooplive.com/station/doodong' },
  { nickname: '치치', image: 'https://stimg.sooplive.com/LOGO/lo/lomioeov/m/lomioeov.webp', station: 'https://www.sooplive.com/station/lomioeov' },
  { nickname: '시몽', image: 'https://stimg.sooplive.com/LOGO/xi/ximong/ximong.jpg', station: 'https://www.sooplive.com/station/ximong' },
  { nickname: '유오늘', image: 'https://stimg.sooplive.com/LOGO/yo/youoneul/youoneul.jpg', station: 'https://www.sooplive.com/station/youoneul' },
  { nickname: '아야네세나', image: 'https://stimg.sooplive.com/LOGO/ay/ayanesena/ayanesena.jpg', station: 'https://www.sooplive.com/station/ayanesena' },
  { nickname: '포포', image: 'https://stimg.sooplive.com/LOGO/su/sunza1122/sunza1122.jpg', station: 'https://www.sooplive.com/station/sunza1122' },
  { nickname: '채니', image: 'https://stimg.sooplive.com/LOGO/k1/k1baaa/k1baaa.jpg', station: 'https://www.sooplive.com/station/k1baaa' },
  { nickname: '코로미', image: 'https://stimg.sooplive.com/LOGO/bx/bxroong/bxroong.jpg', station: 'https://www.sooplive.com/station/bxroong' },
  { nickname: '구월이', image: 'https://stimg.sooplive.com/LOGO/is/isq1158/isq1158.jpg', station: 'https://www.sooplive.com/station/isq1158' },
  { nickname: '린링', image: 'https://stimg.sooplive.com/LOGO/mi/mini1212/mini1212.jpg', station: 'https://www.sooplive.com/station/mini1212' },
  { nickname: '띠꾸', image: 'https://stimg.sooplive.com/LOGO/dd/ddikku0714/ddikku0714.jpg', station: 'https://www.sooplive.com/station/ddikku0714' },
];

const SCHEDULE_MEMBERS = [WARDEN, ...PRISON_MEMBERS];

function NavChip({ href, label, tone = 'steel', icon = '' }) {
  const toneClass = tone === 'warm'
    ? 'border-amber-200/22 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(255,255,255,0.035))] text-amber-50 hover:border-amber-100/34 hover:bg-amber-300/18 hover:shadow-[0_0_26px_rgba(245,158,11,0.13)]'
    : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] text-white/80 hover:border-white/18 hover:bg-white/10 hover:text-white';

  return (
    <a href={href} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.04] ${toneClass}`}>
      {icon ? <span>{icon}</span> : null}
      <span>{label}</span>
    </a>
  );
}

function SectionTitle({ title, logo }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {logo ? <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/18 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(255,255,255,0.04))] text-lg leading-none text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.10)]">{logo}</span> : null}
      <h3 className="text-[28px] font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[34px]">{title}</h3>
    </div>
  );
}

function ScheduleFilterButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-5 py-2.5 text-[15px] font-black transition ${active ? 'border-cyan-200/38 bg-[linear-gradient(180deg,rgba(34,211,238,0.18),rgba(59,130,246,0.10))] text-white shadow-[0_0_24px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]' : 'border-white/10 bg-white/[0.06] text-white/72 hover:border-cyan-200/24 hover:bg-white/[0.09] hover:text-white'}`}>
      {children}
    </button>
  );
}

function parseMonthFromLabel(monthLabel) {
  const match = String(monthLabel || '').match(/(\d{4})년\s*(\d{1,2})월/);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function buildCalendarCells(schedule) {
  const { year, month } = parseMonthFromLabel(schedule.monthLabel);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingEmpty = new Date(year, month - 1, 1).getDay();
  const totalCells = Math.ceil((leadingEmpty + daysInMonth) / 7) * 7;
  const itemMap = new Map((schedule.items || []).map((item) => [Number(item.dayNumber), item]));

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - leadingEmpty + 1;
    if (day < 1 || day > daysInMonth) return null;
    return itemMap.get(day) || { dayNumber: day, title: '', empty: true };
  });
}

function isOffSchedule(title) {
  return String(title || '').includes('휴방');
}

function CalendarPreview() {
  const [selectedMember, setSelectedMember] = useState('전체보기');
  const [mainSchedule, setMainSchedule] = useState({ monthLabel: '', items: [], loaded: false });

  useEffect(() => {
    let mounted = true;
    const loadMainSchedule = async () => {
      try {
        const res = await fetch('/api/schedule');
        const json = await res.json();
        if (!mounted) return;
        setMainSchedule({ monthLabel: json.monthLabel || '', items: Array.isArray(json.items) ? json.items : [], loaded: true });
      } catch {
        if (!mounted) return;
        setMainSchedule({ monthLabel: '', items: [], loaded: true });
      }
    };
    loadMainSchedule();
    const timer = setInterval(loadMainSchedule, 60 * 1000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const calendarCells = useMemo(() => buildCalendarCells(mainSchedule), [mainSchedule]);
  const { month } = useMemo(() => parseMonthFromLabel(mainSchedule.monthLabel), [mainSchedule.monthLabel]);
  const today = new Date();
  const jangjisuSchedules = useMemo(() => (mainSchedule.items || [])
    .filter((item) => !item.empty && String(item.title || '').trim())
    .map((item) => ({ day: item.dayNumber, member: '장지수', title: item.title })), [mainSchedule]);
  const allSchedules = useMemo(() => [...jangjisuSchedules], [jangjisuSchedules]);
  const visibleSchedules = useMemo(() => selectedMember === '전체보기'
    ? allSchedules
    : allSchedules.filter((item) => item.member === selectedMember), [allSchedules, selectedMember]);
  const scheduleByDay = useMemo(() => {
    const map = new Map();
    visibleSchedules.forEach((item) => {
      const list = map.get(item.day) || [];
      list.push(item);
      map.set(item.day, list);
    });
    return map;
  }, [visibleSchedules]);

  return (
    <section id="schedule" className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/20 lg:p-8">
      <SectionTitle title="장지수용소 일정표" logo="⛓️" />
      <div className="rounded-[30px] border border-[#12305c] bg-[radial-gradient(circle_at_top,rgba(22,78,145,0.18),transparent_26%),linear-gradient(180deg,rgba(4,10,22,0.98),rgba(3,9,20,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[26px] font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] sm:text-[30px]">수용소 월간 일정</div>
            <div className="mt-2 text-[15px] font-semibold leading-7 text-white/68">전체보기는 모든 멤버 일정을 합쳐서 보여주고, 멤버 버튼은 해당 멤버 일정만 표시합니다.</div>
          </div>
          <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black tracking-[0.22em] text-cyan-100">{mainSchedule.monthLabel || 'PRISON SCHEDULE'}</div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 rounded-[24px] border border-white/8 bg-[#05101d] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <ScheduleFilterButton active={selectedMember === '전체보기'} onClick={() => setSelectedMember('전체보기')}>전체보기</ScheduleFilterButton>
          {SCHEDULE_MEMBERS.map((member) => (
            <ScheduleFilterButton key={member.nickname} active={selectedMember === member.nickname} onClick={() => setSelectedMember(member.nickname)}>{member.nickname}</ScheduleFilterButton>
          ))}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#05101d] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
          <div className="mb-4 grid grid-cols-7 gap-3 text-center text-[15px] font-black text-white/68">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div key={day} className={index === 0 ? 'text-[#ff8e8e]' : index === 6 ? 'text-[#89b4ff]' : ''}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3">
            {calendarCells.map((cell, index) => {
              if (!cell) return <div key={`empty-${index}`} className={`${selectedMember === '전체보기' ? 'min-h-[160px]' : 'min-h-[132px]'} rounded-[22px] border border-white/5 bg-white/[0.02]`} />;
              const day = Number(cell.dayNumber);
              const schedules = scheduleByDay.get(day) || [];
              const hasSchedule = schedules.length > 0;
              const isToday = today.getMonth() + 1 === month && today.getDate() === day;
              return (
                <div key={day} className={`group relative overflow-hidden ${selectedMember === '전체보기' ? 'min-h-[160px]' : 'min-h-[132px]'} rounded-[22px] border p-3.5 transition-all duration-300 hover:-translate-y-1 ${hasSchedule ? 'border-white/10 bg-[linear-gradient(180deg,rgba(11,23,38,0.96),rgba(7,17,31,0.98))] hover:border-cyan-300/24 hover:shadow-[0_14px_30px_rgba(56,189,248,0.08)]' : 'border-white/8 bg-[#07111f] hover:border-white/12 hover:bg-[#091729]'}`}>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_72%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="text-[17px] font-black text-white/95">{day}</div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {isToday ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/12 px-2 py-0.5 text-[10px] font-black tracking-[0.08em] text-cyan-100">TODAY</span> : null}
                    </div>
                  </div>
                  <div className="relative mt-3 space-y-2">
                    {schedules.map((item) => {
                      const off = isOffSchedule(item.title);
                      return (
                        <div key={`${item.day}-${item.member}-${item.title}`} className={`text-[13px] font-black leading-6 ${off ? 'text-rose-200' : 'text-white'}`}>
                          {off ? (
                            <>
                              <span className="text-rose-100">{item.member}</span>
                              <span className="ml-1 text-rose-100">휴방</span>
                            </>
                          ) : (
                            <>
                              <span className="text-cyan-100">{item.member}</span>
                              <span className="px-1.5 text-white/42">-</span>
                              <span>{item.title}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          {!mainSchedule.loaded ? <div className="mt-4 text-sm font-bold text-white/55">메인 일정표 데이터를 불러오는 중입니다.</div> : null}
          {mainSchedule.loaded && visibleSchedules.length === 0 ? <div className="mt-4 text-sm font-bold text-white/55">선택한 메뉴의 일정 데이터가 아직 비어 있습니다.</div> : null}
        </div>
      </div>
    </section>
  );
}

function ProfileCard({ member, large = false }) {
  return (
    <a href={member.station} target="_blank" rel="noreferrer" className={`group block rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.065] ${large ? 'mx-auto max-w-[360px]' : ''}`}>
      <img src={member.image} alt={member.nickname} className={`${large ? 'h-28 w-28' : 'h-20 w-20'} mx-auto rounded-full border border-white/10 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.22)]`} />
      <div className={`${large ? 'text-xl' : 'text-sm'} mt-4 font-black text-white`}>{member.nickname}</div>
      <div className="mt-3 inline-flex rounded-full border border-amber-200/16 bg-amber-200/10 px-3 py-1 text-[11px] font-black text-amber-100/88">방송국 열기</div>
    </a>
  );
}

function MemberBoardPreview() {
  return (
    <section id="members" className="mt-8 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] lg:p-8">
      <SectionTitle title="장지수용소 멤버표" logo="🪪" />
      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_30%),linear-gradient(180deg,rgba(13,17,25,0.98),rgba(5,7,11,0.99))] p-5 shadow-[0_22px_55px_rgba(0,0,0,0.34)] sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">교도소장</div>
          </div>
          <div className="rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs font-black tracking-[0.22em] text-amber-50">WARDEN</div>
        </div>
        <ProfileCard member={WARDEN} large />

        <div className="mt-8 border-t border-white/10 pt-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">수용생들</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black tracking-[0.22em] text-white/78">{PRISON_MEMBERS.length}명</div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {PRISON_MEMBERS.map((member) => (
              <ProfileCard key={member.nickname} member={member} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function JangjisuPrisonPage() {
  return (
    <>
      <Head>
        <title>장지수용소 모드 | 장지수용소 팬메이드</title>
        <meta name="description" content="장지수용소 팬메이드 서브사이트" />
      </Head>
      <div className="min-h-screen bg-[#05070c] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 left-[-50px] h-72 w-72 rounded-full bg-slate-500/10 blur-3xl" />
          <div className="absolute top-20 right-[-70px] h-80 w-80 rounded-full bg-amber-500/8 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[30rem] -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl" />
        </div>

        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/72 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <a href="/" className="block h-14 w-14 overflow-hidden rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.12)] transition hover:scale-[1.07] hover:border-white/25">
              <img src="/site-icon.png" alt="SOU" className="h-full w-full object-cover" />
            </a>
            <nav className="flex flex-wrap items-center justify-end gap-3">
              <NavChip href="/" label="SOU 메인" icon="↩" />
              <NavChip href="#members" label="멤버표" icon="🪪" />
              <NavChip href="#schedule" label="일정표" icon="⛓️" tone="warm" />
              <NavChip href="/jangjisu-prison/crews" label="종겜 크루 목록" icon="📋" />
            </nav>
          </div>
        </header>

        <main className="relative mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
          <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
            <div className="relative min-h-[460px] overflow-hidden lg:min-h-[560px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.20),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),_transparent_24%),linear-gradient(180deg,_rgba(8,11,18,0.46)_0%,_rgba(5,7,12,0.70)_48%,_rgba(2,5,10,0.92)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.12),transparent_68%)] blur-2xl" />
              <div className="relative z-10 flex min-h-[460px] flex-col items-center justify-center px-6 text-center lg:min-h-[560px]">
                <div className="text-xs font-black tracking-[0.52em] text-amber-100/46">JANGJISU PRISON FANMADE</div>
                <div className="mt-7 select-none bg-[linear-gradient(90deg,#ffffff_0%,#dbeafe_25%,#ffffff_50%,#fde68a_75%,#ffffff_100%)] bg-[length:200%_200%] bg-clip-text text-[54px] font-black leading-[1.02] tracking-[0.08em] text-transparent drop-shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:text-[76px] md:text-[104px]">
                  장지수용소
                </div>
                <p className="mt-6 max-w-2xl text-sm font-semibold leading-8 text-white/68">장지수가 운영하는 버추얼 동아리 전용 팬메이드 서브사이트입니다.</p>
              </div>
            </div>
          </section>

          <MemberBoardPreview />
          <CalendarPreview />
        </main>
      </div>
    </>
  );
}

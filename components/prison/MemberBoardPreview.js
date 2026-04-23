import { PRISON_MEMBERS, WARDEN } from '../../data/prisonMembers';
import { SectionTitle } from './prisonShared';

function PlatformButton({ href, type }) {
  const srcMap = { youtube: '/youtube-logo.svg', cafe: '/naver-cafe-logo.svg', soop: '/soop-logo.svg' };
  const labelMap = { youtube: 'YouTube 채널', cafe: 'NAVER 팬카페', soop: 'SOOP 방송국' };
  const tone = type === 'youtube'
    ? 'border-red-300/20 bg-red-500/10 hover:border-red-200/42'
    : type === 'cafe'
      ? 'border-emerald-300/20 bg-emerald-400/10 hover:border-emerald-200/42'
      : 'border-cyan-200/20 bg-cyan-300/10 hover:border-cyan-100/42';
  const cls = `inline-flex h-10 w-11 items-center justify-center rounded-2xl border bg-black/18 px-2 transition duration-300 sm:h-12 sm:w-14 ${href ? 'hover:-translate-y-0.5 hover:scale-[1.04]' : 'pointer-events-none grayscale opacity-30'} ${tone}`;
  const icon = <img src={srcMap[type]} alt={labelMap[type]} className={`${type === 'soop' ? '-translate-x-0.5' : ''} max-h-7 max-w-[36px] object-contain sm:max-h-8 sm:max-w-[42px]`} />;

  if (!href) return <span className={cls} title={`${labelMap[type]} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={labelMap[type]} title={labelMap[type]} className={cls}>{icon}</a>;
}

function ProfileCard({ member, large = false }) {
  return (
    <div className={`group rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.065] sm:rounded-[26px] sm:p-4 ${large ? 'mx-auto w-full max-w-[320px] sm:max-w-[360px]' : ''}`}>
      <img src={member.image} alt={member.nickname} className={`${large ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-16 w-16 sm:h-20 sm:w-20'} mx-auto rounded-full border border-white/10 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.22)]`} />
      <div className={`${large ? 'text-lg sm:text-xl' : 'text-[13px] sm:text-sm'} mt-3 font-black text-white sm:mt-4`}>{member.nickname}</div>
      <div className="mt-3 flex items-center justify-center gap-1.5 sm:mt-4 sm:gap-2">
        <PlatformButton href={member.station} type="soop" />
        <PlatformButton href={member.youtube} type="youtube" />
        <PlatformButton href={member.cafe} type="cafe" />
      </div>
    </div>
  );
}

export default function MemberBoardPreview() {
  return (
    <section id="members" className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.28)] sm:mt-8 sm:rounded-[34px] sm:p-6 lg:p-8">
      <SectionTitle title="장지수용소 멤버표" logo="🪪" />
      <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_30%),linear-gradient(180deg,rgba(13,17,25,0.98),rgba(5,7,11,0.99))] p-4 shadow-[0_22px_55px_rgba(0,0,0,0.34)] sm:rounded-[32px] sm:p-5 lg:p-7">
        <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="text-[22px] font-black tracking-tight text-white sm:text-[32px]">교도소장</div>
          <div className="w-fit rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-[11px] font-black tracking-[0.18em] text-amber-50 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.22em]">WARDEN</div>
        </div>

        <ProfileCard member={WARDEN} large />

        <div className="mt-6 border-t border-white/10 pt-6 sm:mt-8 sm:pt-7">
          <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="text-[22px] font-black tracking-tight text-white sm:text-[32px]">수감생</div>
            <div className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[11px] font-black tracking-[0.18em] text-white/78 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.22em]">{PRISON_MEMBERS.length}명</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {PRISON_MEMBERS.map((member) => <ProfileCard key={member.nickname} member={member} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

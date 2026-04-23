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
  const cls = `inline-flex h-12 w-14 items-center justify-center rounded-2xl border bg-black/18 px-2 transition duration-300 ${href ? 'hover:-translate-y-0.5 hover:scale-[1.04]' : 'pointer-events-none grayscale opacity-30'} ${tone}`;
  const icon = <img src={srcMap[type]} alt={labelMap[type]} className={`${type === 'soop' ? '-translate-x-0.5' : ''} max-h-8 max-w-[42px] object-contain`} />;

  if (!href) return <span className={cls} title={`${labelMap[type]} 준비중`}>{icon}</span>;
  return <a href={href} target="_blank" rel="noreferrer" aria-label={labelMap[type]} title={labelMap[type]} className={cls}>{icon}</a>;
}

function ProfileCard({ member, large = false }) {
  return (
    <div className={`group rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_14px_32px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-white/18 hover:bg-white/[0.065] ${large ? 'mx-auto max-w-[360px]' : ''}`}>
      <img src={member.image} alt={member.nickname} className={`${large ? 'h-28 w-28' : 'h-20 w-20'} mx-auto rounded-full border border-white/10 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.22)]`} />
      <div className={`${large ? 'text-xl' : 'text-sm'} mt-4 font-black text-white`}>{member.nickname}</div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <PlatformButton href={member.station} type="soop" />
        <PlatformButton href={member.youtube} type="youtube" />
        <PlatformButton href={member.cafe} type="cafe" />
      </div>
    </div>
  );
}

export default function MemberBoardPreview() {
  return (
    <section id="members" className="mt-8 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.28)] lg:p-8">
      <SectionTitle title="장지수용소 멤버표" logo="🪪" />
      <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_30%),linear-gradient(180deg,rgba(13,17,25,0.98),rgba(5,7,11,0.99))] p-5 shadow-[0_22px_55px_rgba(0,0,0,0.34)] sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">교도소장</div>
          <div className="rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs font-black tracking-[0.22em] text-amber-50">WARDEN</div>
        </div>

        <ProfileCard member={WARDEN} large />

        <div className="mt-8 border-t border-white/10 pt-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="text-[26px] font-black tracking-tight text-white sm:text-[32px]">수감생</div>
            <div className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black tracking-[0.22em] text-white/78">{PRISON_MEMBERS.length}명</div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {PRISON_MEMBERS.map((member) => <ProfileCard key={member.nickname} member={member} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

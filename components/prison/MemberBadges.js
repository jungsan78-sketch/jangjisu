import { getPrisonMemberBadges, PRISON_BADGE_META } from '../../data/prisonBadges';

function badgeClassName(tone, mini) {
  const sizeClass = mini ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  const toneClass = tone === 'warden'
    ? 'border-amber-200/35 bg-[linear-gradient(135deg,rgba(251,191,36,0.36),rgba(120,53,15,0.34))] text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.32),inset_0_1px_0_rgba(255,255,255,0.26)]'
    : tone === 'captain'
      ? 'border-cyan-200/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.34),rgba(30,64,175,0.32))] text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.30),inset_0_1px_0_rgba(255,255,255,0.24)]'
      : 'border-red-200/35 bg-[linear-gradient(135deg,rgba(248,113,113,0.38),rgba(127,29,29,0.36))] text-red-50 shadow-[0_0_18px_rgba(248,113,113,0.30),inset_0_1px_0_rgba(255,255,255,0.24)]';

  return `shrink-0 rounded-full border ${sizeClass} font-black ${toneClass}`;
}

export function MemberBadges({ nickname, mini = false }) {
  const badges = getPrisonMemberBadges(nickname);
  if (!badges.length) return null;

  return (
    <>
      {badges.map((badgeKey) => {
        const meta = PRISON_BADGE_META[badgeKey];
        if (!meta) return null;
        return <span key={badgeKey} className={badgeClassName(meta.tone, mini)}>{meta.label}</span>;
      })}
    </>
  );
}

export function MemberNameWithBadges({ nickname, className = '', badgeMini = false }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="truncate">{nickname}</span>
      <MemberBadges nickname={nickname} mini={badgeMini} />
    </span>
  );
}

export default MemberBadges;

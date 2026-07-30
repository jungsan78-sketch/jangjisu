function getStationId(member, status) {
  if (status?.stationId) return String(status.stationId);
  const matched = String(member?.station || '').match(/\/station\/([^/?#]+)/i);
  return matched?.[1] || '';
}

export default function SoopEmbedTile({ member, status, featured = false, chatSelected = false, onSelectChat, onRemove }) {
  const stationId = getStationId(member, status);
  const embedUrl = stationId ? `https://play.sooplive.com/${encodeURIComponent(stationId)}/embed` : '';
  const liveUrl = status?.liveUrl || member?.station || '#';

  return (
    <article className={`group relative min-h-0 overflow-hidden rounded-[22px] bg-black shadow-[0_20px_55px_rgba(0,0,0,0.36)] transition ${featured ? 'lg:row-span-2' : ''} ${chatSelected ? 'ring-2 ring-sky-300/80' : 'ring-1 ring-white/[0.04]'}`}>
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/82 via-black/48 to-transparent px-3 pb-8 pt-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src={member.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/20" />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-black text-white sm:text-sm">{member.nickname}</div>
            <div className="truncate text-[10px] font-bold text-white/55 sm:text-[11px]">{status?.title || 'SOOP LIVE'}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onSelectChat} className={`rounded-full px-2.5 py-1.5 text-[10px] font-black backdrop-blur transition sm:text-[11px] ${chatSelected ? 'bg-sky-300 text-slate-950' : 'bg-white/10 text-white/80 hover:bg-white/18'}`}>채팅</button>
          <a href={liveUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-2.5 py-1.5 text-[10px] font-black text-white/80 backdrop-blur transition hover:bg-white/18 sm:text-[11px]">SOOP 열기</a>
          <button type="button" onClick={onRemove} aria-label={`${member.nickname} 멀티뷰에서 제거`} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-black text-white/80 backdrop-blur transition hover:bg-rose-500/75 hover:text-white">×</button>
        </div>
      </div>

      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={`${member.nickname} SOOP 라이브`}
          className="h-full min-h-[260px] w-full border-0 bg-black sm:min-h-[360px]"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="flex min-h-[260px] items-center justify-center px-6 text-center text-sm font-bold text-white/55 sm:min-h-[360px]">
          SOOP 방송국 ID를 확인하지 못했습니다.
        </div>
      )}
    </article>
  );
}

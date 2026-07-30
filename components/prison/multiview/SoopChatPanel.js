function getStationId(member, status) {
  if (status?.stationId) return String(status.stationId);
  const matched = String(member?.station || '').match(/\/station\/([^/?#]+)/i);
  return matched?.[1] || '';
}

function getChatUrl(member, status) {
  const stationId = getStationId(member, status);
  const broadNo = String(status?.broadNo || '').trim();
  if (!stationId || !broadNo) return '';
  return `https://play.sooplive.com/${encodeURIComponent(stationId)}/${encodeURIComponent(broadNo)}?vtype=chat`;
}

export default function SoopChatPanel({ member, status, members, onSelect }) {
  const chatUrl = getChatUrl(member, status);

  return (
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
        {members.map((item) => {
          const selected = item.nickname === member?.nickname;
          return (
            <button
              key={item.nickname}
              type="button"
              onClick={() => onSelect(item)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition ${
                selected ? 'bg-sky-300 text-slate-950' : 'bg-white/[0.06] text-white/55 hover:bg-white/10 hover:text-white'
              }`}
            >
              <img src={item.image} alt="" className="h-5 w-5 rounded-full object-cover" />
              {item.nickname}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-[#090c12] ring-1 ring-white/[0.06]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">{member ? `${member.nickname} 채팅` : '채팅'}</div>
            <div className="mt-0.5 truncate text-[10px] font-bold text-white/38">{status?.title || '채팅을 볼 방송을 선택해주세요.'}</div>
          </div>
          {chatUrl ? (
            <a href={chatUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[10px] font-black text-white/65 transition hover:bg-white/12 hover:text-white">
              새 창
            </a>
          ) : null}
        </div>

        {chatUrl ? (
          <iframe
            key={chatUrl}
            src={chatUrl}
            title={`${member.nickname} SOOP 채팅`}
            className="min-h-[500px] w-full flex-1 border-0 bg-[#090c12]"
            allow="clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
            <div className="text-3xl text-white/30">▢</div>
            <div className="mt-3 text-sm font-black text-white/65">채팅을 표시할 수 없습니다.</div>
            <div className="mt-1 text-[11px] font-bold leading-5 text-white/35">방송이 종료됐거나 방송 번호를 확인하지 못했습니다.</div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] font-bold leading-4 text-white/30">로그인 또는 채팅 입력이 제한되면 ‘새 창’에서 SOOP 채팅을 이용해주세요.</p>
    </div>
  );
}

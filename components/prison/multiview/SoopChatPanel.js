function getStationId(member, status) {
  if (status?.stationId) return String(status.stationId);
  const matched = String(member?.station || '').match(/\/station\/([^/?#]+)/i);
  return matched?.[1] || '';
}

export default function SoopChatPanel({ selectedMembers, statuses, chatName, onSelect }) {
  const chatMember = selectedMembers.find((member) => member.nickname === chatName) || selectedMembers[0] || null;
  const status = chatMember ? statuses[chatMember.nickname] || {} : {};
  const stationId = getStationId(chatMember, status);
  const broadNo = String(status.broadNo || status.broad_no || '').trim();
  const chatUrl = stationId && broadNo ? `https://play.sooplive.com/${encodeURIComponent(stationId)}/${encodeURIComponent(broadNo)}?vtype=chat` : '';

  return (
    <aside className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-[26px] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_20px_50px_rgba(0,0,0,0.24)]">
      <div className="border-b border-white/[0.06] px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">실시간 채팅</h2>
            <p className="mt-1 text-[11px] font-bold text-white/38">선택한 방송의 SOOP 공식 채팅입니다.</p>
          </div>
          {chatUrl ? <a href={chatUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-xl bg-white/[0.065] px-3 py-2 text-[10px] font-black text-white/65 transition hover:bg-white/12 hover:text-white">새 창</a> : null}
        </div>

        {selectedMembers.length ? (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {selectedMembers.map((member) => {
              const active = member.nickname === chatMember?.nickname;
              return <button key={member.nickname} type="button" onClick={() => onSelect(member.nickname)} className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[11px] font-black transition ${active ? 'bg-sky-300 text-slate-950' : 'bg-white/[0.06] text-white/58 hover:bg-white/10 hover:text-white'}`}><img src={member.image} alt="" className="h-6 w-6 rounded-full object-cover" />{member.nickname}</button>;
            })}
          </div>
        ) : null}
      </div>

      {chatUrl ? (
        <iframe key={`${stationId}-${broadNo}`} src={chatUrl} title={`${chatMember.nickname} SOOP 실시간 채팅`} className="min-h-[520px] flex-1 border-0 bg-white" allow="clipboard-write" referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <div className="flex min-h-[520px] flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/[0.055] text-2xl text-white/42">▤</div>
          <div className="mt-4 text-sm font-black text-white/68">{chatMember ? '채팅 연결을 기다리는 중입니다' : '방송을 선택해주세요'}</div>
          <div className="mt-2 text-xs font-bold leading-5 text-white/34">{chatMember ? '방송 상태가 갱신되면 공식 채팅이 자동으로 연결됩니다.' : '상단 스트림 목록에서 방송을 추가하면 채팅이 표시됩니다.'}</div>
        </div>
      )}
    </aside>
  );
}

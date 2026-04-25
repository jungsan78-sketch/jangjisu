import { useMemo, useState } from 'react';

function buildCollectorScript(appUrl) {
  const targetOrigin = new URL(appUrl).origin;
  return `(function(){
  const targetOrigin=${JSON.stringify(targetOrigin)};
  const targetUrl=${JSON.stringify(appUrl)};
  const target=window.open(targetUrl,'sou_funding_memo');
  const seen=new WeakSet();
  function text(el){return (el&&el.innerText||'').trim();}
  function send(item){
    const user=item.querySelector('button.user,.user');
    const msg=item.querySelector('.message-text .msg,#message-original,.msg');
    const nickname=(user&&user.getAttribute('user_nick'))||text(item.querySelector('.author'));
    const userId=(user&&user.getAttribute('user_id'))||'';
    const message=text(msg);
    if(!nickname||!message) return;
    target.postMessage({type:'SOU_SOOP_CHAT',nickname,userId,message,at:Date.now()},targetOrigin);
    console.log('[JANGJISOU CHAT]',nickname,message);
  }
  function scan(root){
    (root||document).querySelectorAll('.chatting-list-item').forEach(function(item){
      if(seen.has(item)) return;
      seen.add(item);
      send(item);
    });
  }
  scan(document);
  if(window.__souFundingCollectorObserver){
    window.__souFundingCollectorObserver.disconnect();
  }
  const observer=new MutationObserver(function(mutations){
    mutations.forEach(function(mutation){
      mutation.addedNodes.forEach(function(node){
        if(!(node instanceof HTMLElement)) return;
        if(node.matches&&node.matches('.chatting-list-item')){
          if(!seen.has(node)){seen.add(node);send(node);}
          return;
        }
        scan(node);
      });
    });
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.__souFundingCollectorObserver=observer;
  window.__souFundingCollectorStop=function(){observer.disconnect();console.log('[JANGJISOU CHAT] stopped');};
  console.log('[JANGJISOU CHAT] collector started. 메모장 창을 닫지 마세요.');
})();`;
}

export default function SoopFundingBookmarkletGuide() {
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/utility/soop-funding-memo`;

  const bookmarkletHref = useMemo(() => {
    if (!appUrl) return '#';
    return `javascript:${encodeURIComponent(buildCollectorScript(appUrl))}`;
  }, [appUrl]);

  const copyBookmarklet = async () => {
    if (!bookmarkletHref || bookmarkletHref === '#') return;
    await navigator.clipboard.writeText(bookmarkletHref);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className="relative mx-auto max-w-[1780px] px-5 pt-5 lg:px-8">
      <div className="rounded-[28px] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(34,211,238,0.10),rgba(255,255,255,0.035))] p-4 shadow-2xl shadow-black/20">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/45">Easy collector</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">수집기 실행을 즐겨찾기 버튼처럼 바꿨습니다</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/52">
              아래 버튼을 즐겨찾기바로 드래그해서 한 번 등록하면, 다음부터는 SOOP 방송 페이지에서 그 버튼만 클릭하면 채팅 수집기가 연결됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={bookmarkletHref}
              className="cursor-grab rounded-2xl border border-cyan-200/35 bg-cyan-300/18 px-5 py-3 text-sm font-black text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.12)] transition hover:bg-cyan-300/24 active:cursor-grabbing"
              onClick={(event) => event.preventDefault()}
              title="이 버튼을 즐겨찾기바로 드래그하세요"
            >
              장지수용소 수집기
            </a>
            <button
              type="button"
              onClick={copyBookmarklet}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.09]"
            >
              {copied ? '복사됨' : '북마클릿 코드 복사'}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-xs font-bold leading-5 text-white/45 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/22 p-3"><span className="text-cyan-100/80">1.</span> 크롬 즐겨찾기바를 켭니다.</div>
          <div className="rounded-2xl border border-white/10 bg-black/22 p-3"><span className="text-cyan-100/80">2.</span> `장지수용소 수집기` 버튼을 즐겨찾기바로 드래그합니다.</div>
          <div className="rounded-2xl border border-white/10 bg-black/22 p-3"><span className="text-cyan-100/80">3.</span> SOOP 방송 페이지에서 등록한 버튼을 클릭합니다.</div>
        </div>
      </div>
    </section>
  );
}

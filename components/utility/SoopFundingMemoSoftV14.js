import { useEffect, useState } from 'react';
import SoopFundingMemoSoftV13 from './SoopFundingMemoSoftV13';

function findDebugPanel(root) {
  if (!root) return null;
  const candidates = [...root.querySelectorAll('div')];
  return candidates.find((element) => {
    const text = element.textContent || '';
    return text.includes('Client ID')
      && text.includes('Client Secret')
      && text.includes('Chat SDK URL')
      && text.includes('마지막 SDK 오류');
  });
}

function applyDebugVisibility(root, visible) {
  const panel = findDebugPanel(root);
  if (!panel) return;
  panel.style.display = visible ? '' : 'none';
}

export default function SoopFundingMemoSoftV14() {
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const root = document.querySelector('.funding-memo-soft-v14');
    applyDebugVisibility(root, showDebug);

    const observer = new MutationObserver(() => applyDebugVisibility(root, showDebug));
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [showDebug]);

  return (
    <div className="funding-memo-soft-v14 relative">
      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => setShowDebug((value) => !value)}
          className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_16px_38px_rgba(0,0,0,0.34)] transition hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {showDebug ? '진단 숨기기' : '진단 보기'}
        </button>
      </div>
      <SoopFundingMemoSoftV13 />
    </div>
  );
}

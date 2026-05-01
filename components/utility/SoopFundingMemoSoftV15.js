import { useState } from 'react';
import SoopFundingMemoSoftV13 from './SoopFundingMemoSoftV13';

export default function SoopFundingMemoSoftV15() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className={`funding-memo-soft-v15 ${showDebug ? 'show-debug' : 'hide-debug'}`}>
      <SoopFundingMemoSoftV13 />
      <button
        type="button"
        onClick={() => setShowDebug((value) => !value)}
        className="fixed bottom-5 right-5 z-[9999] rounded-full bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_16px_38px_rgba(0,0,0,0.34)] transition hover:-translate-y-0.5 active:scale-[0.98]"
      >
        {showDebug ? '진단 숨기기' : '진단 보기'}
      </button>
      <style jsx global>{`
        .funding-memo-soft-v15.hide-debug div[class*="rounded-2xl"][class*="bg-black/20"][class*="text-[11px]"][class*="font-black"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

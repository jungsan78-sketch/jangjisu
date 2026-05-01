import { useEffect } from 'react';
import SoopFundingMemoSoftV6 from './SoopFundingMemoSoftV6';

const STATUS_LABELS = {
  IDLE: '대기중',
  CONNECTED: '연결됨',
  RECEIVED: '수신됨',
  AUTHORIZED: '로그인됨',
  CONNECTING: '연결중',
  RECONNECTING: '재연결중',
  CLOSED: '연결끊김',
  ERROR: '오류',
  'CLOSED-TEST': '끊김테스트',
  'ERROR-TEST': '오류테스트',
};

function enhance(root) {
  if (!root) return;

  root.querySelectorAll('span').forEach((element) => {
    if (element.children.length > 0) return;
    const text = element.textContent?.trim();
    if (!text || !STATUS_LABELS[text]) return;
    element.textContent = STATUS_LABELS[text];
    element.style.letterSpacing = '0.02em';
    element.style.fontSize = '13px';
    element.style.paddingLeft = '14px';
    element.style.paddingRight = '14px';
  });

  root.querySelectorAll('button, div').forEach((element) => {
    if (element.children.length > 0) return;
    const text = element.textContent?.trim();
    if (!text) return;
    if (text === 'ERROR 테스트') element.textContent = '오류 테스트';
    if (text.includes('debug=live 전용입니다')) {
      element.textContent = '테스트 전용입니다. 자동 재연결 흐름을 확인합니다.';
    }
  });
}

export default function SoopFundingMemoSoftV9() {
  useEffect(() => {
    const root = document.querySelector('.funding-memo-soft-v9');
    enhance(root);
    const observer = new MutationObserver(() => enhance(root));
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="funding-memo-soft-v9">
      <SoopFundingMemoSoftV6 />
      <style jsx global>{`
        .funding-memo-soft-v9 textarea {
          color: #111827 !important;
          background: #ffffff !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .funding-memo-soft-v9 textarea::placeholder {
          color: #6b7280 !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #6b7280 !important;
        }
      `}</style>
    </div>
  );
}

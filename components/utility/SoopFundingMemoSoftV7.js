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

function getStatusNotice(text) {
  if (text.includes('방송 채팅 연결됨') || text.includes('후원 반영') || text.includes('후원 메시지 매칭')) {
    return {
      tone: 'ok',
      title: text.includes('후원 반영') ? '후원 반영 완료' : '방송 채팅 연결됨',
      desc: text.includes('후원 반영') ? text : '후원 대기 중입니다. 이 창을 닫지 마세요.',
    };
  }
  if (text.includes('자동 재연결') || text.includes('복구') || text.includes('연결 끊김')) {
    return {
      tone: 'warn',
      title: '자동 재연결 중',
      desc: text,
    };
  }
  if (text.includes('오류') || text.includes('실패') || text.includes('필요합니다') || text.includes('먼저 1번')) {
    return {
      tone: 'danger',
      title: '확인이 필요합니다',
      desc: text,
    };
  }
  if (text.includes('수동으로 중지') || text.includes('눌러주세요') || text.includes('연결 중입니다')) {
    return {
      tone: 'idle',
      title: text.includes('연결 중입니다') ? '방송 채팅 연결 중' : '방송 채팅 연결 대기중',
      desc: text.includes('수동으로 중지') ? '후원을 받으려면 2. 방송 채팅 연결을 눌러주세요.' : text,
    };
  }
  return null;
}

function applyNoticeStyle(element, notice) {
  if (!notice || element.dataset.noticeText === `${notice.title}|${notice.desc}`) return;
  element.dataset.noticeText = `${notice.title}|${notice.desc}`;
  const toneMap = {
    ok: {
      icon: '✅',
      background: 'linear-gradient(135deg, rgba(16,185,129,0.24), rgba(6,78,59,0.22))',
      border: '1px solid rgba(110,231,183,0.32)',
      shadow: '0 14px 34px rgba(16,185,129,0.12), inset 0 0 0 1px rgba(255,255,255,0.05)',
    },
    warn: {
      icon: '⚠️',
      background: 'linear-gradient(135deg, rgba(251,191,36,0.24), rgba(120,53,15,0.20))',
      border: '1px solid rgba(252,211,77,0.32)',
      shadow: '0 14px 34px rgba(251,191,36,0.10), inset 0 0 0 1px rgba(255,255,255,0.05)',
    },
    danger: {
      icon: '🚨',
      background: 'linear-gradient(135deg, rgba(251,113,133,0.24), rgba(127,29,29,0.20))',
      border: '1px solid rgba(251,113,133,0.34)',
      shadow: '0 14px 34px rgba(251,113,133,0.10), inset 0 0 0 1px rgba(255,255,255,0.05)',
    },
    idle: {
      icon: '⏸️',
      background: 'linear-gradient(135deg, rgba(34,211,238,0.18), rgba(30,64,175,0.16))',
      border: '1px solid rgba(103,232,249,0.28)',
      shadow: '0 14px 34px rgba(34,211,238,0.09), inset 0 0 0 1px rgba(255,255,255,0.05)',
    },
  };
  const tone = toneMap[notice.tone] || toneMap.idle;
  element.style.background = tone.background;
  element.style.border = tone.border;
  element.style.boxShadow = tone.shadow;
  element.style.borderRadius = '22px';
  element.style.padding = '16px 18px';
  element.style.color = '#ffffff';
  element.style.minHeight = 'auto';
  element.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start;">
      <div style="font-size:22px;line-height:1.2;">${tone.icon}</div>
      <div>
        <div style="font-size:18px;font-weight:950;line-height:1.25;color:#fff;letter-spacing:-0.02em;">${notice.title}</div>
        <div style="margin-top:5px;font-size:14px;font-weight:850;line-height:1.45;color:rgba(255,255,255,0.78);">${notice.desc}</div>
      </div>
    </div>`;
}

function enhanceUi(root) {
  if (!root) return;
  const elements = root.querySelectorAll('button, a, span, div, p');
  elements.forEach((element) => {
    const text = element.textContent?.trim();
    if (!text) return;

    if (STATUS_LABELS[text]) {
      element.textContent = STATUS_LABELS[text];
      element.style.letterSpacing = '0.02em';
      element.style.fontSize = '13px';
      element.style.paddingLeft = '14px';
      element.style.paddingRight = '14px';
    }

    if (text === 'SOOP 파트너 연결') element.textContent = '숲 파트너 연결';
    if (text === '1. SOOP 로그인') element.textContent = '1. 숲 로그인';
    if (text.includes('debug=live 전용입니다')) element.textContent = '테스트 전용입니다. 자동 재연결 흐름을 확인합니다.';

    const notice = getStatusNotice(text);
    if (notice && text.length < 120) applyNoticeStyle(element, notice);
  });
}

export default function SoopFundingMemoSoftV7() {
  useEffect(() => {
    const root = document.querySelector('.funding-memo-soft-v7');
    enhanceUi(root);
    const observer = new MutationObserver(() => enhanceUi(root));
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="funding-memo-soft-v7">
      <SoopFundingMemoSoftV6 />
    </div>
  );
}

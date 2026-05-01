import { useEffect } from 'react';
import SoopFundingMemoSoftV15 from './SoopFundingMemoSoftV15';

const PATCH_FLAG = '__souFundingChatSdkSafePatch';
const MANUAL_DISCONNECT_UNTIL = '__souFundingManualDisconnectUntil';
const HARD_RECONNECT_KEY = 'sou-soop-funding-hard-reconnect-at';
const HARD_RELOAD_DELAY_MS = 400;

function markManualDisconnect() {
  if (typeof window === 'undefined') return;
  window[MANUAL_DISCONNECT_UNTIL] = Date.now() + 5000;
}

function isManualDisconnectWindow() {
  if (typeof window === 'undefined') return false;
  return Number(window[MANUAL_DISCONNECT_UNTIL] || 0) > Date.now();
}

function scheduleHardReload() {
  if (typeof window === 'undefined') return;
  if (isManualDisconnectWindow()) return;

  try {
    sessionStorage.setItem(HARD_RECONNECT_KEY, String(Date.now()));
  } catch {}

  window.clearTimeout(window.__souFundingHardReloadTimer);
  window.__souFundingHardReloadTimer = window.setTimeout(() => {
    if (isManualDisconnectWindow()) return;
    window.location.replace('/utility/soop-funding-memo?reconnect=1');
  }, HARD_RELOAD_DELAY_MS);
}

function patchChatSdk(target) {
  if (!target || target[PATCH_FLAG]) return false;

  const OriginalChatSdk = target.ChatSDK;
  if (typeof OriginalChatSdk !== 'function') return false;

  function SafeChatSdk(...args) {
    const sdk = new OriginalChatSdk(...args);
    const originalDisconnect = sdk?.disconnect?.bind(sdk);
    const originalHandleError = sdk?.handleError?.bind(sdk);
    const originalHandleChatClosed = sdk?.handleChatClosed?.bind(sdk);

    // SOOP SDK의 handleError 등록 단계에서 null.on 오류가 발생하는 케이스가 있어
    // 연결/수신에 필수인 message/closed 핸들러는 유지하고 error 핸들러만 안전하게 무시한다.
    sdk.handleError = () => sdk;
    sdk.__originalHandleError = originalHandleError;

    // 일반 재연결은 CONNECTED가 떠도 이벤트 스트림이 다시 안 붙는 케이스가 있어,
    // 채팅 close 시 페이지 단위로 SDK 런타임을 완전히 초기화한다.
    if (originalHandleChatClosed) {
      sdk.handleChatClosed = (callback) => originalHandleChatClosed((...closedArgs) => {
        try {
          callback?.(...closedArgs);
        } finally {
          scheduleHardReload();
        }
      });
    }

    if (originalDisconnect) {
      sdk.disconnect = (...disconnectArgs) => {
        markManualDisconnect();
        try {
          return originalDisconnect(...disconnectArgs);
        } catch {
          return undefined;
        }
      };
    }

    return sdk;
  }

  try {
    Object.setPrototypeOf(SafeChatSdk, OriginalChatSdk);
    SafeChatSdk.prototype = OriginalChatSdk.prototype;
  } catch {}

  SafeChatSdk[PATCH_FLAG] = true;
  SafeChatSdk.__OriginalChatSDK = OriginalChatSdk;
  target.ChatSDK = SafeChatSdk;
  return true;
}

function patchAll() {
  if (typeof window === 'undefined') return false;
  const soopPatched = patchChatSdk(window.SOOP);
  const globalPatched = typeof window.ChatSDK === 'function' && !window.ChatSDK[PATCH_FLAG]
    ? (() => {
        const holder = { ChatSDK: window.ChatSDK };
        const patched = patchChatSdk(holder);
        if (patched) window.ChatSDK = holder.ChatSDK;
        return patched;
      })()
    : false;
  return soopPatched || globalPatched;
}

export default function SoopFundingMemoResilient() {
  useEffect(() => {
    patchAll();
    const timer = window.setInterval(() => {
      if (patchAll()) window.clearInterval(timer);
    }, 300);
    return () => window.clearInterval(timer);
  }, []);

  return <SoopFundingMemoSoftV15 />;
}

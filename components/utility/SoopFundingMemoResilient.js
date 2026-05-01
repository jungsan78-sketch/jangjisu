import { useEffect } from 'react';
import SoopFundingMemoSoftV15 from './SoopFundingMemoSoftV15';

const PATCH_FLAG = '__souFundingChatSdkSafePatch';

function patchChatSdk(target) {
  if (!target || target[PATCH_FLAG]) return false;

  const OriginalChatSdk = target.ChatSDK;
  if (typeof OriginalChatSdk !== 'function') return false;

  function SafeChatSdk(...args) {
    const sdk = new OriginalChatSdk(...args);
    const originalDisconnect = sdk?.disconnect?.bind(sdk);

    // SOOP SDK의 handleError 등록 단계에서 null.on 오류가 발생하는 케이스가 있어
    // 연결/수신에 필수인 message/closed 핸들러는 유지하고 error 핸들러만 안전하게 무시한다.
    sdk.handleError = () => sdk;

    if (originalDisconnect) {
      sdk.disconnect = (...disconnectArgs) => {
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

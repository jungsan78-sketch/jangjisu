(() => {
  if (window.__jangjisouFundingCollectorContentLoaded) return;
  window.__jangjisouFundingCollectorContentLoaded = true;

  const state = {
    active: false,
    appUrl: 'https://www.jangjisou.xyz/utility/soop-funding-memo',
    targetWindow: null,
    observer: null,
    seen: new WeakSet(),
    sentCount: 0,
  };

  function text(el) {
    return (el && el.innerText ? el.innerText : '').trim();
  }

  function getBroadcastTitle() {
    const title = document.querySelector('meta[property="og:title"]')?.content || document.title || location.href;
    return title.replace(/\s+/g, ' ').trim();
  }

  function getTargetOrigin() {
    try {
      return new URL(state.appUrl).origin;
    } catch {
      return '*';
    }
  }

  function openMemoWindow() {
    if (!state.targetWindow || state.targetWindow.closed) {
      state.targetWindow = window.open(state.appUrl, 'sou_funding_memo');
    }
    return state.targetWindow;
  }

  function sendChat(item) {
    if (!state.active) return;
    const user = item.querySelector('button.user,.user');
    const msg = item.querySelector('.message-text .msg,#message-original,.msg');
    const nickname = (user && user.getAttribute('user_nick')) || text(item.querySelector('.author'));
    const userId = (user && user.getAttribute('user_id')) || '';
    const message = text(msg);
    if (!nickname || !message) return;

    const target = openMemoWindow();
    target?.postMessage({
      type: 'SOU_SOOP_CHAT',
      nickname,
      userId,
      message,
      at: Date.now(),
      source: 'chrome-extension',
      pageUrl: location.href,
      pageTitle: getBroadcastTitle(),
    }, getTargetOrigin());

    state.sentCount += 1;
    chrome.runtime.sendMessage({ type: 'SOU_COLLECTOR_STATUS', active: true, sentCount: state.sentCount, title: getBroadcastTitle(), url: location.href }).catch(() => {});
  }

  function scan(root = document) {
    root.querySelectorAll?.('.chatting-list-item').forEach((item) => {
      if (state.seen.has(item)) return;
      state.seen.add(item);
      sendChat(item);
    });
  }

  function start(appUrl) {
    state.appUrl = appUrl || state.appUrl;
    state.active = true;
    state.sentCount = 0;
    openMemoWindow();
    scan(document);

    if (state.observer) state.observer.disconnect();
    state.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.('.chatting-list-item')) {
            if (!state.seen.has(node)) {
              state.seen.add(node);
              sendChat(node);
            }
            return;
          }
          scan(node);
        });
      });
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
    chrome.runtime.sendMessage({ type: 'SOU_COLLECTOR_STATUS', active: true, sentCount: state.sentCount, title: getBroadcastTitle(), url: location.href }).catch(() => {});
  }

  function stop() {
    state.active = false;
    if (state.observer) state.observer.disconnect();
    state.observer = null;
    chrome.runtime.sendMessage({ type: 'SOU_COLLECTOR_STATUS', active: false, sentCount: state.sentCount, title: getBroadcastTitle(), url: location.href }).catch(() => {});
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'SOU_START_COLLECTOR') {
      start(message.appUrl);
      sendResponse({ ok: true, active: true, title: getBroadcastTitle(), url: location.href });
      return true;
    }
    if (message?.type === 'SOU_STOP_COLLECTOR') {
      stop();
      sendResponse({ ok: true, active: false, title: getBroadcastTitle(), url: location.href });
      return true;
    }
    if (message?.type === 'SOU_GET_PAGE_INFO') {
      sendResponse({ ok: true, active: state.active, sentCount: state.sentCount, title: getBroadcastTitle(), url: location.href });
      return true;
    }
    return false;
  });
})();

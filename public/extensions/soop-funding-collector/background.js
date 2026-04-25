const DEFAULT_APP_URL = 'https://www.jangjisou.xyz/utility/soop-funding-memo';

async function getSettings() {
  const data = await chrome.storage.local.get({
    appUrl: DEFAULT_APP_URL,
    selectedTabId: null,
    lastStatus: null,
  });
  return data;
}

async function setSettings(settings) {
  await chrome.storage.local.set(settings);
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await getSettings();
  await setSettings({ appUrl: current.appUrl || DEFAULT_APP_URL });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SOU_COLLECTOR_STATUS') {
    setSettings({
      selectedTabId: sender.tab?.id || null,
      lastStatus: {
        ...message,
        tabId: sender.tab?.id || null,
        updatedAt: Date.now(),
      },
    }).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

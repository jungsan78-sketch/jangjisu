const DEFAULT_APP_URL = 'https://www.jangjisou.xyz/utility/soop-funding-memo';

const appUrlInput = document.getElementById('appUrl');
const saveUrlButton = document.getElementById('saveUrl');
const refreshButton = document.getElementById('refresh');
const tabsEl = document.getElementById('tabs');
const statusEl = document.getElementById('status');
const stopButton = document.getElementById('stop');

function isSoopUrl(url = '') {
  return /https:\/\/([^/]+\.)?sooplive\.com\//.test(url);
}

function status(text) {
  statusEl.textContent = text;
}

async function getSettings() {
  return chrome.storage.local.get({ appUrl: DEFAULT_APP_URL, selectedTabId: null, lastStatus: null });
}

async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

async function querySoopTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => isSoopUrl(tab.url));
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'SOU_GET_PAGE_INFO' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  }
}

async function startCollector(tab) {
  const appUrl = appUrlInput.value.trim() || DEFAULT_APP_URL;
  await saveSettings({ appUrl, selectedTabId: tab.id });
  await ensureContentScript(tab.id);
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'SOU_START_COLLECTOR', appUrl });
  status(response?.title ? `수집 중: ${response.title}` : '수집을 시작했습니다.');
  await renderTabs();
}

async function stopCollector() {
  const settings = await getSettings();
  if (settings.selectedTabId) {
    try {
      await chrome.tabs.sendMessage(settings.selectedTabId, { type: 'SOU_STOP_COLLECTOR' });
    } catch {}
  }
  await saveSettings({ selectedTabId: null });
  status('수집을 중지했습니다.');
  await renderTabs();
}

function renderEmpty() {
  tabsEl.innerHTML = '<div class="empty">열려 있는 SOOP 방송 탭이 없습니다.<br />방송 페이지를 먼저 열고 새로고침을 눌러주세요.</div>';
}

async function renderTabs() {
  const settings = await getSettings();
  appUrlInput.value = settings.appUrl || DEFAULT_APP_URL;
  const tabs = await querySoopTabs();
  tabsEl.innerHTML = '';

  if (!tabs.length) {
    renderEmpty();
  } else {
    tabs.forEach((tab) => {
      const button = document.createElement('button');
      button.className = 'tab';
      button.type = 'button';
      button.innerHTML = `<div class="tab-title">${tab.id === settings.selectedTabId ? '✅ ' : ''}${tab.title || 'SOOP 방송'}</div><div class="tab-url">${tab.url || ''}</div>`;
      button.addEventListener('click', () => startCollector(tab).catch((error) => status(`연결 실패: ${error.message}`)));
      tabsEl.appendChild(button);
    });
  }

  if (settings.lastStatus?.active) {
    status(`수집 중: ${settings.lastStatus.title || 'SOOP 방송'} / 채팅 ${settings.lastStatus.sentCount || 0}개`);
  } else if (!settings.selectedTabId) {
    status('대기 중입니다. 방송 탭을 선택하세요.');
  }
}

saveUrlButton.addEventListener('click', async () => {
  await saveSettings({ appUrl: appUrlInput.value.trim() || DEFAULT_APP_URL });
  status('자동메모장 주소를 저장했습니다.');
});
refreshButton.addEventListener('click', () => renderTabs().catch((error) => status(`새로고침 실패: ${error.message}`)));
stopButton.addEventListener('click', () => stopCollector().catch((error) => status(`중지 실패: ${error.message}`)));

document.addEventListener('DOMContentLoaded', () => renderTabs().catch((error) => status(`초기화 실패: ${error.message}`)));

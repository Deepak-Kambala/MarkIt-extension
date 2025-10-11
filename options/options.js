const DEFAULTS = {
  darkMode: false,
  refreshInterval: 0,
  exportFormat: 'json'
};

document.addEventListener('DOMContentLoaded', restoreSettings);
document.getElementById('save').addEventListener('click', saveSettings);

async function restoreSettings() {
  const result = await chrome.storage.sync.get(DEFAULTS);
  document.getElementById('darkMode').checked = result.darkMode;
  document.getElementById('refreshInterval').value = result.refreshInterval;
  document.getElementById('exportFormat').value = result.exportFormat;
}

async function saveSettings() {
  const data = {
    darkMode: document.getElementById('darkMode').checked,
    refreshInterval: Number(document.getElementById('refreshInterval').value || 0),
    exportFormat: document.getElementById('exportFormat').value
  };

  await chrome.storage.sync.set(data);
  document.getElementById('status').textContent = 'Saved!';
  setTimeout(() => (document.getElementById('status').textContent = ''), 1500);

  chrome.runtime.sendMessage({ type: 'settings-updated', payload: data });
}

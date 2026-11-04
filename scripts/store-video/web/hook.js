// Loaded into the render-only copy of popup.html, before the Popup's own script. The Reels Feed in the
// video counts Reels in real (render) time, so the Popup hears local-storage changes (the Session) only
// when render.ts lets one through, at the moment the timeline wants the counter to tick.
'use strict';
(() => {
  const style = document.createElement('style');
  style.textContent = '.rf-open-reels { display: none !important; } html, body { overflow: hidden !important; }';
  document.documentElement.append(style);
  window.__passLocal = false;
  const changed = chrome.storage.local.onChanged;
  const add = changed.addListener.bind(changed);
  changed.addListener = (listener) => add((...args) => { if (window.__passLocal) listener(...args); });
  const anyChanged = chrome.storage.onChanged;
  const addAny = anyChanged.addListener.bind(anyChanged);
  anyChanged.addListener = (listener) => addAny((changes, area) => { if (area !== 'local' || window.__passLocal) listener(changes, area); });
})();

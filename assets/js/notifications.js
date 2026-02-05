/*
  أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP
  Toast Notifications Engine (60-90s)
*/

import { APP, loadJSON, showToast, sleep } from './app.js';

const STATE = {
  loaded: false,
  list: [],
  running: false
};

function pickRandom(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

async function loadNotifications() {
  if (STATE.loaded) return;
  try {
    const data = await loadJSON(`${APP.contentBase}/notifications.json`);
    STATE.list = Array.isArray(data.notifications) ? data.notifications : [];
    STATE.loaded = true;
  } catch (e) {
    STATE.list = [];
    STATE.loaded = true;
  }
}

export async function startNotifications() {
  if (STATE.running) return;
  STATE.running = true;
  await loadNotifications();

  // First delay: short, then normal
  await sleep(9000);

  while (STATE.running) {
    const ctx = window.PAGE_CONTEXT || {};
    if (!ctx.disableToasts && STATE.list.length) {
      const n = pickRandom(STATE.list);
      if (n) {
        const title = n.name ? `${n.name}` : 'تنبيه';
        const text = n.text || '';
        const quote = n.quote || '';
        const actionLabel = n.cta && n.cta.label ? n.cta.label : '';
        const actionHref = n.cta && n.cta.href ? n.cta.href : '';
        showToast({ title, text, quote, actionLabel, actionHref });
      }
    }

    const next = 60000 + Math.floor(Math.random() * 30000); // 60-90 sec
    await sleep(next);
  }
}

export function stopNotifications() {
  STATE.running = false;
}

document.addEventListener('DOMContentLoaded', () => {
  // Notifications run globally, but pages can disable by calling initCommon({disableToasts:true})
  startNotifications();
});

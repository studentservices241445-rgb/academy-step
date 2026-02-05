/*
  أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP
  App Core (helpers + UI common + PWA)
*/

import { Store, now } from './storage.js';

export const APP = {
  programName: 'أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP',
  shortName: 'أكاديمية عايد — STEP',
  courseWebsite: 'https://ayedacademy2026.github.io/ayed-step-academy2026/',
  telegramStarsLink: 'https://t.me/+BKZFAaIFbe4zOTk0',
  supportEmail: 'stepacademy438@gmail.com',
  contentBase: './assets/content',
  dataBase: './assets/data',
  fullTestLockHours: 24
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function fmtHM(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}س ${m}د`;
}

export function getBaseProgramUrl() {
  // Works on GitHub Pages too.
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  // Keep same origin + path base (folder)
  const parts = url.pathname.split('/');
  parts.pop();
  url.pathname = parts.join('/') + '/';
  return url.toString();
}

export function buildUrl(path, params = {}) {
  const base = getBaseProgramUrl();
  const u = new URL(path.replace(/^\//, ''), base);
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    u.searchParams.set(k, String(v));
  });
  return u.toString();
}

export function getQueryParams() {
  const u = new URL(window.location.href);
  const obj = {};
  u.searchParams.forEach((v, k) => (obj[k] = v));
  return obj;
}

export function escapeHTML(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const JSON_CACHE = new Map();
export async function loadJSON(url) {
  if (JSON_CACHE.has(url)) return JSON_CACHE.get(url);
  const p = (async () => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  })();
  JSON_CACHE.set(url, p);
  return p;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Toast
function ensureToastHost() {
  let host = $('.toast-host');
  if (host) return host;
  host = document.createElement('div');
  host.className = 'toast-host';
  host.innerHTML = `<div class="toast" role="status" aria-live="polite"></div>`;
  document.body.appendChild(host);
  return host;
}

let TOAST_TIMER = null;
export function showToast({ title, text, quote, actionLabel, actionHref } = {}) {
  const ctx = window.PAGE_CONTEXT || {};
  if (ctx.disableToasts) return;

  const host = ensureToastHost();
  const t = host.querySelector('.toast');
  const safeTitle = escapeHTML(title || 'تنبيه');
  const safeText = escapeHTML(text || '');
  const safeQuote = quote ? escapeHTML(quote) : '';
  const action = actionLabel && actionHref ? `<a class="mini" href="${escapeHTML(actionHref)}">${escapeHTML(actionLabel)}</a>` : '';

  t.innerHTML = `
    <div>
      <div class="t-title">${safeTitle}</div>
      <div class="t-sub">${safeText}</div>
      ${quote ? `<div class="t-quote">“${safeQuote}”</div>` : ''}
    </div>
    <div class="t-actions">
      ${action}
      <button class="mini" type="button" data-toast-close>إغلاق</button>
    </div>
  `;

  clearTimeout(TOAST_TIMER);
  t.classList.add('show');

  const close = () => {
    t.classList.remove('show');
  };
  const closeBtn = t.querySelector('[data-toast-close]');
  if (closeBtn) closeBtn.onclick = close;

  TOAST_TIMER = setTimeout(close, 9000);
}

// Modal
function ensureModal() {
  let backdrop = $('.modal-backdrop');
  if (backdrop) return backdrop;
  backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-content"></div>
      <div class="btn-row" style="justify-content:flex-end">
        <button class="btn sm" type="button" data-modal-close>إغلاق</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) hideModal();
  });
  backdrop.querySelector('[data-modal-close]').addEventListener('click', hideModal);
  return backdrop;
}

export function showModal({ title, html }) {
  const b = ensureModal();
  const c = b.querySelector('.modal-content');
  c.innerHTML = `
    <h3>${escapeHTML(title || '')}</h3>
    <div>${html || ''}</div>
  `;
  b.classList.add('show');
}

export function hideModal() {
  const b = $('.modal-backdrop');
  if (b) b.classList.remove('show');
}

// Copy
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast({ title: 'تم النسخ ✅', text: 'تقدر تلصق النص في واتساب/تلجرام.' });
    return true;
  } catch (e) {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast({ title: 'تم النسخ ✅', text: 'تقدر تلصق النص في واتساب/تلجرام.' });
    return true;
  }
}

export async function shareText({ title, text, url } = {}) {
  const shareData = {
    title: title || APP.programName,
    text: text || '',
    url: url || ''
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (e) {
      // user cancelled
      return false;
    }
  }

  // Fallback: copy
  const merged = [shareData.text, shareData.url].filter(Boolean).join('\n');
  return copyText(merged);
}

// PWA install
let deferredPrompt = null;
function setupInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = $('#btnInstall');
    if (btn) btn.disabled = false;
  });

  const btn = $('#btnInstall');
  if (btn) {
    btn.addEventListener('click', async () => {
      // iOS doesn't support beforeinstallprompt
      if (!deferredPrompt) {
        showModal({
          title: 'تثبيت التطبيق',
          html: `
            <p>إذا تستخدم iPhone: افتح الصفحة في Safari ثم اضغط مشاركة → <b>Add to Home Screen</b>.</p>
            <p>إذا تستخدم Android/Chrome: جرّب تحديث الصفحة، ثم اضغط زر التثبيت مرة ثانية.</p>
          `
        });
        return;
      }
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice && choice.outcome === 'accepted') {
        showToast({ title: 'تم 👌', text: 'انضاف للتطبيقات عندك.' });
      }
    });
  }
}

// Nav active
function markActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  $$('.nav a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.endsWith(path)) {
      a.style.background = 'rgba(201,164,76,0.14)';
      a.style.borderColor = 'rgba(201,164,76,0.34)';
    }
  });
}

export function setPageContext(ctx) {
  window.PAGE_CONTEXT = Object.assign({ disableToasts: false }, ctx || {});
}

// Full-test lock helpers
export function getLockInfo() {
  const lastTs = Store.getLastTestTs();
  const lockMs = APP.fullTestLockHours * 3600 * 1000;
  const remaining = Math.max(0, (lastTs + lockMs) - now());
  return {
    lastTs,
    lockMs,
    remaining,
    locked: lastTs > 0 && remaining > 0
  };
}

export function initCommon({ disableToasts = false } = {}) {
  setPageContext({ disableToasts });
  setupInstall();
  markActiveNav();

  // Footer year
  const y = $('#yearNow');
  if (y) y.textContent = String(new Date().getFullYear());
}

export { Store };

// Register service worker for PWA offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Wait for page load to register the service worker
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

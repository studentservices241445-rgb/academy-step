/* Start page: collect UserProfile */

import { $, Store, getLockInfo, showToast } from './app.js';

function fillForm(p) {
  if (!p) return;
  const set = (id, v) => {
    const el = $(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v != null ? v : '';
  };
  set('#name', p.name);
  set('#exam_window', p.exam_window);
  set('#minutes_per_day', p.minutes_per_day);
  set('#goal', p.goal);
  set('#stage', p.stage);
  set('#best_time', p.best_time);
  set('#weak_guess', p.weak_guess);
  set('#previous_score', p.previous_score);
  set('#target_score', p.target_score);
}

function getFormData() {
  const v = (id) => {
    const el = $(id);
    return el ? String(el.value || '').trim() : '';
  };

  return {
    name: v('#name'),
    exam_window: v('#exam_window'),
    minutes_per_day: Number(v('#minutes_per_day') || 60),
    goal: v('#goal'),
    stage: v('#stage'),
    best_time: v('#best_time'),
    weak_guess: v('#weak_guess'),
    previous_score: v('#previous_score') ? Number(v('#previous_score')) : null,
    target_score: v('#target_score') ? Number(v('#target_score')) : null,
    updatedAt: Date.now()
  };
}

function validate(profile) {
  if (!profile.name) return 'اكتب اسمك (للاستخدام داخل الخطة فقط).';
  if (!profile.exam_window) return 'اختر متى اختبارك (تقريبًا).';
  if (!profile.minutes_per_day || profile.minutes_per_day < 15) return 'اختر وقتك اليومي.';
  return null;
}

function renderLock() {
  const box = $('#lockBox');
  if (!box) return;
  const lock = getLockInfo();
  if (!lock.locked) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = `
    <div class="notice-danger">
      الاختبار الكامل مقفول مؤقتًا ⏳ — باقي على المحاولة القادمة: <span id="lockRemaining"></span>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn sm" href="./results.html">خطتي/نتائجي</a>
        <a class="btn sm" href="./quiz.html">كويزات تدريب</a>
      </div>
    </div>
  `;
  const rem = $('#lockRemaining');
  const tick = () => {
    const l = getLockInfo();
    const ms = l.remaining;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (rem) rem.textContent = `${h}س ${m}د ${s}ث`;
    if (!l.locked) {
      box.style.display = 'none';
      clearInterval(intv);
    }
  };
  tick();
  const intv = setInterval(tick, 1000);
}

function init() {
  fillForm(Store.getProfile());
  renderLock();

  const form = $('#startForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = getFormData();
    const err = validate(profile);
    if (err) {
      showToast({ title: 'تأكد من البيانات', text: err });
      return;
    }
    Store.setProfile(profile);
    showToast({ title: 'تم ✅', text: `هلا ${profile.name} — جاهزين للاختبار.` });
    setTimeout(() => (window.location.href = './test.html'), 450);
  });
}

document.addEventListener('DOMContentLoaded', init);

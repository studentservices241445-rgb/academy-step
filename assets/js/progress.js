/* Progress / History page */

import { $, Store, fmtDate, showToast, showModal, hideModal } from './app.js';
import { secLabelAr } from './plan.js';

function secAr(s){ return secLabelAr(s) || s; }

function renderNoResult() {
  const box = $('#noResultBox');
  if (!box) return;
  box.innerHTML = `
    <div class="notice-danger">
      <b>ما عندك نتيجة لأنك ما سويت الاختبار — تذكير: محاولة واحدة كل 24 ساعة</b>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn sm primary" href="./start.html">بدء الاختبار</a>
        <a class="btn sm" href="./index.html">الرجوع للرئيسية</a>
      </div>
    </div>
  `;
}

function renderProfile() {
  const p = Store.getProfile();
  const el = $('#profileBox');
  if (!el) return;
  if (!p) {
    el.innerHTML = `<div class="p">ما في بيانات طالب محفوظة. تقدر تبدأ من <a href="./start.html"><b>هنا</b></a>.</div>`;
    return;
  }
  el.innerHTML = `
    <div class="card">
      <div class="badge">بياناتك</div>
      <div class="h1" style="margin:10px 0 8px">${p.name}</div>
      <div class="p">الوقت اليومي: <b>${p.minutes_per_day} دقيقة</b> • موعد الاختبار: <b>${p.exam_window}</b></div>
    </div>
  `;
}

function renderAttempts() {
  const list = Store.getResultsHistory();
  const tbody = $('#attemptsTbody');
  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="muted">ما في محاولات محفوظة.</td></tr>`;
    return;
  }
  list.forEach((a) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(a.ts)}</td>
      <td><b>${a.overallPercent}%</b> — ${a.level}</td>
      <td>${(a.weakSections || []).map(secAr).join(' + ')}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderQuizzes() {
  const list = Store.getQuizHistory();
  const tbody = $('#quizTbody');
  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted">ما في كويزات محفوظة.</td></tr>`;
    return;
  }
  list.forEach((q) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(q.ts)}</td>
      <td>${secAr(q.section)} • ${q.count} سؤال</td>
      <td><b>${q.scorePercent}%</b> (${q.correct}/${q.count})</td>
      <td>Seed: ${q.seed}</td>
    `;
    tbody.appendChild(tr);
  });
}

function bindDangerButtons() {
  const btn = $('#btnClear');
  if (!btn) return;

  btn.addEventListener('click', () => {
    showModal({
      title: 'تأكيد حذف البيانات',
      html: `
        <p>راح نحذف بياناتك من المتصفح (الاسم، النتائج، التاريخ، الكويزات).
        هذا الإجراء لا يمكن الرجوع عنه.</p>
        <div class="btn-row" style="justify-content:flex-end">
          <button class="btn sm" id="cancelClear" type="button">إلغاء</button>
          <button class="btn sm danger" id="confirmClear" type="button">حذف بياناتي</button>
        </div>
      `
    });

    $('#cancelClear').onclick = hideModal;
    $('#confirmClear').onclick = () => {
      hideModal();
      Store.resetAll();
      showToast({ title: 'تم', text: 'تم حذف بياناتك من هذا الجهاز.' });
      setTimeout(() => location.reload(), 500);
    };
  });
}

function init() {
  renderProfile();
  const has = Store.hasCompletedFullTest();
  if (!has) renderNoResult();
  renderAttempts();
  renderQuizzes();
  bindDangerButtons();
}

document.addEventListener('DOMContentLoaded', init);

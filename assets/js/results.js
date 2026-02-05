/* Results + Plan + PDF */

import { $, APP, Store, showToast, copyText, shareText, buildUrl, fmtDate } from './app.js';
import { generatePlan, secLabelAr } from './plan.js';
import { generateShareText } from './share.js';

function secAr(s) {
  return secLabelAr(s);
}

function renderNoResult() {
  const root = $('#resultsRoot');
  root.innerHTML = `
    <div class="notice-danger">
      <b>ما عندك نتيجة لأنك ما سويت الاختبار — تذكير: محاولة واحدة كل 24 ساعة</b>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn sm primary" href="./start.html">بدء الاختبار</a>
        <a class="btn sm" href="./index.html">الرجوع للرئيسية</a>
      </div>
    </div>
  `;
}

function renderSummary(result) {
  $('#scoreOverall').textContent = `${result.overallPercent}%`;
  $('#scoreLevel').textContent = result.level;
  $('#scoreCorrect').textContent = `${result.correct}/${result.total}`;
  $('#scoreDate').textContent = fmtDate(result.finishedAt);

  // Bars
  const bars = ['Vocabulary','Grammar','Reading','Listening'];
  bars.forEach((s) => {
    const pct = result.breakdown[s].percent;
    const el = document.querySelector(`[data-bar='${s}']`);
    const label = document.querySelector(`[data-label='${s}']`);
    if (label) label.textContent = `${secAr(s)} — ${pct}%`;
    if (el) el.style.width = `${pct}%`;
  });

  // Weak sections
  const weak = result.weakSections || [];
  $('#weakSections').textContent = weak.map(secAr).join(' + ');
}

function renderPlan(plan) {
  $('#planText').textContent = plan.planText;

  // Today's tasks
  if (plan.today) {
    $('#todayTasks').textContent = plan.today.text;
  }

  // Table
  const tbody = $('#planTableBody');
  tbody.innerHTML = '';
  plan.dailyTable.forEach((d) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>اليوم ${d.day}</b><div class="muted" style="margin-top:6px">${d.note}</div></td>
      <td>${d.text.replaceAll('\n','<br>')}</td>
      <td><span class="muted">□</span></td>
    `;
    tbody.appendChild(tr);
  });

  // Arrow scroll
  const go = $('#goTable');
  if (go) {
    go.addEventListener('click', () => {
      const t = document.getElementById('planTableAnchor');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function shouldRecommendSubscription(plan, result) {
  if (!plan || !result) return false;
  const days = plan.days;
  const overall = result.overallPercent;
  if (days <= 7) return true;
  if (overall < 55) return true;
  if (plan.minutesPerDay < 45) return true;
  return false;
}

async function init() {
  const result = Store.getLastTestResult();
  if (!result) {
    renderNoResult();
    return;
  }

  renderSummary(result);

  const lockTs = Store.getLastTestTs();
  const cached = Store.getPlan(lockTs);
  let plan = cached;
  if (!plan) {
    plan = await generatePlan({ profile: Store.getProfile() || {}, testResult: result });
    Store.savePlan(lockTs, plan);
  }

  renderPlan(plan);

  // Recommendation blocks
  const subBox = $('#subscriptionBox');
  if (subBox) {
    if (shouldRecommendSubscription(plan, result)) {
      subBox.style.display = 'block';
      subBox.innerHTML = `
        <div class="card">
          <div class="badge gold">توصية حسب خطتك</div>
          <div class="h1" style="margin:10px 0 8px">إذا ودك تلتزم بسرعة…</div>
          <p class="p">التجربة تثبت أن الالتزام يكون أسهل لما يكون مع مجموعة أو متابعة منظمة.</p>
          <div class="btn-row">
            <a class="btn primary" href="${APP.telegramStarsLink}" target="_blank" rel="noopener">رابط الاشتراك (نجوم تلجرام)</a>
            <a class="btn" href="./group.html">سوّ مجموعة التزام</a>
          </div>
        </div>
      `;
    } else {
      subBox.style.display = 'none';
    }
  }

  // Buttons
  $('#btnCopyPlan').addEventListener('click', async () => {
    const profile = Store.getProfile() || {};
    const text = `${APP.programName}\n\n${plan.planText}\n\nأول يوم:\n${plan.today ? plan.today.text : ''}\n\n(تم توليد الخطة داخل البرنامج)`;
    await copyText(text);
  });

  $('#btnSharePlan').addEventListener('click', async () => {
    const profile = Store.getProfile() || {};
    const focus1 = secAr(plan.focus[0]);
    const focus2 = secAr(plan.focus[1]);

    const share = await generateShareText('plan', {
      NAME: profile.name || 'طالب/ة',
      DAYS: plan.days,
      MINUTES: plan.minutesPerDay,
      FOCUS_1: focus1,
      FOCUS_2: focus2,
      PROGRAM_URL: buildUrl('/index.html')
    });
    await shareText({ title: APP.programName, text: share, url: buildUrl('/index.html') });
  });

  $('#btnShareProgram').addEventListener('click', async () => {
    const share = await generateShareText('program', {
      PROGRAM_URL: buildUrl('/index.html')
    });
    await shareText({ title: APP.programName, text: share, url: buildUrl('/index.html') });
  });

  $('#btnPrintPdf').addEventListener('click', () => {
    showToast({ title: 'PDF', text: 'راح يفتح وضع الطباعة — اختر Save as PDF.' });
    setTimeout(() => window.print(), 350);
  });

  // Course link in PDF only (print-only section already contains it)
  const courseLink = $('#courseLink');
  if (courseLink) courseLink.href = APP.courseWebsite;

  const namePrint = $('#printName');
  const profile = Store.getProfile() || {};
  if (namePrint) namePrint.textContent = profile.name || '—';
}

document.addEventListener('DOMContentLoaded', init);

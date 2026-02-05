/* Group commitment page */

import { $, APP, loadJSON, Store, showToast, copyText, shareText, buildUrl } from './app.js';
import { secLabelAr, deriveDaysFromProfile, deriveMinutesFromProfile } from './plan.js';
import { generateShareText } from './share.js';

let TPL = null;

function monthAr(m) {
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return months[m] || '';
}

function secAr(s) {
  if (s === 'Mixed') return 'مختلط';
  return secLabelAr(s);
}

async function loadTemplates() {
  if (TPL) return TPL;
  const data = await loadJSON(`${APP.contentBase}/group_templates.json`).catch(() => ({}));
  TPL = data;
  return TPL;
}

function renderNoTest() {
  const root = $('#groupRoot');
  root.innerHTML = `
    <div class="notice-danger">
      <b>لازم تسوي اختبار تحديد المستوى أول — عشان نطلع لك مجموعة على نفس الخطة ✅</b>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn sm primary" href="./start.html">بدء الاختبار</a>
        <a class="btn sm" href="./index.html">الرجوع للرئيسية</a>
      </div>
    </div>
  `;
}

function fillSuggestions(templates, vars) {
  const arr = Array.isArray(templates) ? templates : [];
  return arr.map((t) => t
    .replaceAll('{DAYS}', String(vars.DAYS || ''))
    .replaceAll('{MINUTES}', String(vars.MINUTES || ''))
    .replaceAll('{FOCUS_1}', String(vars.FOCUS_1 || ''))
    .replaceAll('{FOCUS_2}', String(vars.FOCUS_2 || ''))
    .replaceAll('{NAME}', String(vars.NAME || ''))
    .replaceAll('{MONTH_AR}', String(vars.MONTH_AR || ''))
    .replaceAll('{YEAR}', String(vars.YEAR || ''))
  );
}

async function init() {
  const result = Store.getLastTestResult();
  if (!result) {
    renderNoTest();
    return;
  }

  const profile = Store.getProfile() || {};
  const days = deriveDaysFromProfile(profile);
  const minutes = deriveMinutesFromProfile(profile);
  const focus = result.weakSections || ['Vocabulary','Grammar'];

  const now = new Date();
  const vars = {
    NAME: profile.name || 'طالب/ة',
    DAYS: days,
    MINUTES: minutes,
    FOCUS_1: secAr(focus[0]),
    FOCUS_2: secAr(focus[1]),
    MONTH_AR: monthAr(now.getMonth()),
    YEAR: now.getFullYear()
  };

  const data = await loadTemplates();
  const suggestions = fillSuggestions(data.name_suggestions, vars);
  const rules = Array.isArray(data.rules_text) ? data.rules_text : [];

  // Render suggestions
  const sugBox = $('#nameSuggestions');
  sugBox.innerHTML = '';
  suggestions.forEach((name, idx) => {
    const row = document.createElement('label');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.padding = '10px 0';
    row.style.borderBottom = '1px solid rgba(15,23,42,0.06)';
    row.innerHTML = `<input type="radio" name="gname" value="${name.replaceAll('"','')}"> <span>${name}</span>`;
    sugBox.appendChild(row);
    if (idx === 0) row.querySelector('input').checked = true;
  });

  const rulesBox = $('#rulesBox');
  rulesBox.innerHTML = rules.map((r) => `<div class="p" style="margin:0 0 8px">${r}</div>`).join('');

  $('#btnCopyRules').onclick = async () => {
    await copyText(rules.join('\n'));
  };

  const saved = Store.getGroupConfig() || {};
  if (saved.platform) $('#platform').value = saved.platform;
  if (saved.type) $('#groupType').value = saved.type;
  if (saved.mode) $('#mode').value = saved.mode;
  if (saved.groupUrl) $('#groupUrl').value = saved.groupUrl;

  const form = $('#groupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const platform = $('#platform').value;
    const type = $('#groupType').value;
    const mode = $('#mode').value;
    const groupUrl = String($('#groupUrl').value || '').trim();

    const selected = document.querySelector('input[name="gname"]:checked');
    const groupName = selected ? selected.value : suggestions[0];

    if (!groupUrl || groupUrl.length < 8) {
      showToast({ title: 'الرابط مطلوب', text: 'حط رابط المجموعة/القناة (إلزامي).' });
      return;
    }

    Store.setGroupConfig({ platform, type, mode, groupUrl, groupName, updatedAt: Date.now() });

    const shareMsg = await generateShareText('group', {
      GROUP_NAME: groupName,
      GROUP_URL: groupUrl,
      NAME: vars.NAME,
      DAYS: vars.DAYS,
      MINUTES: vars.MINUTES,
      FOCUS_1: vars.FOCUS_1,
      FOCUS_2: vars.FOCUS_2,
      PROGRAM_URL: buildUrl('/index.html')
    });

    $('#shareOutput').value = shareMsg;
    showToast({ title: 'جاهز ✅', text: 'تم توليد رسالة مشاركة المجموعة.' });
  });

  $('#btnCopyGroupMsg').onclick = async () => {
    const msg = String($('#shareOutput').value || '').trim();
    if (!msg) {
      showToast({ title: 'قبل النسخ', text: 'اضغط زر (توليد رسالة المشاركة) أول.' });
      return;
    }
    await copyText(msg);
  };

  $('#btnShareGroupMsg').onclick = async () => {
    const msg = String($('#shareOutput').value || '').trim();
    if (!msg) {
      showToast({ title: 'قبل المشاركة', text: 'اضغط زر (توليد رسالة المشاركة) أول.' });
      return;
    }
    await shareText({ title: APP.programName, text: msg, url: buildUrl('/index.html') });
  };
}

document.addEventListener('DOMContentLoaded', init);

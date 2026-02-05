/*
  أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP
  Floating Assistant (rule-based + AI-ready placeholders)
*/

import { APP, $, $$, loadJSON, escapeHTML, showToast, sleep, buildUrl, setPageContext, Store } from './app.js';

const STATE = {
  loaded: false,
  content: null,
  isOpen: false,
  awaitingName: false
};

function ensureUI() {
  if ($('#assistantFab') && $('#assistantWindow')) return;

  const fab = document.createElement('button');
  fab.className = 'assistant-fab no-print';
  fab.id = 'assistantFab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'مساعد أكاديمية عايد الرسمية');
  fab.innerHTML = '💬';

  const win = document.createElement('div');
  win.className = 'assistant-window no-print';
  win.id = 'assistantWindow';
  win.innerHTML = `
    <div class="assistant-top">
      <div>
        <div class="name">المساعد</div>
        <div class="status" id="assistantStatus">متصل الآن</div>
      </div>
      <button class="btn sm" type="button" id="assistantClose">إغلاق</button>
    </div>
    <div class="assistant-body" id="assistantBody"></div>
    <div class="assistant-actions">
      <div class="quick" id="assistantQuick"></div>
      <div class="assistant-input">
        <input class="input" id="assistantInput" placeholder="اكتب سؤالك هنا…" inputmode="text" autocomplete="off" />
        <button class="btn sm dark" type="button" id="assistantSend">إرسال</button>
      </div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(win);
}

async function loadAssistantContent() {
  if (STATE.loaded) return;
  try {
    const data = await loadJSON(`${APP.contentBase}/assistant_content.json`);
    STATE.content = data;
  } catch (e) {
    STATE.content = {
      greeting_with_name: ['هلا {NAME} 👋 كيف أقدر أساعدك داخل البرنامج؟'],
      greeting_without_name: ['هلا 👋 اكتب اسمك (بس للاستخدام داخل خطتك)'],
      quick_actions: [],
      onboarding_tips: ['امش على جدول واحد أسبوع كامل بدون مصادر إضافية.'],
      fallbacks: { unknown: 'اكتب سؤالك بشكل مختصر: (اختبار/خطة/كويز/PDF/تثبيت/مجموعة) وأنا أساعدك 🙌' }
    };
  }
  STATE.loaded = true;
}

function addBubble(text, who = 'bot') {
  const body = $('#assistantBody');
  if (!body) return;
  const div = document.createElement('div');
  div.className = `bubble ${who === 'me' ? 'me' : ''}`;
  const safe = escapeHTML(text).replaceAll('\n', '<br>');
  div.innerHTML = safe;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function setStatus(text) {
  const s = $('#assistantStatus');
  if (s) s.textContent = text;
}

function renderQuickActions() {
  const q = $('#assistantQuick');
  if (!q) return;
  q.innerHTML = '';

  const actions = (STATE.content && Array.isArray(STATE.content.quick_actions)) ? STATE.content.quick_actions : [];
  actions.slice(0, 6).forEach((a) => {
    const btn = document.createElement('a');
    btn.className = 'btn sm';
    btn.href = a.route || '#';
    btn.textContent = a.label || 'فتح';
    q.appendChild(btn);
  });
}

function normalize(str) {
  return String(str || '').toLowerCase();
}

function getNameFromProfile() {
  const p = Store.getProfile();
  return p && p.name ? String(p.name).trim() : '';
}

function tryCaptureName(message) {
  const msg = String(message || '').trim();
  if (!msg) return null;
  // إذا المستخدم كتب اسم مختصر
  if (msg.length <= 20) {
    const p = Store.getProfile() || {};
    p.name = msg;
    Store.setProfile(p);
    return msg;
  }
  return null;
}

function ruleBasedReply(message) {
  const msg = normalize(message);

  if (msg.includes('تثبيت') || msg.includes('install') || msg.includes('pwa')) {
    return {
      reply:
        'لتثبيت البرنامج كتطبيق:\n1) افتح الصفحة الرئيسية\n2) اضغط زر (ثبّت التطبيق)\n\nعلى iPhone: Safari → مشاركة → Add to Home Screen.',
      quick: [{ label: 'الصفحة الرئيسية', href: buildUrl('/index.html') }]
    };
  }

  if (msg.includes('اختبار') || msg.includes('محاولة') || msg.includes('24')) {
    return {
      reply:
        'الاختبار الكامل متاح مرة واحدة كل 24 ساعة عشان تركيزك ✅\nإذا تبي تطوّر أسرع بين المحاولات: سوّ كويزات وراجع أخطاءك.',
      quick: [
        { label: 'ابدأ الاختبار', href: buildUrl('/start.html') },
        { label: 'أنشئ كويز', href: buildUrl('/quiz.html') }
      ]
    };
  }

  if (msg.includes('نتيجة') || msg.includes('نتائج') || msg.includes('خطة') || msg.includes('جدول')) {
    return {
      reply:
        'تلقى خطتك وتحليل الأقسام في صفحة (خطتي/نتائجي).\nوفيها بعد: زر نسخ الخطة + مشاركة + تحميل PDF.',
      quick: [{ label: 'فتح خطتي/نتائجي', href: buildUrl('/results.html') }]
    };
  }

  if (msg.includes('pdf') || msg.includes('تحميل')) {
    return {
      reply:
        'تحميل PDF موجود في صفحة النتائج 👇\nاضغط (تحميل PDF) وراح يفتح وضع الطباعة — اختر Save as PDF.',
      quick: [{ label: 'تحميل PDF', href: buildUrl('/results.html', {}) + '#pdf' }]
    };
  }

  if (msg.includes('كويز') || msg.includes('quiz')) {
    return {
      reply:
        'تقدر تنشئ كويز لأي قسم وتختار: عدد الأسئلة + الصعوبة + نموذج 49/50/51 + الأكثر تكرارًا.\nبعدها تراجع أخطاءك مباشرة ✅',
      quick: [{ label: 'أنشئ كويز', href: buildUrl('/quiz.html') }]
    };
  }

  if (msg.includes('مجموعة') || msg.includes('قروب') || msg.includes('واتساب') || msg.includes('تلجرام')) {
    return {
      reply:
        'فكرة مجموعة الالتزام: 3–7 طلاب على نفس المدة.\nكل يوم: (تم ✅) + سؤال واحد تعلمته اليوم.\nتقدر تسويها من صفحة (مجموعة الالتزام).',
      quick: [{ label: 'فتح مجموعة الالتزام', href: buildUrl('/group.html') }]
    };
  }

  if (msg.includes('faq') || msg.includes('الأسئلة') || msg.includes('شائع')) {
    return {
      reply:
        'حاضر ✅ صفحة الأسئلة الشائعة مرتبة وبها بحث وتصنيفات.',
      quick: [{ label: 'الأسئلة الشائعة', href: buildUrl('/faq.html') }]
    };
  }

  return {
    reply: (STATE.content && STATE.content.fallbacks && STATE.content.fallbacks.unknown) ? STATE.content.fallbacks.unknown : 'كيف أقدر أساعدك؟',
    quick: []
  };
}

async function respond(message) {
  const name = getNameFromProfile();

  // إذا نحتاج اسم
  if (!name) {
    if (!STATE.awaitingName) {
      STATE.awaitingName = true;
      const greet = pickFrom(STATE.content.greeting_without_name);
      addBubble(greet, 'bot');
      return;
    }

    const captured = tryCaptureName(message);
    if (captured) {
      STATE.awaitingName = false;
      addBubble(`تمام يا ${captured} ✅\nتبغى تبدأ اختبار تحديد المستوى ولا نبدأ بكويز سريع؟`, 'bot');
      return;
    }
  }

  setStatus('جاري الكتابة…');
  await sleep(450 + Math.floor(Math.random() * 550));

  const r = ruleBasedReply(message);
  addBubble(r.reply, 'bot');
  setStatus('متصل الآن');

  // Quick replies as buttons inside a small bubble
  if (r.quick && r.quick.length) {
    const body = $('#assistantBody');
    const wrap = document.createElement('div');
    wrap.className = 'bubble';
    wrap.innerHTML = `<div class="small" style="margin-bottom:8px">روابط سريعة:</div>`;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '8px';
    r.quick.slice(0, 3).forEach((q) => {
      const a = document.createElement('a');
      a.className = 'btn sm';
      a.href = q.href;
      a.textContent = q.label;
      row.appendChild(a);
    });
    wrap.appendChild(row);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }
}

function pickFrom(arr) {
  const a = Array.isArray(arr) ? arr : [];
  if (!a.length) return '';
  return a[Math.floor(Math.random() * a.length)];
}

function openAssistant() {
  const win = $('#assistantWindow');
  if (!win) return;
  win.classList.add('open');
  STATE.isOpen = true;
}

function closeAssistant() {
  const win = $('#assistantWindow');
  if (!win) return;
  win.classList.remove('open');
  STATE.isOpen = false;
}

async function bootstrap() {
  ensureUI();
  await loadAssistantContent();
  renderQuickActions();

  const fab = $('#assistantFab');
  const close = $('#assistantClose');
  const send = $('#assistantSend');
  const input = $('#assistantInput');

  const greeting = () => {
    const name = getNameFromProfile();
    const greetTpl = name ? pickFrom(STATE.content.greeting_with_name) : pickFrom(STATE.content.greeting_without_name);
    const greet = greetTpl.replaceAll('{NAME}', name || '');
    addBubble(greet, 'bot');

    const tip = pickFrom(STATE.content.onboarding_tips);
    if (tip) {
      const t = document.createElement('div');
      t.className = 'bubble';
      t.innerHTML = `<div class="small">نصيحة سريعة:</div>${escapeHTML(tip)}`;
      $('#assistantBody').appendChild(t);
    }
  };

  fab.addEventListener('click', () => {
    if (STATE.isOpen) {
      closeAssistant();
      return;
    }
    openAssistant();
    if (!$('#assistantBody').children.length) greeting();
  });

  close.addEventListener('click', closeAssistant);

  const doSend = async () => {
    const msg = String(input.value || '').trim();
    if (!msg) return;
    input.value = '';
    addBubble(msg, 'me');
    await respond(msg);
  };

  send.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSend();
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);

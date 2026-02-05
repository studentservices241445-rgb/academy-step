/*
  Quiz Builder + Runner
  - Deterministic by seed (URL)
  - Review mistakes
  - Pause notifications while solving
*/

import { $, $$, APP, Store, showToast, copyText, shareText, buildUrl, getQueryParams, setPageContext } from './app.js';
import { buildQuizQuestions } from './questionBank.js';
import { generateShareText } from './share.js';
import { secLabelAr } from './plan.js';

const RUN = {
  config: null,
  questions: [],
  answers: [],
  currentIndex: 0,
  showExplain: true,
  startedAt: null,
  finishedAt: null
};

function secAr(s) {
  if (s === 'Mixed') return 'مختلط';
  return secLabelAr(s);
}

function randSeed() {
  const a = Math.random().toString(36).slice(2, 6);
  const b = Date.now().toString(36).slice(-4);
  return `${a}${b}`;
}

function getFormConfig() {
  const v = (id) => {
    const el = $(id);
    return el ? String(el.value || '').trim() : '';
  };

  return {
    section: v('#q_section') || 'Mixed',
    count: Number(v('#q_count') || 10),
    difficulty: v('#q_difficulty') || 'auto',
    modelNo: v('#q_model') || 'mix',
    trendingMode: v('#q_trend') || 'none',
    keywords: v('#q_keywords') || '',
    seed: v('#q_seed') || '',
    useAI: !!($('#q_use_ai') && $('#q_use_ai').checked)
  };
}

function fillForm(cfg) {
  const set = (id, val) => {
    const el = $(id);
    if (!el) return;
    el.value = val != null ? val : '';
  };
  set('#q_section', cfg.section || 'Mixed');
  set('#q_count', cfg.count || 10);
  set('#q_difficulty', cfg.difficulty || 'auto');
  set('#q_model', cfg.modelNo || 'mix');
  set('#q_trend', cfg.trendingMode || 'none');
  set('#q_keywords', cfg.keywords || '');
  set('#q_seed', cfg.seed || '');
}

function buildShareLink(cfg) {
  return buildUrl('/quiz.html', {
    section: cfg.section,
    count: cfg.count,
    difficulty: cfg.difficulty,
    model: cfg.modelNo,
    trend: cfg.trendingMode,
    keywords: cfg.keywords,
    seed: cfg.seed
  });
}

// توليد أسئلة الكويز عبر الذكاء الاصطناعي
// هذه الدالة تستدعي الدالة serverless في الخلفية وتنشئ أسئلة بناءً على المدخلات.
async function generateAIQuestions(cfg) {
  try {
    const payload = {
      topic: cfg.section === 'Mixed' ? 'general English skills for STEP exam' : cfg.section,
      n: cfg.count,
      difficulty: cfg.difficulty === 'auto' ? 'medium' : cfg.difficulty,
      language: 'Arabic'
    };
    const res = await fetch('/.netlify/functions/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    // Parse OpenAI response. The content is expected in data.choices[0].message.content
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    // Robust JSON parsing (handles code fences / wrapper objects / extra text)
    const safeParse = (raw) => {
      if (!raw || typeof raw !== 'string') return null;
      let txt = raw.trim();
      // Strip markdown code fences
      txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

      // Try direct parse
      try {
        return JSON.parse(txt);
      } catch (_) {}

      // Try to extract array payload
      const aStart = txt.indexOf('[');
      const aEnd = txt.lastIndexOf(']');
      if (aStart !== -1 && aEnd !== -1 && aEnd > aStart) {
        const sub = txt.slice(aStart, aEnd + 1);
        try { return JSON.parse(sub); } catch (_) {}
      }

      // Try to extract object payload
      const oStart = txt.indexOf('{');
      const oEnd = txt.lastIndexOf('}');
      if (oStart !== -1 && oEnd !== -1 && oEnd > oStart) {
        const sub = txt.slice(oStart, oEnd + 1);
        try { return JSON.parse(sub); } catch (_) {}
      }

      return null;
    };

    const parsed = safeParse(content);
    let arr = null;
    if (Array.isArray(parsed)) arr = parsed;
    else if (parsed && Array.isArray(parsed.questions)) arr = parsed.questions;

    if (!Array.isArray(arr) || arr.length === 0) {
      console.warn('AI questions payload was empty or invalid');
      return { questions: [] };
    }
    // Convert to internal question format
    const questions = arr.map((item) => {
      const id = 'ai-' + Math.random().toString(36).substring(2, 10);
      const rawAnswer = (item && item.answer != null) ? String(item.answer).trim() : 'A';
      const answerLetter = rawAnswer.toUpperCase();
      const answerIdx = ['A', 'B', 'C', 'D'].indexOf(answerLetter);
      const answerFromNumber = ['1', '2', '3', '4'].indexOf(rawAnswer);
      const optionsArray = Array.isArray(item.options) ? item.options.map((opt) => {
        // Remove leading letter and dot if present (e.g. "A) option")
        return typeof opt === 'string'
          ? opt
              .replace(/^\s*[A-D]\)|^\s*[A-D]\.|^\s*[A-D]\-|^\s*[A-D]\:\s*/i, '')
              .trim()
          : opt;
      }) : [];
      return {
        id,
        prompt: item.question || '',
        choices: optionsArray,
        answer_index: answerIdx >= 0 ? answerIdx : (answerFromNumber >= 0 ? answerFromNumber : 0),
        explain_ar: item.explanation || '',
        passage: null,
        transcript: null
      };
    });
    return { questions };
  } catch (e) {
    console.error('Error generating AI questions', e);
    return { questions: [] };
  }
}

function showSetupView() {
  $('#setupView').style.display = 'block';
  $('#runView').style.display = 'none';
  setPageContext({ disableToasts: false });
}

function showRunView() {
  $('#setupView').style.display = 'none';
  $('#runView').style.display = 'block';
}

function renderSetupSummary(cfg, questionsCount) {
  const box = $('#quizSummary');
  const link = buildShareLink(cfg);
  box.innerHTML = `
    <div class="card">
      <div class="badge gold">كويز جاهز ✅</div>
      <div class="h1" style="margin:10px 0 8px">${secAr(cfg.section)} — ${cfg.count} سؤال</div>
      <p class="p">الصعوبة: <b>${cfg.difficulty === 'auto' ? 'تلقائي' : cfg.difficulty}</b> • النموذج: <b>${cfg.modelNo === 'mix' ? 'خليط' : cfg.modelNo}</b> • الفلتر: <b>${cfg.trendingMode === 'week' ? 'الأكثر تكرارًا (أسبوع)' : (cfg.trendingMode === 'month' ? 'الأكثر تكرارًا (شهر)' : 'عادي')}</b></p>
      <div class="btn-row">
        <button class="btn primary" type="button" id="btnStartQuiz">بدء الكويز</button>
        <button class="btn" type="button" id="btnShareQuizLink">مشاركة رابط الكويز</button>
        <button class="btn" type="button" id="btnCopyQuizLink">نسخ الرابط</button>
      </div>
      <div class="divider"></div>
      <div class="help">الرابط يحتوي Seed عشان يفتح نفس الكويز عند أي شخص.</div>
    </div>
  `;

  $('#btnCopyQuizLink').onclick = () => copyText(link);
  $('#btnShareQuizLink').onclick = async () => {
    const txt = await generateShareText('quiz', {
      SECTION: secAr(cfg.section),
      MODEL: cfg.modelNo === 'mix' ? 'خليط' : cfg.modelNo,
      DATE: new Date().toLocaleDateString('ar-SA'),
      QUIZ_URL: link,
      PROGRAM_URL: buildUrl('/index.html')
    });
    await shareText({ title: APP.programName, text: txt, url: link });
  };

  $('#btnStartQuiz').onclick = () => startQuiz(cfg);
}

function renderRunTop() {
  const cfg = RUN.config;
  $('#runTitle').textContent = `${secAr(cfg.section)} — ${cfg.count} سؤال`;
  $('#runMeta').textContent = `نموذج: ${cfg.modelNo === 'mix' ? 'خليط' : cfg.modelNo} • Seed: ${cfg.seed}`;
}

function renderQuestion() {
  const q = RUN.questions[RUN.currentIndex];
  if (!q) return;

  $('#qIndex').textContent = `سؤال ${RUN.currentIndex + 1} / ${RUN.questions.length}`;

  const bar = $('#runProgress');
  if (bar) {
    const pct = ((RUN.currentIndex + 1) / RUN.questions.length) * 100;
    bar.style.width = `${pct}%`;
  }

  const passageBox = $('#qPassage');
  if (q.passage) {
    passageBox.style.display = 'block';
    passageBox.innerHTML = `<div class="label">نص القراءة</div><div class="p" style="margin:0">${q.passage}</div>`;
  } else {
    passageBox.style.display = 'none';
    passageBox.innerHTML = '';
  }

  const transcriptBox = $('#qTranscript');
  if (q.transcript) {
    transcriptBox.style.display = 'block';
    transcriptBox.innerHTML = `<div class="label">نص الاستماع</div><div class="p" style="margin:0">${q.transcript}</div>`;
  } else {
    transcriptBox.style.display = 'none';
    transcriptBox.innerHTML = '';
  }

  $('#qPrompt').textContent = q.prompt;

  const choices = $('#qChoices');
  choices.innerHTML = '';
  const chosen = RUN.answers[RUN.currentIndex];

  q.choices.forEach((c, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.style.width = '100%';
    b.style.justifyContent = 'flex-start';
    b.innerHTML = `<b style="min-width:24px">${idx + 1})</b> <span>${c}</span>`;
    if (chosen === idx) {
      b.style.background = 'rgba(201,164,76,0.16)';
      b.style.borderColor = 'rgba(201,164,76,0.45)';
    }
    b.addEventListener('click', () => {
      RUN.answers[RUN.currentIndex] = idx;
      persistRunState();
      renderQuestion();
    });
    choices.appendChild(b);
  });

  $('#btnPrev').disabled = RUN.currentIndex === 0;
  $('#btnNext').disabled = RUN.currentIndex === RUN.questions.length - 1;

  const explainBox = $('#qExplain');
  const toggle = $('#toggleExplain');
  toggle.checked = !!RUN.showExplain;
  if (RUN.showExplain && chosen !== null && chosen !== undefined) {
    const ok = chosen === q.answer_index;
    explainBox.style.display = 'block';
    explainBox.innerHTML = `
      <div class="${ok ? 'notice-success' : 'notice-danger'}">
        ${ok ? 'إجابة صحيحة ✅' : 'إجابة غير صحيحة ❌'}
        <div style="margin-top:8px;font-weight:700;color:rgba(15,23,42,0.8)">
          الشرح: ${q.explain_ar}
        </div>
      </div>
    `;
  } else {
    explainBox.style.display = 'none';
    explainBox.innerHTML = '';
  }
}

function persistRunState() {
  Store.setCurrentQuizState({
    version: 5,
    config: RUN.config,
    questionIds: RUN.questions.map((q) => q.id),
    answers: RUN.answers,
    currentIndex: RUN.currentIndex,
    showExplain: RUN.showExplain,
    startedAt: RUN.startedAt,
    finishedAt: RUN.finishedAt
  });
}

function tryRestoreRunState() {
  const s = Store.getCurrentQuizState();
  if (!s || !s.config || !Array.isArray(s.questionIds) || !Array.isArray(s.answers)) return null;
  return s;
}

async function startQuiz(cfg) {
  // While solving: stop toasts
  setPageContext({ disableToasts: true });
  showRunView();

  RUN.config = cfg;
  RUN.startedAt = Date.now();
  RUN.finishedAt = null;
  RUN.currentIndex = 0;
  RUN.showExplain = true;

  let built;
  if (cfg.useAI) {
    // Use existing AI questions if preview already generated
    if (Array.isArray(RUN.questions) && RUN.questions.length) {
      built = { questions: RUN.questions };
    } else {
      built = await generateAIQuestions(cfg);
    }
  } else {
    built = await buildQuizQuestions({
      section: cfg.section,
      count: cfg.count,
      difficulty: cfg.difficulty,
      modelNo: cfg.modelNo,
      keywords: cfg.keywords,
      trendingMode: cfg.trendingMode === 'none' ? 'none' : cfg.trendingMode,
      userSeed: cfg.seed
    });
  }

  RUN.questions = built.questions || [];
  RUN.answers = Array(RUN.questions.length).fill(null);

  renderRunTop();
  persistRunState();
  bindRunButtons();
  renderQuestion();
}

function computeScore() {
  let correct = 0;
  const wrong = [];
  RUN.questions.forEach((q, idx) => {
    const a = RUN.answers[idx];
    const ok = a === q.answer_index;
    if (ok) correct++;
    else wrong.push({ q, idx });
  });
  const pct = Math.round((correct / RUN.questions.length) * 100);
  return { correct, total: RUN.questions.length, pct, wrong };
}

async function finishQuiz() {
  RUN.finishedAt = Date.now();
  persistRunState();

  const { correct, total, pct, wrong } = computeScore();

  // Save to history
  Store.addQuizAttempt({
    ts: RUN.finishedAt,
    section: RUN.config.section,
    count: total,
    modelNo: RUN.config.modelNo,
    difficulty: RUN.config.difficulty,
    trendingMode: RUN.config.trendingMode,
    seed: RUN.config.seed,
    scorePercent: pct,
    correct,
    wrongIds: wrong.map((x) => x.q.id)
  });

  const box = $('#finishBox');
  box.style.display = 'block';

  const shareLink = buildShareLink(RUN.config);

  box.innerHTML = `
    <div class="card">
      <div class="badge gold">النتيجة</div>
      <div class="h1" style="margin:10px 0 8px">${pct}% — ${correct}/${total}</div>
      <p class="p">ممتاز ✅ الآن أهم خطوة: <b>مراجعة الأخطاء</b>.</p>
      <div class="btn-row">
        <button class="btn" type="button" id="btnReview">راجع أخطائي</button>
        <button class="btn" type="button" id="btnRetryWrong">أعد حل الأخطاء فقط</button>
        <button class="btn" type="button" id="btnShareQuiz">مشاركة الكويز</button>
      </div>
      <div class="divider"></div>
      <div class="btn-row">
        <a class="btn sm" href="./test.html">اختبار تحديد المستوى</a>
        <a class="btn sm" href="./index.html">الرئيسية</a>
      </div>
    </div>
  `;

  $('#btnShareQuiz').onclick = async () => {
    const txt = await generateShareText('quiz', {
      SECTION: secAr(RUN.config.section),
      MODEL: RUN.config.modelNo === 'mix' ? 'خليط' : RUN.config.modelNo,
      DATE: new Date().toLocaleDateString('ar-SA'),
      QUIZ_URL: shareLink,
      PROGRAM_URL: buildUrl('/index.html')
    });
    await shareText({ title: APP.programName, text: txt, url: shareLink });
  };

  $('#btnReview').onclick = () => {
    const anchor = document.getElementById('reviewAnchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
    renderReview(wrong);
  };

  $('#btnRetryWrong').onclick = () => {
    if (!wrong.length) {
      showToast({ title: 'ما شاء الله ✅', text: 'ما عندك أخطاء في هذا الكويز.' });
      return;
    }
    // Build a new quiz with only wrong questions
    RUN.questions = wrong.map((x) => x.q);
    RUN.answers = Array(RUN.questions.length).fill(null);
    RUN.currentIndex = 0;
    RUN.finishedAt = null;
    $('#finishBox').style.display = 'none';
    renderQuestion();
    showToast({ title: 'جاهز', text: 'أعد حل الأخطاء فقط 👌' });
    persistRunState();
  };
}

function renderReview(wrong) {
  const box = $('#reviewBox');
  box.innerHTML = '';

  if (!wrong.length) {
    box.innerHTML = `<div class="notice-success">ما شاء الله ✅ ما عندك أخطاء.</div>`;
    return;
  }

  const acc = document.createElement('div');
  acc.className = 'accordion';

  wrong.slice(0, 30).forEach((w, i) => {
    const q = w.q;
    const chosen = RUN.answers[w.idx];
    const correctText = q.choices[q.answer_index];
    const chosenText = (chosen !== null && chosen !== undefined) ? q.choices[chosen] : '—';

    const item = document.createElement('div');
    item.className = 'acc-item';
    item.innerHTML = `
      <button class="acc-head" type="button">
        <span>خطأ ${i + 1}: ${q.prompt}</span>
        <span class="meta">${secAr(q.section)} • الإجابة الصحيحة: ${q.answer_index + 1}</span>
      </button>
      <div class="acc-body">
        <div class="p">إجابتك: <b>${chosenText}</b></div>
        <div class="p">الصحيح: <b>${correctText}</b></div>
        <div class="p">الشرح: ${q.explain_ar}</div>
      </div>
    `;

    item.querySelector('.acc-head').addEventListener('click', () => {
      item.classList.toggle('open');
    });

    acc.appendChild(item);
  });

  box.appendChild(acc);
}

function bindRunButtons() {
  $('#btnPrev').onclick = () => {
    RUN.currentIndex = Math.max(0, RUN.currentIndex - 1);
    persistRunState();
    renderQuestion();
  };

  $('#btnNext').onclick = () => {
    RUN.currentIndex = Math.min(RUN.questions.length - 1, RUN.currentIndex + 1);
    persistRunState();
    renderQuestion();
  };

  $('#toggleExplain').onchange = (e) => {
    RUN.showExplain = !!e.target.checked;
    persistRunState();
    renderQuestion();
  };

  $('#btnFinish').onclick = finishQuiz;

  $('#btnExit').onclick = () => {
    // stop run & allow toasts
    Store.clearCurrentQuizState();
    showSetupView();
    showToast({ title: 'تم', text: 'رجعناك لصفحة إنشاء الكويز.' });
  };

  $('#toggleFocus').onchange = (e) => {
    const on = !!e.target.checked;
    setPageContext({ disableToasts: on ? true : true });
    // In this program, we keep notifications paused during the quiz anyway.
    showToast({ title: 'تركيز', text: on ? 'تم تفعيل وضع التركيز ✅' : 'تم إلغاء وضع التركيز.' });
  };
}

async function buildFromUrlIfAny() {
  const qp = getQueryParams();
  if (!Object.keys(qp).length) return false;

  const cfg = {
    section: qp.section || 'Mixed',
    count: Number(qp.count || 10),
    difficulty: qp.difficulty || 'auto',
    modelNo: qp.model || 'mix',
    trendingMode: qp.trend || 'none',
    keywords: qp.keywords || '',
    seed: qp.seed || ''
  };

  if (cfg.seed) {
    fillForm(cfg);
    // Pre-build summary (without starting)
    const built = await buildQuizQuestions({
      section: cfg.section,
      count: cfg.count,
      difficulty: cfg.difficulty,
      modelNo: cfg.modelNo,
      keywords: cfg.keywords,
      trendingMode: cfg.trendingMode,
      userSeed: cfg.seed
    });
    RUN.config = cfg;
    RUN.questions = built.questions;
    renderSetupSummary(cfg, built.questions.length);
    return true;
  }

  fillForm(cfg);
  return false;
}

async function init() {
  showSetupView();

  // Restore if user had an unfinished quiz
  const restored = tryRestoreRunState();
  if (restored && !restored.finishedAt) {
    const cfg = restored.config;
    const built = await buildQuizQuestions({
      section: cfg.section,
      count: cfg.count,
      difficulty: cfg.difficulty,
      modelNo: cfg.modelNo,
      keywords: cfg.keywords,
      trendingMode: cfg.trendingMode,
      userSeed: cfg.seed
    });

    RUN.config = cfg;
    RUN.questions = built.questions;
    RUN.answers = restored.answers;
    RUN.currentIndex = restored.currentIndex || 0;
    RUN.showExplain = restored.showExplain !== false;
    RUN.startedAt = restored.startedAt || Date.now();
    RUN.finishedAt = null;

    showToast({ title: 'تم استرجاع الكويز ✅', text: 'كمل من آخر سؤال.' });
    setPageContext({ disableToasts: true });
    showRunView();
    renderRunTop();
    bindRunButtons();
    renderQuestion();
    return;
  }

  const pre = await buildFromUrlIfAny();

  const form = $('#quizForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cfg = getFormConfig();
    if (!cfg.seed) cfg.seed = randSeed();
    fillForm(cfg);

    // Build preview (AI or local)
    let built;
    if (cfg.useAI) {
      built = await generateAIQuestions(cfg);
    } else {
      built = await buildQuizQuestions({
        section: cfg.section,
        count: cfg.count,
        difficulty: cfg.difficulty,
        modelNo: cfg.modelNo,
        keywords: cfg.keywords,
        trendingMode: cfg.trendingMode,
        userSeed: cfg.seed
      });
    }
    RUN.config = cfg;
    RUN.questions = built.questions || [];
    renderSetupSummary(cfg, RUN.questions.length);

    // Update URL (so user can share same quiz)
    const link = buildShareLink(cfg);
    history.replaceState({}, '', link);
  });

  // If no URL seed, still allow a default seed display
  if (!$('#q_seed').value) {
    $('#q_seed').value = randSeed();
  }
}

document.addEventListener('DOMContentLoaded', init);

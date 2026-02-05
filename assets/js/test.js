/*
  Full Level Test (50 questions)
  - One attempt per 24h
  - Save progress in LocalStorage
*/

import { $, $$, Store, getLockInfo, showToast, fmtHM, showModal, hideModal } from './app.js';
import { loadQuestions, buildFullTestQuestions } from './questionBank.js';

const STATE = {
  questions: [],
  qById: {},
  testState: null
};

// التحكم في ظهور شبكة التنقل: مخفية بشكل افتراضي
let gridVisible = false;

function secAr(s) {
  const map = { Vocabulary: 'المفردات', Grammar: 'القواعد', Reading: 'القراءة', Listening: 'الاستماع' };
  return map[s] || s;
}

function levelLabel(p) {
  if (p < 40) return 'مبتدئ';
  if (p < 70) return 'متوسط';
  return 'متقدم';
}

function renderLock() {
  const lockBox = $('#lockBox');
  const lock = getLockInfo();
  if (!lockBox) return;
  if (!lock.locked) {
    lockBox.style.display = 'none';
    return;
  }

  lockBox.style.display = 'block';
  lockBox.innerHTML = `
    <div class="notice-danger">
      الاختبار الكامل مقفول مؤقتًا ⏳
      <div style="margin-top:8px">باقي: <b id="lockRemaining"></b></div>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
        <a class="btn sm" href="./results.html">خطتي/نتائجي</a>
        <a class="btn sm" href="./quiz.html">كويزات تدريب</a>
      </div>
    </div>
  `;

  const rem = $('#lockRemaining');
  const tick = () => {
    const l = getLockInfo();
    if (rem) rem.textContent = fmtHM(l.remaining);
    if (!l.locked) {
      lockBox.style.display = 'none';
      clearInterval(intv);
      showToast({ title: 'جاهز ✅', text: 'تقدر تبدأ المحاولة الجديدة الآن.' });
      location.reload();
    }
  };
  tick();
  const intv = setInterval(tick, 1000);
}

async function loadBank() {
  const qs = await loadQuestions();
  STATE.questions = qs;
  STATE.qById = Object.fromEntries(qs.map((q) => [q.id, q]));
}

function newState({ seed, questions }) {
  return {
    version: 5,
    seed,
    questionIds: questions.map((q) => q.id),
    answers: Array(questions.length).fill(null),
    currentIndex: 0,
    showExplain: true,
    startedAt: Date.now(),
    lastSavedAt: Date.now()
  };
}

function getStateQuestion(i) {
  const id = STATE.testState.questionIds[i];
  return STATE.qById[id];
}

function saveState() {
  STATE.testState.lastSavedAt = Date.now();
  Store.setCurrentTestState(STATE.testState);
}

function renderGrid() {
  const grid = $('#qGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const st = STATE.testState;
  st.questionIds.forEach((_, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn sm';
    b.style.padding = '8px 10px';
    b.style.borderRadius = '14px';
    const answered = st.answers[idx] !== null && st.answers[idx] !== undefined;
    if (answered) {
      b.style.background = 'rgba(6,118,71,0.08)';
      b.style.borderColor = 'rgba(6,118,71,0.25)';
    }
    if (idx === st.currentIndex) {
      b.style.background = 'rgba(201,164,76,0.18)';
      b.style.borderColor = 'rgba(201,164,76,0.45)';
    }
    b.textContent = String(idx + 1);
    b.addEventListener('click', () => {
      st.currentIndex = idx;
      saveState();
      render();
    });
    grid.appendChild(b);
  });
}

function render() {
  const st = STATE.testState;
  const q = getStateQuestion(st.currentIndex);
  if (!q) return;

  $('#qNum').textContent = `سؤال ${st.currentIndex + 1} / ${st.questionIds.length}`;
  $('#qSection').textContent = secAr(q.section);

  const bar = $('#progressFill');
  if (bar) {
    const pct = ((st.currentIndex + 1) / st.questionIds.length) * 100;
    bar.style.width = `${pct}%`;
  }

  const passageBox = $('#passageBox');
  if (passageBox) {
    if (q.passage) {
      passageBox.style.display = 'block';
      passageBox.innerHTML = `<div class="label">نص القراءة</div><div class="p" style="margin:0">${q.passage}</div>`;
    } else {
      passageBox.style.display = 'none';
      passageBox.innerHTML = '';
    }
  }

  const transcriptBox = $('#transcriptBox');
  if (transcriptBox) {
    if (q.transcript) {
      transcriptBox.style.display = 'block';
      transcriptBox.innerHTML = `<div class="label">نص الاستماع</div><div class="p" style="margin:0">${q.transcript}</div>`;
    } else {
      transcriptBox.style.display = 'none';
      transcriptBox.innerHTML = '';
    }
  }

  $('#qPrompt').textContent = q.prompt;

  const choices = $('#choices');
  choices.innerHTML = '';
  const chosen = st.answers[st.currentIndex];

  q.choices.forEach((c, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.style.justifyContent = 'flex-start';
    btn.style.width = '100%';
    btn.innerHTML = `<b style="min-width:24px">${idx + 1})</b> <span>${c}</span>`;
    if (chosen === idx) {
      btn.style.background = 'rgba(201,164,76,0.16)';
      btn.style.borderColor = 'rgba(201,164,76,0.45)';
    }
    btn.addEventListener('click', () => {
      st.answers[st.currentIndex] = idx;
      saveState();
      render();
      renderGrid();
    });
    choices.appendChild(btn);
  });

  const explainBox = $('#explainBox');
  const showExplain = $('#toggleExplain');
  if (showExplain) showExplain.checked = !!st.showExplain;
  if (explainBox) {
    if (st.showExplain && chosen !== null && chosen !== undefined) {
      const correct = chosen === q.answer_index;
      explainBox.style.display = 'block';
      explainBox.innerHTML = `
        <div class="${correct ? 'notice-success' : 'notice-danger'}">
          ${correct ? 'إجابة صحيحة ✅' : 'إجابة غير صحيحة ❌'}
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

  $('#btnPrev').disabled = st.currentIndex === 0;
  $('#btnNext').disabled = st.currentIndex === st.questionIds.length - 1;

  const doneBtn = $('#btnFinish');
  if (doneBtn) {
    const answeredCount = st.answers.filter((a) => a !== null && a !== undefined).length;
    doneBtn.textContent = answeredCount === st.questionIds.length ? 'إنهاء الاختبار وإظهار النتيجة' : `إنهاء الاختبار (${answeredCount}/50)`;
  }
}

function computeResult() {
  const st = STATE.testState;
  const total = st.questionIds.length;
  let correct = 0;

  const breakdown = {
    Vocabulary: { correct: 0, total: 0, percent: 0 },
    Grammar: { correct: 0, total: 0, percent: 0 },
    Reading: { correct: 0, total: 0, percent: 0 },
    Listening: { correct: 0, total: 0, percent: 0 }
  };

  st.questionIds.forEach((id, idx) => {
    const q = STATE.qById[id];
    if (!q) return;
    const ans = st.answers[idx];
    const ok = ans === q.answer_index;
    if (ok) correct++;
    breakdown[q.section].total++;
    if (ok) breakdown[q.section].correct++;
  });

  Object.keys(breakdown).forEach((k) => {
    const b = breakdown[k];
    b.percent = b.total ? Math.round((b.correct / b.total) * 100) : 0;
  });

  const overallPercent = Math.round((correct / total) * 100);
  const sectionsSorted = Object.keys(breakdown)
    .map((s) => ({ s, p: breakdown[s].percent }))
    .sort((a, b) => a.p - b.p);

  const weakSections = sectionsSorted.slice(0, 2).map((x) => x.s);

  return {
    finishedAt: Date.now(),
    seed: st.seed,
    total,
    correct,
    overallPercent,
    level: levelLabel(overallPercent),
    breakdown,
    weakSections,
    questionIds: st.questionIds,
    answers: st.answers
  };
}

function finishFlow() {
  const unanswered = STATE.testState.answers.filter((a) => a === null || a === undefined).length;
  const warn = unanswered ? `<p>باقي <b>${unanswered}</b> سؤال بدون إجابة. تقدر تكمل… أو تكمل بالنواقص.</p>` : '';

  showModal({
    title: 'تأكيد إنهاء الاختبار',
    html: `
      ${warn}
      <p>إذا جاهز، اضغط (عرض النتيجة).</p>
      <div class="btn-row" style="justify-content:flex-end">
        <button class="btn sm" id="cancelFinish" type="button">رجوع</button>
        <button class="btn sm primary" id="confirmFinish" type="button">عرض النتيجة</button>
      </div>
    `
  });

  $('#cancelFinish').onclick = hideModal;
  $('#confirmFinish').onclick = () => {
    hideModal();
    const result = computeResult();
    // Save lock + result
    Store.setLastTestTs(Date.now());
    Store.setLastTestResult(result);
    Store.addResultAttempt({
      ts: result.finishedAt,
      overallPercent: result.overallPercent,
      level: result.level,
      weakSections: result.weakSections
    });
    Store.clearCurrentTestState();
    showToast({ title: 'تم ✅', text: 'تم حفظ نتيجتك وبناء خطتك.' });
    setTimeout(() => (window.location.href = './results.html'), 450);
  };
}

async function startOrResume() {
  const lock = getLockInfo();
  if (lock.locked) {
    renderLock();
    return;
  }

  await loadBank();
  const saved = Store.getCurrentTestState();

  if (saved && saved.questionIds && Array.isArray(saved.questionIds) && saved.questionIds.length === 50) {
    STATE.testState = saved;
    showToast({ title: 'تم استرجاع المحاولة ✅', text: 'كمل من آخر سؤال وقفت عنده.' });
  } else {
    const { seed, questions } = await buildFullTestQuestions({ userSeed: String(Date.now()) });
    STATE.testState = newState({ seed, questions });
    saveState();
  }

  // Bind UI
  $('#btnPrev').addEventListener('click', () => {
    STATE.testState.currentIndex = Math.max(0, STATE.testState.currentIndex - 1);
    saveState();
    render();
    renderGrid();
  });

  $('#btnNext').addEventListener('click', () => {
    STATE.testState.currentIndex = Math.min(49, STATE.testState.currentIndex + 1);
    saveState();
    render();
    renderGrid();
  });

  $('#btnFinish').addEventListener('click', finishFlow);

  $('#toggleExplain').addEventListener('change', (e) => {
    STATE.testState.showExplain = !!e.target.checked;
    saveState();
    render();
  });

  // In case user refreshes
  window.addEventListener('beforeunload', saveState);

  renderGrid();
  render();
}

function init() {
  renderLock();
  startOrResume();

  // Toggle the visibility of the question grid on user request
  const toggleBtn = $('#toggleGridBtn');
  const qGrid = $('#qGrid');
  if (toggleBtn && qGrid) {
    // Initialize button label based on current state
    toggleBtn.textContent = gridVisible ? 'إخفاء الشبكة' : 'عرض الشبكة';
    toggleBtn.addEventListener('click', () => {
      gridVisible = !gridVisible;
      qGrid.style.display = gridVisible ? 'flex' : 'none';
      toggleBtn.textContent = gridVisible ? 'إخفاء الشبكة' : 'عرض الشبكة';
    });
  }
}

document.addEventListener('DOMContentLoaded', init);

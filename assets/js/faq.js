/* FAQ page */

import { $, APP, loadJSON, Store, showToast } from './app.js';

let DATA = [];
let ACTIVE_TAG = 'الكل';

function buildTags(items) {
  const set = new Set();
  items.forEach((i) => {
    (i.tags || []).forEach((t) => set.add(String(t)));
  });
  return ['الكل', ...Array.from(set).slice(0, 30)];
}

function renderChips(tags) {
  const wrap = $('#faqChips');
  wrap.innerHTML = '';
  tags.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (t === ACTIVE_TAG ? ' active' : '');
    b.textContent = t;
    b.addEventListener('click', () => {
      ACTIVE_TAG = t;
      renderAll();
    });
    wrap.appendChild(b);
  });
}

function matches(item, q) {
  const hay = `${item.q} ${item.a} ${(item.tags || []).join(' ')}`.toLowerCase();
  if (q && !hay.includes(q)) return false;
  if (ACTIVE_TAG !== 'الكل') {
    return (item.tags || []).includes(ACTIVE_TAG);
  }
  return true;
}

function renderAll() {
  const q = String($('#faqSearch').value || '').trim().toLowerCase();
  const list = DATA.filter((i) => matches(i, q));

  // update chips active state
  document.querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('active', c.textContent === ACTIVE_TAG);
  });

  const acc = $('#faqList');
  acc.innerHTML = '';

  if (!list.length) {
    acc.innerHTML = `<div class="card"><div class="p">ما لقينا نتيجة لبحثك. جرّب كلمة أبسط.</div></div>`;
    return;
  }

  list.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'acc-item';
    const meta = (item.tags || []).slice(0, 3).join(' • ');

    const votes = Store.getFaqVotes();
    const v = votes[item.id] || { up: 0, down: 0 };

    div.innerHTML = `
      <button class="acc-head" type="button">
        <span>${item.q}</span>
        <span class="meta">${meta}</span>
      </button>
      <div class="acc-body">
        <div class="p" style="margin-top:4px">${item.a}</div>
        <div class="divider"></div>
        <div class="p" style="margin:0">هل كانت الإجابة مفيدة؟</div>
        <div class="btn-row" style="margin-top:8px">
          <button class="btn sm" type="button" data-up>نعم 👍</button>
          <button class="btn sm" type="button" data-down>لا 👎</button>
          <span class="muted" style="margin-inline-start:auto">${v.up} 👍 • ${v.down} 👎</span>
        </div>
      </div>
    `;

    const head = div.querySelector('.acc-head');
    head.addEventListener('click', () => div.classList.toggle('open'));

    div.querySelector('[data-up]').addEventListener('click', (e) => {
      e.stopPropagation();
      const votes2 = Store.getFaqVotes();
      votes2[item.id] = votes2[item.id] || { up: 0, down: 0 };
      votes2[item.id].up += 1;
      Store.setFaqVotes(votes2);
      showToast({ title: 'شكراً لك', text: 'تم تسجيل رأيك ✅' });
      renderAll();
    });

    div.querySelector('[data-down]').addEventListener('click', (e) => {
      e.stopPropagation();
      const votes2 = Store.getFaqVotes();
      votes2[item.id] = votes2[item.id] || { up: 0, down: 0 };
      votes2[item.id].down += 1;
      Store.setFaqVotes(votes2);
      showToast({ title: 'وصلنا ✅', text: 'بنحسّن الإجابة بإذن الله.' });
      renderAll();
    });

    acc.appendChild(div);
  });
}

async function init() {
  try {
    const data = await loadJSON(`${APP.contentBase}/faq.json`);
    DATA = Array.isArray(data.faq) ? data.faq.map((x, i) => ({ id: x.id || `FAQ-${i+1}`, ...x })) : [];
  } catch (e) {
    DATA = [];
  }

  const tags = buildTags(DATA);
  renderChips(tags);

  $('#faqSearch').addEventListener('input', () => renderAll());

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);

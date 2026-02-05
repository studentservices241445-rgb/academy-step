/* Home page dynamic blocks: verse/hadith, reviews, stories */

import { $, APP, loadJSON, showToast, shareText, buildUrl } from './app.js';
import { getVerseBlock, getHadithBlock, generateShareText } from './share.js';

async function renderSpiritual() {
  const v = await getVerseBlock();
  const h = await getHadithBlock();
  const vb = $('#verseBlock');
  const hb = $('#hadithBlock');
  if (vb) vb.textContent = v || '';
  if (hb) hb.textContent = h || '';
}

function renderReviews(list) {
  const wrap = $('#reviews');
  wrap.innerHTML = '';
  list.slice(0, 18).forEach((r) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.minWidth = '260px';
    card.style.maxWidth = '320px';
    card.innerHTML = `
      <div class="badge gold">★★★★★</div>
      <div class="p" style="margin-top:10px">${r.text}</div>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
        <b>${r.name}</b>
        <span class="muted">${r.city || ''}</span>
      </div>
    `;
    wrap.appendChild(card);
  });
}

function renderStories(list) {
  const acc = $('#stories');
  acc.innerHTML = '';
  list.slice(0, 12).forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'acc-item';
    item.innerHTML = `
      <button class="acc-head" type="button">
        <span>${s.title}</span>
        <span class="meta">${s.name} • ${s.city || ''}</span>
      </button>
      <div class="acc-body">
        <div class="p">${s.text}</div>
      </div>
    `;
    item.querySelector('.acc-head').addEventListener('click', () => item.classList.toggle('open'));
    acc.appendChild(item);
  });
}

async function init() {
  await renderSpiritual();

  // Social proof
  const [reviews, stories] = await Promise.all([
    loadJSON(`${APP.contentBase}/reviews.json`).catch(() => ({ reviews: [] })),
    loadJSON(`${APP.contentBase}/stories.json`).catch(() => ({ stories: [] }))
  ]);

  renderReviews(Array.isArray(reviews.reviews) ? reviews.reviews : []);
  renderStories(Array.isArray(stories.stories) ? stories.stories : []);

  // Share program
  const btnShare = $('#btnShareProgram');
  if (btnShare) {
    btnShare.addEventListener('click', async () => {
      const txt = await generateShareText('program', { PROGRAM_URL: buildUrl('/index.html') });
      await shareText({ title: APP.programName, text: txt, url: buildUrl('/index.html') });
    });
  }
}

document.addEventListener('DOMContentLoaded', init);

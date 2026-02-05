/*
  أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP
  Question Bank helper (load + deterministic selection)
*/

import { APP, loadJSON } from './app.js';

let CACHE = null;

export async function loadQuestions() {
  if (CACHE) return CACHE;
  const data = await loadJSON(`${APP.dataBase}/questions.json`);
  const qs = Array.isArray(data.questions) ? data.questions : [];
  CACHE = qs;
  return qs;
}

export function hashStringToSeed(str) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function filterQuestions(qs, { section, difficulty, modelNo, keywords, trendingMode } = {}) {
  let list = qs.slice();

  if (section && section !== 'Mixed') {
    list = list.filter((q) => q.section === section);
  }

  if (modelNo && modelNo !== 'mix') {
    const m = Number(modelNo);
    list = list.filter((q) => Number(q.model_no) === m);
  }

  if (difficulty && difficulty !== 'auto') {
    const d = Number(difficulty);
    list = list.filter((q) => Number(q.difficulty) === d);
  }

  if (keywords) {
    const k = String(keywords).trim().toLowerCase();
    if (k) {
      list = list.filter((q) => {
        const hay = `${q.prompt} ${(q.tags || []).join(' ')}`.toLowerCase();
        return hay.includes(k);
      });
    }
  }

  // trendingMode: week|month|none
  if (trendingMode === 'week') {
    list = list.slice().sort((a, b) => (b.freq_week || 0) - (a.freq_week || 0));
  } else if (trendingMode === 'month') {
    list = list.slice().sort((a, b) => (b.freq_month || 0) - (a.freq_month || 0));
  }

  return list;
}

export function pickDeterministic(list, count, seed) {
  const rnd = mulberry32(seed);
  const shuffled = shuffle(list, rnd);
  return shuffled.slice(0, count);
}

export function buildSeed({ section, count, difficulty, modelNo, keywords, trendingMode, userSeed } = {}) {
  const base = `${section || ''}|${count || ''}|${difficulty || ''}|${modelNo || ''}|${keywords || ''}|${trendingMode || ''}|${userSeed || ''}`;
  return hashStringToSeed(base);
}

export async function buildQuizQuestions({ section, count, difficulty, modelNo, keywords, trendingMode, userSeed } = {}) {
  const all = await loadQuestions();
  const filtered = filterQuestions(all, { section, difficulty, modelNo, keywords, trendingMode });

  const safeCount = Math.max(3, Math.min(Number(count) || 10, 40));
  const seed = buildSeed({ section, count: safeCount, difficulty, modelNo, keywords, trendingMode, userSeed });

  // If we don't have enough, fallback to Mixed/any within model filter
  let pool = filtered;
  if (pool.length < safeCount) {
    const relaxed = filterQuestions(all, {
      section: 'Mixed',
      difficulty,
      modelNo,
      keywords,
      trendingMode
    });
    pool = pool.concat(relaxed);
  }

  // Final fallback: all
  if (pool.length < safeCount) pool = all.slice();

  const picked = pickDeterministic(pool, safeCount, seed);
  return { seed, questions: picked };
}

export async function buildFullTestQuestions({ userSeed } = {}) {
  const all = await loadQuestions();
  const seed = buildSeed({ section: 'FULL', count: 50, difficulty: 'mix', modelNo: 'mix', keywords: '', trendingMode: 'none', userSeed });
  const rnd = mulberry32(seed);

  const bySection = {
    Vocabulary: all.filter((q) => q.section === 'Vocabulary'),
    Grammar: all.filter((q) => q.section === 'Grammar'),
    Reading: all.filter((q) => q.section === 'Reading'),
    Listening: all.filter((q) => q.section === 'Listening')
  };

  const take = (arr, n) => shuffle(arr, rnd).slice(0, n);

  const selected = [
    ...take(bySection.Vocabulary, 15),
    ...take(bySection.Grammar, 15),
    ...take(bySection.Reading, 15),
    ...take(bySection.Listening, 5)
  ];

  // Shuffle final list
  const finalList = shuffle(selected, rnd).slice(0, 50);
  return { seed, questions: finalList };
}

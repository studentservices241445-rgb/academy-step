/*
  أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP
  Share Text Generator (templates + verse/hadith rotation)
*/

import { APP, loadJSON, getBaseProgramUrl, escapeHTML } from './app.js';
import { Store } from './storage.js';

const STATE = {
  loaded: false,
  templates: null,
  verses: null,
  hadith: null,
  duas: null
};

async function loadLibraries() {
  if (STATE.loaded) return;
  const [templates, verses, hadith, duas] = await Promise.all([
    loadJSON(`${APP.contentBase}/share_templates.json`).catch(() => ({})),
    loadJSON(`${APP.contentBase}/quran_verses.json`).catch(() => ({ verses: [] })),
    loadJSON(`${APP.contentBase}/hadith.json`).catch(() => ({ hadith: [] })),
    loadJSON(`${APP.contentBase}/duas.json`).catch(() => ({ duas: [] }))
  ]);
  STATE.templates = templates;
  STATE.verses = Array.isArray(verses.verses) ? verses.verses : [];
  STATE.hadith = Array.isArray(hadith.hadith) ? hadith.hadith : [];
  STATE.duas = Array.isArray(duas.duas) ? duas.duas : [];
  STATE.loaded = true;
}

function pickRotating(list, usedIds, setUsed) {
  if (!list.length) return null;
  const unused = list.filter((x) => !usedIds.includes(x.id));
  const pool = unused.length ? unused : list;
  const item = pool[Math.floor(Math.random() * pool.length)];

  // Update used list (avoid uncontrolled growth)
  const nextUsed = unused.length ? usedIds.concat([item.id]) : [item.id];
  setUsed(nextUsed.slice(-2000));
  return item;
}

export async function getVerseBlock() {
  await loadLibraries();
  const used = Store.getUsedVerses();
  const v = pickRotating(STATE.verses, used, (arr) => Store.setUsedVerses(arr));
  if (!v) return '';
  return `${v.text}\nسورة ${v.surah_name} (${v.surah_no}:${v.ayah_no})`;
}

export async function getHadithBlock() {
  await loadLibraries();
  const used = Store.getUsedHadith();
  const h = pickRotating(STATE.hadith, used, (arr) => Store.setUsedHadith(arr));
  if (!h) return '';
  return `${h.text}\nالمصدر: ${h.source}`;
}

export async function getDuaBlock() {
  await loadLibraries();
  const list = Array.isArray(STATE.duas) ? STATE.duas : [];
  if (!list.length) return '';
  const d = list[Math.floor(Math.random() * list.length)];
  // dua.json is optional and short
  return d.text || '';
}

function joinHashtags(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return a.join(' ');
}

function fill(template, vars) {
  return template.replace(/\{([A-Z0-9_]+)\}/g, (_, k) => {
    return (vars[k] !== undefined && vars[k] !== null) ? String(vars[k]) : '';
  });
}

export async function generateShareText(type, vars = {}) {
  await loadLibraries();
  const templates = (STATE.templates && STATE.templates.templates) ? STATE.templates.templates : {};
  const list = Array.isArray(templates[type]) ? templates[type] : [];
  const tpl = list.length ? list[Math.floor(Math.random() * list.length)] : '';

  const programUrl = vars.PROGRAM_URL || getBaseProgramUrl();
  const verse = await getVerseBlock();
  const hadith = await getHadithBlock();
  const dua = await getDuaBlock();

  const filled = fill(tpl, {
    PROGRAM_NAME: STATE.templates.program_name || APP.programName,
    PROGRAM_URL: programUrl,
    QUIZ_URL: vars.QUIZ_URL || programUrl,
    VERSE_BLOCK: verse,
    HADITH_BLOCK: hadith,
    DUA_BLOCK: dua,
    HASHTAGS: joinHashtags(STATE.templates.hashtags),
    NAME: vars.NAME || '',
    DAYS: vars.DAYS || '',
    MINUTES: vars.MINUTES || '',
    FOCUS_1: vars.FOCUS_1 || '',
    FOCUS_2: vars.FOCUS_2 || '',
    GROUP_NAME: vars.GROUP_NAME || '',
    GROUP_URL: vars.GROUP_URL || '',
    SECTION: vars.SECTION || '',
    COUNT: vars.COUNT || '',
    MODEL: vars.MODEL || '',
    DATE: vars.DATE || ''
  });

  return filled.trim();
}

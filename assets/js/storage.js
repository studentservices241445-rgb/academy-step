/*
  أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP
  Storage Layer (LocalStorage)

  Structures:
  - UserProfile
  - Attempts (ResultsHistory)
  - Plans (PlanCache)
  - QuizHistory
*/

export const STORAGE_KEYS = {
  profile: 'ayed_profile',
  lastTestTs: 'ayed_last_full_test_ts',
  lastTestResult: 'ayed_last_full_test_result',
  resultsHistory: 'ayed_results_history',
  currentTestState: 'ayed_current_test_state',
  planCache: 'ayed_plans',
  quizHistory: 'ayed_quiz_history',
  currentQuizState: 'ayed_current_quiz_state',
  usedVerses: 'ayed_used_verses',
  usedHadith: 'ayed_used_hadith',
  faqVotes: 'ayed_faq_votes',
  groupConfig: 'ayed_group_config',
  uiPrefs: 'ayed_ui_prefs'
};

export function now() {
  return Date.now();
}

function safeParse(jsonStr, fallback) {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return fallback;
  }
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export const Store = {
  get(key, fallback = null) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return safeParse(raw, fallback);
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  resetAll() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },

  // Profile
  getProfile() {
    const p = this.get(STORAGE_KEYS.profile, null);
    return isObject(p) ? p : null;
  },
  setProfile(profile) {
    this.set(STORAGE_KEYS.profile, profile);
  },

  // Full test lock/result
  getLastTestTs() {
    const v = localStorage.getItem(STORAGE_KEYS.lastTestTs);
    const n = v ? Number(v) : 0;
    return Number.isFinite(n) ? n : 0;
  },
  setLastTestTs(ts) {
    localStorage.setItem(STORAGE_KEYS.lastTestTs, String(ts));
  },
  getLastTestResult() {
    const r = this.get(STORAGE_KEYS.lastTestResult, null);
    return isObject(r) ? r : null;
  },
  setLastTestResult(result) {
    this.set(STORAGE_KEYS.lastTestResult, result);
  },
  hasCompletedFullTest() {
    return !!this.getLastTestResult();
  },

  // History
  getResultsHistory() {
    const h = this.get(STORAGE_KEYS.resultsHistory, []);
    return Array.isArray(h) ? h : [];
  },
  addResultAttempt(attempt) {
    const h = this.getResultsHistory();
    h.unshift(attempt);
    this.set(STORAGE_KEYS.resultsHistory, h.slice(0, 50));
  },

  // Plans cache (keyed by lastTestTs)
  getPlans() {
    const p = this.get(STORAGE_KEYS.planCache, {});
    return isObject(p) ? p : {};
  },
  savePlan(tsKey, planObj) {
    const p = this.getPlans();
    p[String(tsKey)] = planObj;
    this.set(STORAGE_KEYS.planCache, p);
  },
  getPlan(tsKey) {
    const p = this.getPlans();
    return p[String(tsKey)] || null;
  },

  // Quiz
  getQuizHistory() {
    const h = this.get(STORAGE_KEYS.quizHistory, []);
    return Array.isArray(h) ? h : [];
  },
  addQuizAttempt(attempt) {
    const h = this.getQuizHistory();
    h.unshift(attempt);
    this.set(STORAGE_KEYS.quizHistory, h.slice(0, 80));
  },
  getCurrentQuizState() {
    const s = this.get(STORAGE_KEYS.currentQuizState, null);
    return isObject(s) ? s : null;
  },
  setCurrentQuizState(state) {
    this.set(STORAGE_KEYS.currentQuizState, state);
  },
  clearCurrentQuizState() {
    this.remove(STORAGE_KEYS.currentQuizState);
  },

  // Test state
  getCurrentTestState() {
    const s = this.get(STORAGE_KEYS.currentTestState, null);
    return isObject(s) ? s : null;
  },
  setCurrentTestState(state) {
    this.set(STORAGE_KEYS.currentTestState, state);
  },
  clearCurrentTestState() {
    this.remove(STORAGE_KEYS.currentTestState);
  },

  // Rotation
  getUsedVerses() {
    const v = this.get(STORAGE_KEYS.usedVerses, []);
    return Array.isArray(v) ? v : [];
  },
  setUsedVerses(arr) {
    this.set(STORAGE_KEYS.usedVerses, arr);
  },
  getUsedHadith() {
    const v = this.get(STORAGE_KEYS.usedHadith, []);
    return Array.isArray(v) ? v : [];
  },
  setUsedHadith(arr) {
    this.set(STORAGE_KEYS.usedHadith, arr);
  },

  // FAQ votes
  getFaqVotes() {
    const v = this.get(STORAGE_KEYS.faqVotes, {});
    return isObject(v) ? v : {};
  },
  setFaqVotes(votes) {
    this.set(STORAGE_KEYS.faqVotes, votes);
  },

  // Group config
  getGroupConfig() {
    const v = this.get(STORAGE_KEYS.groupConfig, null);
    return isObject(v) ? v : null;
  },
  setGroupConfig(cfg) {
    this.set(STORAGE_KEYS.groupConfig, cfg);
  },

  // UI prefs
  getUiPrefs() {
    const v = this.get(STORAGE_KEYS.uiPrefs, {});
    return isObject(v) ? v : {};
  },
  setUiPrefs(prefs) {
    this.set(STORAGE_KEYS.uiPrefs, prefs);
  }
};

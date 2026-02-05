/*
  أكاديمية عايد الرسمية — برنامج تحديد مستوى STEP
  Plan Engine: builds plan text + daily table from index_course.json
*/

import { APP, loadJSON, clamp } from './app.js';

function secLabelAr(section) {
  const map = {
    Vocabulary: 'المفردات',
    Grammar: 'القواعد',
    Reading: 'القراءة',
    Listening: 'الاستماع',
    Mixed: 'مختلط'
  };
  return map[section] || section;
}

export function deriveDaysFromProfile(profile) {
  const code = profile && profile.exam_window ? profile.exam_window : 'not_booked';
  const map = {
    lt_24h: 1,
    '3_days': 3,
    '7_days': 7,
    '14_days': 14,
    '30_days': 30,
    not_booked: 20
  };
  return map[code] || 20;
}

export function deriveMinutesFromProfile(profile) {
  const v = profile && profile.minutes_per_day ? Number(profile.minutes_per_day) : 60;
  return clamp(v, 15, 180);
}

function pickTips(days, minutes) {
  const tips = [];
  if (days <= 3) {
    tips.push('باقي وقت قصير — خلّ تركيزك على أعلى عائد: الأضعف عندك + نماذج مختلطة.');
    tips.push('لا تكثر مصادر. جدول واحد + مراجعة الأخطاء — هذا أهم شيء.');
  } else if (days <= 7) {
    tips.push('خطة مركزة: كل يوم قسمين + تطبيق نموذج + مراجعة أخطاء.');
    tips.push('بعد كل كويز: ارجع لنفس الأخطاء ولا تنتقل بسرعة.');
  } else {
    tips.push('خطة تدريجية: فهم + تدريب + نماذج + مراجعات أسبوعية.');
    tips.push('الاستمرارية أهم من الكثرة: 30 دقيقة يوميًا أفضل من 3 ساعات مرة وحدة.');
  }
  if (minutes < 45) tips.push('وقتكم محدود — نختار المهم فقط ونمنع التشتيت.');
  return tips;
}

function levelLabel(overallPercent) {
  if (overallPercent < 40) return 'مبتدئ';
  if (overallPercent < 70) return 'متوسط';
  return 'متقدم';
}

function sortItems(items) {
  return items
    .slice()
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || (a.minutes || 0) - (b.minutes || 0));
}

function groupItemsBySection(items) {
  const g = { Vocabulary: [], Grammar: [], Reading: [], Listening: [], Mixed: [] };
  items.forEach((it) => {
    const s = it.section || 'Mixed';
    if (!g[s]) g[s] = [];
    g[s].push(it);
  });
  Object.keys(g).forEach((k) => (g[k] = sortItems(g[k])));
  return g;
}

function pickNext(list, state, key) {
  const idx = state[key] || 0;
  const item = list[idx % Math.max(1, list.length)];
  state[key] = idx + 1;
  return item;
}

function buildDayItems({ targetMinutes, focusSections, grouped, pickState, day, daysTotal }) {
  const items = [];
  let used = 0;

  const add = (sectionKey) => {
    const list = grouped[sectionKey] || [];
    if (!list.length) return;
    const it = pickNext(list, pickState, sectionKey);
    if (!it) return;
    items.push(it);
    used += it.minutes || 0;
  };

  // Review days
  if (daysTotal >= 10 && day % 5 === 0) {
    const review = (grouped.Mixed || []).find((x) => String(x.id || '').startsWith('WK-REV'));
    if (review) {
      items.push(review);
      used += review.minutes || 0;
    }
  }

  // Focus cycle
  focusSections.forEach((s) => add(s));

  // Add a mixed drill if time allows
  if (used < targetMinutes * 0.75) {
    add('Mixed');
  }

  // Fill remaining time with next focus items
  while (used < targetMinutes * 0.92 && items.length < 4) {
    const s = focusSections[items.length % focusSections.length] || focusSections[0];
    add(s);
    if (used > targetMinutes * 1.12) break;
  }

  return items;
}

export async function generatePlan({ profile, testResult }) {
  const days = deriveDaysFromProfile(profile);
  const minutesPerDay = deriveMinutesFromProfile(profile);

  const breakdown = testResult && testResult.breakdown ? testResult.breakdown : {};
  const overall = testResult && Number.isFinite(testResult.overallPercent) ? testResult.overallPercent : 0;

  const sectionsSorted = ['Vocabulary', 'Grammar', 'Reading', 'Listening']
    .map((s) => ({ s, p: (breakdown[s] && breakdown[s].percent) ? breakdown[s].percent : 0 }))
    .sort((a, b) => a.p - b.p);

  const focus = sectionsSorted.slice(0, 2).map((x) => x.s);

  // Load course index
  const index = await loadJSON(`${APP.dataBase}/index_course.json`);
  const items = Array.isArray(index.items) ? index.items : [];
  const grouped = groupItemsBySection(items);

  const pickState = {};
  const daily = [];

  for (let d = 1; d <= days; d++) {
    const itemsDay = buildDayItems({
      targetMinutes: minutesPerDay,
      focusSections: focus,
      grouped,
      pickState,
      day: d,
      daysTotal: days
    });

    const line = itemsDay.map((it) => {
      const m = it.model_no ? `نموذج ${it.model_no}` : 'مراجعة';
      return `${it.title_ar} (${it.minutes}د • ${m})`;
    });

    const note = (d === 1)
      ? 'ابدأ بهدوء: حل ثم راجع أخطاءك مباشرة.'
      : (d % 5 === 0 && days >= 10)
        ? 'يوم مراجعة: ركّز على أخطاءك أكثر من كمية الحل.'
        : 'بعد كل تدريب: راجع الأخطاء ثم كمّل.';

    daily.push({
      day: d,
      items: itemsDay,
      text: line.join(' \n'),
      note
    });
  }

  const name = profile && profile.name ? profile.name : 'طالبنا';
  const lvl = levelLabel(overall);
  const tips = pickTips(days, minutesPerDay);

  const planText =
    `يا ${name} 🤍\n` +
    `مستواك التدريبي الحالي: ${lvl} (${Math.round(overall)}%).\n` +
    `خلّنا نمشي بخطة واضحة لمدة ${days} يوم — بدون تشتيت.\n\n` +
    `تركيزنا الأساسي: ${secLabelAr(focus[0])} + ${secLabelAr(focus[1])}.\n` +
    `وقتك اليومي: ${minutesPerDay} دقيقة.\n\n` +
    tips.map((t) => `• ${t}`).join('\n');

  const today = daily[0] || null;

  return {
    days,
    minutesPerDay,
    focus,
    planText,
    dailyTable: daily,
    today
  };
}

export { secLabelAr };

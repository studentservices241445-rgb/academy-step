/* Support page */

import { $, APP, showModal, showToast } from './app.js';

function makeTicket() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `AYED-${n}`;
}

function init() {
  const form = $('#supportForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = String($('#s_name').value || '').trim();
    const email = String($('#s_email').value || '').trim();
    const topic = String($('#s_topic').value || '').trim();
    const msg = String($('#s_message').value || '').trim();

    if (!name || !msg) {
      showToast({ title: 'ناقص بيانات', text: 'اكتب الاسم والرسالة.' });
      return;
    }

    const ticket = makeTicket();
    const subject = encodeURIComponent(`دعم البرنامج — ${ticket} — ${topic || 'استفسار'}`);
    const body = encodeURIComponent(
      `الاسم: ${name}\n` +
      (email ? `البريد: ${email}\n` : '') +
      (topic ? `التصنيف: ${topic}\n` : '') +
      `\nالرسالة:\n${msg}\n\n` +
      `رقم التتبع: ${ticket}\n` +
      `—\nأكاديمية عايد الرسمية`
    );

    const mailto = `mailto:${APP.supportEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailto;

    showModal({
      title: 'تم استلام طلبك ✅',
      html: `
        <p>رقم التتبع: <b>${ticket}</b></p>
        <p>مدة الرد المتوقعة: خلال <b>24–48 ساعة</b> (حسب ضغط الرسائل).</p>
        <p class="muted">تم فتح البريد لإرسال الرسالة. إذا ما انفتح، انسخ رقم التتبع وجرّب مرة ثانية.</p>
      `
    });

    form.reset();
  });
}

document.addEventListener('DOMContentLoaded', init);

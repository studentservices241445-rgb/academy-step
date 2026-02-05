// Netlify Function (Backend Proxy) — أكاديمية عايد الرسمية
// مهم: لا تضع مفتاح API داخل الواجهة.
// ضع OPENAI_API_KEY في Environment Variables داخل Netlify.

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // IMPORTANT SECURITY NOTE:
    // Never hardcode secrets. The OpenAI key MUST be provided via environment variables
    // in your hosting provider.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing OPENAI_API_KEY (set it in environment variables)' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    // body example:
    // {
    //   "task": "assistant" | "generate_quiz" | "generate_plan" | "share_text",
    //   "payload": {...}
    // }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        temperature: body.temperature ?? 0.4,
        messages: body.messages || [
          { role: 'system', content: 'You are a helpful assistant for a STEP placement program in Saudi Arabic.' },
          { role: 'user', content: JSON.stringify(body) }
        ]
      })
    });

    const data = await res.json();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: String(e) }) };
  }
};

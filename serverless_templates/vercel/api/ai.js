// Vercel Serverless Function — أكاديمية عايد الرسمية
// ضع OPENAI_API_KEY داخل Vercel Environment Variables.

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // IMPORTANT SECURITY NOTE:
    // Never hardcode secrets. The OpenAI key MUST be provided via Vercel environment variables.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY (set it in Vercel environment variables)' });
      return;
    }

    const body = req.body || {};

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

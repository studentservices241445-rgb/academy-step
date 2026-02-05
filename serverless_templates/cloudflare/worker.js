// Cloudflare Worker — أكاديمية عايد الرسمية
// ضع OPENAI_API_KEY في Secrets:
// wrangler secret put OPENAI_API_KEY

export default {
  async fetch(request, env) {
    try {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      // IMPORTANT SECURITY NOTE:
      // Never hardcode secrets. The OpenAI key MUST be provided via Worker secrets.
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'Missing OPENAI_API_KEY (set it as a Cloudflare Worker secret)' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const body = await request.json().catch(() => ({}));

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

      const data = await r.text();
      return new Response(data, { status: r.status, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
}

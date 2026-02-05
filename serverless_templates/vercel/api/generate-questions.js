// Vercel serverless function to generate multiple‑choice questions using OpenAI.
// Accepts POST requests with a JSON body { topic, n, difficulty, language, model, temperature }.
// Returns a JSON array of questions with options, correct answer letter, and explanation.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  try {
    // IMPORTANT SECURITY NOTE:
    // Never hardcode secrets. The OpenAI key MUST be provided via Vercel environment variables.
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY (set it in Vercel environment variables)' });
      return;
    }
    const { topic = 'general English skills', n = 5, difficulty = 'medium', language = 'Arabic', model = 'gpt-4o-mini', temperature = 0.4 } = req.body || {};
    const count = Math.min(Math.max(parseInt(n), 1), 10);
    const userPrompt = `Generate ${count} multiple‑choice questions with exactly 4 options each on the topic of ${topic}. ` +
      `Difficulty: ${difficulty}. Provide the questions and options in ${language}, and include the correct answer letter and a brief explanation. ` +
      `Format the response as a JSON array of objects with fields: question, options (an array of 4 strings labelled A–D), answer (one of 'A','B','C','D'), and explanation.`;
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: 'You are a test question generator for a STEP placement program. Return only JSON.' },
          { role: 'user', content: userPrompt }
        ]
      })
    });
    const data = await openaiRes.json();
    res.status(openaiRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
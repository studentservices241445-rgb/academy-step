// Netlify Function to dynamically generate multiple-choice questions using OpenAI.
// This endpoint accepts a POST request with a JSON body specifying the topic,
// number of questions (n), difficulty, and an optional language. It returns
// questions in a structured JSON format. DO NOT expose the API key on the client.

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
    const topic = body.topic || 'general English skills';
    const n = Math.min(Math.max(body.n || 5, 1), 10); // limit to 1–10 questions
    const difficulty = body.difficulty || 'medium';
    const language = body.language || 'Arabic';

    // Construct a prompt asking OpenAI to generate multiple‑choice questions.
    const userPrompt = `Generate ${n} multiple‑choice questions with exactly 4 options each on the topic of ${topic}. ` +
      `Difficulty: ${difficulty}. Provide the questions and options in ${language}, and include the correct answer letter and a brief explanation. ` +
      `Format the response as a JSON array of objects with fields: question, options (an array of 4 strings labelled A–D), answer (one of 'A','B','C','D'), and explanation.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        temperature: body.temperature ?? 0.4,
        messages: [
          { role: 'system', content: 'You are a test question generator for a STEP placement program. Return only JSON.' },
          { role: 'user', content: userPrompt }
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
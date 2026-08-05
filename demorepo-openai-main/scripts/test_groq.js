async function test() {
  const GROQ_API_KEY = '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';
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 10
      })
    });
    console.log('Status:', response.status);
    console.log('OK:', response.ok);
    const text = await response.text();
    console.log('Response text:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();

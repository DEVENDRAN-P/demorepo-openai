/**
 * Vercel Serverless Function - Chat API
 * Handles Groq API calls securely from the backend
 * Frontend never sees the API key
 */

const Groq = require("groq-sdk").default;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, model = "llama-3.3-70b-versatile", temperature = 0.7, max_tokens = 1024 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set");
      return res.status(500).json({ error: "API key not configured" });
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false,
    });

    return res.status(200).json({
      success: true,
      content: completion.choices[0]?.message?.content || "",
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error) {
    console.error("Groq API Error:", error);
    
    if (error.status === 401) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    
    if (error.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    return res.status(500).json({
      error: error.message || "Failed to process chat request",
    });
  }
}

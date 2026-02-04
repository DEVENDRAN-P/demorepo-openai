/**
 * Vercel Serverless Function - Extract Bill Data with AI
 * Handles Groq API calls for invoice extraction securely from the backend
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
    const { ocrText, hints = {} } = req.body;

    if (!ocrText) {
      return res.status(400).json({ error: "OCR text is required" });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set");
      return res.status(500).json({ error: "API key not configured" });
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const systemPrompt = `You are an expert Indian GST invoice extraction AI trained to handle camera-captured invoices with varied quality.
You receive:
1) RAW_OCR_TEXT (may be noisy or partial from camera capture)
2) LOCAL_HINTS (a preliminary numeric guess object)

EXTRACTION RULES:
- Use LOCAL_HINTS as a strong starting point. If hints provide non-zero amount/taxPercent, prefer those over guessing.
- Search for any visible numbers that could be: subtotal, total, amount, CGST, SGST, IGST.
- VALID GST RATES: 5, 12, 18, 28. Snap to nearest if unsure.
- If you find any plausible numeric amount >= 100, use it as 'amount' (not zero).
- Derive taxAmount = amount × (taxPercent / 100)
- totalAmount = amount + taxAmount
- extractionConfidence: "high" (clear data), "medium" (reasonable guess), "low" (very uncertain)

RETURN ONLY VALID JSON - NO MARKDOWN, NO EXPLANATION:
{
  "invoiceNumber": "string|null",
  "date": "YYYY-MM-DD|null",
  "vendor": "string|null",
  "amount": number,
  "taxPercent": 5|12|18|28|0,
  "taxAmount": number,
  "totalAmount": number,
  "category": "string",
  "expenseType": "string",
  "extractionConfidence": "high|medium|low",
  "taxBreakdown": { "cgst": number|null, "sgst": number|null, "igst": number|null }
}`;

    const hintsJSON = JSON.stringify(hints);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `RAW_OCR_TEXT:\n${ocrText}\n\nLOCAL_HINTS:\n${hintsJSON}\n\nReturn final JSON only.`,
        },
      ],
      temperature: 0.05,
      max_tokens: 1400,
    });

    const responseContent = completion.choices[0]?.message?.content || "";

    // Parse JSON from response
    let jsonMatch = responseContent.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) jsonMatch = responseContent.match(/```([\s\S]*?)```/);
    if (!jsonMatch) jsonMatch = responseContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(400).json({
        error: "Could not parse extraction response",
        raw: responseContent,
      });
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const extracted = JSON.parse(jsonStr);

    return res.status(200).json({
      success: true,
      data: extracted,
      confidence: extracted.extractionConfidence,
    });
  } catch (error) {
    console.error("Extraction API Error:", error);

    if (error.status === 401) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    if (error.status === 429) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    return res.status(500).json({
      error: error.message || "Failed to extract invoice data",
    });
  }
}

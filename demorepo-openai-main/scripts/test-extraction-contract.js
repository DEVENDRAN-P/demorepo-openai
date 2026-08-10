/* Verify the invoice_extraction input contract without needing live secrets:
   - empty input -> 400 INVALID_INPUT (the reported bug surface)
   - string data-URL image -> input accepted, proceeds to Gemini (503 AI_MISSING_KEY here since no key)
   - ocrText -> input accepted, proceeds to Gemini
*/
const handlers = require("../lib/aiTasks");
const handleInvoiceExtraction = handlers.invoice_extraction;

function expect(status, code, label) {
  console.log(`${label}: ${status} ${code} ${status === 400 && code === "INVALID_INPUT" ? "(PASS)" : ""}`);
}

(async () => {
  // Case 1: nothing provided -> must throw 400 INVALID_INPUT BEFORE hitting Gemini
  try {
    await handleInvoiceExtraction({ business: {} });
    console.log("CASE1 empty input: FAIL (no error thrown)");
  } catch (e) {
    expect(e.status, e.code, "CASE1 empty input");
  }

  // Case 2: string data-URL image -> parsing must succeed and reach Gemini
  try {
    const fakeB64 = Buffer.from("fakeimage").toString("base64");
    await handleInvoiceExtraction({ image: `data:image/png;base64,${fakeB64}`, business: {} });
    console.log("CASE2 string image: FAIL (no error — unexpected success)");
  } catch (e) {
    console.log(
      `CASE2 string data-URL image: ${e.status} ${e.code} ` +
        (e.code === "AI_MISSING_KEY" || e.code === "AI_RATE_LIMITED" || e.code === "AI_SERVICE_ERROR"
          ? "(PASS — input parsed, reached Gemini)"
          : `(UNEXPECTED: ${e.message})`)
    );
  }

  // Case 3: object-form image { data, mimeType } -> must parse and reach Gemini
  try {
    const fakeB64 = Buffer.from("fakeimage").toString("base64");
    await handleInvoiceExtraction({ image: { data: fakeB64, mimeType: "image/jpeg" }, business: {} });
    console.log("CASE3 object image: FAIL (no error — unexpected success)");
  } catch (e) {
    console.log(
      `CASE3 object image: ${e.status} ${e.code} ` +
        (e.code === "AI_MISSING_KEY" || e.code === "AI_RATE_LIMITED" || e.code === "AI_SERVICE_ERROR"
          ? "(PASS — input parsed, reached Gemini)"
          : `(UNEXPECTED: ${e.message})`)
    );
  }

  // Case 4: ocrText -> must parse and reach Gemini
  try {
    await handleInvoiceExtraction({ ocrText: "INV-1001 supplier ABC 33ABCDE1234F1Z5 amount 1000 tax 180 total 1180", business: {} });
    console.log("CASE4 ocrText: FAIL (no error — unexpected success)");
  } catch (e) {
    console.log(
      `CASE4 ocrText: ${e.status} ${e.code} ` +
        (e.code === "AI_MISSING_KEY" || e.code === "AI_RATE_LIMITED" || e.code === "AI_SERVICE_ERROR"
          ? "(PASS — input parsed, reached Gemini)"
          : `(UNEXPECTED: ${e.message})`)
    );
  }
})();

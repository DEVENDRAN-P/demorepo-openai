/**
 * Centralized feature flags for GST Buddy.
 *
 * The app is designed to run completely WITHOUT Firebase Cloud Storage:
 * invoices are processed entirely in browser memory (Tesseract OCR + the
 * server-side Gemini endpoint) and only structured metadata is persisted to
 * Firestore. No storage bucket, no billing upgrade, no CORS setup required.
 *
 * Optional future document archiving (uploading the original file to a
 * Firebase Storage bucket) is isolated behind ENABLE_DOCUMENT_STORAGE.
 * Default: false. Set REACT_APP_ENABLE_DOCUMENT_STORAGE=true in .env to
 * re-enable it (a bucket + storage rules + CORS are then required).
 */
export const ENABLE_DOCUMENT_STORAGE =
  process.env.REACT_APP_ENABLE_DOCUMENT_STORAGE === "true";

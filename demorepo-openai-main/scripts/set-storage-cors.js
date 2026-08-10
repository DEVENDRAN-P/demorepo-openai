/**
 * One-off script: set CORS rules on the Firebase Storage bucket so browser
 * uploads (firebase/storage SDK) work from localhost and Vercel.
 *
 * Uses the service-account credentials already in .env
 * (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) —
 * no gcloud/gsutil installation required.
 *
 * Run from the project root:
 *   node scripts/set-storage-cors.js
 */
require("dotenv").config();

const admin = require("firebase-admin");
const { getApps, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "finalopenai-fc9c5";

// Bucket names are "<projectId>.appspot.com" by default; allow override.
const bucketName =
  process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

if (getApps().length === 0) {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKey) {
    console.error(
      "❌ FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY missing from .env — cannot authenticate."
    );
    process.exit(1);
  }
  admin.initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

const CORS_CONFIG = [
  {
    // Allow browser uploads from local dev and any Vercel/Firebase-hosted
    // domain. CORS does not bypass storage security rules — read/write is
    // still enforced by storage.rules.
    origin: ["*"],
    method: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
    responseHeader: ["*"],
    maxAgeSeconds: 3600,
  },
];

async function main() {
  const bucket = getStorage().bucket(bucketName);
  console.log(`🔧 Setting CORS on gs://${bucketName} ...`);
  await bucket.setCorsConfiguration(CORS_CONFIG);
  console.log("✅ CORS configuration applied!");

  const [metadata] = await bucket.getMetadata();
  console.log("📋 Current CORS config on bucket:");
  console.log(JSON.stringify(metadata.cors || [], null, 2));
}

main().catch((err) => {
  console.error("❌ Failed to set CORS:", err.message);
  if (err.code === 403 || err.code === 401) {
    console.error(
      "   The service account in .env lacks storage permission, or the key is invalid."
    );
  }
  process.exit(1);
});

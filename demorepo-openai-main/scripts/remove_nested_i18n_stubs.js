/**
 * Remove nested English-stub objects from the locale files.
 *
 * A translation script added flat dot-notation keys WITH real translations
 * (e.g. "agent_activity.title": "AI एजेंट गतिविधि") AND nested stub objects
 * (e.g. "agent_activity": { "title": "Title", ... }) full of English
 * placeholders. i18next resolves "agent_activity.title" through the nested
 * object first, so every language was showing English stubs, and calls like
 * t('agent_activity') / t('pricing') returned an OBJECT instead of a string
 * (React error: "key 'x' returned an object instead of string").
 *
 * Every nested key has an exact flat equivalent (verified), so deleting the
 * nested objects is lossless: dotted lookups fall through to the flat keys.
 */
const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "src", "i18n", "locales");
const LANGUAGES = ["en", "hi", "ta", "ml", "kn"];
// Nested objects that duplicate (and shadow) flat dot-notation keys.
const STUB_KEYS = ["support", "chat", "pricing", "agent_activity", "ai_finance", "forgot_password", "auth"];

let changed = false;
for (const lang of LANGUAGES) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);

  let removed = [];
  for (const key of STUB_KEYS) {
    if (data[key] && typeof data[key] === "object" && !Array.isArray(data[key])) {
      delete data[key];
      removed.push(key);
    }
  }

  if (removed.length === 0) {
    console.log(`${lang}: no stub objects found (skip)`);
    continue;
  }

  const out = JSON.stringify(data, null, 2) + "\n";
  if (out !== raw) {
    fs.writeFileSync(file, out, "utf8");
    changed = true;
  }
  console.log(`${lang}: removed ${removed.join(", ")}`);
}

if (!changed) {
  console.log("No changes were made.");
}

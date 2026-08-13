/**
 * verify_langs.js
 * ---------------
 * Validates that all i18n locale files (en, hi, ta, ml, kn) are perfectly in
 * sync:
 *   1. Every key path present in one language must exist in ALL languages
 *      (works for flat and nested structures — paths are flattened with '.').
 *   2. No key may hold an empty string (placeholder that was never translated).
 *   3. Value types must match across languages (string vs array vs object).
 *   4. Every `t('key')` literal referenced in source (src/**) must exist in
 *      en.json — catches typos that would otherwise silently render raw keys.
 *
 * Exits with code 1 when any issue is found, so it can run in CI / pre-push.
 *
 * Usage: node verify_langs.js
 */
const fs = require('fs');
const path = require('path');

const languages = ['en', 'hi', 'ta', 'ml', 'kn'];
const localesPath = path.join(__dirname, 'src', 'i18n', 'locales');

// Flatten an object into an array of { path, type } records. Arrays are treated
// as values (type 'array') — we do NOT descend into array indices, because that
// would explode when arrays legitimately differ in length across languages.
function flatten(obj, prefix = '', out = []) {
  for (const key of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    const v = obj[key];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, p, out);
    } else if (Array.isArray(v)) {
      out.push({ path: p, type: 'array', value: v });
    } else {
      out.push({ path: p, type: typeof v, value: v });
    }
  }
  return out;
}

console.log('\n=== LANGUAGE FILE VERIFICATION ===\n');

const data = {};
const flat = {};
for (const lang of languages) {
  const filePath = path.join(localesPath, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing locale file: ${filePath}`);
    process.exit(1);
  }
  data[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  flat[lang] = flatten(data[lang]);
  const byPath = new Map(flat[lang].map((r) => [r.path, r]));
  flat[lang].byPath = byPath;
  console.log(`${lang.toUpperCase()}: ${flat[lang].length} keys`);
}

// ---- 1. Key parity ---------------------------------------------------------
const allPaths = new Set();
Object.values(flat).forEach((f) => f.forEach((r) => allPaths.add(r.path)));

let hasIssues = false;
const missingByLang = {};
for (const lang of languages) {
  missingByLang[lang] = [];
  for (const p of allPaths) {
    if (!flat[lang].byPath.has(p)) missingByLang[lang].push(p);
  }
}

console.log('\n=== CHECKING FOR MISSING KEYS ===\n');
const totalKeys = allPaths.size;
console.log(`Total unique key paths: ${totalKeys}`);
for (const lang of languages) {
  const missing = missingByLang[lang];
  if (missing.length > 0) {
    hasIssues = true;
    console.log(`❌ ${lang}.json is missing ${missing.length} key(s):`);
    missing.slice(0, 20).forEach((k) => console.log(`   - ${k}`));
    if (missing.length > 20) console.log(`   ... and ${missing.length - 20} more`);
  }
}
if (!hasIssues) console.log('✅ All language files have identical key paths.');

// ---- 2. Empty values -------------------------------------------------------
console.log('\n=== CHECKING FOR EMPTY / UNTRANSLATED VALUES ===\n');
let emptyCount = 0;
for (const lang of languages) {
  const empties = flat[lang].filter(
    (r) => (r.type === 'string' || r.type === 'number') && String(r.value).trim() === ''
  );
  if (empties.length > 0) {
    hasIssues = true;
    emptyCount += empties.length;
    console.log(`❌ ${lang}.json has ${empties.length} empty value(s):`);
    empties.slice(0, 15).forEach((r) => console.log(`   - ${r.path}`));
    if (empties.length > 15) console.log(`   ... and ${empties.length - 15} more`);
  }
}
if (emptyCount === 0) console.log('✅ No empty values found.');

// ---- 3. Type parity ----------------------------------------------------------
console.log('\n=== CHECKING VALUE TYPES ===\n');
let typeIssues = 0;
for (const p of allPaths) {
  const types = new Set();
  for (const lang of languages) {
    const r = flat[lang].byPath.get(p);
    if (r) types.add(r.type);
  }
  if (types.size > 1) {
    hasIssues = true;
    typeIssues++;
    const detail = languages
      .map((l) => `${l}:${flat[l].byPath.get(p)?.type}`)
      .join('  ');
    console.log(`⚠️  Type mismatch at "${p}": ${detail}`);
  }
}
if (typeIssues === 0) console.log('✅ Value types match across all languages.');

// ---- 4. Source key coverage --------------------------------------------------
console.log('\n=== CHECKING SOURCE KEYS EXIST IN EN.JSON ===\n');
const srcDir = path.join(__dirname, 'src');
const enKeys = new Set(flat.en.map((r) => r.path));
const missingKeys = new Set();
const keyUsages = new Map(); // key -> set of files using it

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.[jt]sx?$/.test(entry.name) && !entry.name.endsWith('.test.js')) {
      const content = fs.readFileSync(full, 'utf8');
      // Match t('key') with dot paths; allow template interpolation as fallback
      const re = /\bt\(\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        const key = m[1];
        if (key.includes('.')) {
          if (!enKeys.has(key)) missingKeys.add(key);
          if (!keyUsages.has(key)) keyUsages.set(key, new Set());
          keyUsages.get(key).add(full.replace(__dirname + path.sep, ''));
        }
      }
    }
  }
}
walk(srcDir);

if (missingKeys.size > 0) {
  hasIssues = true;
  const sorted = [...missingKeys].sort();
  console.log(`❌ ${sorted.length} key(s) used in source but missing from en.json:`);
  sorted.slice(0, 25).forEach((k) => {
    const files = [...(keyUsages.get(k) || [])].slice(0, 2).join(', ');
    console.log(`   - ${k}  (used in: ${files})`);
  });
  if (sorted.length > 25) console.log(`   ... and ${sorted.length - 25} more`);
} else {
  console.log(`✅ All ${enKeys.size} keys referenced in source exist in en.json.`);
}

// ---- Summary ----------------------------------------------------------------
console.log('\n=== VERIFICATION COMPLETE ===\n');
if (hasIssues) {
  console.log('❌ Issues found. Fix the errors above before shipping.');
  process.exit(1);
}
console.log(
  `✅ All ${languages.length} language files are in sync — ${totalKeys} keys each, no empty values, matching types.`
);
if (!hasIssues) console.log('✅ Source key coverage verified.');
process.exit(0);

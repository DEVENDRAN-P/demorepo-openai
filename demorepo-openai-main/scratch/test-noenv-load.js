/* Reproduce Vercel's crash: load the api modules WITHOUT the server-side
 * env vars (FIREBASE_*, GEMINI_*, CRON_*) to confirm which module load
 * fails, exactly like the production deployment missing env vars. */
// Strip the env vars that are missing on Vercel
const removePrefixes = ["FIREBASE_", "GEMINI_", "CRON_"];
for (const key of Object.keys(process.env)) {
  if (removePrefixes.some((p) => key.startsWith(p))) delete process.env[key];
}

const mods = ["billing", "ai", "agent", "email", "health"];
for (const m of mods) {
  try {
    require(`../api/${m}`);
    console.log(`${m}.js: loads OK without env vars`);
  } catch (e) {
    console.log(`${m}.js: LOAD FAILED -> ${(e.message || e).toString().slice(0, 200)}`);
  }
}

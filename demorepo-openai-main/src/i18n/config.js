import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ta from "./locales/ta.json";
import ml from "./locales/ml.json";
import kn from "./locales/kn.json";

const SUPPORTED_LANGS = ["en", "ta", "hi", "ml", "kn"];

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem("language");
    return saved && SUPPORTED_LANGS.includes(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

// Helper function to clean up raw underscore variable names into natural text
function cleanKeyName(key) {
  if (!key || typeof key !== "string") return key;
  // Extract last segment if dot-notated (e.g. "agent_activity.title" -> "title")
  const text = key.includes(".") ? key.split(".").pop() : key;
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const initialLng = getSavedLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta },
    ml: { translation: ml },
    kn: { translation: kn },
  },
  lng: initialLng,
  fallbackLng: "en",
  ns: ["translation"],
  defaultNS: "translation",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
    transEmptyNodeValue: "",
    transSupportBasicHtmlNodes: true,
  },
  // Format missing keys cleanly so underscores never appear in the UI
  parseMissingKeyHandler: (key, defaultValue) => {
    if (defaultValue && defaultValue !== key) return defaultValue;
    return cleanKeyName(key);
  },
  // Enable event listeners for language change
  detection: {
    order: ["localStorage"],
    caches: ["localStorage"],
  },
});

// Listen to language changes and save to localStorage
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
  document.documentElement.lang = lng;
});

// Change-language helper: switch locale cleanly
i18n.changeLanguageAsync = async (lng) => {
  if (!SUPPORTED_LANGS.includes(lng)) lng = "en";
  await i18n.changeLanguage(lng);
};

export default i18n;

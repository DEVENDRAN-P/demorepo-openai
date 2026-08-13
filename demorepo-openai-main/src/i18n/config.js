import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ta from "./locales/ta.json";
import hi from "./locales/hi.json";
import ml from "./locales/ml.json";
import kn from "./locales/kn.json";

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
  ml: { translation: ml },
  kn: { translation: kn },
};

// Helper function to clean up raw underscore variable names into natural text
function cleanKeyName(key) {
  if (!key || typeof key !== "string") return key;
  // Extract last segment if dot-notated (e.g. "agent_activity.title" -> "title")
  const text = key.includes(".") ? key.split(".").pop() : key;
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("language") || "en",
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

export default i18n;


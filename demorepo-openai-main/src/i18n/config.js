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

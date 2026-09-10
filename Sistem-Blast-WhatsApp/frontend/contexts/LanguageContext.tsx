"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

import id from "../locales/id.json";
import zh from "../locales/zh.json";

const dictionaries: any = { id, zh };

type Language = "id" | "zh";

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps>({
  language: "id",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("id");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang && ["id", "zh"].includes(savedLang)) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string) => {
    return dictionaries[language]?.[key] || key;
  };

  if (!mounted) {
    // Render without translations until mounted to avoid hydration mismatch
    return (
      <LanguageContext.Provider value={{ language: "id", setLanguage, t: (k) => id[k as keyof typeof id] || k }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

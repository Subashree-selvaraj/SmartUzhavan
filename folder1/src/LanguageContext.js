import React, { createContext, useState, useEffect, useContext } from "react";

export const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {}
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("language") || "en");

  useEffect(() => {
    localStorage.setItem("language", lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Add this hook:
export function useLanguage() {
  return useContext(LanguageContext);
}
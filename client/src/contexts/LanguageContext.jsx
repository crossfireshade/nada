import React, { createContext, useState, useEffect, useCallback } from 'react'
import i18n from '../i18n'

export const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('i18nextLng') || 'fr'
  )

  useEffect(() => {
    applyLanguage(language)
  }, [language])

  function applyLanguage(lang) {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang)
  }

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'fr' ? 'ar' : 'fr'))
  }, [])

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, changeLanguage, isRTL: language === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  )
}

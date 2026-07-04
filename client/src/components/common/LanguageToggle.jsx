import React from 'react'
import { useLanguage } from '../../hooks/useLanguage'

export default function LanguageToggle({ className = '' }) {
  const { language, toggleLanguage } = useLanguage()

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors ${className}`}
      title={language === 'fr' ? 'Switch to Arabic' : 'Passer au français'}
    >
      <span className={language === 'ar' ? 'text-primary font-bold' : 'text-slate-400 dark:text-slate-500'}>ع</span>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <span className={language === 'fr' ? 'text-primary font-bold' : 'text-slate-400 dark:text-slate-500'}>FR</span>
    </button>
  )
}

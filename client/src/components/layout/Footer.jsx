import React from 'react'

export default function Footer() {
  return (
    <footer className="h-10 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-700 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
      © {new Date().getFullYear()} Radio Monastir — إذاعة المنستير
    </footer>
  )
}

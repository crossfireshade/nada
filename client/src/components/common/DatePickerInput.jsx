import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useLanguage } from '../../hooks/useLanguage'

const MONTH_NAMES = {
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
}
const DAY_NAMES = {
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  ar: ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'],
}

const POPUP_WIDTH = 288  // w-72 = 18rem = 288px
const POPUP_HEIGHT = 320 // approximate popup height

function calcPos(buttonEl) {
  const rect = buttonEl.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isRTL = document.documentElement.dir === 'rtl'

  // Horizontal: in RTL right-align popup with button's right edge
  let left = isRTL ? rect.right - POPUP_WIDTH : rect.left
  if (left + POPUP_WIDTH > viewportWidth) left = viewportWidth - POPUP_WIDTH - 8
  if (left < 8) left = 8

  // Vertical: prefer above, fallback to below if not enough space
  const top = rect.top >= POPUP_HEIGHT + 14
    ? rect.top - POPUP_HEIGHT - 6
    : rect.bottom + 6
  return { top, left }
}

export default function DatePickerInput({ value, onChange, placeholder, disabled = false, variant = 'default' }) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => value ? new Date(value + 'T00:00:00') : new Date())
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const popupRef = useRef(null)

  const monthNames = MONTH_NAMES[language] || MONTH_NAMES.fr
  const dayNames = DAY_NAMES[language] || DAY_NAMES.fr

  useEffect(() => {
    function handleOutsideClick(e) {
      const clickedInsideButton = ref.current && ref.current.contains(e.target)
      const clickedInsidePopup = popupRef.current && popupRef.current.contains(e.target)
      if (!clickedInsideButton && !clickedInsidePopup) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Keep popup anchored to the button when any scrollable container scrolls
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (ref.current) setPopupPos(calcPos(ref.current))
    }
    // capture:true catches scroll from ANY ancestor (including overflow-auto containers)
    document.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      document.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (value) setViewDate(new Date(value + 'T00:00:00'))
  }, [value])

  const monthStart = startOfMonth(viewDate)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(viewDate) })
  // Monday-based week: getDay returns 0=Sun, convert so Mon=0
  const startWeekday = (getDay(monthStart) + 6) % 7
  const today = new Date()
  const selected = value ? new Date(value + 'T00:00:00') : null

  const handleDay = (day) => {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleToday = () => {
    onChange(format(today, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleToggle = () => {
    if (disabled) return
    if (!open && ref.current) {
      setPopupPos(calcPos(ref.current))
    }
    setOpen(v => !v)
  }

  const isLight = variant === 'light'
  const isInline = variant === 'light-inline'
  const needsCard = !isLight && !isInline

  const buttonClass = isLight
    ? 'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/30 bg-white/20 text-sm text-white hover:bg-white/30 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
    : isInline
      ? 'flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-sm text-slate-600 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-slate-600 dark:text-slate-300 hover:border-sky-400 dark:hover:border-sky-500 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'

  const popup = open ? ReactDOM.createPortal(
    <div
      ref={popupRef}
      style={{ top: popupPos.top, left: popupPos.left }}
      className="fixed z-[99999] bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-2xl shadow-2xl p-4 w-72"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(prev => subMonths(prev, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </button>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(prev => addMonths(prev, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-1.5 font-semibold uppercase tracking-wide">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startWeekday }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map(day => {
          const isToday = isSameDay(day, today)
          const isSelected = selected && isSameDay(day, selected)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDay(day)}
              className={`w-8 h-8 mx-auto flex items-center justify-center text-xs rounded-full transition-all duration-150
                ${isSelected
                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-200 dark:shadow-sky-900/40'
                  : isToday
                    ? 'ring-2 ring-sky-400 text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600'
                }`}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => { onChange(''); setOpen(false) }}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
        >
          {t('common.clear') || 'Effacer'}
        </button>
        <button
          type="button"
          onClick={handleToday}
          className="text-xs text-sky-500 hover:text-sky-600 transition-colors font-semibold"
        >
          {t('common.today') || "Aujourd'hui"}
        </button>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className={`relative ${needsCard ? 'bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-3 w-fit' : ''}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={buttonClass}
      >
        <CalendarIcon className={`h-4 w-4 ${isLight ? 'text-white/80' : 'text-sky-500'}`} />
        <span>{value ? format(new Date(value + 'T00:00:00'), 'dd/MM/yyyy') : (placeholder || t('guides.filterByDate'))}</span>
        {value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange('') } }}
            className={`${isLight ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-red-500'} transition-colors`}
            aria-label={t('guides.clearFilter')}
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      {popup}
    </div>
  )
}

import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDaysIcon, ClockIcon, XMarkIcon, FunnelIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline'
import DatePickerInput from './DatePickerInput'
import { format } from 'date-fns'

function TimeTextInput({ value, onChange, placeholder }) {
  const mmRef = useRef(null)
  const parts = (value || '').split(':')
  const hh = parts[0] || ''
  const mm = parts[1] || ''

  const handleHH = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${v}:${mm}`)
    if (v.length === 2) mmRef.current?.focus()
  }
  const handleMM = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${hh}:${v}`)
  }

  const inputCls = 'w-9 text-center text-sm font-mono bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg focus:border-cyan-400 focus:ring-1 focus:ring-cyan-300 focus:outline-none dark:text-white px-1 py-2 transition-all'

  return (
    <div dir="ltr" className="flex items-center gap-0.5 px-2 py-1 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700">
      <ClockIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 me-1" />
      <input type="text" inputMode="numeric" maxLength={2} value={hh} onChange={handleHH} placeholder="HH" className={inputCls} />
      <span className="text-cyan-500 font-bold text-base leading-none select-none">:</span>
      <input ref={mmRef} type="text" inputMode="numeric" maxLength={2} value={mm} onChange={handleMM} placeholder="MM" className={inputCls} />
    </div>
  )
}

/**
 * DateTimeRangeFilter
 * Props:
 *   dateValue    – 'yyyy-MM-dd' string or ''
 *   onDateChange – (v: string) => void
 *   timeFrom     – 'HH:MM' string or ''
 *   timeTo       – 'HH:MM' string or ''
 *   onTimeFromChange – (v: string) => void
 *   onTimeToChange   – (v: string) => void
 *   onClear      – () => void
 */
export default function DateTimeRangeFilter({
  dateValue, onDateChange,
  timeFrom, timeTo,
  onTimeFromChange, onTimeToChange,
  onClear,
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const hasFilter = !!dateValue || !!timeFrom || !!timeTo
  const activeCount = [dateValue, timeFrom, timeTo].filter(Boolean).length

  const formatTimeSummary = () => {
    const arrow = i18n.language === 'ar' ? '←' : '→'
    if (timeFrom && timeTo) return `${timeFrom} ${arrow} ${timeTo}`
    if (timeFrom) return `${i18n.language === 'ar' ? 'من ' : 'à partir de '}${timeFrom}`
    if (timeTo) return `${i18n.language === 'ar' ? 'حتى ' : "jusqu'à "}${timeTo}`
    return null
  }

  const dateSummary = dateValue
    ? format(new Date(dateValue + 'T00:00:00'), 'dd/MM/yyyy')
    : null
  const timeSummary = formatTimeSummary()

  return (
    <div className="space-y-3">
      {/* ── Trigger button ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`
            inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold
            border transition-all duration-200 select-none
            ${open || hasFilter
              ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200/40 dark:shadow-teal-900/30'
              : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-300 hover:border-teal-400 hover:text-teal-600 dark:hover:border-teal-500 dark:hover:text-teal-400'
            }
          `}
        >
          <FunnelIcon className="h-4 w-4" />
          <span>{t('common.filter') || 'Filtrer'}</span>
          {hasFilter && (
            <span className={`
              flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-bold
              ${open || hasFilter ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'}
            `}>
              {activeCount}
            </span>
          )}
          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Active filter chips */}
        {hasFilter && (
          <div className="flex items-center gap-2 flex-wrap">
            {dateSummary && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700/50">
                <CalendarDaysIcon className="h-3 w-3" />
                {dateSummary}
              </span>
            )}
            {timeSummary && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700/50">
                <ClockIcon className="h-3 w-3" />
                {timeSummary}
              </span>
            )}
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all duration-150"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              {t('guides.clearFilter') || 'Effacer'}
            </button>
          </div>
        )}
      </div>

      {/* ── Expandable filter panel ── */}
      <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-2xl p-5 shadow-lg shadow-slate-100/60 dark:shadow-gray-900/40">

          <div className="flex flex-wrap gap-6 items-end">

            {/* ── Date picker ── */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <CalendarDaysIcon className="h-3.5 w-3.5 text-teal-500" />
                {t('entryPermissions.date') || 'Date'}
              </label>
              <DatePickerInput
                value={dateValue}
                onChange={onDateChange}
                placeholder={t('guides.filterByDate') || 'Choisir une date'}
                variant="light-inline"
              />
            </div>

            {/* ── Divider ── */}
            <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-gray-600 self-end mb-0.5" />

            {/* ── Time range ── */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <ClockIcon className="h-3.5 w-3.5 text-cyan-500" />
                {t('entryPermissions.timeInterval') || 'Intervalle horaire'}
              </label>
              <div className="flex items-center gap-2">
                {/* From */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wide">{t('guides.startTime')}</span>
                  <TimeTextInput value={timeFrom} onChange={onTimeFromChange} placeholder="00:00" />
                </div>

                {/* Connector */}
                <span className="text-slate-400 dark:text-slate-500 font-bold text-base mt-4">{i18n.language === 'ar' ? '←' : '→'}</span>

                {/* To */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wide">{t('guides.endTime')}</span>
                  <TimeTextInput value={timeTo} onChange={onTimeToChange} placeholder="23:59" />
                </div>

                {/* Clear time only */}
                {(timeFrom || timeTo) && (
                  <button
                    type="button"
                    onClick={() => { onTimeFromChange(''); onTimeToChange('') }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Effacer l'heure"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Time hint */}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {t('entryPermissions.timeIntervalHint') || 'Filtre sur l\'heure de début du programme'}
              </p>
            </div>

            {/* ── Close button ── */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ms-auto self-end mb-0.5 px-4 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm shadow-teal-200/40 dark:shadow-teal-900/30"
            >
              {t('common.apply') || 'Appliquer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { getBlacklist } from '../guides/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  NoSymbolIcon, TrophyIcon, FunnelIcon, PrinterIcon,
  PhoneIcon, GiftIcon, CalendarDaysIcon, IdentificationIcon,
  XMarkIcon, ExclamationTriangleIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function BlacklistPage() {
  const { t, i18n } = useTranslation()
  const { addNotification } = useNotifications()
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [nameSearch, setNameSearch] = useState('')
  const debounceRef = useRef(null)

  const fetchData = async (name, from, to) => {
    setLoading(true)
    try {
      const params = {}
      if (name) params.name = name
      if (from) params.dateFrom = from
      if (to) params.dateTo = to
      const res = await getBlacklist(params)
      setWinners(res.data?.data || [])
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(nameSearch, dateFrom, dateTo) }, [dateFrom, dateTo])

  const handleNameChange = (val) => {
    setNameSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchData(val, dateFrom, dateTo), 350)
  }

  const clearAll = () => {
    setDateFrom(''); setDateTo(''); setNameSearch('')
    fetchData('', '', '')
  }

  const hasFilter = dateFrom || dateTo || nameSearch

  return (
    <div className="space-y-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-700 shadow-lg shadow-red-200/40 dark:shadow-red-900/30 print:hidden">
        {/* decorative blobs */}
        <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute top-4 left-1/2 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
              <NoSymbolIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t('winners.blacklistTitle')}</h1>
              <p className="text-sm text-red-100/80 mt-0.5">{t('winners.blacklistSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <div className="px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-center">
                <p className="text-2xl font-bold text-white leading-none">{winners.length}</p>
                <p className="text-[10px] text-red-100/80 mt-0.5">{t('winners.blacklistTitle')}</p>
              </div>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-semibold transition-all active:scale-95"
            >
              <PrinterIcon className="h-4 w-4" />
              {t('guides.exportPdf')}
            </button>
          </div>
        </div>
      </div>

      {/* Print title */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b-2 border-red-200 pb-4 mb-4" dir="ltr">
          <img src="/assets/logo-main.png" alt="Radio Monastir" className="h-14 object-contain" />
          <div className="text-end">
            <h1 className="text-2xl font-bold text-slate-800">{t('winners.blacklistTitle')}</h1>
            {hasFilter && (
              <p className="text-sm text-slate-500 mt-1">
                {dateFrom && `${t('common.from')} ${dateFrom}`} {dateTo && `${t('common.to')} ${dateTo}`}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm print:hidden">
        <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <FunnelIcon className="h-4 w-4" />
            <span className="text-sm font-semibold">{t('common.filter')}</span>
          </div>
          <div className="w-px h-5 bg-slate-200 dark:bg-gray-600" />
          {/* Name search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={nameSearch}
              onChange={e => handleNameChange(e.target.value)}
              placeholder={t('winners.searchByName')}
              className="ps-8 pe-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 w-44"
            />
          </div>
          <div className="w-px h-5 bg-slate-200 dark:bg-gray-600" />
          {/* Date filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('common.from')}</span>
            <DatePickerInput value={dateFrom} onChange={setDateFrom} variant="light-inline" />
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('common.to')}</span>
            <DatePickerInput value={dateTo} onChange={setDateTo} variant="light-inline" />
          </div>
          {hasFilter && (
            <button
              onClick={clearAll}
              className="ms-auto inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              {t('common.clear')}
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : winners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <NoSymbolIcon className="h-10 w-10 text-red-300 dark:text-red-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border-2 border-white dark:border-gray-900">
              <span className="text-green-600 dark:text-green-400 text-xs font-bold">0</span>
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">{t('common.noData')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hasFilter ? t('common.tryChangingFilter') || 'Essayez de modifier les filtres' : t('winners.blacklistSubtitle')}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {winners.map((w, idx) => (
            <div
              key={w._id || w.id}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-800/50 transition-all overflow-hidden"
            >
              {/* Top accent bar */}
              <div className="h-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />

              <div className="p-4">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Index badge */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm shadow-red-200/50 dark:shadow-red-900/30">
                    <span className="text-white text-sm font-bold">{idx + 1}</span>
                  </div>

                  {/* Name + blacklist badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 dark:text-white text-base leading-tight truncate">{w.winnerName}</p>
                    </div>
                    {w.guideId?.programTitle && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate flex items-center gap-1">
                        <TrophyIcon className="h-3 w-3 flex-shrink-0 text-amber-400" />
                        {w.guideId.programTitle}
                      </p>
                    )}
                  </div>

                  {/* Danger badge */}
                  <div className="flex-shrink-0 p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  </div>
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {w.cin && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-600">
                      <IdentificationIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span dir="ltr">{w.cin}</span>
                    </span>
                  )}
                  {w.prize && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                      <GiftIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      {w.prize}
                    </span>
                  )}
                  {w.phone && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/30">
                      <PhoneIcon className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                      <span dir="ltr">{w.phone}</span>
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30">
                    <NoSymbolIcon className="h-3 w-3" />
                    {t('winners.blacklisted')}
                  </span>
                  {w.blacklistedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <CalendarDaysIcon className="h-3 w-3" />
                      {format(new Date(w.blacklistedAt), 'dd/MM/yyyy HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

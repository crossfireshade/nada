import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import DateTimeRangeFilter from '../../components/common/DateTimeRangeFilter'
import {
  ClipboardDocumentCheckIcon, ShieldCheckIcon, CheckCircleIcon,
  CalendarDaysIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'
import { format } from 'date-fns'

// HH:MM string comparison helper
const isValidTime = t => /^\d{2}:\d{2}$/.test(t)
const timeInRange = (startTime, endTime, from, to) => {
  if (!startTime && !endTime) return true
  if (from && isValidTime(from) && startTime && startTime < from) return false
  if (to && isValidTime(to)) {
    const upperBound = endTime || startTime
    if (upperBound && upperBound > to) return false
  }
  return true
}

export default function ReceptionDashboard() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const { user } = useAuth()
  const [rawPermissions, setRawPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  useEffect(() => {
    api.get('/entry-permissions/inbox')
      .then(res => {
        const all = res.data?.data || []
        setRawPermissions(all.filter(p => p.status === 'PENDING'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const permissions = useMemo(() => {
    return rawPermissions.filter(perm => {
      if (dateFilter) {
        const epDate = perm.date ? format(new Date(perm.date), 'yyyy-MM-dd') : ''
        const guideDate = perm.guideId?.broadcastDate || ''
        if (epDate !== dateFilter && guideDate !== dateFilter) return false
      }
      if (timeFrom || timeTo) {
        const startTime = perm.startTime || perm.guideId?.startTime || ''
        const endTime = perm.endTime || perm.guideId?.endTime || ''
        if (!timeInRange(startTime, endTime, timeFrom, timeTo)) return false
      }
      return true
    })
  }, [rawPermissions, dateFilter, timeFrom, timeTo])


  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 p-6 text-white shadow-lg shadow-sky-200/40 dark:shadow-sky-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <ShieldCheckIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheckIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">{t('roles.RECEPTIONNISTE_POLICIER')}</span>
          </div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {firstName}</h1>
          <p className="text-sm text-white/60 mt-1">Radio Monastir</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/30">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('entryPermissions.title')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{permissions.length}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <DateTimeRangeFilter
        dateValue={dateFilter}
        onDateChange={setDateFilter}
        timeFrom={timeFrom}
        timeTo={timeTo}
        onTimeFromChange={setTimeFrom}
        onTimeToChange={setTimeTo}
        onClear={() => { setDateFilter(''); setTimeFrom(''); setTimeTo('') }}
      />

      {/* Pending permissions list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/10 dark:to-cyan-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <ClipboardDocumentCheckIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('entryPermissions.inbox')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('entryPermissions.checkin')}</p>
            </div>
            {permissions.length > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
                {permissions.length}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : permissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 rounded-2xl">
                <ClipboardDocumentCheckIcon className="h-12 w-12 text-sky-300 dark:text-sky-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {permissions.map((perm) => {
                const guestCount = perm.guests?.length || 0
                const checkedCount = perm.guests?.filter(g => g.checkinTime).length || 0
                const allDone = guestCount > 0 && checkedCount === guestCount
                const progress = guestCount > 0 ? Math.round((checkedCount / guestCount) * 100) : 0
                const guideStartTime = perm.startTime || perm.guideId?.startTime
                const guideEndTime = perm.endTime || perm.guideId?.endTime
                return (
                  <Link
                    key={perm._id}
                    to={`/entry-permissions/${perm._id}`}
                    className={`block rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                      allDone
                        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-sky-200 dark:hover:border-sky-700'
                    }`}
                  >
                    <div className={`h-1 ${allDone ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-sky-400 to-cyan-400'}`} />
                    <div className="p-4 flex items-center gap-4">
                      {/* Guest avatars */}
                      <div className="flex -space-x-2 flex-shrink-0">
                        {(perm.guests || []).slice(0, 4).map((g, i) => (
                          <div
                            key={i}
                            className={`h-10 w-10 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm ${
                              g.checkinTime
                                ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                                : 'bg-gradient-to-br from-sky-400 to-cyan-400'
                            }`}
                          >
                            {g.checkinTime
                              ? <CheckCircleIcon className="h-4 w-4 text-white" />
                              : <span className="text-xs font-bold text-white">{(g.guestName || '?')[0].toUpperCase()}</span>
                            }
                          </div>
                        ))}
                        {guestCount > 4 && (
                          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">+{guestCount - 4}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {perm.guests?.length ? perm.guests.map(g => g.guestName).join(', ') : t('entryPermissions.title')}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {perm.date && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <CalendarDaysIcon className="h-3.5 w-3.5" />
                              {format(new Date(perm.date), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {(guideStartTime || guideEndTime) && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 px-2 py-0.5 rounded-full border border-cyan-200/60 dark:border-cyan-700/40">
                              <ClipboardDocumentCheckIcon className="h-3 w-3" />
                              {guideStartTime}{guideEndTime ? ` ${isRTL ? '←' : '→'} ${guideEndTime}` : ''}
                            </span>
                          )}
                          {perm.programTitle && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{perm.programTitle}</span>
                          )}
                        </div>
                        {/* Mini progress bar */}
                        {guestCount > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-full h-1.5 max-w-[120px]">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-sky-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className={`text-[11px] font-bold ${allDone ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                              {checkedCount}/{guestCount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                          allDone
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                        }`}>
                          {allDone ? t('entryPermissions.checkedIn') : t('entryPermissions.checkin')}
                        </span>
                        <ChevronRightIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

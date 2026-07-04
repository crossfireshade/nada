import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  ClipboardDocumentCheckIcon, UserGroupIcon, ShieldCheckIcon,
  CalendarDaysIcon, ChevronRightIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { getEntryPermissionsInbox } from './api'
import { format } from 'date-fns'

export default function ReceptionInboxPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkedInTotal, setCheckedInTotal] = useState(0)
  const [totalGuests, setTotalGuests] = useState(0)

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || ''

  useEffect(() => {
    getEntryPermissionsInbox()
      .then(async (res) => {
        const list = res.data?.data || []
        setPermissions(list)
        let checked = 0
        let total = 0
        for (const p of list) {
          if (p.guests) {
            total += p.guests.length
            checked += p.guests.filter(g => g.checkinTime).length
          }
        }
        setCheckedInTotal(checked)
        setTotalGuests(total)
      })
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 p-6 text-white shadow-lg shadow-sky-200/40 dark:shadow-sky-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <ShieldCheckIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">{t('entryPermissions.inbox')}</span>
          </div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {firstName}</h1>
          <p className="text-sm text-white/70 mt-1">{t('roles.RECEPTIONNISTE_POLICIER')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/30">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('entryPermissions.title')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{permissions.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <UserGroupIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('entryPermissions.guests')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalGuests}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('entryPermissions.checkedIn')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{checkedInTotal}</p>
          </div>
        </div>
      </div>

      {/* Permission cards */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/10 dark:to-cyan-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <ClipboardDocumentCheckIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('entryPermissions.title')}</h2>
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
                        <div className="flex items-center gap-3 mt-1">
                          {perm.date && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <CalendarDaysIcon className="h-3.5 w-3.5" />
                              {format(new Date(perm.date), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {perm.programTitle && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{perm.programTitle}</span>
                          )}
                        </div>
                      </div>

                      {/* Status + arrow */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          allDone
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                        }`}>
                          {checkedCount}/{guestCount}
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

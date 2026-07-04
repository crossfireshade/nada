import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import { getEntryPermission, getPermissionGuests, checkinGuest } from './api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import {
  CheckCircleIcon, UserIcon, ShieldCheckIcon,
  CalendarDaysIcon, IdentificationIcon, ArrowLeftIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function CheckInPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [permission, setPermission] = useState(null)
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(null)
  const [cinInputs, setCinInputs] = useState({})

  const isReceptionniste = user?.role === 'RECEPTIONNISTE_POLICIER'

  const refresh = async () => {
    const [permRes, guestRes] = await Promise.all([
      getEntryPermission(id),
      getPermissionGuests(id),
    ])
    setPermission(permRes.data?.data || permRes.data)
    setGuests(guestRes.data?.data || [])
  }

  useEffect(() => {
    refresh()
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }, [id])

  const handleCheckin = async (guestId) => {
    setCheckingIn(guestId)
    try {
      const cin = cinInputs[guestId] || ''
      await checkinGuest(id, guestId, cin ? { cin } : {})
      await refresh()
      addNotification({ type: 'success', message: t('entryPermissions.validated') })
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setCheckingIn(null)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  if (!permission) return <div className="text-center text-slate-400 py-20">{t('errors.notFound')}</div>

  const checkedCount = guests.filter(g => g.checkinTime).length
  const totalGuests = guests.length
  const allChecked = totalGuests > 0 && checkedCount === totalGuests

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-slate-400 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shadow-lg ${allChecked ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-200/40 dark:shadow-green-900/20' : 'bg-gradient-to-br from-sky-500 to-cyan-500 shadow-sky-200/40 dark:shadow-sky-900/20'}`}>
            <ShieldCheckIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{t('entryPermissions.checkin')}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {checkedCount}/{totalGuests} {t('entryPermissions.checkedIn').toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Permission info card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/10 dark:to-cyan-900/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('entryPermissions.title')}</h2>
          <StatusBadge status={permission.status || 'PENDING'} />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20">
                <CalendarDaysIcon className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('entryPermissions.date')}</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {permission.date ? format(new Date(permission.date), 'dd/MM/yyyy') : '—'}
                </p>
              </div>
            </div>

            {/* Time interval */}
            {(permission.startTime || permission.endTime) && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
                  <ClockIcon className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('entryPermissions.timeInterval')}</p>
                  <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                    {permission.startTime || '—'}{permission.endTime ? ` ${i18n.language === 'ar' ? '←' : '→'} ${permission.endTime}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Producer */}
            {permission.producerName && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <UserIcon className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('entryPermissions.producerName')}</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{permission.producerName}</p>
                </div>
              </div>
            )}

            {/* Program */}
            {permission.programTitle && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <ClockIcon className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t('entryPermissions.programTitle')}</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{permission.programTitle}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {totalGuests > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${allChecked ? 'bg-green-500' : 'bg-sky-500'}`}
                  style={{ width: `${Math.round((checkedCount / totalGuests) * 100)}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${allChecked ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {Math.round((checkedCount / totalGuests) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Guest list */}
      <div className="space-y-3">
        {guests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-5 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 rounded-2xl">
              <UserIcon className="h-12 w-12 text-sky-300 dark:text-sky-600" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
          </div>
        ) : (
          guests.map((guest, idx) => {
            const guestId = guest._id || guest.id
            const isChecked = !!guest.checkinTime
            return (
              <div
                key={guestId}
                className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-all duration-200 ${
                  isChecked
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-slate-100 dark:border-gray-700 hover:shadow-md'
                }`}
              >
                {/* Top accent */}
                <div className={`h-1 ${isChecked ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-sky-400 to-cyan-400'}`} />

                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                      isChecked
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 ring-2 ring-green-200 dark:ring-green-800'
                        : 'bg-gradient-to-br from-sky-400 to-cyan-400 ring-2 ring-sky-200 dark:ring-sky-800'
                    }`}>
                      {isChecked
                        ? <CheckCircleIcon className="h-6 w-6 text-white" />
                        : <span className="text-lg font-bold text-white">{(guest.guestName || '?')[0].toUpperCase()}</span>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-base ${isChecked ? 'text-green-700 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>
                        {guest.guestName}
                      </p>
                      {guest.functionTitle && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{guest.functionTitle}</p>
                      )}
                      {guest.cin && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <IdentificationIcon className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{guest.cin}</span>
                        </div>
                      )}
                    </div>

                    {/* Check-in status / action */}
                    {isChecked ? (
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          <CheckCircleIcon className="h-4 w-4" />
                          {format(new Date(guest.checkinTime), 'HH:mm')}
                        </span>
                      </div>
                    ) : isReceptionniste ? (
                      <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-2">
                          <IdentificationIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder={t('entryPermissions.cin')}
                            className="form-input text-sm w-36 py-1.5"
                            value={cinInputs[guestId] || ''}
                            onChange={(e) => setCinInputs(prev => ({ ...prev, [guestId]: e.target.value }))}
                          />
                        </div>
                        <button
                          onClick={() => handleCheckin(guestId)}
                          disabled={checkingIn === guestId}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white text-sm font-medium rounded-lg shadow-md shadow-sky-200/40 dark:shadow-sky-900/20 disabled:opacity-60 transition-all"
                        >
                          <ShieldCheckIcon className="h-4 w-4" />
                          {checkingIn === guestId ? t('common.loading') : t('entryPermissions.checkin')}
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {t('entryPermissions.pending')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

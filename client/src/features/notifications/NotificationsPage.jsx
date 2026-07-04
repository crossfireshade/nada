import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { formatDistanceToNow } from 'date-fns'
import { fr, ar } from 'date-fns/locale'
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import { useLanguage } from '../../hooks/useLanguage'
import { useAuth } from '../../hooks/useAuth'

const SEVERITY_CONFIG = {
  CRITICAL: {
    icon: ExclamationCircleIcon,
    bg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-500',
    border: 'border-s-red-500',
  },
  WARNING: {
    icon: ExclamationTriangleIcon,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-500',
    border: 'border-s-amber-500',
  },
  SUCCESS: {
    icon: CheckCircleIcon,
    bg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-500',
    border: 'border-s-green-500',
  },
  INFO: {
    icon: InformationCircleIcon,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-500',
    border: 'border-s-blue-500',
  },
}

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const { isRTL } = useLanguage()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [grantingAccess, setGrantingAccess] = useState({})

  const dateLocale = i18n.language === 'ar' ? ar : fr

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/alerts', { params: { limit: 100 } })
      setNotifications(res.data?.data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/alerts/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'READ' } : n))
    } catch { }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/alerts/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })))
    } catch { }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/alerts/${id}`)
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch { }
  }

  const handleGrantAccess = async (n) => {
    const occId = n.relatedEntityId
    if (!occId) return
    setGrantingAccess(prev => ({ ...prev, [n._id]: 'loading' }))
    try {
      await api.post(`/recurring-guides/occurrences/${occId}/grant-access`)
      setGrantingAccess(prev => ({ ...prev, [n._id]: 'done' }))
      // auto-mark notification as read
      await api.patch(`/alerts/${n._id}/read`).catch(() => {})
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, status: 'READ' } : x))
    } catch {
      setGrantingAccess(prev => ({ ...prev, [n._id]: null }))
    }
  }

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length

  const getDisplayMessage = (n) => {
    if (n.messageKey) return t(n.messageKey, n.params || {})
    return n.message || ''
  }

  const getRelativeTime = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: dateLocale })
    } catch {
      return ''
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t('notifications.title')}
          </h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-6 w-6 bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <CheckIcon className="h-4 w-4" />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="card text-center text-slate-400 py-10">{t('common.loading')}</div>
      ) : notifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-600">
          <BellIcon className="h-14 w-14 mb-4 opacity-30" />
          <p className="text-base">{t('notifications.noNotifications')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.INFO
            const Icon = cfg.icon
            return (
              <div
                key={n._id}
                className={`
                  bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700
                  shadow-sm transition-all hover:shadow-md
                  ${n.status === 'UNREAD' ? `border-s-4 ${cfg.border}` : ''}
                `}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.status === 'UNREAD' ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                      {getDisplayMessage(n)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {getRelativeTime(n.createdAt)}
                    </p>
                    {/* Grant access button — only for admin on access-request notifications */}
                    {user?.role === 'RESPONSABLE_ADMINISTRATIF' &&
                      n.messageKey === 'notifications.accessRequested' &&
                      n.relatedEntityType === 'GuideOccurrence' && (
                      <div className="mt-2">
                        {grantingAccess[n._id] === 'done' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-lg">
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            {t('recurring.grantAccess')} ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleGrantAccess(n)}
                            disabled={grantingAccess[n._id] === 'loading'}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors disabled:opacity-60"
                          >
                            <KeyIcon className="h-3.5 w-3.5" />
                            {grantingAccess[n._id] === 'loading' ? t('common.loading') : t('recurring.grantAccess')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {n.status === 'UNREAD' && (
                      <button
                        onClick={() => handleMarkRead(n._id)}
                        title={t('notifications.markRead')}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n._id)}
                      title={t('notifications.delete')}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

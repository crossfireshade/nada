import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr, ar } from 'date-fns/locale'
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'

const SEVERITY_CONFIG = {
  CRITICAL: {
    icon: ExclamationCircleIcon,
    bg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-500',
    dot: 'bg-red-500',
  },
  WARNING: {
    icon: ExclamationTriangleIcon,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  SUCCESS: {
    icon: CheckCircleIcon,
    bg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-500',
    dot: 'bg-green-500',
  },
  INFO: {
    icon: InformationCircleIcon,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-500',
    dot: 'bg-blue-500',
  },
}

export default function NotificationCenter({
  notifications = [],
  onClose,
  onMarkRead = null,
  onDelete = null,
  onMarkAllRead = null,
}) {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'ar' ? ar : fr

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

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length

  return (
    <div className="absolute end-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-700 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-100">
            {t('notifications.title')}
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title={t('notifications.markAllRead')}
              className="text-xs text-primary hover:underline"
            >
              {t('notifications.markAllRead')}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50 dark:divide-gray-700/50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600">
            <BellIcon className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          notifications.map(n => {
            const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.INFO
            const Icon = cfg.icon
            return (
              <div
                key={n._id}
                className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-gray-700/50 ${n.status === 'UNREAD' ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}
              >
                {/* Severity icon */}
                <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.status === 'UNREAD' ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                    {getDisplayMessage(n)}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {getRelativeTime(n.createdAt)}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {n.status === 'UNREAD' && (
                    <button
                      onClick={() => onMarkRead && onMarkRead(n._id)}
                      title={t('notifications.markRead')}
                      className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete && onDelete(n._id)}
                    title={t('notifications.delete')}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-gray-700 text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-sm text-primary hover:underline font-medium"
        >
          {t('notifications.viewAll')}
        </Link>
      </div>
    </div>
  )
}

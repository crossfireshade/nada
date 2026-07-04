import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { Link } from 'react-router-dom'
import {
  ClipboardDocumentCheckIcon, ClockIcon, ShieldCheckIcon,
  ShieldExclamationIcon, CogIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'

export default function ResponsableDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState({ total: 0, pending: 0, validated: 0 })

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  useEffect(() => {
    api.get('/entry-permissions', { params: { limit: 1 } }).then(res => {
      const data = res.data?.data || []
      const pagination = res.data?.pagination || {}
      setStats(prev => ({ ...prev, total: pagination.total || data.length || 0 }))
    }).catch(() => {})
    api.get('/entry-permissions', { params: { limit: 1, status: 'PENDING' } }).then(res => {
      setStats(prev => ({ ...prev, pending: res.data?.pagination?.total || 0 }))
    }).catch(() => {})
    api.get('/entry-permissions', { params: { limit: 1, status: 'VALIDATED' } }).then(res => {
      setStats(prev => ({ ...prev, validated: res.data?.pagination?.total || 0 }))
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 p-6 text-white shadow-lg shadow-slate-300/40 dark:shadow-slate-900/40">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <CogIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ShieldExclamationIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">{t('dashboard.adminPanel')}</span>
          </div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {firstName}</h1>
          <p className="text-sm text-white/60 mt-1">Radio Monastir</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('nav.entryPermissions')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <ClockIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('status.PENDING')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
            <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('status.VALIDATED')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.validated}</p>
          </div>
        </div>
      </div>

      {/* Quick link */}
      <Link
        to="/entry-permissions"
        className="flex items-center justify-between p-5 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30 group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50 transition-colors">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">{t('nav.entryPermissions')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('nav.entries')}</p>
          </div>
        </div>
        <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-teal-500 transition-colors rtl:rotate-180" />
      </Link>
    </div>
  )
}

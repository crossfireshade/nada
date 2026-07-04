import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  UsersIcon, BookOpenIcon, ShieldExclamationIcon,
  CalendarDaysIcon, ChevronRightIcon, UserIcon,
  ClockIcon, CogIcon, DocumentTextIcon,
  FunnelIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'
import { format } from 'date-fns'

const actionTheme = {
  CREATE_PROGRAM:           { bg: 'from-green-400 to-emerald-500',  text: 'text-green-700 dark:text-green-400', badge: 'bg-green-100 dark:bg-green-900/30' },
  UPDATE_PROGRAM:           { bg: 'from-blue-400 to-indigo-500',    text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-900/30' },
  DELETE_PROGRAM:           { bg: 'from-red-400 to-rose-500',       text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/30' },
  CREATE_USER:              { bg: 'from-sky-400 to-blue-500',       text: 'text-sky-700 dark:text-sky-400', badge: 'bg-sky-100 dark:bg-sky-900/30' },
  UPDATE_USER:              { bg: 'from-amber-400 to-orange-500',   text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30' },
  DELETE_USER:              { bg: 'from-red-500 to-red-600',        text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/30' },
  CREATE_ENTRY_PERMISSION:  { bg: 'from-violet-400 to-purple-500',  text: 'text-violet-700 dark:text-violet-400', badge: 'bg-violet-100 dark:bg-violet-900/30' },
  UPDATE_ENTRY_PERMISSION:  { bg: 'from-indigo-400 to-blue-500',    text: 'text-indigo-700 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-900/30' },
  DELETE_ENTRY_PERMISSION:  { bg: 'from-red-400 to-rose-500',       text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/30' },
}
const defaultActionTheme = { bg: 'from-slate-400 to-gray-500', text: 'text-slate-600 dark:text-slate-400', badge: 'bg-slate-100 dark:bg-slate-700/50' }

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState({ users: 0, guides: 0 })
  const [auditLogs, setAuditLogs] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const limit = 10

  const currentMonth = new Date().toISOString().slice(0, 7) // e.g. "2026-06"

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  // Fetch stats + users list once
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [usersRes, guidesRes, usersListRes, monthlyRes] = await Promise.all([
          api.get('/users', { params: { limit: 1 } }),
          api.get('/guides', { params: { limit: 1 } }),
          api.get('/users', { params: { limit: 100 } }),
          api.get('/audit-logs', { params: { limit: 1, month: currentMonth } }),
        ])
        setStats({
          users: usersRes.data?.pagination?.total || usersRes.data?.total || 0,
          guides: guidesRes.data?.pagination?.total || guidesRes.data?.total || 0,
        })
        setAllUsers(usersListRes.data?.data || [])
        setMonthlyTotal(monthlyRes.data?.pagination?.total || monthlyRes.data?.total || 0)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchInitial()
  }, [])

  // Fetch audit logs with filters
  useEffect(() => {
    const fetchLogs = async () => {
      setLogsLoading(true)
      try {
        const params = { limit, page, sort: 'timestamp', order: 'desc' }
        if (dateFilter) params.date = dateFilter
        if (userFilter) params.actorId = userFilter
        const res = await api.get('/audit-logs', { params })
        setAuditLogs(res.data?.data || [])
        setTotalLogs(res.data?.pagination?.total || res.data?.total || 0)
      } catch {
        // silent
      } finally {
        setLogsLoading(false)
      }
    }
    fetchLogs()
  }, [dateFilter, userFilter, page])

  const totalPages = Math.ceil(totalLogs / limit)

  const clearFilters = () => {
    setDateFilter('')
    setUserFilter('')
    setPage(1)
  }

  const hasFilters = dateFilter || userFilter

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
          <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/30">
            <UsersIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('nav.users')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.users}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <BookOpenIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('guides.title')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.guides}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <ClockIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.totalActivities')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{monthlyTotal}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <FunnelIcon className="h-4 w-4" />
            {t('common.filter')}
          </div>

          <DatePickerInput
            value={dateFilter}
            onChange={(v) => { setDateFilter(v); setPage(1) }}
            placeholder={t('guides.filterByDate')}
            variant="light-inline"
          />

          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-sm text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all"
          >
            <option value="">{t('dashboard.allUsers')}</option>
            {allUsers.map(u => (
              <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="h-3.5 w-3.5" />
              {t('guides.clearFilter')}
            </button>
          )}
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
              <ClockIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('dashboard.recentActivity')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('audit.title')}</p>
            </div>
            {monthlyTotal > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                {monthlyTotal}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {(loading || logsLoading) ? (
            <LoadingSpinner className="py-12" />
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10 rounded-2xl">
                <ClockIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log, idx) => {
                const at = actionTheme[log.action] || defaultActionTheme
                const actor = log.actorId
                const actorName = typeof actor === 'object' ? actor?.name : null
                const actorEmail = typeof actor === 'object' ? actor?.email : null
                return (
                  <div
                    key={log._id || idx}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    <div className={`h-1 bg-gradient-to-r ${at.bg}`} />
                    <div className="p-4 flex items-center gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${at.bg} flex items-center justify-center shadow-sm`}>
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${at.badge} ${at.text}`}>
                            {t(`audit.actions.${log.action}`, { defaultValue: log.action })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {actorName && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                              <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                              {actorName}
                            </span>
                          )}
                          {actorEmail && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {actorEmail}
                            </span>
                          )}
                          {log.timestamp && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                              <CalendarDaysIcon className="h-3.5 w-3.5" />
                              {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRightIcon className="h-5 w-5 text-slate-300 dark:text-slate-600 flex-shrink-0 hidden sm:block" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {t('common.previous')}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
            Math.max(0, page - 3),
            Math.min(totalPages, page + 2)
          ).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                p === page
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-200/40 dark:shadow-slate-900/20'
                  : 'border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  ClipboardDocumentListIcon, FunnelIcon, MagnifyingGlassIcon,
  CalendarDaysIcon, ChevronRightIcon, ShieldCheckIcon,
  DocumentTextIcon, UserIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'
import { format } from 'date-fns'

export default function ProductionManagerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState({ pending: 0 })
  const [submittedGuides, setSubmittedGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  useEffect(() => {
    const fetchData = async () => {
      try {
        const base = {}
        if (dateFrom) base.dateFrom = dateFrom
        if (dateTo) base.dateTo = dateTo
        const submittedRes = await api.get('/guides', { params: { ...base, status: 'SUBMITTED', limit: 10 } })
        setSubmittedGuides(submittedRes.data?.data || [])
        setStats({ pending: submittedRes.data?.pagination?.total || 0 })
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateFrom, dateTo])

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <ShieldCheckIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheckIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">{t('roles.RESPONSABLE_PRODUCTION')}</span>
          </div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {firstName}</h1>
          <p className="text-sm text-white/60 mt-1">Radio Monastir</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <FunnelIcon className="h-4 w-4" />
          <span>{t('common.filter') || 'Filtrer'}</span>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.from') || 'Du'}</span>
        <DatePickerInput value={dateFrom} onChange={setDateFrom} variant="light-inline" />
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.to') || 'Au'}</span>
        <DatePickerInput value={dateTo} onChange={setDateTo} variant="light-inline" />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {t('common.clear') || 'Effacer'}
          </button>
        )}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('guides.producerName') || 'Producteur / Programme'}
            className="ps-8 pe-3 py-1.5 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 w-48"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4 w-fit">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30">
            <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.pendingGuides')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Pending guides list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <ClipboardDocumentListIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('dashboard.pendingGuides')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('guides.approve')}</p>
            </div>
            {submittedGuides.length > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                {submittedGuides.length}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : submittedGuides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl">
                <ClipboardDocumentListIcon className="h-12 w-12 text-emerald-300 dark:text-emerald-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submittedGuides.filter(g => {
                if (!search.trim()) return true
                const q = search.trim().toLowerCase()
                return (g.producerName || '').toLowerCase().includes(q) || (g.programTitle || '').toLowerCase().includes(q)
              }).map((guide) => {
                const gId = guide._id || guide.id
                return (
                  <Link
                    key={gId}
                    to={`/guides/${gId}/validate`}
                    className="block rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-200 overflow-hidden"
                  >
                    <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
                    <div className="p-4 flex items-center gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm">
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {guide.programTitle || t('guides.title')}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {guide.producerName && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <UserIcon className="h-3.5 w-3.5" />
                              {guide.producerName}
                            </span>
                          )}
                          {guide.createdAt && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                              <CalendarDaysIcon className="h-3.5 w-3.5" />
                              {format(new Date(guide.createdAt), 'dd/MM/yyyy')}
                            </span>
                          )}
                          <StatusBadge status={guide.status} />
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-all">
                          <ShieldCheckIcon className="h-4 w-4" />
                          {t('guides.approve')}
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

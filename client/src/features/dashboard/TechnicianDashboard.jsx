import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  BoltIcon, CheckCircleIcon, SignalIcon, FunnelIcon, MagnifyingGlassIcon,
  CalendarDaysIcon, ChevronRightIcon, UserIcon,
  DocumentTextIcon, PlayIcon, WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'
import { format } from 'date-fns'

export default function TechnicianDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [liveGuides, setLiveGuides] = useState([])
  const [publishedGuides, setPublishedGuides] = useState([])
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
        const [liveRes, pubRes] = await Promise.all([
          api.get('/guides', { params: { ...base, status: 'LIVE_IN_PROGRESS', limit: 10 } }),
          api.get('/guides', { params: { ...base, status: 'FINAL_PUBLISHED', limit: 10 } }),
        ])
        setLiveGuides(liveRes.data?.data || [])
        setPublishedGuides(pubRes.data?.data || [])
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 p-6 text-white shadow-lg shadow-rose-200/40 dark:shadow-rose-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <WrenchScrewdriverIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <WrenchScrewdriverIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">{t('roles.TECHNICIEN_COORDINATEUR')}</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="relative p-3 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 shadow-sm shadow-red-200/50 dark:shadow-red-900/30">
            <BoltIcon className="h-6 w-6 text-white" />
            {liveGuides.length > 0 && (
              <span className="absolute -top-1 -end-1 h-3 w-3 rounded-full bg-red-500 animate-ping" />
            )}
            {liveGuides.length > 0 && (
              <span className="absolute -top-1 -end-1 h-3 w-3 rounded-full bg-red-500" />
            )}
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.liveNow')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{liveGuides.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/30">
            <CheckCircleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.validatedGuides')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{publishedGuides.length}</p>
          </div>
        </div>
      </div>

      {/* Live guides (if any) */}
      {liveGuides.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 dark:border-red-800/30 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10">
            <div className="flex items-center gap-3">
              <div className="relative p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <SignalIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-red-700 dark:text-red-400">{t('dashboard.liveNow')}</h2>
                <p className="text-xs text-red-500/70 dark:text-red-400/60">{t('status.LIVE_IN_PROGRESS')}</p>
              </div>
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                {liveGuides.length}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {liveGuides.filter(g => {
                if (!search.trim()) return true
                const q = search.trim().toLowerCase()
                return (g.producerName || '').toLowerCase().includes(q) || (g.programTitle || '').toLowerCase().includes(q)
              }).map((guide) => {
              const gId = guide._id || guide.id
              return (
                <Link
                  key={gId}
                  to={`/guides/${gId}/live`}
                  className="block rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  <div className="h-1 bg-gradient-to-r from-red-400 to-rose-500 animate-pulse" />
                  <div className="p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-sm shadow-red-200/40 dark:shadow-red-900/20">
                      <SignalIcon className="h-5 w-5 text-white" />
                    </div>
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
                        <StatusBadge status={guide.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm shadow-red-200/50 dark:shadow-red-900/30">
                        <SignalIcon className="h-4 w-4" />
                        {t('common.view')}
                      </span>
                      <ChevronRightIcon className="h-5 w-5 text-red-300 dark:text-red-600" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Published guides ready for live */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <DocumentTextIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('status.FINAL_PUBLISHED')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('guides.startLive')}</p>
            </div>
            {publishedGuides.length > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                {publishedGuides.length}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : publishedGuides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl">
                <DocumentTextIcon className="h-12 w-12 text-orange-300 dark:text-orange-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {publishedGuides.filter(g => {
                if (!search.trim()) return true
                const q = search.trim().toLowerCase()
                return (g.producerName || '').toLowerCase().includes(q) || (g.programTitle || '').toLowerCase().includes(q)
              }).map((guide) => {
                const gId = guide._id || guide.id
                return (
                  <Link
                    key={gId}
                    to={`/guides/${gId}/live`}
                    className="block rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-orange-200 dark:hover:border-orange-700 transition-all duration-200 overflow-hidden"
                  >
                    <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-sm">
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm shadow-orange-200/50 dark:shadow-orange-900/30">
                          <PlayIcon className="h-4 w-4" />
                          {t('guides.startLive')}
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

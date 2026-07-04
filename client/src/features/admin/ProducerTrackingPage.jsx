import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  UserGroupIcon,
  BookOpenIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '../../api/axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function ProducerTrackingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [producers, setProducers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/admin/producers')
      .then(res => setProducers(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = producers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  )

  const totalGuides = producers.reduce((s, p) => s + (p.stats?.total || 0), 0)
  const totalValidated = producers.reduce((s, p) => s + (p.stats?.validated || 0), 0)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-300/30 dark:shadow-indigo-900/30">
        <div className="absolute top-0 end-0 -translate-y-6 translate-x-6 opacity-10">
          <UserGroupIcon className="h-52 w-52" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ArrowTrendingUpIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">{t('admin.producerTracking')}</span>
          </div>
          <h1 className="text-2xl font-bold">{t('admin.producerTrackingTitle')}</h1>
          <p className="text-sm text-white/60 mt-1">Radio Monastir</p>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<UserGroupIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
            bg="bg-indigo-50 dark:bg-indigo-900/20"
            label={t('admin.totalProducers')}
            value={producers.length}
          />
          <StatCard
            icon={<BookOpenIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />}
            bg="bg-sky-50 dark:bg-sky-900/20"
            label={t('admin.totalGuides')}
            value={totalGuides}
          />
          <StatCard
            icon={<CheckBadgeIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            label={t('admin.totalValidated')}
            value={totalValidated}
          />
          <StatCard
            icon={<PencilSquareIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
            bg="bg-amber-50 dark:bg-amber-900/20"
            label={t('admin.totalDraft')}
            value={producers.reduce((s, p) => s + (p.stats?.draft || 0), 0)}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.searchProducer')}
          className="w-full ps-9 pe-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Producers grid */}
      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="p-5 bg-slate-50 dark:bg-gray-800 rounded-2xl">
            <UserGroupIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(producer => (
            <ProducerCard
              key={producer._id}
              producer={producer}
              onClick={() => navigate(`/admin/producers/${producer._id}`)}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, bg, label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
  )
}

function ProducerCard({ producer, onClick, t }) {
  const { stats, lastActivity } = producer
  const initials = producer.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const activityLabel = lastActivity
    ? formatDistanceToNow(new Date(lastActivity), { addSuffix: true, locale: fr })
    : t('admin.noActivity')

  const validationPct = stats.total > 0
    ? Math.round((stats.validated / stats.total) * 100)
    : 0

  return (
    <button
      onClick={onClick}
      className="group text-start bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 overflow-hidden"
    >
      {/* Gradient top bar */}
      <div className="h-1.5 bg-gradient-to-r from-indigo-400 via-purple-500 to-violet-500 group-hover:from-indigo-500 group-hover:to-violet-600 transition-all" />

      <div className="p-5">
        {/* Avatar + name */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/30">
              <span className="text-white font-bold text-sm">{initials}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">{producer.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{producer.email}</p>
            </div>
          </div>
          <ChevronRightIcon className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <MiniStat label={t('admin.total')} value={stats.total} color="text-slate-700 dark:text-white" />
          <MiniStat label={t('guides.statusDRAFT')} value={stats.draft} color="text-amber-600 dark:text-amber-400" />
          <MiniStat label={t('admin.validated')} value={stats.validated} color="text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{t('admin.validationRate')}</span>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{validationPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${validationPct}%` }}
            />
          </div>
        </div>

        {/* Last activity */}
        <div className="flex items-center gap-1.5">
          <ClockIcon className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{activityLabel}</span>
        </div>
      </div>
    </button>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-slate-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{label}</p>
    </div>
  )
}

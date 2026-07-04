import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  PlusIcon, PencilIcon, EyeIcon, CheckCircleIcon, TrashIcon,
  BookOpenIcon, CalendarDaysIcon, UserIcon, ChevronRightIcon,
  SignalIcon, PlayIcon, DocumentTextIcon, WrenchScrewdriverIcon,
  ShieldCheckIcon, CogIcon, DocumentArrowDownIcon, FunnelIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { getGuides, deleteGuide } from './api'
import { format } from 'date-fns'

const STATUS_FILTERS = [
  { key: 'ALL', labelKey: 'guides.filterAll', dot: 'bg-teal-500', active: 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900/40 border-teal-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-300' },
  { key: 'DRAFT', labelKey: 'guides.filterDraft', dot: 'bg-slate-400', active: 'bg-slate-600 text-white shadow-md shadow-slate-200 dark:shadow-slate-900/40 border-slate-600', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 hover:border-slate-400' },
  { key: 'SUBMITTED', labelKey: 'guides.filterSubmitted', dot: 'bg-blue-500', active: 'bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/40 border-blue-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300' },
  { key: 'APPROVED', labelKey: 'guides.filterApproved', dot: 'bg-green-500', active: 'bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-green-900/40 border-green-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300' },
  { key: 'REJECTED', labelKey: 'guides.filterRejected', dot: 'bg-red-500', active: 'bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-red-900/40 border-red-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300' },
]

const TECHNICIEN_STATUS_FILTERS = [
  { key: 'ALL', labelKey: 'guides.filterAll', dot: 'bg-teal-500', active: 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900/40 border-teal-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-300' },
  { key: 'FINAL_PUBLISHED', labelKey: 'status.FINAL_PUBLISHED', dot: 'bg-green-500', active: 'bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-green-900/40 border-green-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300' },
  { key: 'LIVE_IN_PROGRESS', labelKey: 'status.LIVE_IN_PROGRESS', dot: 'bg-red-500', active: 'bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-red-900/40 border-red-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300' },
  { key: 'LIVE_STOPPED', labelKey: 'status.LIVE_STOPPED', dot: 'bg-orange-500', active: 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/40 border-orange-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300' },
]

const ADMIN_STATUS_FILTERS = [
  { key: 'ALL', labelKey: 'guides.filterAll', dot: 'bg-teal-500', active: 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-teal-900/40 border-teal-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-300' },
  { key: 'DRAFT', labelKey: 'guides.filterDraft', dot: 'bg-slate-400', active: 'bg-slate-600 text-white shadow-md shadow-slate-200 dark:shadow-slate-900/40 border-slate-600', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 hover:border-slate-400' },
  { key: 'SUBMITTED', labelKey: 'guides.filterSubmitted', dot: 'bg-blue-500', active: 'bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/40 border-blue-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300' },
  { key: 'APPROVED', labelKey: 'guides.filterApproved', dot: 'bg-green-500', active: 'bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-green-900/40 border-green-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300' },
  { key: 'LIVE_IN_PROGRESS', labelKey: 'status.LIVE_IN_PROGRESS', dot: 'bg-red-500', active: 'bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-red-900/40 border-red-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300' },
  { key: 'LIVE_STOPPED', labelKey: 'status.LIVE_STOPPED', dot: 'bg-orange-500', active: 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/40 border-orange-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300' },
  { key: 'REJECTED', labelKey: 'guides.filterRejected', dot: 'bg-red-500', active: 'bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-red-900/40 border-red-500', inactive: 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300' },
]

// Color mapping for status-based accent bars and icons
const statusTheme = {
  DRAFT:            { bar: 'from-slate-300 to-slate-400',   icon: 'from-slate-400 to-slate-500' },
  SUBMITTED:        { bar: 'from-blue-400 to-indigo-500',   icon: 'from-blue-400 to-indigo-500' },
  APPROVED:         { bar: 'from-green-400 to-emerald-500', icon: 'from-green-400 to-emerald-500' },
  FINAL_PUBLISHED:  { bar: 'from-purple-400 to-violet-500', icon: 'from-purple-400 to-violet-500' },
  LIVE_IN_PROGRESS: { bar: 'from-red-400 to-rose-500',     icon: 'from-red-500 to-rose-500' },
  LIVE_STOPPED:     { bar: 'from-orange-400 to-amber-500',  icon: 'from-orange-400 to-amber-500' },
  REJECTED:         { bar: 'from-red-400 to-red-500',       icon: 'from-red-400 to-red-500' },
  ARCHIVED:         { bar: 'from-slate-300 to-slate-400',   icon: 'from-slate-400 to-slate-500' },
}
const defaultTheme = { bar: 'from-indigo-400 to-purple-400', icon: 'from-indigo-400 to-purple-400' }

// Role-based hero themes
const roleThemes = {
  PRODUCTEUR:              { gradient: 'from-indigo-500 via-purple-500 to-pink-500', shadow: 'shadow-indigo-200/40 dark:shadow-indigo-900/20', HeroIcon: DocumentTextIcon, roleKey: 'roles.PRODUCTEUR' },
  RESPONSABLE_PRODUCTION:  { gradient: 'from-emerald-500 via-teal-500 to-cyan-500', shadow: 'shadow-emerald-200/40 dark:shadow-emerald-900/20', HeroIcon: ShieldCheckIcon, roleKey: 'roles.RESPONSABLE_PRODUCTION' },
  TECHNICIEN_COORDINATEUR: { gradient: 'from-rose-500 via-red-500 to-orange-500',   shadow: 'shadow-rose-200/40 dark:shadow-rose-900/20',    HeroIcon: WrenchScrewdriverIcon, roleKey: 'roles.TECHNICIEN_COORDINATEUR' },
  RESPONSABLE_ADMINISTRATIF: { gradient: 'from-slate-700 via-slate-800 to-gray-900', shadow: 'shadow-slate-300/40 dark:shadow-slate-900/40', HeroIcon: CogIcon, roleKey: 'roles.RESPONSABLE_ADMINISTRATIF' },
}
const defaultRoleTheme = roleThemes.PRODUCTEUR

export default function GuideListPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [producerSearch, setProducerSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const limit = 10

  const canCreate = ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF'].includes(user?.role)
  const isRespProd = user?.role === 'RESPONSABLE_PRODUCTION'
  const isTechnicien = user?.role === 'TECHNICIEN_COORDINATEUR'
  const isAdmin = user?.role === 'RESPONSABLE_ADMINISTRATIF'
  const ownerId = user?._id || user?.id
  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const theme = roleThemes[user?.role] || defaultRoleTheme

  useEffect(() => {
    setLoading(true)
    getGuides({ limit: 100 })
      .then(res => setGuides(res.data?.data || []))
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (guideId) => {
    try {
      await deleteGuide(guideId)
      setGuides(prev => prev.filter(g => (g._id || g.id) !== guideId))
      setConfirmDeleteId(null)
      addNotification({ type: 'success', message: t('common.delete') })
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const baseGuides = isTechnicien
    ? guides.filter(g => ['FINAL_PUBLISHED', 'LIVE_IN_PROGRESS', 'LIVE_STOPPED'].includes(g.status))
    : isAdmin
    ? guides.filter(g => !['ARCHIVED'].includes(g.status))
    : isRespProd
    ? guides.filter(g => ['DRAFT', 'SUBMITTED', 'APPROVED', 'FINAL_PUBLISHED', 'REJECTED'].includes(g.status))
    : guides.filter(g => !['ARCHIVED', 'LIVE_IN_PROGRESS', 'LIVE_STOPPED'].includes(g.status))

  const visibleGuides = baseGuides.filter(g => {
    if (g.status === 'DRAFT') {
      // Each user sees only their own DRAFTs (including admin)
      return isRespProd || String(g.createdBy?._id || g.createdBy) === String(ownerId)
    }
    if (g.status === 'REJECTED') {
      return isRespProd || isAdmin || String(g.createdBy?._id || g.createdBy) === String(ownerId)
    }
    return true
  })

  const getCount = (key) => {
    if (key === 'ALL') return visibleGuides.length
    if (key === 'APPROVED') return visibleGuides.filter(g => g.status === 'APPROVED' || g.status === 'FINAL_PUBLISHED').length
    return visibleGuides.filter(g => g.status === key).length
  }

  const filteredGuides = visibleGuides.filter(g => {
    if (statusFilter === 'APPROVED') {
      if (g.status !== 'APPROVED' && g.status !== 'FINAL_PUBLISHED') return false
    } else if (statusFilter !== 'ALL' && g.status !== statusFilter) return false
    if (dateFrom || dateTo) {
      const checkDate = g.broadcastDate || (g.createdAt ? format(new Date(g.createdAt), 'yyyy-MM-dd') : null)
      if (!checkDate) return false
      if (dateFrom && checkDate < dateFrom) return false
      if (dateTo && checkDate > dateTo) return false
    }
    if (producerSearch.trim()) {
      const q = producerSearch.trim().toLowerCase()
      const matchProducer = (g.producerName || '').toLowerCase().includes(q)
      const matchProgram = (g.programTitle || g.theme || '').toLowerCase().includes(q)
      if (!matchProducer && !matchProgram) return false
    }
    return true
  })

  const totalPages = Math.ceil(filteredGuides.length / limit)
  const paginatedGuides = filteredGuides.slice((page - 1) * limit, page * limit)

  return (
    <div className="space-y-6">

      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-300">
        <div className="flex items-start justify-between">
          <img src="/assets/logo-main.png" alt="Radio Monastir" style={{ height: 64, width: 'auto' }} />
          <div className="text-center flex-1 px-4">
            <h1 className="text-xl font-bold text-gray-800">{t('guides.title')}</h1>
            {(dateFrom || dateTo) && <p className="text-sm text-gray-500 mt-1">{dateFrom && format(new Date(dateFrom + 'T00:00:00'), 'dd/MM/yyyy')}{dateFrom && dateTo ? ' – ' : ''}{dateTo && format(new Date(dateTo + 'T00:00:00'), 'dd/MM/yyyy')}</p>}
            {statusFilter !== 'ALL' && <p className="text-sm text-gray-500">{t(`guides.filter${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}`) || statusFilter}</p>}
          </div>
          <div className="text-end" style={{ minWidth: 80 }}>
            <p className="text-xs text-gray-400">{t('guides.filterAll')}</p>
            <p className="text-2xl font-bold text-gray-800">{filteredGuides.length}</p>
          </div>
        </div>
      </div>

      {/* ── Print-only table ── */}
      <div className="hidden print:block">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 700, color: '#475569' }}>{t('guides.programTitle') || 'Programme'}</th>
              <th style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 700, color: '#475569' }}>{t('guides.producerName') || 'Producteur'}</th>
              <th style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 700, color: '#475569' }}>{t('entryPermissions.date')}</th>
              <th style={{ padding: '8px 12px', textAlign: 'start', fontWeight: 700, color: '#475569' }}>{t('entryPermissions.statusColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuides.map((guide, i) => (
              <tr key={guide._id || guide.id} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>{guide.programTitle || guide.theme || '—'}</td>
                <td style={{ padding: '8px 12px', color: '#475569' }}>{guide.producerName || '—'}</td>
                <td style={{ padding: '8px 12px', color: '#475569' }}>{guide.broadcastDate || (guide.createdAt ? format(new Date(guide.createdAt), 'dd/MM/yyyy') : '—')}</td>
                <td style={{ padding: '8px 12px', color: '#475569' }}>{guide.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hero banner */}
      <div className={`print:hidden relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} p-6 text-white shadow-lg ${theme.shadow}`}>
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <theme.HeroIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpenIcon className="h-5 w-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">{t('guides.title')}</span>
            </div>
            <h1 className="text-2xl font-bold">{t('guides.title')}</h1>
            <p className="text-sm text-white/60 mt-1">{visibleGuides.length} {t('guides.title').toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canCreate && (
              <Link
                to="/guides/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/20 shadow-lg transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4" />
                {t('guides.new')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="print:hidden space-y-3">
        {/* Filter bar card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
              <FunnelIcon className="h-4 w-4" />
              <span>{t('common.filter') || 'Filtrer'}</span>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.from') || 'Du'}</span>
            <DatePickerInput value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1) }} variant="light-inline" />
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.to') || 'Au'}</span>
            <DatePickerInput value={dateTo} onChange={(v) => { setDateTo(v); setPage(1) }} variant="light-inline" />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {t('common.clear') || 'Effacer'}
              </button>
            )}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={producerSearch}
                onChange={e => { setProducerSearch(e.target.value); setPage(1) }}
                placeholder={t('guides.producerName') || 'Producteur / Programme'}
                className="ps-8 pe-3 py-1.5 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 w-48"
              />
            </div>
          </div>
          {filteredGuides.length > 0 && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 hover:from-slate-700 hover:to-slate-900 text-white text-sm font-semibold rounded-xl shadow-md shadow-slate-400/30 dark:shadow-slate-900/40 transition-all active:scale-95"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              {t('guides.exportPdf') || 'Exporter PDF'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isTechnicien ? TECHNICIEN_STATUS_FILTERS : isAdmin ? ADMIN_STATUS_FILTERS : STATUS_FILTERS).map(({ key, labelKey, dot, active, inactive }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setStatusFilter(key); setPage(1) }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${statusFilter === key ? active : inactive}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${statusFilter === key ? 'bg-white/80' : dot}`} />
              {t(labelKey)}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${statusFilter === key ? 'bg-white/20' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-400'}`}>
                {getCount(key)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Guide cards */}
      {loading ? (
        <LoadingSpinner className="py-16 print:hidden" />
      ) : filteredGuides.length === 0 ? (
        <div className="print:hidden bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center py-16 gap-4">
          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-700/30 dark:to-gray-700/20 rounded-2xl">
            <BookOpenIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="print:hidden space-y-3">
          {paginatedGuides.map((guide) => {
            const gId = guide._id || guide.id
            const st = statusTheme[guide.status] || defaultTheme
            const canEdit = canCreate && ['DRAFT', 'SUBMITTED', 'REJECTED'].includes(guide.status)
            const canEditRespProd = isRespProd && guide.status === 'FINAL_PUBLISHED'
            const canValidate = guide.status === 'SUBMITTED' && isRespProd
            const canStartLive = guide.status === 'FINAL_PUBLISHED' && isTechnicien
            const isLive = guide.status === 'LIVE_IN_PROGRESS'
            const viewUrl = (isTechnicien || guide.status === 'ARCHIVED' || isLive || guide.status === 'LIVE_STOPPED')
              ? `/guides/${gId}/live`
              : `/guides/${gId}`

            return (
              <div
                key={gId}
                className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${
                  isLive
                    ? 'border-red-200 dark:border-red-800/50'
                    : 'border-slate-100 dark:border-gray-700'
                }`}
              >
                {/* Accent bar */}
                <div className={`h-1 bg-gradient-to-r ${st.bar} ${isLive ? 'animate-pulse' : ''}`} />

                <div className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${st.icon} flex items-center justify-center shadow-sm relative`}>
                    {isLive ? (
                      <>
                        <SignalIcon className="h-5 w-5 text-white" />
                        <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                        <span className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                      </>
                    ) : (
                      <DocumentTextIcon className="h-5 w-5 text-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">
                      {guide.programTitle || t('common.noData')}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {guide.producerName && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <UserIcon className="h-3.5 w-3.5" />
                          {guide.producerName}
                        </span>
                      )}
                      {guide.broadcastDate && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <CalendarDaysIcon className="h-3.5 w-3.5" />
                          {guide.broadcastDate}
                        </span>
                      )}
                      {guide.createdAt && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {format(new Date(guide.createdAt), 'dd/MM/yyyy')}
                        </span>
                      )}
                      <StatusBadge status={guide.status} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {/* Primary action chip */}
                    {canValidate ? (
                      <Link
                        to={`/guides/${gId}/validate`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        {t('guides.validate')}
                      </Link>
                    ) : canStartLive ? (
                      <Link
                        to={`/guides/${gId}/live`}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm shadow-orange-200/50 dark:shadow-orange-900/30 transition-all"
                      >
                        <PlayIcon className="h-4 w-4" />
                        {t('guides.startLive')}
                      </Link>
                    ) : isLive ? (
                      <Link
                        to={`/guides/${gId}/live`}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm shadow-red-200/50 dark:shadow-red-900/30 transition-all"
                      >
                        <SignalIcon className="h-4 w-4" />
                        {t('common.view')}
                      </Link>
                    ) : (
                      <Link
                        to={viewUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                        title={t('common.view')}
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                        {t('common.view')}
                      </Link>
                    )}

                    {/* Edit */}
                    {(canEdit || canEditRespProd) && (
                      <Link
                        to={`/guides/${gId}/edit`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title={t('common.edit')}
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        {t('common.edit')}
                      </Link>
                    )}

                    {/* Delete */}
                    {(canCreate || isTechnicien) && (
                      <button
                        onClick={() => setConfirmDeleteId(gId)}
                        className="p-2 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('common.delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}

                    <ChevronRightIcon className="h-5 w-5 text-slate-300 dark:text-slate-600 hidden sm:block" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="print:hidden flex items-center justify-center gap-2">
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
                  ? `bg-gradient-to-br ${theme.gradient} text-white shadow-md`
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

      {/* Delete confirmation modal */}
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-5 border border-slate-100 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-center font-medium">
                {t('guides.confirmDelete')}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary px-5">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

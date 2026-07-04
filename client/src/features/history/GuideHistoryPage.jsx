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
  EyeIcon, TrashIcon, ArchiveBoxIcon, PencilIcon,
  CalendarDaysIcon, UserIcon, DocumentTextIcon, ChevronRightIcon,
  DocumentArrowDownIcon, FunnelIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { getArchivedGuides } from './api'
import { deleteGuide } from '../guides/api'
import { format } from 'date-fns'

const statusTheme = {
  ARCHIVED:         { bar: 'from-slate-300 to-slate-400',   icon: 'from-slate-400 to-slate-500' },
  FINAL_PUBLISHED:  { bar: 'from-purple-400 to-violet-500', icon: 'from-purple-400 to-violet-500' },
  LIVE_IN_PROGRESS: { bar: 'from-red-400 to-rose-500',     icon: 'from-red-500 to-rose-500' },
  LIVE_STOPPED:     { bar: 'from-orange-400 to-amber-500',  icon: 'from-orange-400 to-amber-500' },
  APPROVED:         { bar: 'from-green-400 to-emerald-500', icon: 'from-green-400 to-emerald-500' },
  SUBMITTED:        { bar: 'from-blue-400 to-indigo-500',   icon: 'from-blue-400 to-indigo-500' },
  DRAFT:            { bar: 'from-slate-300 to-slate-400',   icon: 'from-slate-400 to-slate-500' },
  REJECTED:         { bar: 'from-red-400 to-red-500',       icon: 'from-red-400 to-red-500' },
}
const defaultTheme = { bar: 'from-indigo-400 to-purple-400', icon: 'from-indigo-400 to-purple-400' }

export default function GuideHistoryPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [printGuides, setPrintGuides] = useState([])
  const [printing, setPrinting] = useState(false)
  const limit = 10

  const fetchGuides = () => {
    if (!user) return
    setLoading(true)
    const params = { limit, page }
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (user.role === 'TECHNICIEN_COORDINATEUR') {
      params.status = 'FINAL_PUBLISHED,LIVE_IN_PROGRESS,LIVE_STOPPED,ARCHIVED'
    } else if (user.role === 'RESPONSABLE_PRODUCTION') {
      params.validatedBy = user.id
    } else if (user.role === 'PRODUCTEUR') {
      params.createdBy = user.id
    }
    getArchivedGuides(params)
      .then(res => {
        setGuides(res.data?.data || [])
        setTotal(res.data?.pagination?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchGuides()
  }, [page, dateFrom, dateTo, user?.id, user?.role])

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

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const params = { limit: 1000, page: 1 }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo) params.dateTo = dateTo
      if (user.role === 'TECHNICIEN_COORDINATEUR') {
        params.status = 'FINAL_PUBLISHED,LIVE_IN_PROGRESS,LIVE_STOPPED,ARCHIVED'
      } else if (user.role === 'RESPONSABLE_PRODUCTION') {
        params.validatedBy = user.id
      } else if (user.role === 'PRODUCTEUR') {
        params.createdBy = user.id
      }
      const res = await getArchivedGuides(params)
      setPrintGuides(res.data?.data || [])
      setTimeout(() => { window.print(); setPrinting(false) }, 150)
    } catch {
      setPrinting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  const statusLabel = (s) => {
    const map = {
      ARCHIVED: 'Archivé', FINAL_PUBLISHED: 'Publié', LIVE_IN_PROGRESS: 'En direct',
      LIVE_STOPPED: 'Arrêté', APPROVED: 'Approuvé', SUBMITTED: 'Soumis',
      DRAFT: 'Brouillon', REJECTED: 'Rejeté',
    }
    return map[s] || s
  }

  return (
    <div className="space-y-6">

      {/* ── Print-only header ── */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-slate-300 pb-4 mb-6">
        <img src="/assets/logo-main.png" alt="Radio Monastir" className="h-14 object-contain" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">{t('nav.history')} — {t('guides.title')}</h1>
          {(dateFrom || dateTo) && <p className="text-sm text-slate-500 mt-1">{dateFrom || '…'} → {dateTo || '…'}</p>}
        </div>
        <div className="text-right text-sm text-slate-500">
          <p className="font-semibold text-slate-700">{printGuides.length} {t('guides.title').toLowerCase()}</p>
          <p>{new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* ── Print-only table ── */}
      {printGuides.length > 0 && (
        <table className="hidden print:table w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Programme</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Producteur</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Date</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">Statut</th>
            </tr>
          </thead>
          <tbody>
            {printGuides.map((guide) => (
              <tr key={guide._id || guide.id} className="even:bg-slate-50">
                <td className="border border-slate-200 px-3 py-2 text-slate-800">{guide.programTitle || guide.theme || '—'}</td>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">{guide.producerName || '—'}</td>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">{guide.createdAt ? format(new Date(guide.createdAt), 'dd/MM/yyyy') : '—'}</td>
                <td className="border border-slate-200 px-3 py-2 text-slate-600">{statusLabel(guide.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Hero Banner ── */}
      <div className="print:hidden relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 p-6 text-white shadow-lg shadow-slate-400/30 dark:shadow-slate-900/50">
        {/* Decorative background icons */}
        <div className="absolute top-0 end-0 -translate-y-6 translate-x-6 opacity-[0.07]">
          <ArchiveBoxIcon className="h-52 w-52" />
        </div>
        <div className="absolute bottom-0 start-0 translate-y-10 -translate-x-6 opacity-[0.05]">
          <DocumentTextIcon className="h-44 w-44 rotate-12" />
        </div>
        {/* Glow */}
        <div className="absolute top-4 end-28 w-24 h-24 bg-sky-400/15 rounded-full blur-2xl" />
        <div className="absolute bottom-2 start-16 w-20 h-20 bg-slate-400/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <ArchiveBoxIcon className="h-5 w-5 text-white/70" />
            <span className="text-sm font-medium text-white/70">Radio Monastir</span>
          </div>
          <h1 className="text-2xl font-bold">{t('nav.history')} — {t('guides.title')}</h1>
          <p className="text-sm text-white/60 mt-1">{total} {t('guides.title').toLowerCase()}</p>
        </div>
      </div>

      {/* ── Filter + Export bar ── */}
      <div className="print:hidden bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">

        {/* Date range — start (RIGHT in RTL) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <FunnelIcon className="h-4 w-4" />
            <span>{t('common.filter') || 'Filtrer'}</span>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.from') || 'Du'}</span>
          <DatePickerInput
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(1) }}
            variant="light-inline"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('common.to') || 'Au'}</span>
          <DatePickerInput
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(1) }}
            variant="light-inline"
          />
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('guides.producerName') || 'Producteur / Programme'}
              className="ps-8 pe-3 py-1.5 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-600 w-48"
            />
          </div>
        </div>

        {/* Export PDF — end (LEFT in RTL) */}
        {guides.length > 0 && (
          <button
            onClick={handlePrint}
            disabled={printing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 hover:from-slate-700 hover:to-slate-900 text-white text-sm font-semibold rounded-xl shadow-md shadow-slate-400/30 dark:shadow-slate-900/40 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <DocumentArrowDownIcon className={`h-4 w-4 ${printing ? 'animate-spin' : ''}`} />
            {printing ? '...' : (t('guides.exportPdf') || 'Exporter PDF')}
          </button>
        )}
      </div>

      {/* Guide cards */}
      <div className="print:hidden bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">

        <div className="p-5">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : guides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10 rounded-2xl">
                <ArchiveBoxIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {guides.filter(g => {
                if (!search.trim()) return true
                const q = search.trim().toLowerCase()
                return (g.producerName || '').toLowerCase().includes(q) || (g.programTitle || g.theme || '').toLowerCase().includes(q)
              }).map((guide) => {
                const gId = guide._id || guide.id
                const st = statusTheme[guide.status] || defaultTheme
                const isProductionFinalPublished =
                  user?.role === 'RESPONSABLE_PRODUCTION' && guide.status === 'FINAL_PUBLISHED'
                const viewUrl = ['ARCHIVED', 'LIVE_IN_PROGRESS', 'LIVE_STOPPED', 'FINAL_PUBLISHED'].includes(guide.status) && !isProductionFinalPublished
                  ? `/guides/${gId}/live`
                  : `/guides/${gId}`
                const canEdit = ['DRAFT', 'SUBMITTED', 'REJECTED'].includes(guide.status) || isProductionFinalPublished

                return (
                  <div
                    key={gId}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    <div className={`h-1 bg-gradient-to-r ${st.bar}`} />
                    <div className="p-4 flex items-center gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${st.icon} flex items-center justify-center shadow-sm`}>
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {guide.programTitle || guide.theme || t('common.noData')}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
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

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Link
                          to={viewUrl}
                          className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                          title={t('common.view')}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        {canEdit && (
                          <Link
                            to={`/guides/${gId}/edit`}
                            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          onClick={() => setConfirmDeleteId(gId)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <ChevronRightIcon className="h-5 w-5 text-slate-300 dark:text-slate-600 hidden sm:block" />
                      </div>
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
                  ? 'bg-slate-600 text-white shadow-md shadow-slate-200/40 dark:shadow-slate-900/20'
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

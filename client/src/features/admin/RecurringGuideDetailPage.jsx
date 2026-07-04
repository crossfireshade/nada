import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDaysIcon, ClockIcon, UserIcon, ArrowLeftIcon,
  CheckCircleIcon, XCircleIcon, PencilSquareIcon,
  NoSymbolIcon, ArrowPathIcon, ExclamationTriangleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '../../api/axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import RecurringGuideFormModal from './RecurringGuideFormModal'

// ── Countdown helper ──────────────────────────────────────────────────────────
function getCountdown(deadline, t) {
  const now = Date.now()
  const ms = new Date(deadline).getTime() - now
  if (ms <= 0) return { label: t('recurring.overdue'), color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (mins < 60) return { label: t('recurring.minutesLeft', { count: mins }), color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }
  if (hours < 24) return { label: t('recurring.hoursLeft', { count: hours }), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  return { label: t('recurring.daysLeft', { count: days }), color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20' }
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  PLANNED:  'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-slate-300',
  DRAFT:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUBMITTED:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LATE:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  VALIDATED:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LIVE:     'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  ARCHIVED: 'bg-slate-200 text-slate-500 dark:bg-gray-700 dark:text-slate-400',
  DISABLED: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
}

function StatusBadge({ status, t }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[status] || STATUS_STYLES.PLANNED}`}>
      {t(`recurring.occurrenceStatus.${status}`)}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecurringGuideDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [template, setTemplate] = useState(null)
  const [occurrences, setOccurrences] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingOcc, setLoadingOcc] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [grantingAccess, setGrantingAccess] = useState({})

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [page, setPage] = useState(1)

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await api.get(`/recurring-guides/templates/${id}`)
      setTemplate(res.data?.data)
    } catch { /* silent */ }
  }, [id])

  const fetchOccurrences = useCallback(async () => {
    setLoadingOcc(true)
    try {
      const params = { templateId: id, page, limit: 15 }
      // By default, exclude ARCHIVED (they auto-disappear when archived)
      params.status = filterStatus || 'PLANNED,DRAFT,SUBMITTED,LATE,VALIDATED,LIVE,DISABLED'
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo
      const res = await api.get('/recurring-guides/occurrences', { params })
      setOccurrences(res.data?.data?.data || [])
      setTotal(res.data?.data?.total || 0)
    } catch { /* silent */ } finally { setLoadingOcc(false) }
  }, [id, filterStatus, filterFrom, filterTo, page])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTemplate(), fetchOccurrences()]).finally(() => setLoading(false))
  }, []) // eslint-disable-line

  useEffect(() => {
    fetchOccurrences()
  }, [fetchOccurrences])

  const handleAction = async (occId, action) => {
    try {
      await api.patch(`/recurring-guides/occurrences/${occId}/${action}`)
      fetchOccurrences()
    } catch { /* silent */ }
  }

  const handleGrantAccess = async (occId) => {
    setGrantingAccess(prev => ({ ...prev, [occId]: 'loading' }))
    try {
      await api.post(`/recurring-guides/occurrences/${occId}/grant-access`)
      setGrantingAccess(prev => ({ ...prev, [occId]: 'done' }))
      fetchOccurrences()
    } catch {
      setGrantingAccess(prev => ({ ...prev, [occId]: null }))
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  if (!template) return (
    <div className="text-center py-20 text-slate-400">{t('common.noData')}</div>
  )

  const wd = template.weekday ?? 0

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 mb-4 transition-colors">
          {t('recurring.backToTemplates')}
        </button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
            <CalendarDaysIcon className="h-40 w-40" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  template.isActive ? 'bg-white/20' : 'bg-white/10 opacity-60'
                }`}>
                  {template.isActive ? t('recurring.active') : t('recurring.inactive')}
                </span>
              </div>
              <h1 className="text-2xl font-bold">{template.programName}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4" />
                  {t(`recurring.weekdays.${wd}`)}
                </span>
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4" />
                  {template.startTime} – {template.endTime}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4" />
                  {template.producerId?.name || '—'}
                </span>
                <span className="flex items-center gap-1.5 text-white/60 text-xs">
                  {template.submissionDeadlineHours}h avant diffusion
                </span>
              </div>
              {template.description && (
                <p className="text-sm text-white/60 mt-2">{template.description}</p>
              )}
            </div>
            <button
              onClick={() => setShowEditForm(true)}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/20 transition-all"
            >
              <PencilSquareIcon className="h-4 w-4" />
              {t('common.edit')}
            </button>
          </div>
        </div>
      </div>

      {/* Occurrences section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Section header + filters */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <CalendarDaysIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('recurring.occurrences')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('recurring.occurrencesCount', { count: total })}</p>
              </div>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2 mt-3">
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-400 outline-none"
            >
              <option value="">{t('recurring.activeStatuses')}</option>
              {['PLANNED','DRAFT','SUBMITTED','LATE','VALIDATED','LIVE','ARCHIVED','DISABLED'].map(s => (
                <option key={s} value={s}>{t(`recurring.occurrenceStatus.${s}`)}</option>
              ))}
            </select>
            <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1) }}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-400 outline-none" />
            <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1) }}
              className="px-3 py-1.5 text-xs border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-400 outline-none" />
            {(filterStatus || filterFrom || filterTo) && (
              <button onClick={() => { setFilterStatus(''); setFilterFrom(''); setFilterTo(''); setPage(1) }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg transition-colors">
                {t('common.clear')}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loadingOcc ? (
            <LoadingSpinner className="py-12" />
          ) : occurrences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CalendarDaysIcon className="h-12 w-12 text-slate-200 dark:text-gray-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">{t('recurring.noOccurrences')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-700 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-gray-900/30">
                  <th className="px-4 py-3 text-start font-semibold">{t('recurring.broadcastDate')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('common.status')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('recurring.deadline')}</th>
                  <th className="px-4 py-3 text-start font-semibold hidden md:table-cell">{t('recurring.notes')}</th>
                  <th className="px-4 py-3 text-end font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                {occurrences.map(occ => {
                  const countdown = getCountdown(occ.submissionDeadline, t)
                  const isFuture = new Date(occ.broadcastDateTime) > new Date()
                  const isLate = occ.status === 'LATE' || (occ.status === 'PLANNED' && new Date(occ.submissionDeadline) < new Date())
                  return (
                    <tr key={occ._id} className={`transition-colors ${
                      isLate
                        ? 'bg-red-50/40 dark:bg-red-900/5 hover:bg-red-50 dark:hover:bg-red-900/10'
                        : 'hover:bg-slate-50 dark:hover:bg-gray-700/30'
                    }`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-800 dark:text-white">
                          {format(new Date(occ.scheduledDate), 'dd MMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{occ.startTime} – {occ.endTime}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={isLate && occ.status === 'PLANNED' ? 'LATE' : occ.status} t={t} />
                          {isLate && !occ.accessGranted && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-400" title="En attente d'accès" />
                          )}
                          {occ.accessGranted && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                              <KeyIcon className="h-3 w-3" />
                              Accès accordé
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {['VALIDATED', 'LIVE', 'ARCHIVED', 'DISABLED'].includes(occ.status) ? (
                          occ.validatedAt ? (
                            <span className="text-xs text-slate-400">{format(new Date(occ.validatedAt), 'dd/MM/yyyy')}</span>
                          ) : <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${countdown.bg} ${countdown.color}`}>
                            {countdown.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{occ.notes || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Grant access button: only show after producer has requested */}
                          {isLate && occ.accessRequested && !occ.accessGranted && (
                            grantingAccess[occ._id] === 'done' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                {t('recurring.grantAccess')} ✓
                              </span>
                            ) : (
                              <button
                                onClick={() => handleGrantAccess(occ._id)}
                                disabled={grantingAccess[occ._id] === 'loading'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm shadow-teal-200/40 transition-all active:scale-95 disabled:opacity-60"
                                title={t('recurring.grantAccess')}
                              >
                                <KeyIcon className="h-3.5 w-3.5" />
                                {grantingAccess[occ._id] === 'loading' ? t('common.loading') : t('recurring.grantAccess')}
                              </button>
                            )
                          )}
                          {occ.status === 'DISABLED' ? (
                            <button onClick={() => handleAction(occ._id, 'enable')}
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 hover:bg-emerald-100 rounded-lg transition-all"
                              title={t('recurring.enable')}>
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            !['VALIDATED','LIVE','ARCHIVED','LATE'].includes(occ.status) && !isLate && isFuture && (
                              <button onClick={() => handleAction(occ._id, 'disable')}
                                className="p-1.5 bg-slate-50 dark:bg-gray-700 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title={t('recurring.disable')}>
                                <NoSymbolIcon className="h-3.5 w-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('common.page')} {page} {t('common.of')} {Math.ceil(total / 15)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                {t('common.previous')}
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 15 >= total}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit form modal */}
      {showEditForm && (
        <RecurringGuideFormModal
          initial={template}
          onClose={() => setShowEditForm(false)}
          onSaved={() => { setShowEditForm(false); fetchTemplate(); fetchOccurrences() }}
        />
      )}

    </div>
  )
}

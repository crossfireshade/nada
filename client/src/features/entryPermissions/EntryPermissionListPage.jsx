import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import StatusBadge from '../../components/common/StatusBadge'
import DateTimeRangeFilter from '../../components/common/DateTimeRangeFilter'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  PlusIcon, EyeIcon, PencilIcon, TrashIcon,
  ClipboardDocumentCheckIcon, CalendarDaysIcon, ShieldCheckIcon,
  UserGroupIcon, ClockIcon, DocumentArrowDownIcon,
  CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline'
import { getEntryPermissions, deleteEntryPermission, approveEntryPermission, rejectEntryPermission } from './api'
import { format } from 'date-fns'

// HH:MM string comparison helper — only apply filter if both HH and MM are filled
const isValidTime = t => /^\d{2}:\d{2}$/.test(t)
const timeInRange = (startTime, endTime, from, to) => {
  if (!startTime && !endTime) return true
  if (from && isValidTime(from) && startTime && startTime < from) return false
  if (to && isValidTime(to)) {
    const upperBound = endTime || startTime
    if (upperBound && upperBound > to) return false
  }
  return true
}

export default function EntryPermissionListPage() {
  const { t, i18n } = useTranslation()
  const { addNotification } = useNotifications()
  const { user } = useAuth()
  const isReceptionniste = user?.role === 'RECEPTIONNISTE_POLICIER'
  const isResponsableProduction = user?.role === 'RESPONSABLE_PRODUCTION'
  const isProducteur = user?.role === 'PRODUCTEUR'
  const [rawPermissions, setRawPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [dateFilter, setDateFilter] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const limit = 20

  const fetchPermissions = () => {
    setLoading(true)
    const params = { limit, page }
    if (dateFilter) params.date = dateFilter
    getEntryPermissions(params)
      .then(res => {
        const list = res.data?.data || []
        setRawPermissions(list)
        setTotal(res.data?.pagination?.total || res.data?.total || list.length)
      })
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPermissions()
  }, [page, dateFilter])

  // Client-side time filter on top of server-side date filter
  // Use EP's own times first, fall back to linked guide's times
  const permissions = useMemo(() => {
    if (!timeFrom && !timeTo) return rawPermissions
    return rawPermissions.filter(perm => {
      const startTime = perm.startTime || perm.guideId?.startTime || ''
      const endTime = perm.endTime || perm.guideId?.endTime || ''
      return timeInRange(startTime, endTime, timeFrom, timeTo)
    })
  }, [rawPermissions, timeFrom, timeTo])

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    try {
      await deleteEntryPermission(confirmDeleteId)
      addNotification({ type: 'success', message: t('entryPermissions.deleted') })
      setConfirmDeleteId(null)
      fetchPermissions()
    } catch {
      addNotification({ type: 'error', message: t('entryPermissions.errorMessage') })
    } finally {
      setDeleting(false)
    }
  }

  const handleApprove = async (permId) => {
    setActionLoading(permId + '_approve')
    try {
      await approveEntryPermission(permId)
      addNotification({ type: 'success', message: t('entryPermissions.approved') })
      fetchPermissions()
    } catch {
      addNotification({ type: 'error', message: t('entryPermissions.errorMessage') })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (permId) => {
    setActionLoading(permId + '_reject')
    try {
      await rejectEntryPermission(permId)
      addNotification({ type: 'success', message: t('entryPermissions.rejected') })
      fetchPermissions()
    } catch {
      addNotification({ type: 'error', message: t('entryPermissions.errorMessage') })
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const validatedCount = rawPermissions.filter(p => p.status === 'VALIDATED').length
  const pendingCount = rawPermissions.filter(p => p.status === 'PENDING' || !p.status).length
  const pendingApprovalCount = rawPermissions.filter(p => p.status === 'PENDING_APPROVAL').length

  const dateLabel = dateFilter ? format(new Date(dateFilter), 'dd/MM/yyyy') : null

  return (
    <div className="space-y-6">

      {/* ── Print-only header ── */}
      <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
        <div className="flex items-start justify-between">
          <img src="/assets/logo-main.png" alt="Radio Monastir" style={{ height: 64, width: 'auto' }} />
          <div className="text-center flex-1 px-4">
            <h1 className="text-xl font-bold text-gray-800">{t('entryPermissions.title')}</h1>
            {dateLabel && <p className="text-sm text-gray-500 mt-1">{dateLabel}</p>}
          </div>
          <div className="text-end" style={{ minWidth: 80 }}>
            <p className="text-xs text-gray-400">{t('guides.filterAll')}</p>
            <p className="text-2xl font-bold text-gray-800">{permissions.length}</p>
          </div>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div className="print:hidden relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-700 p-6 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/40">
        {/* Decorative elements */}
        <div className="absolute top-0 end-0 -translate-y-6 translate-x-6 opacity-[0.08]">
          <ClipboardDocumentCheckIcon className="h-52 w-52" />
        </div>
        <div className="absolute bottom-0 start-0 translate-y-10 -translate-x-6 opacity-[0.06]">
          <ShieldCheckIcon className="h-44 w-44 rotate-12" />
        </div>
        {/* Glow */}
        <div className="absolute top-6 end-24 w-24 h-24 bg-cyan-300/20 rounded-full blur-2xl" />
        <div className="absolute bottom-2 start-20 w-20 h-20 bg-emerald-300/15 rounded-full blur-2xl" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardDocumentCheckIcon className="h-5 w-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">Radio Monastir</span>
            </div>
            <h1 className="text-2xl font-bold">{t('entryPermissions.title')}</h1>
            <p className="text-sm text-white/60 mt-1">
              {total} {t('entryPermissions.title').toLowerCase()}
            </p>
          </div>

          {!isReceptionniste && (
            <Link
              to="/entry-permissions/new"
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-900/20 whitespace-nowrap"
            >
              <PlusIcon className="h-4 w-4" />
              {t('entryPermissions.new')}
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className={`print:hidden grid grid-cols-1 gap-4 ${(isResponsableProduction || isProducteur) ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4 transition-colors">
          <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('guides.filterAll')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{total}</p>
          </div>
        </div>
        {(isResponsableProduction || isProducteur) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-800/40 shadow-sm p-5 flex items-center gap-4 transition-colors">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <ClockIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('status.PENDING_APPROVAL')}</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{pendingApprovalCount}</p>
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4 transition-colors">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <ShieldCheckIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('status.VALIDATED')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{validatedCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4 transition-colors">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <ClockIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('status.PENDING')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="print:hidden">
      <DateTimeRangeFilter
        dateValue={dateFilter}
        onDateChange={v => { setDateFilter(v); setPage(1) }}
        timeFrom={timeFrom}
        timeTo={timeTo}
        onTimeFromChange={setTimeFrom}
        onTimeToChange={setTimeTo}
        onClear={() => { setDateFilter(''); setTimeFrom(''); setTimeTo(''); setPage(1) }}
      />
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors
        dark:shadow-xl dark:shadow-emerald-950/10">

        {/* Table header bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="hidden dark:block absolute inset-0 bg-emerald-500/20 rounded-lg blur-md" />
              <div className="relative p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-500/20">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('entryPermissions.title')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('entryPermissions.inbox')}</p>
            </div>
            {total > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
                {total}
              </span>
            )}
            {permissions.length > 0 && (
              <button
                onClick={() => window.print()}
                className="print:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/30 transition-all duration-200 active:scale-95"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                {t('guides.exportPdf') || 'Exporter PDF'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : permissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <div className="hidden dark:block absolute inset-0 bg-emerald-500/15 rounded-2xl blur-xl" />
              <div className="relative p-5 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-700/30 dark:to-gray-700/10 rounded-2xl border border-slate-100 dark:border-gray-600/30">
                <ClipboardDocumentCheckIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-gray-700/20 border-b border-slate-100 dark:border-gray-700">
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      {t('entryPermissions.date')}
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <UserGroupIcon className="h-3.5 w-3.5" />
                      {t('entryPermissions.guestName')}
                    </div>
                  </th>
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('entryPermissions.programTitle')}
                  </th>
                  <th className="px-6 py-3.5 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('entryPermissions.statusColumn')}
                  </th>
                  <th className="print:hidden px-6 py-3.5 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-700/40">
                {permissions.map((perm) => {
                  const permId = perm._id || perm.id
                  const guestNames = Array.isArray(perm.guests) && perm.guests.length > 0
                    ? perm.guests.map(g => g.guestName).filter(Boolean).join(', ')
                    : '—'
                  const isValidated = perm.status === 'VALIDATED'
                  return (
                    <tr
                      key={permId}
                      className="group transition-all duration-200 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10"
                    >
                      {/* Date */}
                      <td className="px-6 py-4 relative">
                        <div className={`absolute start-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-200
                          bg-transparent group-hover:bg-gradient-to-b group-hover:from-teal-400 group-hover:to-emerald-500 dark:group-hover:from-teal-500 dark:group-hover:to-emerald-600
                        `} />
                        <div className="flex flex-col gap-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-gray-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-gray-600 group-hover:border-emerald-200 dark:group-hover:border-emerald-700/40 transition-colors w-fit">
                            <CalendarDaysIcon className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                            {perm.date ? format(new Date(perm.date), 'dd/MM/yyyy') : '—'}
                          </span>
                          {(() => {
                            const st = perm.startTime || perm.guideId?.startTime || ''
                            const et = perm.endTime || perm.guideId?.endTime || ''
                            return (st || et) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-700/40 w-fit">
                                <ClockIcon className="h-3 w-3" />
                                {st || '—'}{et ? ` ${i18n.language === 'ar' ? '←' : '→'} ${et}` : ''}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </td>

                      {/* Guests */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-1.5 flex-shrink-0">
                            {(perm.guests || []).slice(0, 3).map((g, i) => {
                              const colors = [
                                'from-teal-400 to-emerald-500',
                                'from-cyan-400 to-sky-500',
                                'from-violet-400 to-purple-500',
                              ]
                              return (
                                <div key={i} className={`h-8 w-8 rounded-full bg-gradient-to-br ${colors[i % 3]} border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm`}>
                                  <span className="text-[10px] font-bold text-white">{(g.guestName || '?')[0].toUpperCase()}</span>
                                </div>
                              )
                            })}
                            {(perm.guests || []).length > 3 && (
                              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">+{perm.guests.length - 3}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-slate-700 dark:text-slate-200 truncate max-w-[200px] font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {guestNames}
                          </span>
                        </div>
                      </td>

                      {/* Program */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        {perm.programTitle || '—'}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={perm.status || 'PENDING'} />
                      </td>

                      {/* Actions */}
                      <td className="print:hidden px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Approve / Reject buttons for RESPONSABLE_PRODUCTION */}
                          {isResponsableProduction && perm.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                onClick={() => handleApprove(permId)}
                                disabled={actionLoading === permId + '_approve'}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                                title={t('entryPermissions.approve')}
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                {t('entryPermissions.approve')}
                              </button>
                              <button
                                onClick={() => handleReject(permId)}
                                disabled={actionLoading === permId + '_reject'}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors"
                                title={t('entryPermissions.reject')}
                              >
                                <XCircleIcon className="h-3.5 w-3.5" />
                                {t('entryPermissions.reject')}
                              </button>
                            </>
                          )}
                          <Link
                            to={`/entry-permissions/${permId}`}
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                            title={t('common.view')}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          {!isReceptionniste && perm.status !== 'PENDING_APPROVAL' && (
                            <Link
                              to={`/entry-permissions/${permId}/edit`}
                              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-colors"
                              title={t('common.edit')}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => setConfirmDeleteId(permId)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
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
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20'
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

      {/* ── Delete Confirmation Modal ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-5 border border-slate-100 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-center font-medium">
                {t('entryPermissions.confirmDelete')}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary px-5">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm disabled:opacity-60 transition-colors">
                {deleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

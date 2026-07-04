import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  PencilSquareIcon,
  FunnelIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '../../api/axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import DatePickerInput from '../../components/common/DatePickerInput'

const STATUS_META = {
  DRAFT:            { label: 'guides.statusDRAFT',            color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  SUBMITTED:        { label: 'guides.statusSUBMITTED',        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  APPROVED:         { label: 'guides.statusAPPROVED',         color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  REJECTED:         { label: 'guides.statusREJECTED',         color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  FINAL_PUBLISHED:  { label: 'guides.statusFINAL_PUBLISHED',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  LIVE_IN_PROGRESS: { label: 'guides.statusLIVE_IN_PROGRESS', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  LIVE_STOPPED:     { label: 'guides.statusLIVE_STOPPED',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  ARCHIVED:         { label: 'guides.statusARCHIVED',         color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

export default function ProducerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const printRef = useRef(null)

  const [producer, setProducer] = useState(null)
  const [guides, setGuides] = useState([])
  const [total, setTotal] = useState(0)
  const [filteredStats, setFilteredStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guidesLoading, setGuidesLoading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const limit = 20

  // Load producer info once
  useEffect(() => {
    api.get(`/admin/producers/${id}`)
      .then(res => setProducer(res.data?.data || null))
      .catch(() => navigate('/admin/producers'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  // Load guides when filters/sort/page change
  const fetchGuides = useCallback(() => {
    setGuidesLoading(true)
    const params = { page, limit, sort: sortField, order: sortOrder }
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (statusFilter) params.status = statusFilter

    api.get(`/admin/producers/${id}/guides`, { params })
      .then(res => {
        const d = res.data?.data
        setGuides(d?.data || [])
        setTotal(d?.total || 0)
        setFilteredStats(d?.filteredStats || null)
      })
      .catch(() => {})
      .finally(() => setGuidesLoading(false))
  }, [id, page, sortField, sortOrder, dateFrom, dateTo, statusFilter])

  useEffect(() => {
    fetchGuides()
  }, [fetchGuides])

  const hasFilters = dateFrom || dateTo || statusFilter
  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setStatusFilter(''); setPage(1)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleDelete = async (guideId) => {
    setDeletingId(guideId)
    try {
      await api.delete(`/guides/${guideId}`)
      setGuides(prev => prev.filter(g => g._id !== guideId))
      setTotal(prev => prev - 1)
      setConfirmDeleteId(null)
    } catch {
      // silently fail — user sees no change
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportPdf = () => {
    window.print()
  }

  const totalPages = Math.ceil(total / limit)

  if (loading) return <LoadingSpinner className="py-20" />
  if (!producer) return null

  const initials = producer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // Use filteredStats when available (always after first fetch), fallback to producer.stats
  const displayStats = filteredStats || producer.stats

  // Build mini chart data: group guides by month
  const monthCounts = {}
  guides.forEach(g => {
    const key = format(new Date(g.createdAt), 'MMM yy', { locale: fr })
    monthCounts[key] = (monthCounts[key] || 0) + 1
  })
  const chartData = Object.entries(monthCounts).slice(-6)
  const maxCount = Math.max(...chartData.map(([, v]) => v), 1)

  const filterLabel = [
    dateFrom && `${t('admin.dateFrom')}: ${format(new Date(dateFrom), 'dd/MM/yyyy')}`,
    dateTo && `${t('admin.dateTo')}: ${format(new Date(dateTo), 'dd/MM/yyyy')}`,
    statusFilter && t(STATUS_META[statusFilter]?.label),
  ].filter(Boolean).join(' · ')

  return (
    <>
      {/* Print-only header */}
      <div className="hidden print:block print:mb-6 print:border-b print:pb-4">
        {/* Logo row */}
        <div className="flex justify-center mb-4">
          <img src="/assets/logo-main.png" alt="Radio Monastir" style={{ height: 96, width: 'auto' }} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{t('admin.producerTracking')} — Radio Monastir</p>
            <h1 className="text-xl font-bold text-slate-800">{producer.name}</h1>
            <p className="text-xs text-slate-500">{producer.email}</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-slate-400">{t('admin.exportedOn')} {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            {filterLabel && <p className="text-xs text-slate-500 mt-0.5">{filterLabel}</p>}
          </div>
        </div>
        {/* Print stats row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{displayStats.total}</p>
            <p className="text-[11px] text-slate-500">{t('admin.totalGuides')}</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-amber-600">{displayStats.draft}</p>
            <p className="text-[11px] text-slate-500">{t('guides.statusDRAFT')}</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-sky-600">{displayStats.submitted}</p>
            <p className="text-[11px] text-slate-500">{t('guides.statusSUBMITTED')}</p>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{displayStats.validated}</p>
            <p className="text-[11px] text-slate-500">{t('admin.validated')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 print:space-y-4" ref={printRef}>
        {/* Back + Header + Export button */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => navigate('/admin/producers')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{t('admin.producerTracking')}</p>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{producer.name}</h1>
          </div>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200/40 dark:shadow-indigo-900/30 transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            {t('admin.exportPdf')}
          </button>
        </div>

        {/* Producer profile card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden print:hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-400 via-purple-500 to-violet-500 print:hidden" />
          <div className="p-6 print:p-4">
            <div className="flex items-start gap-5 flex-wrap">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200/40 dark:shadow-indigo-900/30 flex-shrink-0 print:hidden">
                <span className="text-white font-bold text-xl">{initials}</span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white print:hidden">{producer.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 print:hidden">{producer.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 print:hidden">
                  {t('admin.memberSince')} {format(new Date(producer.createdAt), 'MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            {/* Stats cards — reactive to filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 print:mt-0 print:hidden">
              <ProfileStat
                icon={<BookOpenIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
                bg="bg-indigo-50 dark:bg-indigo-900/20"
                label={t('admin.totalGuides')}
                value={displayStats.total}
                highlight={hasFilters}
              />
              <ProfileStat
                icon={<PencilSquareIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                bg="bg-amber-50 dark:bg-amber-900/20"
                label={t('guides.statusDRAFT')}
                value={displayStats.draft}
                highlight={hasFilters}
              />
              <ProfileStat
                icon={<ClockIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
                bg="bg-sky-50 dark:bg-sky-900/20"
                label={t('guides.statusSUBMITTED')}
                value={displayStats.submitted}
                highlight={hasFilters}
              />
              <ProfileStat
                icon={<CheckBadgeIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                bg="bg-emerald-50 dark:bg-emerald-900/20"
                label={t('admin.validated')}
                value={displayStats.validated}
                highlight={hasFilters}
              />
            </div>

            {/* Filter active indicator */}
            {hasFilters && (
              <div className="mt-3 flex items-center gap-2 print:hidden">
                <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full font-medium">
                  <FunnelIcon className="h-3 w-3" />
                  {t('admin.statsFilteredBy')} {filterLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mini activity chart — hidden on print */}
        {chartData.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 print:hidden">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <ChartBarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('admin.activityChart')}</h3>
            </div>
            <div className="flex items-end gap-2 h-20">
              {chartData.map(([month, count]) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{count}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 min-h-[4px] transition-all duration-500"
                    style={{ height: `${(count / maxCount) * 60}px` }}
                  />
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 text-center leading-tight">{month}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-4 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <FunnelIcon className="h-4 w-4" />
              {t('common.filter')}
            </div>

            <DatePickerInput
              value={dateFrom}
              onChange={v => { setDateFrom(v); setPage(1) }}
              placeholder={t('admin.dateFrom')}
              variant="light-inline"
            />
            <DatePickerInput
              value={dateTo}
              onChange={v => { setDateTo(v); setPage(1) }}
              placeholder={t('admin.dateTo')}
              variant="light-inline"
            />

            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-sm text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all"
            >
              <option value="">{t('admin.allStatuses')}</option>
              {Object.keys(STATUS_META).map(s => (
                <option key={s} value={s}>{t(STATUS_META[s].label)}</option>
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

        {/* Guides table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden print:rounded-none print:border print:shadow-none">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10 flex items-center justify-between print:bg-transparent print:from-transparent print:to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 print:hidden">
                <BookOpenIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('admin.programsList')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('admin.filteredResults', { count: total })}</p>
              </div>
            </div>
            {total > 0 && (
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 print:hidden">
                {total}
              </span>
            )}
          </div>

          {guidesLoading ? (
            <LoadingSpinner className="py-12 print:hidden" />
          ) : guides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 print:py-8">
              <div className="p-5 bg-slate-50 dark:bg-gray-700/30 rounded-2xl print:hidden">
                <BookOpenIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <>
              {/* Table (desktop + print) */}
              <div className="hidden md:block print:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-gray-700 print:border-gray-300">
                      <SortTh field="programTitle" current={sortField} order={sortOrder} onSort={handleSort} label={t('guides.programTitle')} />
                      <SortTh field="createdAt" current={sortField} order={sortOrder} onSort={handleSort} label={t('common.createdAt')} />
                      <SortTh field="broadcastDate" current={sortField} order={sortOrder} onSort={handleSort} label={t('guides.broadcastDate')} />
                      <SortTh field="status" current={sortField} order={sortOrder} onSort={handleSort} label={t('common.status')} />
                      <th className="px-4 py-3 text-start text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                        {t('admin.guests')}
                      </th>
                      <th className="px-4 py-3 text-end text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide print:hidden">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-gray-700/50 print:divide-gray-200">
                    {guides.map(guide => (
                      <GuideRow key={guide._id} guide={guide} t={t} onDelete={() => setConfirmDeleteId(guide._id)} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards (hidden on print) */}
              <div className="md:hidden print:hidden divide-y divide-slate-50 dark:divide-gray-700/50">
                {guides.map(guide => (
                  <GuideMobileCard key={guide._id} guide={guide} t={t} onDelete={() => setConfirmDeleteId(guide._id)} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination — hidden on print */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 print:hidden">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {t('common.previous')}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
              .map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                    p === page
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/40'
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

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
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
                disabled={!!deletingId}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ProfileStat({ icon, bg, label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 flex items-center gap-3 transition-all ${
      highlight
        ? 'bg-white dark:bg-gray-700 ring-2 ring-indigo-200 dark:ring-indigo-700 shadow-sm'
        : 'bg-slate-50 dark:bg-gray-700/50'
    }`}>
      <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
  )
}

function SortTh({ field, current, order, onSort, label }) {
  const active = current === field
  return (
    <th
      className="px-4 py-3 text-start text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors select-none print:cursor-default print:text-gray-500"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="print:hidden">
          {active ? (
            order === 'asc'
              ? <ArrowUpIcon className="h-3 w-3 text-indigo-500" />
              : <ArrowDownIcon className="h-3 w-3 text-indigo-500" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 opacity-30" />
          )}
        </span>
      </div>
    </th>
  )
}

function GuideRow({ guide, t, onDelete }) {
  const meta = STATUS_META[guide.status] || STATUS_META.DRAFT
  const broadcastDisplay = guide.broadcastDate
    ? format(new Date(guide.broadcastDate), 'dd/MM/yyyy')
    : '—'
  const timeDisplay = guide.startTime
    ? `${guide.startTime}${guide.endTime ? ` → ${guide.endTime}` : ''}`
    : '—'

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors print:hover:bg-transparent">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
          {guide.programTitle || <span className="text-slate-300 dark:text-slate-600 italic">{t('guides.untitled')}</span>}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {format(new Date(guide.createdAt), 'dd/MM/yyyy')}
      </td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
        <div>{broadcastDisplay}</div>
        {timeDisplay !== '—' && <div className="text-[11px] text-slate-400">{timeDisplay}</div>}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>
          {t(meta.label)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <UserGroupIcon className="h-3.5 w-3.5 text-slate-400 print:hidden" />
          <span className="text-slate-600 dark:text-slate-300 font-medium">{guide.guestCount || 0}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-end print:hidden">
        <div className="inline-flex items-center gap-1">
          <Link
            to={`/guides/${guide._id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            {t('common.view')}
          </Link>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t('common.delete')}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function GuideMobileCard({ guide, t, onDelete }) {
  const meta = STATUS_META[guide.status] || STATUS_META.DRAFT
  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">
          {guide.programTitle || <span className="text-slate-300 italic">{t('guides.untitled')}</span>}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>
            {t(meta.label)}
          </span>
          <span className="text-[11px] text-slate-400">
            <CalendarDaysIcon className="inline h-3 w-3 me-0.5" />
            {format(new Date(guide.createdAt), 'dd/MM/yy')}
          </span>
          <span className="text-[11px] text-slate-400">
            <UserGroupIcon className="inline h-3 w-3 me-0.5" />
            {guide.guestCount || 0}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Link
          to={`/guides/${guide._id}`}
          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        >
          <EyeIcon className="h-4 w-4" />
        </Link>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title={t('common.delete')}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

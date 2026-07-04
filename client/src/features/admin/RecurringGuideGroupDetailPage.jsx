import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  UsersIcon, ArrowLeftIcon, CalendarDaysIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, EyeIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import api from '../../api/axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const STATUS_STYLES = {
  PLANNED:   'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-slate-300',
  DRAFT:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUBMITTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LATE:      'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  VALIDATED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LIVE:      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  ARCHIVED:  'bg-slate-200 text-slate-500 dark:bg-gray-700 dark:text-slate-400',
  DISABLED:  'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
}

const WEEKDAY_COLORS = [
  'from-blue-400 to-blue-600', 'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600', 'from-purple-400 to-purple-600',
  'from-fuchsia-400 to-fuchsia-600', 'from-pink-400 to-rose-500',
  'from-orange-400 to-amber-500',
]

function StatusBadge({ status, t }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[status] || STATUS_STYLES.PLANNED}`}>
      {t(`recurring.occurrenceStatus.${status}`)}
    </span>
  )
}

function getCountdown(deadline, t) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return { label: t('recurring.overdue'), color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' }
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (mins < 60) return { label: t('recurring.minutesLeft', { count: mins }), color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' }
  if (hours < 24) return { label: t('recurring.hoursLeft', { count: hours }), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' }
  return { label: t('recurring.daysLeft', { count: days }), color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' }
}

export default function RecurringGuideGroupDetailPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGroup = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/recurring-guides/groups/${groupId}`)
      setRows(res.data?.data || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [groupId])

  useEffect(() => { fetchGroup() }, [fetchGroup])

  if (loading) return <LoadingSpinner className="py-20" />
  if (!rows.length) return <div className="text-center py-20 text-slate-400">{t('common.noData')}</div>

  const first = rows[0].template
  const wd = first?.weekday ?? 0

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 mb-4 transition-colors">
          {t('recurring.backToTemplates')}
        </button>

        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 p-6 text-white shadow-lg">
          <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
            <UsersIcon className="h-40 w-40" />
          </div>
          <div className={`absolute top-0 start-0 w-full h-1 bg-gradient-to-r ${WEEKDAY_COLORS[wd]}`} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
                {t('recurring.groupBanner', { count: rows.length })}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{first.programName}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <CalendarDaysIcon className="h-4 w-4" />
                {t(`recurring.weekdays.${wd}`)}
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" />
                {first.startTime} – {first.endTime}
              </span>
              <span className="text-white/60 text-xs">
                {first.submissionDeadlineHours}h {t('recurring.beforeBroadcast')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <UsersIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('recurring.statusByProducer')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('recurring.producersInGroup', { count: rows.length })}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-gray-700 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-gray-900/30">
                <th className="px-4 py-3 text-start font-semibold">{t('recurring.producerColumn')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('recurring.templateColumn')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('recurring.broadcastDate')}</th>
                <th className="px-4 py-3 text-start font-semibold">{t('common.status')}</th>
                <th className="px-4 py-3 text-start font-semibold hidden md:table-cell">{t('recurring.deadline')}</th>
                <th className="px-4 py-3 text-end font-semibold">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
              {rows.map(({ template: tmpl, nextOccurrence: occ }) => {
                const countdown = occ ? getCountdown(occ.submissionDeadline, t) : null
                return (
                  <tr key={tmpl._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Producer */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 dark:text-white">{tmpl.producerId?.name || '—'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{tmpl.producerId?.email || ''}</p>
                    </td>
                    {/* Template active/inactive */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        tmpl.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-slate-400'
                      }`}>
                        {tmpl.isActive
                          ? <><CheckCircleIcon className="h-3 w-3" />{t('recurring.active')}</>
                          : <><XCircleIcon className="h-3 w-3" />{t('recurring.inactive')}</>}
                      </span>
                    </td>
                    {/* Next occurrence date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {occ ? (
                        <>
                          <p className="font-semibold text-slate-800 dark:text-white">
                            {format(new Date(occ.scheduledDate), 'dd MMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{occ.startTime} – {occ.endTime}</p>
                        </>
                      ) : <span className="text-xs text-slate-300 dark:text-gray-600">—</span>}
                    </td>
                    {/* Occurrence status */}
                    <td className="px-4 py-3">
                      {occ ? (
                        <div className="flex items-center gap-1">
                          <StatusBadge status={occ.status} t={t} />
                          {occ.status === 'LATE' && <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />}
                        </div>
                      ) : <span className="text-xs text-slate-300 dark:text-gray-600">—</span>}
                    </td>
                    {/* Countdown */}
                    <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                      {occ && !['VALIDATED', 'DISABLED', 'ARCHIVED', 'LIVE'].includes(occ.status) && countdown ? (
                        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${countdown.bg} ${countdown.color}`}>
                          {countdown.label}
                        </span>
                      ) : occ?.validatedAt ? (
                        <span className="text-xs text-slate-400">{format(new Date(occ.validatedAt), 'dd/MM/yyyy')}</span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Link
                          to={`/admin/recurring-guides/${tmpl._id}`}
                          className="p-1.5 bg-slate-50 dark:bg-gray-700 text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-all"
                          title={t('recurring.viewTemplate')}
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  BookOpenIcon, CheckCircleIcon, PlusIcon,
  CalendarDaysIcon, ChevronRightIcon, PencilSquareIcon,
  EyeIcon, DocumentTextIcon, ClockIcon, ExclamationTriangleIcon,
  PencilIcon, BellAlertIcon, ArrowRightIcon, TrashIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'
import { deleteGuide } from '../guides/api'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

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

export default function ProducerDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ draftGuides: 0, validatedGuides: 0 })
  const [recentGuides, setRecentGuides] = useState([])
  const [upcomingOcc, setUpcomingOcc] = useState([])
  const [actionLoading, setActionLoading] = useState(null)
  const [requestedAccess, setRequestedAccess] = useState({})
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [occGuideMap, setOccGuideMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  useEffect(() => {
    const fetchData = async () => {
      try {
        const base = { createdBy: user?.id }
        if (dateFrom) base.dateFrom = dateFrom
        if (dateTo) base.dateTo = dateTo
        const [guidesRes, pendingRes, validatedRes, occRes] = await Promise.all([
          api.get('/guides', { params: { ...base, limit: 5 } }),
          api.get('/guides', { params: { ...base, status: 'DRAFT,SUBMITTED' } }),
          api.get('/guides', { params: { ...base, status: 'FINAL_PUBLISHED,APPROVED' } }),
          api.get('/recurring-guides/occurrences', { params: { status: 'PLANNED,LATE,DRAFT', limit: 3 } }).catch(() => ({ data: null })),
        ])
        setStats({
          draftGuides: pendingRes.data?.pagination?.total || 0,
          validatedGuides: validatedRes.data?.pagination?.total || 0,
        })
        setRecentGuides(guidesRes.data?.data || [])
        const occurrences = occRes.data?.data?.data || []
        setUpcomingOcc(occurrences)

        // Build map: occurrenceId → guide (to detect already-created drafts)
        if (occurrences.length > 0) {
          const occGuidesRes = await api.get('/guides', {
            params: { status: 'DRAFT,SUBMITTED,APPROVED,FINAL_PUBLISHED,REJECTED', limit: 50, createdBy: user?.id },
          }).catch(() => null)
          const map = {}
          ;(occGuidesRes?.data?.data || []).forEach(g => {
            if (g.occurrenceId) map[String(g.occurrenceId)] = g
          })
          setOccGuideMap(map)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user, dateFrom, dateTo])

  const refreshOcc = async () => {
    try {
      const res = await api.get('/recurring-guides/occurrences', { params: { status: 'PLANNED,LATE,DRAFT', limit: 3 } })
      setUpcomingOcc(res.data?.data?.data || [])
    } catch { /* silent */ }
  }


  const handleCreateGuide = async (occ) => {
    setActionLoading(occ._id + '_create')
    try {
      const broadcastDate = format(new Date(occ.scheduledDate), 'yyyy-MM-dd')
      const res = await api.post('/guides', {
        programTitle: occ.programName,
        producerName: user?.name || '',
        broadcastDate,
        startTime: occ.startTime,
        endTime: occ.endTime,
        occurrenceId: occ._id,
      })
      const guideId = res.data?.data?._id || res.data?._id
      // Mark occurrence as started (DRAFT) if still PLANNED or LATE (with access granted)
      if (['PLANNED', 'LATE'].includes(occ.status)) {
        await api.patch(`/recurring-guides/occurrences/${occ._id}/start`).catch(() => {})
      }
      navigate(`/guides/${guideId}/edit`)
    } catch { /* silent */ } finally { setActionLoading(null) }
  }

  const handleRequestAccess = async (occ) => {
    setActionLoading(occ._id + '_request')
    try {
      await api.post(`/recurring-guides/occurrences/${occ._id}/request-access`)
      setRequestedAccess(prev => ({ ...prev, [occ._id]: true }))
    } catch { /* silent */ } finally { setActionLoading(null) }
  }

  const handleDelete = async (guideId) => {
    try {
      await deleteGuide(guideId)
      setRecentGuides(prev => prev.filter(g => (g._id || g.id) !== guideId))
      setConfirmDeleteId(null)
    } catch { /* silent */ }
  }

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg shadow-indigo-200/40 dark:shadow-indigo-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <DocumentTextIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DocumentTextIcon className="h-5 w-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">{t('roles.PRODUCTEUR')}</span>
            </div>
            <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {firstName}</h1>
            <p className="text-sm text-white/60 mt-1">Radio Monastir</p>
          </div>
          <Link
            to="/guides/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/20 shadow-lg transition-all duration-200"
          >
            <PlusIcon className="h-4 w-4" />
            {t('guides.new')}
          </Link>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30">
            <BookOpenIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.pendingGuides')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.draftGuides}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm shadow-emerald-200/50 dark:shadow-emerald-900/30">
            <CheckCircleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.validatedGuides')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.validatedGuides}</p>
          </div>
        </div>
      </div>

      {/* Upcoming recurring occurrences */}
      {upcomingOcc.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-300/40">
              <CalendarDaysIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('recurring.myOccurrences')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{upcomingOcc.length} {t('recurring.upcoming').toLowerCase()}</p>
            </div>
            <span className="ms-auto w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-sm font-bold flex items-center justify-center">
              {upcomingOcc.length}
            </span>
          </div>

          {/* Cards grid */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {upcomingOcc.map((occ) => {
              const countdown = getCountdown(occ.submissionDeadline, t)
              const isPlanned = occ.status === 'PLANNED'
              const isDraft = occ.status === 'DRAFT'
              const isLate = occ.status === 'LATE' || (isPlanned && new Date(occ.submissionDeadline) < new Date())
              const canCreateLate = isLate && occ.accessGranted
              const existingGuide = occGuideMap[String(occ._id)]
              const isRejected = isDraft && existingGuide?.status === 'REJECTED'

              return (
                <div key={occ._id} className={`rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col ${
                  isLate
                    ? 'border-red-200 dark:border-red-800'
                    : isRejected
                      ? 'border-amber-200 dark:border-amber-800'
                      : isDraft
                        ? 'border-indigo-200 dark:border-indigo-700'
                        : 'border-slate-100 dark:border-gray-700'
                }`}>
                  {/* Colored top bar */}
                  <div className={`h-1.5 w-full ${
                    isLate ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                    isRejected ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                    isDraft ? 'bg-gradient-to-r from-indigo-400 to-violet-500' :
                    'bg-gradient-to-r from-violet-400 to-purple-500'
                  }`} />

                  {/* Rejected banner */}
                  {isRejected && (
                    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/50 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t('recurring.guideRejected')}</p>
                    </div>
                  )}

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    {/* Header: icon + name + status badge */}
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                        isLate ? 'bg-red-100 dark:bg-red-900/30' :
                        isDraft ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                        'bg-violet-100 dark:bg-violet-900/30'
                      }`}>
                        {isLate
                          ? <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                          : isDraft
                            ? <PencilIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            : <CalendarDaysIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-white truncate leading-tight">{occ.programName}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {format(new Date(occ.scheduledDate), 'dd MMM yyyy', { locale: fr })} · {occ.startTime}
                        </p>
                        {occ.templateId?.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic truncate">{occ.templateId.description}</p>
                        )}
                      </div>
                      {/* Status pill */}
                      {isLate ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          {t('recurring.occurrenceStatus.LATE')}
                        </span>
                      ) : isDraft ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <PencilIcon className="h-3 w-3" />
                          {t('recurring.occurrenceStatus.DRAFT')}
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                          <ClockIcon className="h-3 w-3" />
                          {t('recurring.occurrenceStatus.PLANNED')}
                        </span>
                      )}
                    </div>

                    {/* Countdown bar */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${countdown.bg}`}>
                      <ClockIcon className={`h-3.5 w-3.5 flex-shrink-0 ${countdown.color}`} />
                      <span className={`text-xs font-semibold ${countdown.color}`}>
                        {t('recurring.deadline')} : {countdown.label}
                      </span>
                    </div>

                    {/* Action button — full width, pushed to bottom */}
                    <div className="mt-auto">
                      {isDraft ? (
                        <button
                          onClick={() => existingGuide && navigate(`/guides/${existingGuide._id}/edit`)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-sm shadow-indigo-200/50 dark:shadow-indigo-900/30 transition-all active:scale-[0.98]"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          {t('recurring.continueGuide')}
                          <ArrowRightIcon className="h-4 w-4 ms-auto" />
                        </button>
                      ) : isLate ? (
                        canCreateLate ? (
                          <button
                            onClick={() => existingGuide ? navigate(`/guides/${existingGuide._id}/edit`) : handleCreateGuide(occ)}
                            disabled={!!actionLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm shadow-teal-200/50 dark:shadow-teal-900/30 transition-all active:scale-[0.98] disabled:opacity-60"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            {existingGuide ? t('recurring.continueGuide') : (actionLoading === occ._id + '_create' ? t('common.loading') : t('recurring.createGuide'))}
                            <ArrowRightIcon className="h-4 w-4 ms-auto" />
                          </button>
                        ) : requestedAccess[occ._id] ? (
                          <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                            <BellAlertIcon className="h-4 w-4" />
                            {t('recurring.accessRequested')}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRequestAccess(occ)}
                            disabled={!!actionLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30 transition-all active:scale-[0.98] disabled:opacity-60"
                          >
                            <BellAlertIcon className="h-4 w-4" />
                            {actionLoading === occ._id + '_request' ? t('common.loading') : t('recurring.requestAccess')}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleCreateGuide(occ)}
                          disabled={!!actionLoading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm shadow-teal-200/50 dark:shadow-teal-900/30 transition-all active:scale-[0.98] disabled:opacity-60"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          {actionLoading === occ._id + '_create' ? t('common.loading') : t('recurring.createGuide')}
                          <ArrowRightIcon className="h-4 w-4 ms-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}


      {/* Recent activity */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm shadow-indigo-200/50 dark:shadow-indigo-900/30">
              <BookOpenIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('dashboard.recentActivity')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('guides.title')}</p>
            </div>
            {recentGuides.length > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                {recentGuides.length}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : recentGuides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl">
                <BookOpenIcon className="h-12 w-12 text-indigo-300 dark:text-indigo-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGuides.map((guide) => {
                const gId = guide._id || guide.id
                const canEdit = ['DRAFT', 'SUBMITTED', 'REJECTED'].includes(guide.status)
                return (
                  <Link
                    key={gId}
                    to={canEdit ? `/guides/${gId}/edit` : (guide.status === 'ARCHIVED' ? `/guides/${gId}/live` : `/guides/${gId}`)}
                    className="block rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200 overflow-hidden"
                  >
                    <div className={`h-1 ${
                      guide.status === 'LIVE_IN_PROGRESS' ? 'bg-gradient-to-r from-red-400 to-rose-500' :
                      guide.status === 'LIVE_STOPPED' ? 'bg-gradient-to-r from-orange-400 to-amber-500' :
                      ['APPROVED', 'FINAL_PUBLISHED'].includes(guide.status) ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                      guide.status === 'REJECTED' ? 'bg-gradient-to-r from-red-400 to-red-500' :
                      guide.status === 'ARCHIVED' ? 'bg-gradient-to-r from-slate-300 to-slate-400' :
                      'bg-gradient-to-r from-indigo-400 to-purple-400'
                    }`} />
                    <div className="p-4 flex items-center gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
                        guide.status === 'LIVE_IN_PROGRESS' ? 'bg-gradient-to-br from-red-400 to-rose-500' :
                        ['APPROVED', 'FINAL_PUBLISHED'].includes(guide.status) ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                        'bg-gradient-to-br from-indigo-400 to-purple-400'
                      }`}>
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {guide.programTitle || t('guides.title')}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {guide.producerName && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">{guide.producerName}</span>
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
                        {canEdit ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-200/40 dark:shadow-amber-900/20">
                            <PencilSquareIcon className="h-4 w-4" />
                            {t('common.edit')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-gray-800">
                            <EyeIcon className="h-3.5 w-3.5" />
                            {t('common.view')}
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(gId) }}
                          className="p-2 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
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

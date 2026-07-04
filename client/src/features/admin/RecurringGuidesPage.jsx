import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDaysIcon, ClockIcon, UserIcon, UsersIcon, PlusIcon,
  PencilSquareIcon, TrashIcon, EyeIcon,
  CheckCircleIcon, XCircleIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import RecurringGuideFormModal from './RecurringGuideFormModal'

const WEEKDAY_COLORS = [
  'from-blue-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600',
  'from-purple-400 to-purple-600',
  'from-fuchsia-400 to-fuchsia-600',
  'from-pink-400 to-rose-500',
  'from-orange-400 to-amber-500',
]

function TemplateCard({ tmpl, t, onEdit, onToggle, onDelete }) {
  const wd = tmpl.weekday ?? 0
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Color bar */}
      <div className={`h-1.5 bg-gradient-to-r ${WEEKDAY_COLORS[wd]}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${WEEKDAY_COLORS[wd]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <span className="text-white text-xs font-bold">
                {t(`recurring.weekdays.${wd}`).slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm">{tmpl.programName}</h3>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                tmpl.isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-slate-400'
              }`}>
                {tmpl.isActive ? (
                  <><CheckCircleIcon className="h-3 w-3" />{t('recurring.active')}</>
                ) : (
                  <><XCircleIcon className="h-3 w-3" />{t('recurring.inactive')}</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
            <span>{t(`recurring.weekdays.${wd}`)}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 flex-shrink-0" />
            <span>{tmpl.startTime} – {tmpl.endTime}</span>
            <span className="ms-auto text-xs bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-medium text-slate-600 dark:text-slate-300">
              {tmpl.submissionDeadlineHours}h avant
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{tmpl.producerId?.name || '—'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/admin/recurring-guides/${tmpl._id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 rounded-lg transition-all"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            {t('common.view')}
          </Link>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 rounded-lg transition-all"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
            {t('common.edit')}
          </button>
          <button
            onClick={onToggle}
            title={t('recurring.toggleActive')}
            className={`p-2 rounded-lg text-xs font-semibold transition-all ${
              tmpl.isActive
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
            }`}
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-all"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function GroupCard({ groupId, templates, t, onEdit, onToggle, onDelete }) {
  const first = templates[0]
  const wd = first.weekday ?? 0
  const allActive = templates.every(tmpl => tmpl.isActive)
  const someActive = templates.some(tmpl => tmpl.isActive)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-violet-100 dark:border-violet-900/30 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${WEEKDAY_COLORS[wd]}`} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${WEEKDAY_COLORS[wd]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm">{first.programName}</h3>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                allActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : someActive ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-slate-400'
              }`}>
                {allActive ? <><CheckCircleIcon className="h-3 w-3" />{t('recurring.active')}</>
                  : someActive ? <><ArrowPathIcon className="h-3 w-3" />{t('recurring.partial')}</>
                  : <><XCircleIcon className="h-3 w-3" />{t('recurring.inactive')}</>}
              </span>
            </div>
          </div>
          <span className="flex-shrink-0 text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-lg">
            {templates.length} prod.
          </span>
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
            <span>{t(`recurring.weekdays.${wd}`)}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 flex-shrink-0" />
            <span>{first.startTime} – {first.endTime}</span>
            <span className="ms-auto text-xs bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-medium text-slate-600 dark:text-slate-300">
              {first.submissionDeadlineHours}h avant
            </span>
          </div>
        </div>

        {/* Producer chips */}
        <div className="flex flex-wrap gap-1 mb-4">
          {templates.slice(0, 4).map(tmpl => (
            <span key={tmpl._id} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              tmpl.isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-gray-700 dark:text-slate-400 dark:border-gray-600'
            }`}>
              {tmpl.producerId?.name || '—'}
            </span>
          ))}
          {templates.length > 4 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-gray-700 dark:text-slate-400">
              +{templates.length - 4}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            to={`/admin/recurring-guides/group/${groupId}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 rounded-lg transition-all"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            {t('common.view')}
          </Link>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 rounded-lg transition-all"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
            {t('common.edit')}
          </button>
          <button
            onClick={onToggle}
            title={t('recurring.toggleActive')}
            className={`p-2 rounded-lg transition-all ${
              allActive
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
            }`}
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-all"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RecurringGuidesPage() {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [filterActive, setFilterActive] = useState('')
  const [filterWeekday, setFilterWeekday] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editGroupTemplates, setEditGroupTemplates] = useState(null)

  const fetchTemplates = useCallback(async () => {
    try {
      const params = {}
      if (filterActive !== '') params.isActive = filterActive
      if (filterWeekday !== '') params.weekday = filterWeekday
      const res = await api.get('/recurring-guides/templates', { params })
      setTemplates(res.data?.data?.data || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [filterActive, filterWeekday])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleToggleActive = async (id) => {
    try {
      await api.patch(`/recurring-guides/templates/${id}/toggle`)
      fetchTemplates()
    } catch { /* silent */ }
  }

  const handleDelete = async (target) => {
    const ids = Array.isArray(target) ? target : [target]
    try {
      for (const id of ids) {
        await api.delete(`/recurring-guides/templates/${id}`)
      }
      setConfirmDelete(null)
      fetchTemplates()
    } catch { /* silent */ }
  }

  const handleGroupToggle = async (groupTemplates) => {
    const allActive = groupTemplates.every(t => t.isActive)
    const toToggle = allActive
      ? groupTemplates
      : groupTemplates.filter(t => !t.isActive)
    try {
      for (const tmpl of toToggle) {
        await api.patch(`/recurring-guides/templates/${tmpl._id}/toggle`)
      }
      fetchTemplates()
    } catch { /* silent */ }
  }

  const activeCount = templates.filter(t => t.isActive).length

  // Separate grouped templates from individual ones
  const groupedMap = {}
  const ungrouped = []
  for (const tmpl of templates) {
    if (tmpl.groupId) {
      if (!groupedMap[tmpl.groupId]) groupedMap[tmpl.groupId] = []
      groupedMap[tmpl.groupId].push(tmpl)
    } else {
      ungrouped.push(tmpl)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 p-6 text-white shadow-lg shadow-violet-200/40 dark:shadow-violet-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <CalendarDaysIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDaysIcon className="h-5 w-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">{t('nav.recurringGuides')}</span>
            </div>
            <h1 className="text-2xl font-bold">{t('recurring.title')}</h1>
            <p className="text-sm text-white/60 mt-1">
              {templates.length} {t('recurring.templates')} — {activeCount} {t('recurring.active').toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/20 shadow-lg transition-all duration-200"
          >
            <PlusIcon className="h-4 w-4" />
            {t('recurring.newTemplate')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterWeekday}
          onChange={e => setFilterWeekday(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-400 outline-none"
        >
          <option value="">{t('recurring.allDays')}</option>
          {[0,1,2,3,4,5,6].map(d => (
            <option key={d} value={d}>{t(`recurring.weekdays.${d}`)}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-400 outline-none"
        >
          <option value="">{t('recurring.allStatuses')}</option>
          <option value="true">{t('recurring.active')}</option>
          <option value="false">{t('recurring.inactive')}</option>
        </select>
        {(filterWeekday !== '' || filterActive !== '') && (
          <button
            onClick={() => { setFilterWeekday(''); setFilterActive('') }}
            className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg transition-colors"
          >
            {t('common.clear')}
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700">
          <div className="p-6 bg-violet-50 dark:bg-violet-900/20 rounded-2xl">
            <CalendarDaysIcon className="h-16 w-16 text-violet-300 dark:text-violet-600" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('recurring.noTemplates')}</p>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true) }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            <PlusIcon className="h-4 w-4" />
            {t('recurring.newTemplate')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(groupedMap).map(([gId, group]) => (
            <GroupCard
              key={gId}
              groupId={gId}
              templates={group}
              t={t}
              onEdit={() => { setEditTarget(group[0]); setEditGroupTemplates(group); setShowForm(true) }}
              onToggle={() => handleGroupToggle(group)}
              onDelete={() => setConfirmDelete(group.map(tmpl => tmpl._id))}
            />
          ))}
          {ungrouped.map(tmpl => (
            <TemplateCard
              key={tmpl._id}
              tmpl={tmpl}
              t={t}
              onEdit={() => { setEditTarget(tmpl); setShowForm(true) }}
              onToggle={() => handleToggleActive(tmpl._id)}
              onDelete={() => setConfirmDelete(tmpl._id)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <RecurringGuideFormModal
          initial={editTarget}
          groupTemplates={editGroupTemplates}
          onClose={() => { setShowForm(false); setEditGroupTemplates(null) }}
          onSaved={() => { setShowForm(false); setEditGroupTemplates(null); fetchTemplates() }}
        />
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-5 w-5 text-red-500" />
              </div>
              <p className="font-semibold text-slate-800 dark:text-white text-sm">
                {Array.isArray(confirmDelete)
                  ? t('recurring.confirmDeleteGroup', { count: confirmDelete.length })
                  : t('recurring.confirmDelete')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-all"
              >
                {t('common.delete')}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-sm transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

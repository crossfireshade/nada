import React, { useEffect, useState, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { XMarkIcon } from '@heroicons/react/24/outline'
import api from '../../api/axios'
import { LanguageContext } from '../../contexts/LanguageContext'

const DEADLINE_OPTIONS = [24, 36, 48, 72]

const generateGroupId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })

export default function RecurringGuideFormModal({ initial, groupTemplates, onClose, onSaved }) {
  const { t } = useTranslation()
  const { isRTL } = useContext(LanguageContext)
  const dir = isRTL ? 'rtl' : 'ltr'
  const isEdit = !!initial
  const isGroupEdit = isEdit && groupTemplates && groupTemplates.length > 1

  const [form, setForm] = useState({
    programName: '',
    weekday: 0,
    startTime: '09:00',
    endTime: '10:00',
    producerId: '',
    productionChiefId: '',
    submissionDeadlineHours: 48,
    weeksAhead: 4,
    description: '',
    isActive: true,
  })
  const [producers, setProducers] = useState([])
  const [chiefs, setChiefs] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState('')
  const [error, setError] = useState('')

  // Populate form when editing
  useEffect(() => {
    if (initial) {
      setForm({
        programName: initial.programName || '',
        weekday: initial.weekday ?? 0,
        startTime: initial.startTime || '09:00',
        endTime: initial.endTime || '10:00',
        producerId: initial.producerId?._id || initial.producerId || '',
        productionChiefId: initial.productionChiefId?._id || initial.productionChiefId || '',
        submissionDeadlineHours: initial.submissionDeadlineHours || 48,
        weeksAhead: initial.weeksAhead || 4,
        description: initial.description || '',
        isActive: initial.isActive ?? true,
      })
    }
  }, [initial])

  // Fetch users for dropdowns
  useEffect(() => {
    const fetchUsers = async () => {
      const [pRes, cRes] = await Promise.all([
        api.get('/users', { params: { role: 'PRODUCTEUR', limit: 100 } }),
        api.get('/users', { params: { role: 'RESPONSABLE_PRODUCTION', limit: 100 } }),
      ])
      setProducers(pRes.data?.data || [])
      setChiefs(cRes.data?.data || [])
    }
    fetchUsers().catch(() => {})
  }, [])

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const assignToAll = form.producerId === 'ALL'
    if (!form.programName.trim()) { setError(t('errors.required')); return }
    if (!isGroupEdit && !form.producerId) { setError(t('errors.required')); return }
    if (assignToAll && producers.length === 0) { setError(t('recurring.noProducersFound')); return }

    setSaving(true)
    try {
      const base = {
        programName: form.programName,
        weekday: Number(form.weekday),
        startTime: form.startTime,
        endTime: form.endTime,
        productionChiefId: form.productionChiefId || undefined,
        submissionDeadlineHours: Number(form.submissionDeadlineHours),
        weeksAhead: Number(form.weeksAhead),
        description: form.description,
        isActive: form.isActive,
      }

      if (isGroupEdit) {
        for (let i = 0; i < groupTemplates.length; i++) {
          const tmpl = groupTemplates[i]
          setSaveProgress(`${i + 1} / ${groupTemplates.length}`)
          await api.put(`/recurring-guides/templates/${tmpl._id}`, {
            ...base,
            producerId: tmpl.producerId?._id || tmpl.producerId,
          })
        }
        setSaveProgress('')
      } else if (isEdit) {
        await api.put(`/recurring-guides/templates/${initial._id}`, { ...base, producerId: form.producerId })
      } else if (form.producerId === 'ALL') {
        // Create one template per producer, all sharing the same groupId
        const groupId = generateGroupId()
        for (let i = 0; i < producers.length; i++) {
          const p = producers[i]
          setSaveProgress(`${i + 1} / ${producers.length}`)
          await api.post('/recurring-guides/templates', { ...base, producerId: p._id, groupId })
        }
        setSaveProgress('')
      } else {
        await api.post('/recurring-guides/templates', { ...base, producerId: form.producerId })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'))
    } finally {
      setSaving(false)
      setSaveProgress('')
    }
  }

  const isCustomDeadline = !DEADLINE_OPTIONS.includes(Number(form.submissionDeadlineHours))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" dir={dir} style={{ direction: dir }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            {isGroupEdit
              ? t('recurring.editGroup', { count: groupTemplates.length })
              : isEdit ? t('recurring.editTemplate') : t('recurring.newTemplate')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Program name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('recurring.programName')} *
            </label>
            <input
              type="text"
              value={form.programName}
              onChange={e => set('programName', e.target.value)}
              placeholder={t('recurring.programName')}
              className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
              required
            />
          </div>

          {/* Weekday + times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('recurring.weekday')} *
              </label>
              <select
                value={form.weekday}
                onChange={e => set('weekday', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
              >
                {[0,1,2,3,4,5,6].map(d => (
                  <option key={d} value={d}>{t(`recurring.weekdays.${d}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('recurring.startTime')} *
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('recurring.endTime')} *
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
                required
              />
            </div>
          </div>

          {/* Producer dropdown (hidden for group edit) */}
          {isGroupEdit ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('recurring.producer')}
              </label>
              <div className="flex flex-wrap gap-1 p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg">
                {groupTemplates.map(tmpl => (
                  <span key={tmpl._id} className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {tmpl.producerId?.name || '—'}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">{t('recurring.producersReadOnly')}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('recurring.producer')} *
              </label>
              <select
                value={form.producerId}
                onChange={e => set('producerId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
                required
              >
                <option value="">— {t('recurring.producer')} —</option>
                {!isEdit && (
                  <option value="ALL">★ Tous les producteurs ({producers.length})</option>
                )}
                {producers.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
              {form.producerId === 'ALL' && (
                <p className="mt-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium">
                  {t('recurring.allProducersInfo', { count: producers.length })}
                </p>
              )}
            </div>
          )}

          {/* Production chief (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('recurring.productionChief')} <span className="text-xs text-slate-400">({t('common.optional')})</span>
            </label>
            <select
              value={form.productionChiefId}
              onChange={e => set('productionChiefId', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
            >
              <option value="">— {t('common.optional')} —</option>
              {chiefs.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Deadline + weeks ahead */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('recurring.deadlineHours')} *
              </label>
              <select
                value={isCustomDeadline ? 'custom' : form.submissionDeadlineHours}
                onChange={e => {
                  if (e.target.value === 'custom') set('submissionDeadlineHours', '')
                  else set('submissionDeadlineHours', Number(e.target.value))
                }}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
              >
                {DEADLINE_OPTIONS.map(h => (
                  <option key={h} value={h}>{t(`recurring.deadlineHoursOptions.${h}`)}</option>
                ))}
                <option value="custom">Personnalisé</option>
              </select>
              {isCustomDeadline && (
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={form.submissionDeadlineHours}
                  onChange={e => set('submissionDeadlineHours', e.target.value)}
                  placeholder="Nombre d'heures"
                  className="mt-2 w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('recurring.weeksAhead')}
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={form.weeksAhead}
                onChange={e => set('weeksAhead', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('recurring.description')} <span className="text-xs text-slate-400">({t('common.optional')})</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder={t('recurring.description')}
              className="w-full px-3 py-2 border border-slate-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-400 outline-none resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {saveProgress && (
            <p className="text-sm text-violet-600 dark:text-violet-400 font-medium text-center">
              Création en cours : {saveProgress}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-all"
            >
              {saving
                ? (saveProgress ? `${t(isGroupEdit ? 'recurring.updatingProgress' : 'recurring.creatingProgress')}... ${saveProgress}` : t('common.loading'))
                : isGroupEdit
                  ? t('recurring.editGroupCount', { count: groupTemplates.length })
                  : form.producerId === 'ALL'
                    ? `${t('recurring.newTemplate')} (${producers.length})`
                    : t('common.save')
              }
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-sm transition-all"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { Cog6ToothIcon, TrophyIcon, CheckIcon } from '@heroicons/react/24/outline'
import api from '../../api/axios'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [maxWins, setMaxWins] = useState(2)
  const [inputVal, setInputVal] = useState('2')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/settings').then(res => {
      const val = res.data?.data?.maxWinsPerMonth ?? 2
      setMaxWins(val)
      setInputVal(String(val))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const num = parseInt(inputVal, 10)
    if (isNaN(num) || num < 1) return
    setSaving(true)
    try {
      await api.put('/settings/maxWinsPerMonth', { value: num })
      setMaxWins(num)
      addNotification({ type: 'success', message: t('settings.saved') })
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900 p-6 text-white shadow-lg">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <Cog6ToothIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Cog6ToothIcon className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">{t('settings.title')}</span>
          </div>
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-sm text-white/60 mt-1">Radio Monastir</p>
        </div>
      </div>

      {/* Settings card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <TrophyIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('settings.winnersSection')}</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              {t('settings.maxWinsPerMonth')}
            </label>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              {t('settings.maxWinsPerMonthHint')}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={20}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                disabled={loading}
                className="w-24 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 text-sm font-semibold text-center
                  focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 dark:focus:ring-teal-500/30 dark:focus:border-teal-500
                  disabled:opacity-50 transition-all"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">{t('settings.timesPerMonth')}</span>
              <button
                onClick={handleSave}
                disabled={saving || loading || parseInt(inputVal, 10) === maxWins || isNaN(parseInt(inputVal, 10)) || parseInt(inputVal, 10) < 1}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 rounded-xl shadow-sm disabled:opacity-50 transition-all"
              >
                <CheckIcon className="h-4 w-4" />
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-bold">{t('settings.currentValue')} : </span>
              {loading ? '…' : `${maxWins} ${t('settings.timesPerMonth')}`}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t('settings.maxWinsExplain', { max: loading ? '…' : maxWins })}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  TrophyIcon, PencilIcon, TrashIcon, GiftIcon, PhoneIcon,
  MegaphoneIcon, SparklesIcon, ClockIcon, FunnelIcon, CheckBadgeIcon,
  IdentificationIcon, NoSymbolIcon,
} from '@heroicons/react/24/outline'
import api from '../../api/axios'
import { updateWinner, deleteWinner, receiveWinner } from '../guides/api'
import { useNotifications } from '../../hooks/useNotifications'
import { format } from 'date-fns'

const RANK_STYLES = [
  { bg: 'bg-gradient-to-br from-amber-400 to-yellow-500', ring: 'ring-amber-200 dark:ring-amber-700', shadow: 'shadow-amber-200/50 dark:shadow-amber-900/30' },
  { bg: 'bg-gradient-to-br from-slate-300 to-slate-400', ring: 'ring-slate-200 dark:ring-slate-600', shadow: 'shadow-slate-200/50 dark:shadow-slate-800/30' },
  { bg: 'bg-gradient-to-br from-orange-400 to-amber-600', ring: 'ring-orange-200 dark:ring-orange-700', shadow: 'shadow-orange-200/50 dark:shadow-orange-900/30' },
]

const DEFAULT_RANK = { bg: 'bg-gradient-to-br from-sky-400 to-blue-500', ring: 'ring-sky-200 dark:ring-sky-700', shadow: 'shadow-sky-200/50 dark:shadow-sky-900/30' }

export default function PublicityDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [receivedWinners, setReceivedWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [editingWinner, setEditingWinner] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cinModal, setCinModal] = useState(false)
  const [cinWinner, setCinWinner] = useState(null)
  const [cinValue, setCinValue] = useState('')
  const [receiving, setReceiving] = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  const fetchData = async () => {
    try {
      const guidesRes = await api.get('/guides', { params: { status: 'FINAL_PUBLISHED,LIVE_IN_PROGRESS,ARCHIVED', limit: 100 } })
      const guides = guidesRes.data?.data || []
      const winners = []
      for (const guide of guides) {
        try {
          const wRes = await api.get(`/guides/${guide._id || guide.id}/winners`)
          const ws = wRes.data?.data || []
          winners.push(...ws.map(w => ({
            ...w,
            guideId: guide._id || guide.id,
            guideTheme: guide.programTitle || guide.theme,
          })))
        } catch {
          // non-critical
        }
      }
      setReceivedWinners(winners.filter(w => w.sentToPublicityAt).sort((a, b) => new Date(b.sentToPublicityAt) - new Date(a.sentToPublicityAt)))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const openEdit = (w) => {
    setEditingWinner(w)
    reset({ winnerName: w.winnerName, prize: w.prize, phone: w.phone })
    setEditModal(true)
  }

  const onSubmitEdit = async (data) => {
    try {
      await updateWinner(editingWinner.guideId, editingWinner._id || editingWinner.id, data)
      setEditModal(false)
      setEditingWinner(null)
      setLoading(true)
      await fetchData()
    } catch {
      // silent
    }
  }

  const openCinModal = (winner) => {
    setCinWinner(winner)
    setCinValue('')
    setCinModal(true)
  }

  const handleConfirmReceive = async () => {
    if (!cinWinner) return
    setReceiving(true)
    try {
      const res = await receiveWinner(cinWinner.guideId, cinWinner._id || cinWinner.id, { cin: cinValue.trim() })
      const data = res.data?.data || res.data
      if (data?.blacklistedNow) {
        addNotification({ type: 'error', message: t('winners.blacklistedAlert', { name: data.winnerName }) })
        setReceivedWinners(prev => prev.map(w =>
          (w._id || w.id) === (cinWinner._id || cinWinner.id) ? { ...w, blacklisted: true, cin: data.cin } : w
        ))
      } else {
        setReceivedWinners(prev => prev.map(w =>
          (w._id || w.id) === (cinWinner._id || cinWinner.id)
            ? { ...w, receivedByPublicityAt: data?.receivedByPublicityAt || new Date().toISOString(), cin: data.cin }
            : w
        ))
      }
      setCinModal(false)
      setCinWinner(null)
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setReceiving(false)
    }
  }

  const handleDelete = async (winner) => {
    setDeleting(true)
    try {
      await deleteWinner(winner.guideId, winner._id || winner.id)
      setConfirmDeleteId(null)
      setLoading(true)
      await fetchData()
    } catch {
      // silent
    } finally {
      setDeleting(false)
    }
  }

  // Filter winners by date range
  const filteredWinners = receivedWinners.filter(w => {
    const sent = new Date(w.sentToPublicityAt)
    if (dateFrom && sent < new Date(dateFrom + 'T00:00:00')) return false
    if (dateTo && sent > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <div className="space-y-6">
      {/* Hero welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 text-white shadow-lg shadow-orange-200/40 dark:shadow-orange-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <MegaphoneIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="h-5 w-5 text-amber-200" />
            <span className="text-sm font-medium text-white/80">{t('dashboard.welcome')}</span>
          </div>
          <h1 className="text-2xl font-bold">{firstName}</h1>
          <p className="text-sm text-white/70 mt-1">{t('roles.RESPONSABLE_PUBLICITE')}</p>
        </div>
      </div>

      {/* Stats cards — 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-200/50 dark:shadow-amber-900/30">
            <TrophyIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('winners.title')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{receivedWinners.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-sm shadow-purple-200/50 dark:shadow-purple-900/30">
            <GiftIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('winners.prize')}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{receivedWinners.filter(w => w.prize).length}</p>
          </div>
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

      {/* Winners list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <TrophyIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('nav.winners')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('winners.sentAt')}</p>
            </div>
            {filteredWinners.length > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                {filteredWinners.length}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : filteredWinners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl">
                <TrophyIcon className="h-12 w-12 text-amber-300 dark:text-amber-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWinners.map((w, idx) => {
                const wId = w._id || w.id
                const isConfirmingDelete = confirmDeleteId === wId
                const rankStyle = RANK_STYLES[idx] || DEFAULT_RANK
                return (
                  <div
                    key={wId}
                    className="group relative bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700 transition-all duration-200 overflow-hidden"
                  >
                    {/* Top accent bar */}
                    <div className={`h-1 ${rankStyle.bg}`} />

                    <div className="p-4 flex items-start gap-4">
                      {/* Rank badge */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${rankStyle.bg} ring-2 ${rankStyle.ring} shadow-lg ${rankStyle.shadow} flex items-center justify-center`}>
                        <span className="text-white text-lg font-bold">{idx + 1}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 dark:text-white text-base truncate">
                          {w.winnerName}
                        </p>
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                          {w.prize && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <GiftIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              {w.prize}
                            </span>
                          )}
                          {w.phone && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                              <PhoneIcon className="h-3.5 w-3.5 text-sky-500" />
                              <span dir="ltr">{w.phone}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2.5">
                          {w.guideTheme && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              {w.guideTheme}
                            </span>
                          )}
                          {w.sentToPublicityAt && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                              <ClockIcon className="h-3 w-3" />
                              {format(new Date(w.sentToPublicityAt), 'dd/MM/yyyy HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="px-4 py-2.5 border-t border-slate-50 dark:border-gray-700/50 bg-slate-50/50 dark:bg-gray-800/50 flex items-center justify-between gap-1">
                      {/* Received badge / blacklisted / action */}
                      {w.blacklisted ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-red-500 text-white shadow-sm select-none">
                          <NoSymbolIcon className="h-3.5 w-3.5 shrink-0" />
                          {t('winners.blacklisted')}
                        </span>
                      ) : w.receivedByPublicityAt ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-300/40 dark:shadow-emerald-900/30 select-none">
                          <CheckBadgeIcon className="h-3.5 w-3.5 shrink-0" />
                          {t('winners.received') || 'Reçu'}
                          <span className="font-normal opacity-80 ms-0.5" dir="ltr">{format(new Date(w.receivedByPublicityAt), 'dd/MM HH:mm')}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => openCinModal(w)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-300/40 dark:shadow-emerald-900/30 transition-all duration-150 active:scale-95 hover:shadow-md"
                        >
                          <CheckBadgeIcon className="h-3.5 w-3.5" />
                          {t('winners.markReceived') || 'Marquer reçu'}
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-500 font-medium">{t('common.confirmDelete')}</span>
                            <button
                              onClick={() => handleDelete(w)}
                              disabled={deleting}
                              className="text-xs py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-60 transition-colors"
                            >
                              {t('common.yes')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs py-1.5 px-3 btn-secondary rounded-lg"
                            >
                              {t('common.no')}
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(w)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(wId)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                              {t('common.delete')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* CIN modal */}
      <Modal isOpen={cinModal} onClose={() => { if (!receiving) { setCinModal(false); setCinWinner(null) } }} title={t('winners.confirmReceiveTitle')}>
        <div className="space-y-4">
          {cinWinner && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
              <TrophyIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-white text-sm">{cinWinner.winnerName}</p>
                {cinWinner.prize && <p className="text-xs text-slate-500 dark:text-slate-400">{cinWinner.prize}</p>}
              </div>
            </div>
          )}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <IdentificationIcon className="h-4 w-4 text-slate-400" />
              {t('winners.cinLabel')}
            </label>
            <input
              className="form-input"
              placeholder="XXXXXXXX"
              dir="ltr"
              value={cinValue}
              onChange={e => setCinValue(e.target.value)}
              disabled={receiving}
              autoFocus
            />
            <p className="text-xs text-slate-400 mt-1">{t('winners.cinHint')}</p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => { setCinModal(false); setCinWinner(null) }} className="btn-secondary" disabled={receiving}>
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirmReceive}
              disabled={receiving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-60"
            >
              <CheckBadgeIcon className="h-4 w-4" />
              {receiving ? t('common.loading') : t('winners.markReceived')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={editModal} onClose={() => { setEditModal(false); setEditingWinner(null) }} title={t('winners.title')}>
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="form-label">{t('winners.winnerName')}</label>
            <input className="form-input" {...register('winnerName', { required: t('errors.required') })} />
          </div>
          <div>
            <label className="form-label">{t('winners.prize')}</label>
            <input className="form-input" {...register('prize')} />
          </div>
          <div>
            <label className="form-label">{t('winners.phone')}</label>
            <input type="tel" className="form-input" dir="ltr" {...register('phone')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

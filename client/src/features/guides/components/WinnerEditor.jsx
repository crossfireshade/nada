import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../../hooks/useNotifications'
import { getWinners, createWinner, updateWinner, sendWinnersToPublicity } from '../api'
import Modal from '../../../components/common/Modal'
import { PlusIcon, PencilIcon, PaperAirplaneIcon, TrophyIcon, PhoneIcon, GiftIcon, CheckCircleIcon, CheckBadgeIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

const RANK_COLORS = [
  'from-amber-400 to-yellow-500',   // 1st — gold
  'from-slate-400 to-slate-500',    // 2nd — silver
  'from-orange-400 to-amber-500',   // 3rd — bronze
]

export default function WinnerEditor({ guideId, canSend = false }) {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [sending, setSending] = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm()

  const fetchWinners = () => {
    setLoading(true)
    getWinners(guideId)
      .then(r => setWinners(r.data?.data || []))
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchWinners() }, [guideId])

  const openCreate = () => { reset({}); setEditingId(null); setModalOpen(true) }
  const openEdit = (w) => { reset(w); setEditingId(w._id || w.id); setModalOpen(true) }

  const onSubmit = async (data) => {
    try {
      if (editingId) await updateWinner(guideId, editingId, data)
      else await createWinner(guideId, data)
      addNotification({ type: 'success', message: t('winners.saved') })
      setModalOpen(false)
      fetchWinners()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      await sendWinnersToPublicity(guideId)
      addNotification({ type: 'success', message: t('winners.sent') })
      fetchWinners()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <TrophyIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t('guides.winners')}</h3>
          {winners.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              {winners.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canSend && winners.length > 0 && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-200/60 dark:shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="h-3.5 w-3.5" />
              {sending ? t('common.loading') : t('winners.sendToPublicity')}
            </button>
          )}
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-md shadow-amber-200/60 dark:shadow-amber-900/30 transition-all active:scale-95"
          >
            <PlusIcon className="h-4 w-4 stroke-[2.5]" />
            {t('winners.new')}
          </button>
        </div>
      </div>

      {/* Winners list */}
      {loading ? (
        <div className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">{t('common.loading')}</div>
      ) : winners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="p-4 bg-slate-100 dark:bg-gray-700 rounded-full">
            <TrophyIcon className="h-8 w-8 text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {winners.map((w, idx) => (
            <div
              key={w._id || w.id}
              className="group relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Rank badge */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${RANK_COLORS[idx] || 'from-sky-400 to-blue-500'} flex items-center justify-center shadow-sm`}>
                <span className="text-white text-sm font-bold">{idx + 1}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white text-base truncate">
                  {w.winnerName}
                </p>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  {w.prize && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                      <GiftIcon className="h-3 w-3 flex-shrink-0" />
                      {w.prize}
                    </span>
                  )}
                  {w.phone && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <PhoneIcon className="h-3 w-3" />
                      {w.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Sent / Received / Blacklisted badges */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                {w.blacklisted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700">
                    <NoSymbolIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    {t('winners.blacklisted')}
                  </span>
                ) : w.sentToPublicityAt ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                      <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      {t('winners.sentAt')}
                    </span>
                    <p className="text-xs text-slate-400">{format(new Date(w.sentToPublicityAt), 'dd/MM HH:mm')}</p>
                    {w.receivedByPublicityAt ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                        <CheckBadgeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {t('winners.received') || 'Reçu'}
                        <span className="font-normal opacity-70 ms-0.5" dir="ltr">{format(new Date(w.receivedByPublicityAt), 'dd/MM HH:mm')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
                        <CheckBadgeIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {t('winners.pendingReceive') || 'En attente…'}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(w)}
                      className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                      title={t('common.edit')}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? t('winners.title') : t('winners.new')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">{t('winners.winnerName')}</label>
            <input
              className={`form-input ${errors.winnerName ? 'border-red-400' : ''}`}
              placeholder={t('winners.winnerNamePlaceholder')}
              {...register('winnerName', { required: t('errors.required') })}
            />
            {errors.winnerName && <p className="text-xs text-red-500 mt-1">{errors.winnerName.message}</p>}
          </div>
          <div>
            <label className="form-label">{t('winners.prize')}</label>
            <input
              className="form-input"
              placeholder={t('winners.prizePlaceholder')}
              {...register('prize')}
            />
          </div>
          <div>
            <label className="form-label">{t('winners.phone')}</label>
            <input
              type="tel"
              className="form-input"
              placeholder="+216 XX XXX XXX"
              dir="ltr"
              {...register('phone')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

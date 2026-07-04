import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../../hooks/useNotifications'
import { getSongs, createSong, updateSong, deleteSong, checkDuplicateSong } from '../api'
import Modal from '../../../components/common/Modal'
import ConfirmDialog from '../../../components/common/ConfirmDialog'
import TimePickerInput from '../../../components/common/TimePickerInput'
import {
  PlusIcon, PencilIcon, TrashIcon, MusicalNoteIcon,
  ClockIcon, UserIcon,
} from '@heroicons/react/24/outline'

export default function SongEditor({ guideId, readonly }) {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm()
  const passageTimeValue = watch('passageTime', '')

  const fetch = () => {
    setLoading(true)
    getSongs(guideId)
      .then(r => setSongs(r.data?.data || []))
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [guideId])

  const openCreate = () => { reset({ title: '', artist: '', duration: '', passageTime: '', order: songs.length + 1 }); setEditingId(null); setModalOpen(true) }
  const openEdit = (s) => { reset(s); setEditingId(s._id || s.id); setModalOpen(true) }

  const onSubmit = async (data) => {
    try {
      if (!editingId) {
        const inCurrent = songs.find(s => s.title?.toLowerCase() === data.title?.toLowerCase())
        if (inCurrent) {
          addNotification({ type: 'warning', message: `⚠️ ${t('songs.duplicateWarning', { title: data.title })}` })
        }
        try {
          const dupRes = await checkDuplicateSong(guideId, data.title)
          const dupData = dupRes.data?.data || dupRes.data
          if (dupData?.inTodayGuides) {
            addNotification({ type: 'warning', message: `⚠️ ${t('songs.duplicateInTodayWarning')}` })
          }
        } catch { /* silent */ }
      }
      if (editingId) await updateSong(guideId, editingId, data)
      else await createSong(guideId, data)
      addNotification({ type: 'success', message: t('songs.saved') })
      setModalOpen(false)
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSong(guideId, deleteId)
      setDeleteId(null)
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setDeleting(false)
    }
  }

  const sorted = [...songs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <div className={`space-y-0 ${!loading && songs.length === 0 ? 'print:hidden' : ''}`}>

      {/* Gradient header bar */}
      <div className="song-header-bar flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-t-xl">
        <div className="flex items-center gap-2.5">
          <MusicalNoteIcon className="h-5 w-5 text-white/90" />
          <h3 className="font-semibold text-white text-sm">{t('guides.songs')}</h3>
          {songs.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
              {songs.length}
            </span>
          )}
        </div>
        {!readonly && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border border-white/30 transition-colors print:hidden"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('songs.new')}
          </button>
        )}
      </div>

      {/* Song list */}
      {loading ? (
        <div className="flex items-center justify-center py-10 border border-t-0 border-slate-200 dark:border-slate-700/70 rounded-b-xl bg-white dark:bg-slate-800/60">
          <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        </div>
      ) : songs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 border border-t-0 border-dashed border-slate-200 dark:border-slate-700/60 rounded-b-xl bg-slate-50/50 dark:bg-slate-800/20">
          <div className="p-3.5 bg-slate-100 dark:bg-slate-700/40 rounded-full border border-slate-200 dark:border-slate-600/30">
            <MusicalNoteIcon className="h-7 w-7 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="border border-t-0 border-slate-200 dark:border-slate-700/70 rounded-b-xl overflow-hidden bg-white dark:bg-slate-800/60 divide-y divide-slate-100 dark:divide-slate-700/50">
          {sorted.map((song, idx) => {
            const sId = song._id || song.id
            return (
              <div
                key={sId}
                className={`
                  group flex items-center gap-4 px-4 py-3
                  border-l-[3px] border-l-transparent
                  hover:border-l-sky-400 dark:hover:border-l-cyan-400
                  hover:bg-sky-50/50 dark:hover:bg-sky-950/15
                  transition-all duration-150
                  ${idx % 2 !== 0 ? 'bg-slate-50/40 dark:bg-slate-700/20' : ''}
                `}
              >
                {/* Order badge */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{idx + 1}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {song.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {song.artist && (
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <UserIcon className="h-3 w-3 flex-shrink-0" />
                        {song.artist}
                      </span>
                    )}
                    {song.duration && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{song.duration}</span>
                    )}
                  </div>
                </div>

                {/* Passage time */}
                {song.passageTime && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-mono font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60">
                    <ClockIcon className="h-4 w-4" />
                    {song.passageTime}
                  </span>
                )}

                {/* Actions */}
                {!readonly && (
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => openEdit(song)}
                      className="p-1.5 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                      title={t('common.edit')}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(sId)}
                      className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                      title={t('common.delete')}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t('songs.title') : t('songs.new')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div>
            <label className="form-label">{t('songs.songTitle')} *</label>
            <input
              className={`form-input ${errors.title ? 'border-red-400' : ''}`}
              placeholder={t('songs.songTitle')}
              {...register('title', { required: t('errors.required') })}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('songs.artist')}</label>
              <input
                className="form-input"
                placeholder={t('songs.artist')}
                {...register('artist')}
              />
            </div>
            <div>
              <label className="form-label">{t('songs.duration')}</label>
              <input
                className="form-input"
                placeholder="3:45"
                {...register('duration')}
              />
            </div>
          </div>

          <div>
            <label className="form-label">{t('songs.passageTime')}</label>
            <TimePickerInput
              value={passageTimeValue}
              onChange={v => setValue('passageTime', v)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} />
    </div>
  )
}

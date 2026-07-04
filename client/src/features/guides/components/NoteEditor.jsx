import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../hooks/useAuth'
import { useNotifications } from '../../../hooks/useNotifications'
import { getNotes, createNote } from '../api'
import { PlusIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function NoteEditor({ guideId }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  const fetch = () => {
    setLoading(true)
    getNotes(guideId)
      .then(r => setNotes(r.data?.data || []))
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [guideId])

  const onSubmit = async (data) => {
    try {
      await createNote(guideId, data)
      addNotification({ type: 'success', message: 'Note ajoutée' })
      setShowForm(false)
      reset()
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">{t('guides.notes')}</h2>
        <button onClick={() => setShowForm(prev => !prev)} className="btn-primary text-sm flex items-center gap-1">
          <PlusIcon className="h-4 w-4" />
          {t('notes.new')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-4 bg-slate-50 rounded-lg">
          <textarea
            rows={3}
            className="form-input"
            placeholder={t('notes.content')}
            {...register('content', { required: t('errors.required') })}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary text-sm disabled:opacity-60">{t('common.save')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-6">{t('common.loading')}</div>
      ) : notes.length === 0 ? (
        <div className="text-center text-slate-400 py-6">{t('common.noData')}</div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-slate-700">{note.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                {note.authorEmail} — {note.createdAt ? format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm') : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

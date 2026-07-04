import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../../hooks/useNotifications'
import { getSegments, createSegment, updateSegment, deleteSegment } from '../api'
import Modal from '../../../components/common/Modal'
import ConfirmDialog from '../../../components/common/ConfirmDialog'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

const SEGMENT_TYPES = ['TALK', 'MUSIC', 'AD', 'NEWS', 'INTERVIEW', 'OTHER']

export default function SegmentEditor({ guideId, readonly }) {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  const fetch = () => {
    setLoading(true)
    getSegments(guideId)
      .then(r => setSegments(r.data?.data || []))
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [guideId])

  const openCreate = () => { reset({}); setEditingId(null); setModalOpen(true) }
  const openEdit = (seg) => { reset(seg); setEditingId(seg.id); setModalOpen(true) }

  const onSubmit = async (data) => {
    try {
      if (editingId) await updateSegment(guideId, editingId, data)
      else await createSegment(guideId, data)
      addNotification({ type: 'success', message: 'Segment enregistré' })
      setModalOpen(false)
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSegment(guideId, deleteId)
      addNotification({ type: 'success', message: 'Segment supprimé' })
      setDeleteId(null)
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="card dark:bg-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700 dark:text-slate-200">{t('guides.segments')}</h2>
        {!readonly && (
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1">
            <PlusIcon className="h-4 w-4" />
            {t('segments.new')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-6">{t('common.loading')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary/10 dark:bg-primary/20">
                <th className="table-header text-end w-10">#</th>
                <th className="table-header text-end">المحتوى</th>
                <th className="table-header text-end w-32">المدة</th>
                <th className="table-header text-end w-28">{t('segments.type')}</th>
                {!readonly && <th className="table-header w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={readonly ? 4 : 5} className="table-cell text-center text-slate-400 py-6">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                segments.sort((a, b) => a.order - b.order).map((seg, idx) => (
                  <tr
                    key={seg.id}
                    className={`border-b border-slate-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50 dark:bg-gray-700/50'} hover:bg-primary/5 transition-colors`}
                  >
                    <td className="table-cell text-center text-slate-400 font-medium">{seg.order}</td>
                    <td className="table-cell text-slate-800 dark:text-slate-200">{seg.content}</td>
                    <td className="table-cell text-primary font-medium">{seg.startTime}–{seg.endTime}</td>
                    <td className="table-cell">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {t(`segments.types.${seg.type}`, { defaultValue: seg.type })}
                      </span>
                    </td>
                    {!readonly && (
                      <td className="table-cell">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(seg)} className="p-1.5 text-slate-400 hover:text-primary rounded">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(seg.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? t('segments.title') : t('segments.new')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('segments.order')}</label>
              <input type="number" className="form-input" {...register('order', { required: t('errors.required'), valueAsNumber: true })} />
            </div>
            <div>
              <label className="form-label">{t('segments.type')}</label>
              <select className="form-input" {...register('type', { required: t('errors.required') })}>
                <option value="">—</option>
                {SEGMENT_TYPES.map(tp => <option key={tp} value={tp}>{t(`segments.types.${tp}`)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">{t('segments.startTime')}</label>
              <input type="time" className="form-input" {...register('startTime', { required: t('errors.required') })} />
            </div>
            <div>
              <label className="form-label">{t('segments.endTime')}</label>
              <input type="time" className="form-input" {...register('endTime', { required: t('errors.required') })} />
            </div>
          </div>
          <div>
            <label className="form-label">{t('segments.content')}</label>
            <textarea rows={3} className="form-input" {...register('content')} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} />
    </div>
  )
}


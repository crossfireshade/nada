import React, { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../../hooks/useNotifications'
import { getGuests, createGuest, updateGuest, deleteGuest, uploadGuestPhoto, deleteGuestPhoto, replaceGuestPhoto } from '../api'
import Modal from '../../../components/common/Modal'
import ConfirmDialog from '../../../components/common/ConfirmDialog'
import { PlusIcon, PencilIcon, TrashIcon, PhoneIcon, BuildingOffice2Icon, ArrowPathIcon } from '@heroicons/react/24/outline'

const PARTICIPATION_MODES = ['PRESENT_STUDIO', 'TELEPHONE']

export default function GuestEditor({ guideId, readonly }) {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm()

  const fetch = () => {
    setLoading(true)
    getGuests(guideId)
      .then(r => setGuests(r.data?.data || []))
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [guideId])

  const openCreate = () => { reset({ participationMode: 'PRESENT_STUDIO' }); setEditingId(null); setModalOpen(true) }
  const openEdit = (g) => { reset(g); setEditingId(g.id); setModalOpen(true) }

  const watchedMode = useWatch({ control, name: 'participationMode' })

  const onSubmit = async (data) => {
    try {
      if (editingId) await updateGuest(guideId, editingId, data)
      else await createGuest(guideId, data)
      addNotification({ type: 'success', message: 'Invité enregistré' })
      setModalOpen(false)
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteGuest(guideId, deleteId)
      setDeleteId(null)
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setDeleting(false)
    }
  }

  const handlePhotoUpload = async (guestId, file) => {
    const formData = new FormData()
    formData.append('photo', file)
    try {
      await uploadGuestPhoto(guideId, guestId, formData)
      addNotification({ type: 'success', message: 'Photo ajoutée' })
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleDeletePhoto = async (guestId, photoUrl) => {
    try {
      await deleteGuestPhoto(guideId, guestId, { photoUrl })
      addNotification({ type: 'success', message: 'Photo supprimée' })
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleReplacePhoto = async (guestId, oldPhotoUrl, file) => {
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('oldPhotoUrl', oldPhotoUrl)
    try {
      await replaceGuestPhoto(guideId, guestId, formData)
      addNotification({ type: 'success', message: 'Photo remplacée' })
      fetch()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  return (
    <div className="card dark:bg-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700 dark:text-slate-200">{t('guides.guests')}</h2>
        {!readonly && (
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1">
            <PlusIcon className="h-4 w-4" />
            {t('guests.new')}
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
                <th className="table-header text-end">الضيوف — الإسم و اللقب</th>
                <th className="table-header text-end w-36">الصفة</th>
                <th className="table-header text-end w-40">شكل الحضور</th>
                {!readonly && <th className="table-header w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 ? (
                <tr>
                  <td colSpan={readonly ? 3 : 4} className="table-cell text-center text-slate-400 py-6">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                guests.map((guest, idx) => (
                  <tr
                    key={guest.id}
                    className={`border-b border-slate-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50 dark:bg-gray-700/50'} hover:bg-primary/5 transition-colors`}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        {/* Photo gallery */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {(guest.photoUrls?.length ? guest.photoUrls : guest.photoUrl ? [guest.photoUrl] : []).map((url, photoIdx) => (
                            <div key={photoIdx} className="relative flex-shrink-0 group/photo">
                              <img
                                src={url}
                                alt={`${guest.fullName} ${photoIdx + 1}`}
                                className="h-9 w-9 rounded-full object-cover border-2 border-slate-200 dark:border-gray-600"
                                onError={e => { e.target.style.display = 'none' }}
                              />
                              {!readonly && (
                                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center gap-0.5 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                  <label className="cursor-pointer p-0.5 hover:text-sky-300 text-white transition-colors" title="Remplacer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => {
                                        const f = e.target.files?.[0]
                                        if (f) handleReplacePhoto(guest.id, url, f)
                                        e.target.value = ''
                                      }}
                                    />
                                    <ArrowPathIcon className="h-3 w-3" />
                                  </label>
                                  <button
                                    type="button"
                                    className="p-0.5 hover:text-red-400 text-white transition-colors"
                                    title="Supprimer"
                                    onClick={() => handleDeletePhoto(guest.id, url)}
                                  >
                                    <TrashIcon className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {!readonly && (
                            <label className="h-9 w-9 rounded-full border-2 border-dashed border-slate-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group/add" title="Ajouter une photo">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (f) handlePhotoUpload(guest.id, f)
                                  e.target.value = ''
                                }}
                              />
                              <PlusIcon className="h-3.5 w-3.5 text-slate-400 group-hover/add:text-primary transition-colors" />
                            </label>
                          )}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{guest.fullName}</span>
                      </div>
                    </td>
                    <td className="table-cell text-slate-600 dark:text-slate-400">{guest.titleFunction}</td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {guest.participationMode === 'TELEPHONE'
                            ? <><PhoneIcon className="h-3.5 w-3.5 text-sky-500" /><span>{t('guides.attendancePhone')}</span></>
                            : <><BuildingOffice2Icon className="h-3.5 w-3.5 text-emerald-500" /><span>{t('guides.attendancePresent')}</span></>
                          }
                        </span>
                        {guest.phone && (
                          <span className="text-xs text-slate-400 font-mono" dir="ltr">{guest.phone}</span>
                        )}
                      </div>
                    </td>
                    {!readonly && (
                      <td className="table-cell">
                        <div className="flex gap-1 justify-end items-center">
                          <button onClick={() => openEdit(guest)} className="p-1.5 text-slate-400 hover:text-primary rounded">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(guest.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? t('guests.title') : t('guests.new')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">{t('guests.fullName')}</label>
            <input className="form-input" {...register('fullName', { required: t('errors.required') })} />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="form-label">{t('guests.titleFunction')}</label>
            <input className="form-input" {...register('titleFunction')} />
          </div>
          <div>
            <label className="form-label">{t('guests.participationMode')}</label>
            <div className="flex gap-4 mt-2">
              {PARTICIPATION_MODES.map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={m}
                    className="text-primary"
                    {...register('participationMode', { required: t('errors.required') })}
                  />
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                    {m === 'TELEPHONE'
                      ? <><PhoneIcon className="h-4 w-4 text-sky-500" />{t('guides.attendancePhone')}</>
                      : <><BuildingOffice2Icon className="h-4 w-4 text-emerald-500" />{t('guides.attendancePresent')}</>
                    }
                  </span>
                </label>
              ))}
            </div>
          </div>
          {watchedMode === 'TELEPHONE' && (
            <div>
              <label className="form-label">{t('guests.phone')} — رقم الهاتف</label>
              <input type="tel" className="form-input" {...register('phone')} />
            </div>
          )}
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


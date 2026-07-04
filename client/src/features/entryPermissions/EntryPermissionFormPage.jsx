import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import { createEntryPermission, updateEntryPermission, getEntryPermission, getPermissionGuests, addPermissionGuest, updateGuestCin } from './api'
import {
  PlusIcon, TrashIcon, ClipboardDocumentCheckIcon,
  UserIcon, IdentificationIcon, ArrowLeftIcon,
  CalendarDaysIcon, UserGroupIcon, ShieldCheckIcon,
  DocumentTextIcon, MegaphoneIcon, ClockIcon,
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import DatePickerInput from '../../components/common/DatePickerInput'
import TimePickerInput from '../../components/common/TimePickerInput'

const GUEST_COLORS = [
  'from-teal-400 to-emerald-500',
  'from-cyan-400 to-sky-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-indigo-400 to-blue-500',
]

export default function EntryPermissionFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const { user } = useAuth()
  const isEdit = !!id
  const [existingGuests, setExistingGuests] = useState([])
  const [guestCins, setGuestCins] = useState({})
  const [permissionStatus, setPermissionStatus] = useState(null)
  const [guests, setGuests] = useState([{ guestName: '', functionTitle: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  const isReceptionniste = user?.role === 'RECEPTIONNISTE_POLICIER'

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm()

  useEffect(() => {
    if (!isEdit) return
    Promise.all([
      getEntryPermission(id),
      getPermissionGuests(id),
    ]).then(([permRes, guestRes]) => {
      const perm = permRes.data?.data || permRes.data
      const guestList = guestRes.data?.data || []
      reset({
        date: perm.date ? perm.date.slice(0, 10) : '',
        producerName: perm.producerName || '',
        programTitle: perm.programTitle || '',
        startTime: perm.startTime || '',
        endTime: perm.endTime || '',
      })
      setPermissionStatus(perm.status)
      setExistingGuests(guestList)
      const initialCins = {}
      guestList.forEach(g => { initialCins[g._id || g.id] = g.cin || '' })
      setGuestCins(initialCins)
      setGuests([{ guestName: '', functionTitle: '' }])
    })
      .catch(() => addNotification({ type: 'error', message: t('entryPermissions.errorMessage') }))
      .finally(() => setLoading(false))
  }, [id])

  const addGuest = () => setGuests(prev => [...prev, { guestName: '', functionTitle: '' }])
  const removeGuest = (i) => setGuests(prev => prev.filter((_, idx) => idx !== i))
  const updateGuest = (i, field, value) => setGuests(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g))

  const isCinOnlyMode = isEdit && isReceptionniste && permissionStatus === 'VALIDATED'

  const onSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (isEdit && isCinOnlyMode) {
        await Promise.all(
          existingGuests.map(g => {
            const guestId = g._id || g.id
            return updateGuestCin(id, guestId, { cin: guestCins[guestId] || '' })
          })
        )
        addNotification({ type: 'success', message: t('entryPermissions.cinUpdated') })
        navigate('/entry-permissions')
      } else if (isEdit) {
        await updateEntryPermission(id, {
          date: data.date,
          producerName: data.producerName,
          programTitle: data.programTitle,
          startTime: data.startTime || '',
          endTime: data.endTime || '',
        })
        await Promise.all(guests.filter(g => g.guestName).map(g => addPermissionGuest(id, { guestName: g.guestName, functionTitle: g.functionTitle })))
        addNotification({ type: 'success', message: t('entryPermissions.updated') })
        navigate('/entry-permissions')
      } else {
        const res = await createEntryPermission({
          date: data.date,
          producerName: data.producerName,
          programTitle: data.programTitle,
          startTime: data.startTime || '',
          endTime: data.endTime || '',
        })
        const permId = res.data?.data?.id || res.data?.id || res.data?.data?._id || res.data?._id
        await Promise.all(guests.filter(g => g.guestName).map(g => addPermissionGuest(permId, { guestName: g.guestName, functionTitle: g.functionTitle })))
        addNotification({ type: 'success', message: t('entryPermissions.created') })
        navigate('/entry-permissions')
      }
    } catch {
      addNotification({ type: 'error', message: t('entryPermissions.errorMessage') })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-700 p-6 text-white shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/40">
        {/* Decorative */}
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-[0.08]">
          <ClipboardDocumentCheckIcon className="h-44 w-44" />
        </div>
        <div className="absolute bottom-0 start-0 translate-y-8 -translate-x-6 opacity-[0.06]">
          <ShieldCheckIcon className="h-36 w-36 rotate-12" />
        </div>
        <div className="absolute top-4 end-20 w-20 h-20 bg-cyan-300/20 rounded-full blur-2xl" />

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => navigate('/entry-permissions')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all duration-200"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              {isCinOnlyMode
                ? <IdentificationIcon className="h-4.5 w-4.5 text-white/80" />
                : <ClipboardDocumentCheckIcon className="h-4.5 w-4.5 text-white/80" />
              }
              <span className="text-sm font-medium text-white/70">{t('entryPermissions.title')}</span>
            </div>
            <h1 className="text-xl font-bold">
              {isCinOnlyMode ? t('entryPermissions.cin') : isEdit ? t('entryPermissions.edit') : t('entryPermissions.new')}
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Permission Details Card ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors
          dark:shadow-xl dark:shadow-emerald-950/10">

          {/* Card header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="hidden dark:block absolute inset-0 bg-emerald-500/20 rounded-lg blur-md" />
                <div className="relative p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-500/20">
                  <DocumentTextIcon className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('entryPermissions.title')}</h2>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Date */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                <CalendarDaysIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                {t('entryPermissions.date')}
              </label>
              <Controller
                name="date"
                control={control}
                rules={{ required: !isCinOnlyMode && t('errors.required') }}
                render={({ field }) => (
                  <DatePickerInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder={t('guides.filterByDate')}
                    disabled={isCinOnlyMode}
                    variant="light-inline"
                  />
                )}
              />
              {errors.date && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.date.message}</p>}
            </div>

            {/* Time interval */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                <ClockIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                {t('entryPermissions.timeInterval')}
              </label>
              <div className="flex items-center gap-3">
                {/* Start time */}
                <div className="w-fit">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">{t('entryPermissions.startTime')}</p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 transition-all duration-200 ${!isCinOnlyMode ? 'focus-within:ring-2 focus-within:ring-emerald-400/40 focus-within:border-emerald-400 dark:focus-within:ring-emerald-500/30 dark:focus-within:border-emerald-500' : 'opacity-50'}`}>
                    <ClockIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    <Controller
                      name="startTime"
                      control={control}
                      render={({ field }) => (
                        <TimePickerInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          compact
                        />
                      )}
                    />
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 mt-5">
                  <svg className="h-5 w-5 text-slate-400 dark:text-slate-500 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>

                {/* End time */}
                <div className="w-fit">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">{t('entryPermissions.endTime')}</p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 transition-all duration-200 ${!isCinOnlyMode ? 'focus-within:ring-2 focus-within:ring-emerald-400/40 focus-within:border-emerald-400 dark:focus-within:ring-emerald-500/30 dark:focus-within:border-emerald-500' : 'opacity-50'}`}>
                    <ClockIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                    <Controller
                      name="endTime"
                      control={control}
                      render={({ field }) => (
                        <TimePickerInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          compact
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                {t('entryPermissions.timeIntervalHint')}
              </p>
            </div>

            {/* Producer + Program */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <UserIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  {t('entryPermissions.producerName')}
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 text-sm
                    focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 dark:focus:ring-emerald-500/30 dark:focus:border-emerald-500
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200"
                  disabled={isCinOnlyMode}
                  {...register('producerName')}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <MegaphoneIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  {t('entryPermissions.programTitle')}
                </label>
                <input
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 text-sm
                    focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 dark:focus:ring-emerald-500/30 dark:focus:border-emerald-500
                    placeholder:text-slate-400 dark:placeholder:text-slate-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200"
                  disabled={isCinOnlyMode}
                  {...register('programTitle')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Existing Guests (Edit + CIN mode) ── */}
        {isEdit && existingGuests.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors
            dark:shadow-xl dark:shadow-teal-950/10">

            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="hidden dark:block absolute inset-0 bg-teal-500/20 rounded-lg blur-md" />
                    <div className="relative p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 border border-teal-200/50 dark:border-teal-500/20">
                      <ShieldCheckIcon className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{t('entryPermissions.existingGuests')}</h2>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-200/50 dark:border-teal-500/20">
                  {existingGuests.length}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {existingGuests.map((guest, i) => {
                const guestId = guest._id || guest.id
                const color = GUEST_COLORS[i % GUEST_COLORS.length]
                return (
                  <div key={guestId || i} className="group p-4 bg-slate-50/80 dark:bg-gray-700/20 rounded-xl border border-slate-100 dark:border-gray-600/50 hover:border-teal-200 dark:hover:border-teal-700/40 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                        <span className="text-sm font-bold text-white">{(guest.guestName || '?')[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white text-sm">{guest.guestName}</p>
                        {guest.functionTitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{guest.functionTitle}</p>
                        )}
                      </div>
                    </div>
                    {isCinOnlyMode && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-600/40">
                          <IdentificationIcon className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                        </div>
                        <input
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 text-sm
                            focus:ring-2 focus:ring-teal-400/40 focus:border-teal-400 dark:focus:ring-teal-500/30 dark:focus:border-teal-500
                            placeholder:text-slate-400 dark:placeholder:text-slate-500
                            transition-all duration-200"
                          placeholder={t('entryPermissions.cin')}
                          value={guestCins[guestId] || ''}
                          onChange={(e) => setGuestCins(prev => ({ ...prev, [guestId]: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Add New Guests ── */}
        {!isCinOnlyMode && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors
            dark:shadow-xl dark:shadow-cyan-950/10">

            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-700/20 dark:to-gray-700/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="hidden dark:block absolute inset-0 bg-cyan-500/20 rounded-lg blur-md" />
                    <div className="relative p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200/50 dark:border-cyan-500/20">
                      <UserGroupIcon className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </div>
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {isEdit ? t('entryPermissions.addGuests') : t('entryPermissions.guests')}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addGuest}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl shadow-sm shadow-emerald-200/40 dark:shadow-emerald-900/20 transition-all duration-200"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  {t('common.add')}
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {guests.map((guest, i) => {
                const color = GUEST_COLORS[(existingGuests.length + i) % GUEST_COLORS.length]
                return (
                  <div key={i} className="group relative p-4 bg-slate-50/80 dark:bg-gray-700/20 rounded-xl border border-slate-100 dark:border-gray-600/50 hover:border-cyan-200 dark:hover:border-cyan-700/40 transition-all duration-200">
                    {/* Guest number + delete */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
                          <UserIcon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {t('entryPermissions.guest')} {i + 1}
                        </span>
                      </div>
                      {guests.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGuest(i)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:text-slate-600 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 block">
                          {t('entryPermissions.guestName')}
                        </label>
                        <input
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 text-sm
                            focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 dark:focus:ring-cyan-500/30 dark:focus:border-cyan-500
                            placeholder:text-slate-400 dark:placeholder:text-slate-500
                            transition-all duration-200"
                          value={guest.guestName}
                          onChange={(e) => updateGuest(i, 'guestName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 block">
                          {t('entryPermissions.functionTitle')}
                        </label>
                        <input
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 text-slate-700 dark:text-slate-200 text-sm
                            focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400 dark:focus:ring-cyan-500/30 dark:focus:border-cyan-500
                            placeholder:text-slate-400 dark:placeholder:text-slate-500
                            transition-all duration-200"
                          value={guest.functionTitle}
                          onChange={(e) => updateGuest(i, 'functionTitle', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/entry-permissions')}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="relative px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 rounded-xl shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/20 disabled:opacity-60 transition-all duration-200 overflow-hidden group"
          >
            <div className="hidden dark:block absolute inset-0 bg-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative">{submitting ? t('common.loading') : t('common.save')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

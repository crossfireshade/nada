import React, { useEffect, useState } from 'react'
import { downloadPhoto } from '../../utils/downloadPhoto'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { getGuide, getSegments, getSongs, getNotes, deleteGuide, getGuests, submitGuide, checkGuestConflict } from './api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import {
  PrinterIcon, TrashIcon, PhoneIcon, BuildingOffice2Icon,
  MusicalNoteIcon, ChatBubbleLeftEllipsisIcon, ArrowDownTrayIcon, DocumentTextIcon,
  UserIcon, UserCircleIcon, CalendarDaysIcon, ClockIcon, SparklesIcon, SignalIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

export default function GuideViewPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [guide, setGuide] = useState(null)
  const [segments, setSegments] = useState([])
  const [songs, setSongs] = useState([])
  const [notes, setNotes] = useState([])
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rowConflicts, setRowConflicts] = useState({})
  const canDelete = ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION'].includes(user?.role)
  const canEdit = ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF'].includes(user?.role)

  useEffect(() => {
    Promise.all([
      getGuide(id),
      getSegments(id),
      getSongs(id),
      getNotes(id),
      getGuests(id),
    ]).then(([g, s, so, n, gu]) => {
      setGuide(g.data?.data || g.data)
      setSegments(s.data?.data || [])
      setSongs(so.data?.data || [])
      setNotes(n.data?.data || [])
      setGuests(gu.data?.data || [])
      // Check guest conflicts per row (first/second filter applies via checkGuestConflict)
      const broadcastDate = (g.data?.data || g.data)?.broadcastDate
      const segs = s.data?.data || []
      const programmeRows = segs.filter(r => (r.rowType || 'PROGRAMME') === 'PROGRAMME' && r.guestFullName?.trim().length >= 2)
      programmeRows.forEach(async (row) => {
        try {
          const res = await checkGuestConflict(row.guestFullName.trim(), broadcastDate, id)
          const conflict = res.data?.data
          if (conflict) setRowConflicts(prev => ({ ...prev, [row._id]: { ...conflict, guestName: row.guestFullName.trim() } }))
        } catch { /* ignore */ }
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteGuide(id)
      addNotification({ type: 'success', message: t('common.delete') })
      navigate('/guides')
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitGuide(id)
      addNotification({ type: 'success', message: t('guides.submitSuccess') })
      navigate('/guides')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('errors.serverError')
      addNotification({ type: 'error', message: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  if (!guide) return <div className="text-center text-slate-400 py-20">{t('errors.notFound')}</div>

  return (
    <div className="max-w-6xl mx-auto space-y-5" dir="rtl">

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <StatusBadge status={guide.status} />
          <span className="text-xs text-slate-500" dir="ltr">
            {t('common.createdAt')}: {format(new Date(guide.createdAt), 'dd/MM/yyyy HH:mm')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {['DRAFT', 'SUBMITTED'].includes(guide.status) && (
            <Link to={`/guides/${id}/edit`} className="btn-secondary text-sm">{t('common.edit')}</Link>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-200/50 dark:shadow-sky-900/30 hover:from-sky-600 hover:to-cyan-700 transition-all"
          >
            <PrinterIcon className="h-4 w-4" />
            {t('guides.exportPdf')}
          </button>
          {canDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <TrashIcon className="h-4 w-4" />
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>

      {/* ── Guest conflict banner for RESPONSABLE_PRODUCTION ── */}
      {user?.role === 'RESPONSABLE_PRODUCTION' && Object.keys(rowConflicts).length > 0 && (
        <div className="print:hidden rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50 p-4 flex gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              {t('guides.guestConflictTitle')}
            </p>
            <ul className="space-y-0.5">
              {Object.values(rowConflicts).map((c, i) => (
                <li key={i} className="text-sm text-amber-700 dark:text-amber-400">
                  <span className="font-medium">«{c.guestName}»</span>
                  {' — '}{t('guides.guestConflictDetail', { programTitle: c.programTitle })}
                  {c.startTime && <span className="font-mono text-xs ms-1">({c.startTime}{c.endTime ? ` → ${c.endTime}` : ''})</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Header card ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden">
        {/* Top accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-500" />

        <div className="p-8">
          {/* Logo + Title centered */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="/assets/logo-main.png"
              alt="Radio Monastir"
              className="h-20 mb-4 dark:hidden drop-shadow-sm"
              onError={e => { e.target.style.display = 'none' }}
            />
            <img
              src="/assets/logo-main-dark.png"
              alt="Radio Monastir"
              className="h-20 mb-4 hidden dark:block drop-shadow-sm"
              onError={e => { e.target.style.display = 'none' }}
            />
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-sky-300 dark:to-sky-600" />
              <h2 className="text-xl font-bold tracking-wide text-slate-700 dark:text-slate-200 uppercase text-center" style={{ letterSpacing: '0.08em' }}>
                {t('guides.formTitle')}
              </h2>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-sky-300 dark:to-sky-600" />
            </div>
            <div className="h-0.5 w-16 bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full" />
          </div>

          {/* Program title */}
          <div className="mb-6 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 rounded-xl px-5 py-3.5 border border-sky-100 dark:border-sky-800/40">
            <p className="text-[11px] font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-widest mb-0.5">
              {t('guides.programTitle')}
            </p>
            <p className="text-lg font-semibold text-slate-800 dark:text-white">
              {guide.programTitle || '—'}
            </p>
          </div>

          {/* Info cards grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Producteur */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-sky-400/10 dark:bg-sky-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <UserIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-0.5">
                {t('guides.producerName')}
              </p>
              <p className="text-sm text-slate-800 dark:text-white truncate">{guide.producerName || '—'}</p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-400" />
            </div>

            {/* Date de diffusion */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-cyan-400/10 dark:bg-cyan-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <CalendarDaysIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-0.5">
                {t('guides.broadcastDate')}
              </p>
              <p className="text-sm text-slate-800 dark:text-white">{guide.broadcastDate || '—'}</p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-400" />
            </div>

            {/* Horaire */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-sky-400/10 dark:bg-sky-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <ClockIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-0.5">
                {t('guides.programInterval')}
              </p>
              {guide.startTime || guide.endTime ? (
                <p className="text-sm text-slate-800 dark:text-white font-mono" dir="ltr">
                  {guide.startTime || '—'} → {guide.endTime || '—'}
                  {guide.programDuration && (
                    <span className="text-xs text-slate-400 ms-1">({guide.programDuration})</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-slate-800 dark:text-white">{guide.programDuration || '—'}</p>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-400" />
            </div>

            {/* Thème */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-cyan-400/10 dark:bg-cyan-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <SparklesIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-0.5">
                {t('guides.theme')}
              </p>
              <p className="text-sm text-slate-800 dark:text-white break-words whitespace-pre-wrap">{guide.theme || '—'}</p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Unified table ── */}
      {(() => {
        const hasInlineGuests = segments.some(s => s.guestFullName && s.guestFullName.trim())
        let oldGuestIdx = 0
        const programRows = segments.map(s => {
          const row = { ...s, _rowType: s.rowType || 'PROGRAMME' }
          if (!hasInlineGuests && !row.guestFullName) {
            const og = guests[oldGuestIdx++]
            if (og) {
              row.guestFullName = og.fullName || ''
              row.guestAttendanceMode = og.participationMode || 'PRESENT_STUDIO'
              row.guestPhone = og.phone || ''
              row.guestPhotoUrl = og.photoUrl || ''
              row.guestTitleFunction = og.titleFunction || ''
            }
          }
          return row
        })
        const songRows = songs.map(s => ({ ...s, _rowType: 'CHANSON' }))
        const unified = [...programRows, ...songRows].sort((a, b) => (a.order || 0) - (b.order || 0))

        return (
          <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-sky-600 to-cyan-500 text-white">
                    <th className="px-2 py-3.5 font-semibold text-center border border-sky-500/30 w-20 print:hidden text-xs tracking-wide"></th>
                    <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-28 text-xs tracking-wide">{t('guides.startTime')}</th>
                    <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 text-xs tracking-wide">{t('guides.content')}</th>
                    <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-24 text-xs tracking-wide">{t('guides.duration')}</th>
                    <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-64 print:w-36 text-xs tracking-wide">{t('guides.guestCol')}</th>
                    <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-48 print:w-28 text-xs tracking-wide">{t('guides.attendanceCol')}</th>
                    <th className="px-2 py-3.5 font-semibold text-center border border-sky-500/30 w-24 text-xs tracking-wide">
                      <span className="flex items-center justify-center gap-1"><SignalIcon className="h-3.5 w-3.5" />{t('guides.streaming')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unified.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">{t('common.noData')}</td>
                    </tr>
                  ) : unified.map((row, idx) => {
                    const isChanson = row._rowType === 'CHANSON'
                    const isLigneProgramme = row._rowType === 'LIGNE_PROGRAMME'
                    const baseBg = idx % 2 === 0
                      ? 'bg-white dark:bg-gray-800'
                      : 'bg-sky-50/30 dark:bg-sky-900/5'
                    const chansonBg = idx % 2 === 0
                      ? 'bg-violet-50/40 dark:bg-violet-900/10'
                      : 'bg-violet-50/70 dark:bg-violet-900/15'
                    const ligneProgrammeBg = idx % 2 === 0
                      ? 'bg-emerald-50/40 dark:bg-emerald-900/10'
                      : 'bg-emerald-50/70 dark:bg-emerald-900/15'
                    const streamingBg = 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-400'
                    const hasConflict = !!rowConflicts[row._id]
                    const computedBg = hasConflict
                      ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500'
                      : row.streaming ? streamingBg : isChanson ? chansonBg : isLigneProgramme ? ligneProgrammeBg : baseBg
                    return (
                      <tr key={row._id || row.id} className={`${computedBg} transition-colors`}>

                        {/* Type badge */}
                        <td className="px-2 py-2.5 border border-slate-100 dark:border-gray-700 text-center print:hidden">
                          {isChanson ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50">
                              <MusicalNoteIcon className="h-2.5 w-2.5" />
                              {t('guides.rowTypeChanson')}
                            </span>
                          ) : isLigneProgramme ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                              <DocumentTextIcon className="h-2.5 w-2.5" />
                              {t('guides.rowTypeLigneProgramme')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                              <DocumentTextIcon className="h-2.5 w-2.5" />
                              {t('guides.rowTypeProgramme')}
                            </span>
                          )}
                        </td>

                        {/* Start time */}
                        <td className="px-3 py-3 text-center font-mono text-sky-600 dark:text-sky-400 font-medium border border-slate-100 dark:border-gray-700 text-xs">
                          {isChanson ? (row.passageTime || '—') : (row.startTime || '—')}
                        </td>

                        {/* Content */}
                        <td className="px-3 py-3 border border-slate-100 dark:border-gray-700 whitespace-pre-wrap break-words min-w-0 max-w-xs print:break-all print:text-xs">
                          {isChanson ? (
                            <span className="font-medium text-violet-700 dark:text-violet-300">{row.title}</span>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-200">{row.content}</span>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="px-3 py-3 text-center font-mono text-sky-600 dark:text-sky-400 font-medium border border-slate-100 dark:border-gray-700 text-xs">
                          {row.duration || '—'}
                        </td>

                        {/* Guest / Artist */}
                        {(() => {
                          const photoSrc = row.guestPhotoUrl
                            ? (row.guestPhotoUrl.startsWith('/') ? row.guestPhotoUrl : `/uploads/${row.guestPhotoUrl}`)
                            : null
                          const hasGuest = row.guestFullName || row.guestAttendanceMode === 'TELEPHONE' || row.guestPhone || row.guestPhotoUrl
                          return (
                            <td className="px-3 py-3 border border-slate-100 dark:border-gray-700">
                              {isChanson ? (
                                row.artist ? (
                                  <span className="text-sm text-slate-600 dark:text-slate-300">{row.artist}</span>
                                ) : null
                              ) : hasGuest ? (
                                <div className="flex items-center gap-3">
                                  {photoSrc && (
                                    <>
                                      <div className="relative flex-shrink-0 group">
                                        <button type="button" onClick={() => downloadPhoto(photoSrc, row.guestFullName)} className="block relative print:hidden">
                                          <img src={photoSrc} alt={row.guestFullName} className="h-11 w-11 rounded-full object-cover border-2 border-sky-200 dark:border-sky-700 shadow-sm transition-opacity group-hover:opacity-80" onError={e => { e.target.style.display = 'none' }} />
                                          <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowDownTrayIcon className="h-4 w-4 text-white" />
                                          </span>
                                        </button>
                                        <div className="hidden print:block h-8 w-8 rounded-full flex-shrink-0 bg-cover bg-center bg-slate-100 border border-sky-200" style={{ backgroundImage: `url(${photoSrc})` }} />
                                      </div>
                                      <UserCircleIcon className="h-8 w-8 text-slate-400 flex-shrink-0 print:hidden" />
                                    </>
                                  )}
                                  <div>
                                    {row.guestFullName && (
                                      <p className={`font-medium text-sm ${hasConflict ? 'text-red-700 dark:text-red-300' : 'text-slate-800 dark:text-slate-200'}`}>{row.guestFullName}</p>
                                    )}
                                    {hasConflict && (
                                      <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-0.5 flex items-center gap-0.5">
                                        ⚠ {t('guides.guestConflictDetail', { programTitle: rowConflicts[row._id].programTitle })}
                                        {rowConflicts[row._id].startTime && <span dir="ltr" className="ms-1">({rowConflicts[row._id].startTime}{rowConflicts[row._id].endTime ? `→${rowConflicts[row._id].endTime}` : ''})</span>}
                                      </p>
                                    )}
                                    {row.guestTitleFunction && (
                                      <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">{row.guestTitleFunction}</p>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </td>
                          )
                        })()}

                        {/* Attendance mode */}
                        {(() => {
                          const hasGuest = row.guestFullName || row.guestAttendanceMode === 'TELEPHONE' || row.guestPhone || row.guestPhotoUrl
                          return (
                            <td className="px-3 py-3 border border-slate-100 dark:border-gray-700">
                              {isChanson ? (
                                <div className="flex items-center justify-center gap-1.5 text-xs text-violet-500 dark:text-violet-400">
                                  <MusicalNoteIcon className="h-3.5 w-3.5" />
                                  <span className="font-medium">{t('guides.rowTypeChanson')}</span>
                                </div>
                              ) : hasGuest ? (
                                <>
                                  <span className="hidden print:block text-sm text-slate-700">
                                    {row.guestAttendanceMode === 'TELEPHONE' ? t('guides.attendancePhone') : t('guides.attendancePresent')}
                                  </span>
                                  <div className="flex flex-col gap-1.5 print:hidden">
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full w-fit
                                      ${row.guestAttendanceMode === 'TELEPHONE'
                                        ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50'
                                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                                      }`}
                                    >
                                      {row.guestAttendanceMode === 'TELEPHONE'
                                        ? <><PhoneIcon className="h-3 w-3" /><span>{t('guides.attendancePhone')}</span></>
                                        : <><BuildingOffice2Icon className="h-3 w-3" /><span>{t('guides.attendancePresent')}</span></>
                                      }
                                    </span>
                                    {row.guestAttendanceMode === 'TELEPHONE' && row.guestPhone && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-gray-700 rounded-lg px-2.5 py-1 font-mono" dir="ltr">
                                        {row.guestPhone}
                                      </p>
                                    )}
                                  </div>
                                  {row.guestAttendanceMode === 'TELEPHONE' && row.guestPhone && (
                                    <span className="hidden print:block text-xs text-slate-500 mt-1">{row.guestPhone}</span>
                                  )}
                                </>
                              ) : null}
                            </td>
                          )
                        })()}

                        {/* Streaming indicator */}
                        <td className="px-2 py-3 text-center border border-slate-100 dark:border-gray-700">
                          {row.streaming ? (
                            <>
                              {/* Screen: animated */}
                              <div className="flex flex-col items-center gap-1 print:hidden">
                                <div className="relative w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center shadow-md shadow-orange-200 dark:shadow-orange-900/40">
                                  <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-60" />
                                  <SignalIcon className="h-4 w-4 text-white relative z-10" />
                                </div>
                                <span className="text-[10px] font-semibold text-orange-500">{t('guides.streaming')}</span>
                              </div>
                              {/* Print: static */}
                              <div className="hidden print:flex flex-col items-center gap-1">
                                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                                  <SignalIcon className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-[9px] font-semibold text-orange-600">{t('guides.streaming')}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* ── Notes section ── */}
      <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-sky-500 to-cyan-500">
          <div className="flex items-center gap-2.5">
            <ChatBubbleLeftEllipsisIcon className="h-4.5 w-4.5 text-white/90 h-5 w-5" />
            <h3 className="font-semibold text-white text-sm tracking-wide">{t('guides.notes')}</h3>
            {notes.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30">
                {notes.length}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5">
          {notes.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-3">—</p>
          ) : (
            <div className="space-y-2.5">
              {notes.map(note => (
                <div
                  key={note._id || note.id}
                  className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm"
                >
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{note.content}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-amber-100 dark:border-amber-800/30">
                    {note.authorId?.email || note.authorEmail} — {format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Draft action buttons ── */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-200/50 dark:shadow-sky-900/30 hover:from-sky-600 hover:to-cyan-700 transition-all disabled:opacity-60"
        >
          {submitting ? t('common.loading') : t('guides.saveAndSubmit')}
        </button>
      </div>

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4 border border-slate-100 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-center font-medium">{t('common.confirmDeleteMessage')}</p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary px-5">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
              >
                {deleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

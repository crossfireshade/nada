import React, { useEffect, useState } from 'react'
import { downloadPhoto } from '../../utils/downloadPhoto'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { getGuide, getSegments, getSongs, getNotes, getGuests, validateGuide, rejectGuide, publishGuide, checkGuestConflict } from './api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import {
  PrinterIcon, PencilIcon, PhoneIcon, BuildingOffice2Icon,
  ChatBubbleLeftEllipsisIcon, ArrowDownTrayIcon, MusicalNoteIcon, DocumentTextIcon,
  XMarkIcon, ExclamationTriangleIcon,
  UserIcon, UserCircleIcon, CalendarDaysIcon, ClockIcon, SparklesIcon, SignalIcon,
} from '@heroicons/react/24/outline'

export default function GuideValidationPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [guide, setGuide] = useState(null)
  const [segments, setSegments] = useState([])
  const [songs, setSongs] = useState([])
  const [notes, setNotes] = useState([])
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [guestConflicts, setGuestConflicts] = useState([])

  const refresh = () =>
    Promise.all([getGuide(id), getSegments(id), getSongs(id), getNotes(id), getGuests(id)])
      .then(([g, s, so, n, gu]) => {
        setGuide(g.data?.data || g.data)
        setSegments(s.data?.data || [])
        setSongs(so.data?.data || [])
        setNotes(n.data?.data || [])
        setGuests(gu.data?.data || [])
      })

  useEffect(() => {
    Promise.all([getGuide(id), getSegments(id), getSongs(id), getNotes(id), getGuests(id)])
      .then(([g, s, so, n, gu]) => {
        const guideData = g.data?.data || g.data
        const segs = s.data?.data || []
        setGuide(guideData)
        setSegments(segs)
        setSongs(so.data?.data || [])
        setNotes(n.data?.data || [])
        setGuests(gu.data?.data || [])
        // Per-row conflict check with first/second filter (same as editor/view)
        const broadcastDate = guideData?.broadcastDate
        const seen = new Set()
        const rows = segs.filter(r => r.rowType === 'PROGRAMME' && r.guestFullName?.trim().length >= 2)
        Promise.all(rows.map(async row => {
          const key = row.guestFullName.trim().toLowerCase()
          if (seen.has(key)) return null
          seen.add(key)
          try {
            const res = await checkGuestConflict(row.guestFullName.trim(), broadcastDate, id)
            const conflict = res.data?.data
            if (conflict) return { guestName: row.guestFullName.trim(), ...conflict }
          } catch {}
          return null
        })).then(results => setGuestConflicts(results.filter(Boolean)))
      })
      .catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }, [id])

  // Auto-refresh every 5s for SUBMITTED guides
  useEffect(() => {
    if (!guide?.status || guide.status !== 'SUBMITTED') return
    const interval = setInterval(() => { refresh().catch(() => {}) }, 5000)
    return () => clearInterval(interval)
  }, [id, guide?.status])

  const handleAction = async (action) => {
    setActing(true)
    try {
      if (action === 'validate') {
        await validateGuide(id)
        addNotification({ type: 'success', message: t('guides.validate') })
      } else if (action === 'publish') {
        await publishGuide(id)
        addNotification({ type: 'success', message: t('guides.publish') })
      }
      navigate('/guides')
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setActing(false)
    }
  }

  const handleConfirmReject = async () => {
    setActing(true)
    try {
      await rejectGuide(id, { reason: rejectReason })
      addNotification({ type: 'success', message: t('guides.reject') })
      navigate('/guides')
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setActing(false)
      setShowRejectModal(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  if (!guide) return <div className="text-center text-slate-400 py-20">{t('errors.notFound')}</div>

  // Build unified rows (segments + songs) with backward compat for old Guest model
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
    <div className="max-w-6xl mx-auto space-y-5" dir="rtl">

      {/* ── Guest conflict warning banner ── */}
      {guestConflicts.length > 0 && (
        <div className="print:hidden rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50 p-4 flex gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              {t('guides.guestConflictTitle')}
            </p>
            <ul className="space-y-0.5">
              {guestConflicts.map((c, i) => (
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

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <StatusBadge status={guide.status} />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-200/50 dark:shadow-sky-900/30 hover:from-sky-600 hover:to-cyan-700 transition-all"
          >
            <PrinterIcon className="h-4 w-4" />
            {t('guides.exportPdf')}
          </button>
          <Link
            to={`/guides/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-200/50 dark:shadow-sky-900/30 hover:from-sky-600 hover:to-cyan-700 transition-all"
          >
            <PencilIcon className="h-4 w-4" />
            {t('common.edit')}
          </Link>
          {guide.status === 'SUBMITTED' && (
            <>
              <button
                onClick={() => handleAction('validate')}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-60"
              >
                {acting ? t('common.loading') : t('guides.validate')}
              </button>
              <button
                onClick={() => { setRejectReason(''); setShowRejectModal(true) }}
                disabled={acting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-60"
              >
                {t('guides.reject')}
              </button>
            </>
          )}
          {guide.status === 'APPROVED' && (
            <button
              onClick={() => handleAction('publish')}
              disabled={acting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm hover:from-sky-600 hover:to-cyan-700 transition-all disabled:opacity-60"
            >
              {acting ? t('common.loading') : t('guides.publish')}
            </button>
          )}
        </div>
      </div>

      {/* ── Header card ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden">
        {/* Top accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-500" />

        <div className="p-8">
          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-8">
            <img src="/assets/logo-main.png" alt="Radio Monastir" className="h-20 mb-4 dark:hidden drop-shadow-sm" onError={e => { e.target.style.display = 'none' }} />
            <img src="/assets/logo-main-dark.png" alt="Radio Monastir" className="h-20 mb-4 hidden dark:block drop-shadow-sm" onError={e => { e.target.style.display = 'none' }} />
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
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-sky-400/10 dark:bg-sky-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <UserIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-1.5">
                {t('guides.producerName')}
              </p>
              <p className="text-sm text-slate-800 dark:text-white truncate">{guide.producerName || '—'}</p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-400" />
            </div>

            {/* Date de diffusion */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-cyan-400/10 dark:bg-cyan-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <CalendarDaysIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-1.5">
                {t('guides.broadcastDate')}
              </p>
              <p className="text-sm text-slate-800 dark:text-white">{guide.broadcastDate || '—'}</p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-400" />
            </div>

            {/* Horaire */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-sky-400/10 dark:bg-sky-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <ClockIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-1.5">
                {t('guides.programInterval')}
              </p>
              {guide.startTime || guide.endTime ? (
                <p className="text-sm text-slate-800 dark:text-white font-mono" dir="ltr">
                  {guide.startTime || '—'} → {guide.endTime || '—'}
                  {guide.programDuration && <span className="text-xs text-slate-400 ms-1">({guide.programDuration})</span>}
                </p>
              ) : (
                <p className="text-sm text-slate-800 dark:text-white">{guide.programDuration || '—'}</p>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-400" />
            </div>

            {/* Thème */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-cyan-400/10 dark:bg-cyan-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <SparklesIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <p className="text-[11px] rtl:text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-1.5">
                {t('guides.theme')}
              </p>
              <p className="text-sm text-slate-800 dark:text-white break-words whitespace-pre-wrap">{guide.theme || '—'}</p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-400" />
            </div>

          </div>
        </div>
      </div>

      {/* ── Unified table ── */}
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
                <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-32 print:w-20 text-xs tracking-wide">
                  <span className="flex items-center justify-center gap-1"><SignalIcon className="h-3.5 w-3.5" />{t('guides.streaming')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {unified.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t('common.noData')}</td>
                </tr>
              ) : unified.map((row, idx) => {
                const isChanson = row._rowType === 'CHANSON'
                const isLigneProgramme = row._rowType === 'LIGNE_PROGRAMME'
                const baseBg = idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-sky-50/30 dark:bg-sky-900/5'
                const chansonBg = idx % 2 === 0 ? 'bg-violet-50/40 dark:bg-violet-900/10' : 'bg-violet-50/70 dark:bg-violet-900/15'
                const ligneBg = idx % 2 === 0 ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : 'bg-emerald-50/70 dark:bg-emerald-900/15'
                const streamingBg = 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-400'
                const computedRowBg = row.streaming ? streamingBg : isChanson ? chansonBg : isLigneProgramme ? ligneBg : baseBg
                const hasGuest = row.guestFullName || row.guestAttendanceMode === 'TELEPHONE' || row.guestPhone || row.guestPhotoUrl
                const photoSrc = row.guestPhotoUrl ? (row.guestPhotoUrl.startsWith('/') ? row.guestPhotoUrl : `/uploads/${row.guestPhotoUrl}`) : null
                return (
                  <tr key={row._id || row.id} className={`${computedRowBg} transition-colors`}>

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
                    <td className="px-3 py-3 border border-slate-100 dark:border-gray-700">
                      {isChanson ? (
                        row.artist ? <span className="text-sm text-slate-600 dark:text-slate-300">{row.artist}</span> : null
                      ) : (row.guestFullName || row.guestTitleFunction) ? (
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
                            {row.guestFullName && <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{row.guestFullName}</p>}
                            {row.guestTitleFunction && <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">{row.guestTitleFunction}</p>}
                          </div>
                        </div>
                      ) : null}
                    </td>

                    {/* Attendance / mode */}
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

                    {/* Streaming */}
                    <td className="px-3 py-3 border border-slate-100 dark:border-gray-700 text-center">
                      {row.streaming ? (
                        <>
                          <div className="print:hidden flex flex-col items-center justify-center gap-1">
                            <span className="relative flex h-8 w-8">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-8 w-8 bg-orange-500 items-center justify-center">
                                <SignalIcon className="h-5 w-5 text-white" />
                              </span>
                            </span>
                            <span className="text-xs font-semibold text-orange-500">{t('guides.streaming')}</span>
                          </div>
                          <div className="hidden print:flex flex-col items-center justify-center gap-1">
                            <span className="inline-flex rounded-full h-6 w-6 bg-orange-500 items-center justify-center">
                              <SignalIcon className="h-4 w-4 text-white" />
                            </span>
                            <span className="text-[9px] font-semibold text-orange-600">{t('guides.streaming')}</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                      )}
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Notes section ── */}
      {notes.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-t-xl">
            <div className="flex items-center gap-2.5">
              <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-white/90" />
              <h3 className="font-semibold text-white text-sm">{t('guides.notes')}</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {notes.length}
              </span>
            </div>
          </div>
          <div className="border border-t-0 border-slate-200 dark:border-slate-700/70 rounded-b-xl bg-white dark:bg-slate-800/60 p-4 space-y-2">
            {notes.map(note => (
              <div key={note._id || note.id} className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{note.content}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-amber-100 dark:border-amber-800/30">
                  {note.authorId?.email || note.authorEmail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-start pt-2 print:hidden">
        <button type="button" onClick={() => navigate('/guides')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          {t('common.cancel')}
        </button>
      </div>

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !acting && setShowRejectModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">{t('guides.rejectModalTitle')}</h3>
              </div>
              <button onClick={() => !acting && setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('guides.rejectModalDesc')}</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('guides.rejectionReasonLabel')}
                  <span className="text-slate-400 font-normal ms-1">({t('common.optional')})</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder={t('guides.rejectionReasonPlaceholder')}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none transition"
                  disabled={acting}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
              <button onClick={() => setShowRejectModal(false)} disabled={acting} className="btn-secondary text-sm disabled:opacity-60">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={acting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {acting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('common.loading')}
                  </span>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {t('guides.confirmReject')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

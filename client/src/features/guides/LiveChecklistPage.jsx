import { useEffect, useState } from 'react'
import { downloadPhoto } from '../../utils/downloadPhoto'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import {
  getGuide, getSegments, getSongs, validateSong,
  startLiveGuide, stopLiveGuide, restartLiveGuide, archiveGuide, getNotes, createNote,
  completeSegment, getGuests, getWinners,
} from './api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import WinnerEditor from './components/WinnerEditor'
import {
  CheckCircleIcon, MusicalNoteIcon, CheckIcon, PrinterIcon,
  StopIcon, PlayIcon, ArchiveBoxIcon, PhoneIcon, BuildingOffice2Icon,
  ChatBubbleLeftEllipsisIcon, ArrowDownTrayIcon, DocumentTextIcon,
  UserIcon, UserCircleIcon, CalendarDaysIcon, ClockIcon, SparklesIcon, SignalIcon,
} from '@heroicons/react/24/outline'

export default function LiveChecklistPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const { user } = useAuth()
  const isTechnicien = user?.role === 'TECHNICIEN_COORDINATEUR'
  const [guide, setGuide] = useState(null)
  const [segments, setSegments] = useState([])
  const [songs, setSongs] = useState([])
  const [notes, setNotes] = useState([])
  const [guests, setGuests] = useState([])
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')

  const refresh = async () => {
    const [g, s, so, n, gu, w] = await Promise.all([getGuide(id), getSegments(id), getSongs(id), getNotes(id), getGuests(id), getWinners(id)])
    setGuide(g.data?.data || g.data)
    setSegments(s.data?.data || [])
    setSongs(so.data?.data || [])
    setNotes(n.data?.data || [])
    setGuests(gu.data?.data || [])
    setWinners(w.data?.data || [])
  }

  useEffect(() => {
    refresh().catch(() => addNotification({ type: 'error', message: t('errors.serverError') })).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!guide?.status) return
    const shouldPoll = ['FINAL_PUBLISHED', 'LIVE_IN_PROGRESS'].includes(guide.status)
    if (!shouldPoll) return
    const interval = setInterval(() => { refresh().catch(() => {}) }, 5000)
    return () => clearInterval(interval)
  }, [id, guide?.status])

  const handleCompleteSegment = async (segId) => {
    setCompletingId(segId)
    try {
      await completeSegment(id, segId)
      await refresh()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setCompletingId(null)
    }
  }

  const handleValidateSong = async (songId) => {
    setCompletingId(songId)
    try {
      await validateSong(id, songId)
      await refresh()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setCompletingId(null)
    }
  }

  const handleStatusAction = async (action) => {
    try {
      if (action === 'startLive') await startLiveGuide(id)
      else if (action === 'stopLive') await stopLiveGuide(id)
      else if (action === 'restartLive') await restartLiveGuide(id)
      else if (action === 'archive') await archiveGuide(id)
      await refresh()
      setConfirmStop(false)
      addNotification({ type: 'success', message: 'Action effectuée' })
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return
    try {
      await createNote(id, { content: newNoteText.trim() })
      setNewNoteText('')
      await refresh()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />
  if (!guide) return <div className="text-center text-slate-400 py-20">{t('errors.notFound')}</div>

  const isLive = guide.status === 'LIVE_IN_PROGRESS'
  const isStopped = guide.status === 'LIVE_STOPPED'
  const isFinalPublished = guide.status === 'FINAL_PUBLISHED'
  const canCheck = isLive || isFinalPublished

  // Build unified rows with backward compat
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

  const completedCount = segments.filter(s => s.completedLive).length + songs.filter(s => s.validatedLive).length
  const totalCount = unified.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-5" dir="rtl">

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
          {isTechnicien && isFinalPublished && (
            <button
              onClick={() => handleStatusAction('startLive')}
              className="animate-live-pulse inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white transition-all active:scale-95"
            >
              <span className="inline-flex rounded-full h-2 w-2 bg-white/90 shrink-0" />
              {t('guides.startLive')}
            </button>
          )}
          {isTechnicien && isStopped && (
            <>
              <button
                onClick={() => handleStatusAction('restartLive')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:from-emerald-600 hover:to-teal-700 transition-all"
              >
                <PlayIcon className="h-4 w-4" />
                {t('guides.restartLive')}
              </button>
              <button
                onClick={() => handleStatusAction('archive')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <ArchiveBoxIcon className="h-4 w-4" />
                {t('guides.archiveLive')}
              </button>
            </>
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
              {guide.programTitle || guide.theme || '—'}
            </p>
          </div>

          {/* Info cards */}
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

      {/* ── Progress bar ── */}
      {totalCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 px-5 py-3 flex items-center gap-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {t('guides.segmentsCompleted', { done: completedCount, total: totalCount })}
          </span>
          <div className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-sky-500 to-cyan-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${progress === 100 ? 'text-green-600 dark:text-green-400' : 'text-sky-600 dark:text-sky-400'}`}>
            {progress}%
          </span>
        </div>
      )}

      {/* ── Unified table ── */}
      <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-sky-600 to-cyan-500 text-white">
                <th className="px-2 py-3.5 font-semibold text-center border border-sky-500/30 w-10 text-xs print:hidden">✓</th>
                <th className="px-2 py-3.5 font-semibold text-center border border-sky-500/30 w-20 print:hidden text-xs tracking-wide"></th>
                <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-28 text-xs tracking-wide">{t('guides.startTime')}</th>
                <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 text-xs tracking-wide">{t('guides.content')}</th>
                <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-24 text-xs tracking-wide">{t('guides.duration')}</th>
                <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-56 print:w-36 text-xs tracking-wide">{t('guides.guestCol')}</th>
                <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-40 print:w-28 text-xs tracking-wide">{t('guides.attendanceCol')}</th>
                <th className="px-3 py-3.5 font-semibold text-center border border-sky-500/30 w-32 text-xs tracking-wide">
                  <span className="flex items-center justify-center gap-1"><SignalIcon className="h-3.5 w-3.5" />{t('guides.streaming')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {unified.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t('common.noData')}</td></tr>
              ) : unified.map((row, idx) => {
                const isChanson = row._rowType === 'CHANSON'
                const isLigneProgramme = row._rowType === 'LIGNE_PROGRAMME'
                const rowId = row._id || row.id
                const isCompleted = isChanson ? row.validatedLive : row.completedLive
                const hasGuest = row.guestFullName || row.guestAttendanceMode === 'TELEPHONE' || row.guestPhone || row.guestPhotoUrl
                const photoSrc = row.guestPhotoUrl ? (row.guestPhotoUrl.startsWith('/') ? row.guestPhotoUrl : `/uploads/${row.guestPhotoUrl}`) : null

                const completedBg = 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500'
                const streamingBg = 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-400'
                const baseBg = idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-sky-50/30 dark:bg-sky-900/5'
                const chansonBg = idx % 2 === 0 ? 'bg-violet-50/40 dark:bg-violet-900/10' : 'bg-violet-50/70 dark:bg-violet-900/15'
                const ligneBg = idx % 2 === 0 ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : 'bg-emerald-50/70 dark:bg-emerald-900/15'
                const normalBg = isChanson ? chansonBg : isLigneProgramme ? ligneBg : baseBg
                const rowBg = isCompleted ? completedBg : row.streaming ? streamingBg : `border-l-[3px] border-l-transparent hover:border-l-sky-400 dark:hover:border-l-cyan-400 hover:bg-sky-50/40 dark:hover:bg-sky-950/10 ${normalBg}`

                return (
                  <tr key={rowId} className={`border-b border-slate-100 dark:border-gray-700 transition-all duration-150 cursor-default ${rowBg}`}>

                    {/* Check-in button */}
                    <td className="px-2 py-3 text-center border border-slate-100 dark:border-gray-700 print:hidden">
                      {completingId === rowId ? (
                        <div className="flex justify-center">
                          <div className="h-5 w-5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                        </div>
                      ) : isCompleted ? (
                        <button
                          onClick={() => isChanson ? handleValidateSong(rowId) : handleCompleteSegment(rowId)}
                          disabled={!canCheck}
                          className="flex justify-center mx-auto rounded-full transition-opacity hover:opacity-70 disabled:cursor-default disabled:opacity-100"
                        >
                          <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckIcon className="h-3.5 w-3.5 text-white stroke-[3]" />
                          </div>
                        </button>
                      ) : (
                        <button
                          onClick={() => isChanson ? handleValidateSong(rowId) : handleCompleteSegment(rowId)}
                          disabled={!canCheck}
                          className="rounded-full p-0.5 transition-colors disabled:cursor-default disabled:opacity-30 text-slate-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <CheckCircleIcon className="h-6 w-6" />
                        </button>
                      )}
                    </td>

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
                    <td className={`px-3 py-3 text-center font-mono font-medium border border-slate-100 dark:border-gray-700 text-xs ${isCompleted ? 'text-green-600/60 dark:text-green-400/60' : 'text-sky-600 dark:text-sky-400'}`}>
                      {isChanson ? (row.passageTime || '—') : (row.startTime || '—')}
                    </td>

                    {/* Content */}
                    <td className={`px-3 py-3 border border-slate-100 dark:border-gray-700 whitespace-pre-wrap print:break-all print:text-xs ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : ''}`}>
                      {isChanson ? (
                        <span className={`font-medium ${isCompleted ? '' : 'text-violet-700 dark:text-violet-300'}`}>{row.title}</span>
                      ) : (
                        <span className={isCompleted ? '' : 'text-slate-700 dark:text-slate-200'}>{row.content}</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className={`px-3 py-3 text-center font-mono font-medium border border-slate-100 dark:border-gray-700 text-xs ${isCompleted ? 'text-green-600/60 dark:text-green-400/60' : 'text-sky-600 dark:text-sky-400'}`}>
                      {row.duration || '—'}
                    </td>

                    {/* Guest / Artist */}
                    <td className="px-3 py-3 border border-slate-100 dark:border-gray-700 print:max-w-[140px]">
                      {isChanson ? (
                        row.artist ? <span className="text-sm text-slate-600 dark:text-slate-300">{row.artist}</span> : null
                      ) : hasGuest ? (
                        <div className="flex items-center gap-2 print:gap-1">
                          {photoSrc && (
                            <>
                              <div className="relative flex-shrink-0 group print:flex-shrink-0">
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
                          <div className="min-w-0">
                            {row.guestFullName && <p className="font-medium text-slate-800 dark:text-slate-200 text-sm print:text-xs truncate print:whitespace-normal print:break-words">{row.guestFullName}</p>}
                            {row.guestTitleFunction && <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5 print:text-[10px] truncate print:whitespace-normal print:break-words">{row.guestTitleFunction}</p>}
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
                          {/* Print version — plain text */}
                          <div className="hidden print:block text-xs text-slate-700 space-y-0.5">
                            <p>{row.guestAttendanceMode === 'TELEPHONE' ? t('guides.attendancePhone') : t('guides.attendancePresent')}</p>
                            {row.guestAttendanceMode === 'TELEPHONE' && row.guestPhone && (
                              <p className="font-mono" dir="ltr">{row.guestPhone}</p>
                            )}
                          </div>
                          {/* Screen version — badges */}
                          <div className="print:hidden flex flex-col gap-1.5">
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
                            <span className="inline-flex rounded-full h-8 w-8 bg-orange-500 items-center justify-center">
                              <SignalIcon className="h-5 w-5 text-white" />
                            </span>
                            <span className="text-xs font-semibold text-orange-500">{t('guides.streaming')}</span>
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
      <div>
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-white/90" />
            <h3 className="font-semibold text-white text-sm">{t('guides.notes')}</h3>
            {notes.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {notes.length}
              </span>
            )}
          </div>
        </div>
        <div className="border border-t-0 border-slate-200 dark:border-slate-700/70 rounded-b-xl bg-white dark:bg-slate-800/60 p-4 space-y-2">
          {notes.map(note => (
            <div key={note._id || note.id} className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm text-slate-700 dark:text-slate-300">
              {note.content}
            </div>
          ))}
          <div className="flex gap-2 print:hidden">
            <textarea
              rows={2}
              value={newNoteText}
              onChange={e => setNewNoteText(e.target.value)}
              className="form-input flex-1 text-sm"
              placeholder={t('guides.addNote')}
            />
            <button onClick={handleAddNote} className="btn-secondary text-sm self-start">{t('common.add')}</button>
          </div>
        </div>
      </div>

      {/* ── Winners section ── */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden${winners.length === 0 ? ' print:hidden' : ''}`}>
        <div className="p-4">
          <WinnerEditor guideId={id} canSend={isFinalPublished || isLive} />
        </div>
      </div>

      {/* ── Stop Live ── */}
      {isTechnicien && isLive && (
        <div className="print:hidden flex justify-end pb-4">
          {confirmStop ? (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl px-5 py-3 shadow-sm">
              <span className="text-sm text-red-700 dark:text-red-300 font-semibold">{t('guides.stopLiveConfirm')}</span>
              <button
                onClick={() => handleStatusAction('stopLive')}
                className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold shadow-sm shadow-red-200/60 dark:shadow-red-900/30 transition-all active:scale-95"
              >
                <StopIcon className="h-4 w-4" />
                {t('common.yes')}
              </button>
              <button
                onClick={() => setConfirmStop(false)}
                className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 font-semibold transition-all active:scale-95"
              >
                {t('common.no')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmStop(true)}
              className="animate-live-pulse inline-flex items-center gap-2 text-sm font-semibold py-2.5 px-5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white transition-all active:scale-95"
            >
              <span className="inline-flex rounded-full h-2 w-2 bg-white/90 shrink-0" />
              {t('guides.stopLive')}
            </button>
          )}
        </div>
      )}

    </div>
  )
}

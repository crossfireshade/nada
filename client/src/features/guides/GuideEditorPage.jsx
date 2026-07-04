import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import {
  getGuide, createGuide, updateGuide, deleteGuide,
  submitGuide, approveGuide, publishGuide, validateGuide, rejectGuide,
  startLiveGuide, archiveGuide,
  getSegments, createSegment, updateSegment, deleteSegment,
  getNotes, createNote, updateNote, deleteNote,
  getSongs, createSong, updateSong, deleteSong,
  checkGuestConflict,
} from './api'
import api from '../../api/axios'
import { downloadPhoto } from '../../utils/downloadPhoto'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import TimePickerInput from '../../components/common/TimePickerInput'
import DatePickerInput from '../../components/common/DatePickerInput'
import {
  PlusIcon, TrashIcon, PrinterIcon, MusicalNoteIcon, PencilIcon,
  ClockIcon, UserIcon, UserCircleIcon, ChatBubbleLeftEllipsisIcon, ArrowUpTrayIcon,
  ArrowDownTrayIcon, ExclamationTriangleIcon, DocumentTextIcon,
  CalendarDaysIcon, SparklesIcon, SignalIcon,
} from '@heroicons/react/24/outline'

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function computeDuration(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some(isNaN)) return ''
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) return ''
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

function isIntervalValid(start, end) {
  if (!start || !end) return true // no validation if either is empty
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some(isNaN)) return true
  return (eh * 60 + em) > (sh * 60 + sm)
}

function newProgrammeRow(order) {
  return {
    _localId: Date.now() + Math.random(),
    id: null,
    rowType: 'PROGRAMME',
    order,
    startTime: '',
    content: '',
    duration: '',
    guestFullName: '',
    guestTitleFunction: '',
    guestAttendanceMode: 'PRESENT_STUDIO',
    guestPhone: '',
    guestPhotoFile: null,
    guestPhotoUrl: '',
    streaming: false,
    dirty: true,
  }
}

function newLigneProgrammeRow(order) {
  return {
    _localId: Date.now() + Math.random(),
    id: null,
    rowType: 'LIGNE_PROGRAMME',
    order,
    startTime: '',
    content: '',
    duration: '',
    streaming: false,
    dirty: true,
  }
}

function newChansonRow(order) {
  return {
    _localId: Date.now() + Math.random(),
    id: null,
    rowType: 'CHANSON',
    order,
    startTime: '',     // passageTime
    content: '',       // title
    songArtist: '',
    duration: '',
    streaming: false,
    dirty: true,
  }
}

// ────────────────────────────────────────────────────────────────
// TimeInput sub-component
// ────────────────────────────────────────────────────────────────

function TimeInput({ value, onChange, disabled, light = false }) {
  const minuteRef = useRef(null)
  const parts = (value || '').split(':')
  const hh = parts[0] || ''
  const mm = parts[1] || ''

  const handleHours = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${v}:${mm}`)
    if (v.length === 2) minuteRef.current?.focus()
  }

  const handleMinutes = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${hh}:${v}`)
  }

  if (disabled) {
    return (
      <span className={`text-sm font-mono font-semibold ${light ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`}>
        {value || '—'}
      </span>
    )
  }

  const inputClass = light
    ? 'w-8 text-center text-sm font-mono bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-white/50 rounded px-1 py-0.5'
    : 'w-8 text-center text-sm font-mono bg-transparent border border-slate-200 dark:border-gray-600 focus:border-sky-400 dark:focus:border-sky-500 focus:ring-1 focus:ring-sky-300 focus:outline-none rounded dark:text-white px-1 py-0.5'

  return (
    <>
      <span className={`hidden print:block text-xs font-mono font-semibold text-center ${light ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`}>
        {value || '—'}
      </span>
      <div className="flex items-center justify-center gap-0.5 print:hidden" dir="ltr">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hh}
          onChange={handleHours}
          placeholder="HH"
          className={inputClass}
        />
        <span className={`font-bold text-base leading-none select-none ${light ? 'text-white/70' : 'text-sky-500'}`}>:</span>
        <input
          ref={minuteRef}
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={mm}
          onChange={handleMinutes}
          placeholder="MM"
          className={inputClass}
        />
      </div>
    </>
  )
}

// ────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────

export default function GuideEditorPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const isEdit = !!id

  // Guide header fields
  const [guide, setGuide] = useState(null)
  const [programTitle, setProgramTitle] = useState('')
  const [producerName, setProducerName] = useState('')
  const [broadcastDate, setBroadcastDate] = useState('')
  const [programStartTime, setProgramStartTime] = useState('')
  const [programEndTime, setProgramEndTime] = useState('')
  const [theme, setTheme] = useState('')
  const themeRef = useRef(null)

  useEffect(() => {
    if (themeRef.current) {
      themeRef.current.style.height = 'auto'
      themeRef.current.style.height = themeRef.current.scrollHeight + 'px'
    }
  }, [theme])

  // Unified rows (PROGRAMME + CHANSON)
  const [rows, setRows] = useState([newLigneProgrammeRow(1)])

  // Real-time guest conflict detection
  const [rowConflicts, setRowConflicts] = useState({}) // { [_localId]: { programTitle, startTime, endTime } }
  const guestConflictTimers = useRef({})
  const initialConflictChecked = useRef(false)

  // Notes
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteText, setEditNoteText] = useState('')
  const [localNotes, setLocalNotes] = useState([])
  const [localNoteText, setLocalNoteText] = useState('')
  const [editingLocalNoteIdx, setEditingLocalNoteIdx] = useState(null)
  const [editLocalNoteText, setEditLocalNoteText] = useState('')

  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const printRef = useRef(null)
  const canDelete = ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION'].includes(user?.role)

  // ── Computed validation ──
  const computedDuration = computeDuration(programStartTime, programEndTime)
  const isIntervalError = !isIntervalValid(programStartTime, programEndTime)

  // ── Detect unsaved changes ──
  const hasUnsavedChanges = !isEdit || rows.some(r => r.dirty) || (guide && (
    programTitle !== (guide.programTitle || '') ||
    producerName !== (guide.producerName || '') ||
    broadcastDate !== (guide.broadcastDate || '') ||
    programStartTime !== (guide.startTime || '') ||
    programEndTime !== (guide.endTime || '') ||
    theme !== (guide.theme || '')
  ))

  const hasMissingTelephotoPhoto = rows.some(r =>
    r.rowType === 'PROGRAMME' &&
    r.guestAttendanceMode === 'TELEPHONE' &&
    r.guestFullName && r.guestFullName.trim() !== '' &&
    !r.guestPhotoUrl &&
    !r.guestPhotoFile
  )

  // ── Load data ──
  useEffect(() => {
    if (!id) return
    Promise.all([
      getGuide(id).then(r => r.data?.data || r.data),
      getSegments(id).then(r => r.data?.data || []),
      getNotes(id).then(r => r.data?.data || []),
      getSongs(id).then(r => r.data?.data || []),
    ]).then(([guideData, segs, notesData, songsData]) => {
      setGuide(guideData)
      setProgramTitle(guideData.programTitle || '')
      setProducerName(guideData.producerName || '')
      setBroadcastDate(guideData.broadcastDate || '')
      setProgramStartTime(guideData.startTime || '')
      setProgramEndTime(guideData.endTime || '')
      setTheme(guideData.theme || '')

      // Merge segments and songs into unified rows
      const programRows = segs.map(s => ({
        _localId: s._id || s.id,
        id: s._id || s.id,
        rowType: s.rowType || 'PROGRAMME',
        order: s.order,
        startTime: s.startTime || '',
        content: s.content || '',
        duration: s.duration || '',
        guestFullName: s.guestFullName || '',
        guestTitleFunction: s.guestTitleFunction || '',
        guestAttendanceMode: s.guestAttendanceMode || 'PRESENT_STUDIO',
        guestPhone: s.guestPhone || '',
        guestPhotoFile: null,
        guestPhotoUrl: s.guestPhotoUrl || '',
        streaming: s.streaming || false,
        dirty: false,
      }))
      const chansonRows = songsData.map(s => ({
        _localId: s._id || s.id,
        id: s._id || s.id,
        rowType: 'CHANSON',
        order: s.order,
        startTime: s.passageTime || '',
        content: s.title || '',
        songArtist: s.artist || '',
        duration: s.duration || '',
        streaming: s.streaming || false,
        dirty: false,
      }))
      const merged = [...programRows, ...chansonRows].sort((a, b) => (a.order || 0) - (b.order || 0))
      if (merged.length > 0) setRows(merged)

      setNotes(notesData)
    }).catch(() => addNotification({ type: 'error', message: t('errors.serverError') }))
      .finally(() => setLoading(false))
  }, [id])

  // ── Re-check conflicts for all existing guest rows after guide loads ──
  useEffect(() => { initialConflictChecked.current = false }, [id])

  useEffect(() => {
    if (initialConflictChecked.current) return
    if (!broadcastDate || rows.length === 0 || loading) return
    const programmeRows = rows.filter(r => r.rowType === 'PROGRAMME' && r.guestFullName?.trim().length >= 2)
    if (programmeRows.length === 0) return
    initialConflictChecked.current = true
    programmeRows.forEach(async (row) => {
      try {
        const res = await checkGuestConflict(row.guestFullName.trim(), broadcastDate, id || undefined)
        const conflict = res.data?.data
        if (conflict) setRowConflicts(prev => ({ ...prev, [row._localId]: conflict }))
      } catch { /* ignore */ }
    })
  }, [rows, broadcastDate, id, loading])

  // ── Action handler (approve/validate/reject etc.) ──
  const handleAction = async (action) => {
    try {
      const actions = {
        submit: submitGuide,
        approve: approveGuide,
        publish: publishGuide,
        validate: validateGuide,
        reject: rejectGuide,
        startLive: startLiveGuide,
        archive: archiveGuide,
      }
      const res = await actions[action](id)
      setGuide(res.data?.data || res.data)
      addNotification({ type: 'success', message: t('common.save') })
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  // ── Reject with reason ──
  const handleConfirmReject = async () => {
    setRejecting(true)
    try {
      const res = await rejectGuide(id, { reason: rejectReason })
      setGuide(res.data?.data || res.data)
      addNotification({ type: 'success', message: t('guides.reject') })
      setShowRejectModal(false)
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setRejecting(false)
    }
  }

  // ── Core save helper: save all rows for a given guideId ──
  const saveRows = async (guideId) => {
    for (const row of rows) {
      if (row.rowType === 'CHANSON') {
        if (!row.content?.trim()) continue
        const songData = {
          title: row.content,
          artist: row.songArtist || '',
          duration: row.duration || '',
          passageTime: row.startTime || '',
          order: row.order,
          streaming: row.streaming || false,
        }
        if (!row.id) {
          await createSong(guideId, songData)
        } else if (row.dirty) {
          await updateSong(guideId, row.id, songData)
        }
      } else if (row.rowType === 'LIGNE_PROGRAMME') {
        const rowData = {
          order: row.order,
          rowType: 'LIGNE_PROGRAMME',
          startTime: row.startTime,
          content: row.content,
          duration: row.duration,
          streaming: row.streaming || false,
        }
        if (!row.id) {
          await createSegment(guideId, rowData)
        } else if (row.dirty) {
          await updateSegment(guideId, row.id, rowData)
        }
      } else {
        const rowData = {
          order: row.order,
          rowType: 'PROGRAMME',
          startTime: row.startTime,
          content: row.content,
          duration: row.duration,
          guestFullName: row.guestFullName,
          guestTitleFunction: row.guestTitleFunction,
          guestAttendanceMode: row.guestAttendanceMode,
          guestPhone: row.guestPhone,
          guestPhotoUrl: row.guestPhotoUrl || '',
          streaming: row.streaming || false,
        }
        let savedRow
        if (!row.id) {
          const res = await createSegment(guideId, rowData)
          savedRow = res.data?.data || res.data
        } else if (row.dirty) {
          const res = await updateSegment(guideId, row.id, rowData)
          savedRow = res.data?.data || res.data
        } else {
          continue
        }
        if (row.guestPhotoFile && savedRow) {
          const fd = new FormData()
          fd.append('photo', row.guestPhotoFile)
          await api.post(`/guides/${guideId}/segments/${savedRow._id || savedRow.id}/upload-photo`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      }
    }

    // Reload rows from server to get correct IDs and reset dirty state (prevents duplication on next save)
    const [freshSegs, freshSongs] = await Promise.all([
      getSegments(guideId).then(r => r.data?.data || []),
      getSongs(guideId).then(r => r.data?.data || []),
    ])
    const freshProgramRows = freshSegs.map(s => ({
      _localId: s._id || s.id,
      id: s._id || s.id,
      rowType: s.rowType || 'PROGRAMME',
      order: s.order,
      startTime: s.startTime || '',
      content: s.content || '',
      duration: s.duration || '',
      guestFullName: s.guestFullName || '',
      guestTitleFunction: s.guestTitleFunction || '',
      guestAttendanceMode: s.guestAttendanceMode || 'PRESENT_STUDIO',
      guestPhone: s.guestPhone || '',
      guestPhotoFile: null,
      guestPhotoUrl: s.guestPhotoUrl || '',
      streaming: s.streaming || false,
      dirty: false,
    }))
    const freshChansonRows = freshSongs.map(s => ({
      _localId: s._id || s.id,
      id: s._id || s.id,
      rowType: 'CHANSON',
      order: s.order,
      startTime: s.passageTime || '',
      content: s.title || '',
      songArtist: s.artist || '',
      duration: s.duration || '',
      streaming: s.streaming || false,
      dirty: false,
    }))
    const merged = [...freshProgramRows, ...freshChansonRows].sort((a, b) => (a.order || 0) - (b.order || 0))
    if (merged.length > 0) setRows(merged)
  }

  // ── handleSave ──
  const handleSave = async (shouldSubmit = false) => {
    // If editing and nothing has changed, notify and return
    if (isEdit && !hasUnsavedChanges && !shouldSubmit) {
      addNotification({ type: 'info', message: t('guides.alreadySaved') })
      return
    }

    setSaving(true)
    try {
      let guideId = id
      const programDuration = computedDuration
      const headerData = {
        programTitle, producerName, broadcastDate,
        programDuration, startTime: programStartTime, endTime: programEndTime, theme,
      }

      const wasNew = !isEdit
      if (!isEdit) {
        const res = await createGuide(headerData)
        const newGuide = res.data?.data || res.data
        guideId = newGuide._id || newGuide.id
        setGuide(newGuide)
        navigate(`/guides/${guideId}/edit`, { replace: true })
      } else {
        const res = await updateGuide(id, headerData)
        setGuide(res.data?.data || res.data)
      }

      await saveRows(guideId)

      if (wasNew && localNotes.length > 0) {
        for (const content of localNotes) {
          await createNote(guideId, { content })
        }
      }

      if (shouldSubmit && guideId) {
        const currentStatus = guide?.status || 'DRAFT'
        if (currentStatus === 'DRAFT' || currentStatus === 'REJECTED') {
          const res = await submitGuide(guideId)
          setGuide(res.data?.data || res.data)
        }
        addNotification({ type: 'success', message: t('guides.saveAndSubmit') })
        navigate('/guides')
      } else {
        addNotification({ type: 'success', message: t('common.save') })
      }
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setSaving(false)
    }
  }

  // ── handleSaveAndValidate (RESPONSABLE_PRODUCTION) ──
  const handleSaveAndValidate = async () => {
    setSaving(true)
    try {
      let guideId = id
      const programDuration = computedDuration
      const headerData = {
        programTitle, producerName, broadcastDate,
        programDuration, startTime: programStartTime, endTime: programEndTime, theme,
      }

      const wasNew = !isEdit
      if (!isEdit) {
        const res = await createGuide(headerData)
        const newGuide = res.data?.data || res.data
        guideId = newGuide._id || newGuide.id
        navigate(`/guides/${guideId}/edit`, { replace: true })
      } else {
        await updateGuide(id, headerData)
      }

      await saveRows(guideId)

      if (wasNew && localNotes.length > 0) {
        for (const content of localNotes) {
          await createNote(guideId, { content })
        }
      }

      await submitGuide(guideId)
      await validateGuide(guideId)

      addNotification({ type: 'success', message: t('guides.validate') })
      navigate('/guides')
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setSaving(false)
    }
  }

  // ── Row management ──
  const handleAddProgrammeRow = () => {
    if (hasMissingTelephotoPhoto) {
      addNotification({ type: 'error', message: t('guides.telephonePhotoRequired') })
      return
    }
    setRows(prev => [...prev, newProgrammeRow(prev.length + 1)])
  }

  const handleAddLigneProgrammeRow = () => {
    if (hasMissingTelephotoPhoto) {
      addNotification({ type: 'error', message: t('guides.telephonePhotoRequired') })
      return
    }
    setRows(prev => [...prev, newLigneProgrammeRow(prev.length + 1)])
  }

  const handleAddChansonRow = () => {
    if (hasMissingTelephotoPhoto) {
      addNotification({ type: 'error', message: t('guides.telephonePhotoRequired') })
      return
    }
    setRows(prev => [...prev, newChansonRow(prev.length + 1)])
  }

  const handleDeleteRow = async (row, idx) => {
    if (row.id && id) {
      try {
        if (row.rowType === 'CHANSON') {
          await deleteSong(id, row.id)
        } else {
          await deleteSegment(id, row.id)
        }
      } catch {
        addNotification({ type: 'error', message: t('errors.serverError') })
        return
      }
    }
    const localId = rows[idx]._localId
    if (guestConflictTimers.current[localId]) clearTimeout(guestConflictTimers.current[localId])
    setRowConflicts(prev => { const n = { ...prev }; delete n[localId]; return n })
    setRows(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, order: i + 1 })))
  }

  const updateRow = (idx, field, value) => {
    if (typeof field === 'object') {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...field, dirty: true } : r))
    } else {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, dirty: true } : r))
    }
  }

  const handleGuestNameChange = (idx, value) => {
    const row = rows[idx]
    updateRow(idx, 'guestFullName', value)
    const localId = row._localId
    if (guestConflictTimers.current[localId]) clearTimeout(guestConflictTimers.current[localId])
    if (!value || value.trim().length < 2) {
      setRowConflicts(prev => { const n = { ...prev }; delete n[localId]; return n })
      return
    }
    guestConflictTimers.current[localId] = setTimeout(async () => {
      try {
        if (!broadcastDate) return
        const res = await checkGuestConflict(value.trim(), broadcastDate, id || undefined)
        const conflict = res.data?.data
        setRowConflicts(prev => ({ ...prev, [localId]: conflict || undefined }))
        if (conflict) {
          addNotification({
            type: 'warning',
            message: t('guides.guestConflictWarning', {
              name: value.trim(),
              program: conflict.programTitle,
            }),
          })
          api.post('/alerts/guest-conflict', {
            guestName: value.trim(),
            programTitle: conflict.programTitle,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            conflictingGuideOwnerId: conflict.conflictingGuideOwnerId || null,
            myProgramTitle: programTitle || '',
          }).catch(() => {})
        }
      } catch { /* ignore network errors */ }
    }, 600)
  }

  const handleToggleStreaming = (idx) => {
    const row = rows[idx]
    if (row.streaming) {
      updateRow(idx, 'streaming', false)
      return
    }
    const [sh, sm] = (programStartTime || '').split(':').map(Number)
    const [eh, em] = (programEndTime || '').split(':').map(Number)
    const durationMin = (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em))
      ? Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
      : 0
    // 3 streaming guests per hour; if duration unknown default to 3
    const hours = durationMin > 0 ? durationMin / 60 : 1
    const maxAllowed = Math.max(3, Math.floor(hours * 3))
    // count only PROGRAMME rows (only type that can have streaming)
    const currentCount = rows.filter(r => r.rowType === 'PROGRAMME' && r.streaming).length
    if (currentCount >= maxAllowed) {
      addNotification({ type: 'error', message: t('guides.streamingLimitReached', { max: maxAllowed, hours: Math.ceil(hours) }) })
      return
    }
    updateRow(idx, 'streaming', true)
  }

  // ── Note handlers ──
  const handleAddNote = async () => {
    if (!noteText.trim() || !id) return
    try {
      const res = await createNote(id, { content: noteText })
      setNotes(prev => [...prev, res.data?.data || res.data])
      setNoteText('')
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!id) return
    try {
      await deleteNote(id, noteId)
      setNotes(prev => prev.filter(n => (n._id || n.id) !== noteId))
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleUpdateNote = async () => {
    if (!editNoteText.trim() || !editingNoteId || !id) return
    try {
      const res = await updateNote(id, editingNoteId, { content: editNoteText })
      setNotes(prev => prev.map(n => (n._id || n.id) === editingNoteId ? (res.data?.data || res.data) : n))
      setEditingNoteId(null)
      setEditNoteText('')
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const handleDeleteGuide = async () => {
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

  // ── Render ──
  if (loading) return <LoadingSpinner className="py-20" />

  const isReadonly = guide ? guide.status === 'ARCHIVED' : false
  const canSave = !hasMissingTelephotoPhoto && !isIntervalError

  return (
    <div className="space-y-5 max-w-6xl mx-auto" dir="rtl">

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white" dir="ltr">
            {isEdit ? t('guides.edit') : t('guides.new')}
          </h1>
          {guide && <StatusBadge status={guide.status} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {isEdit && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-200/50 dark:shadow-sky-900/30 hover:from-sky-600 hover:to-cyan-700 transition-all"
            >
              <PrinterIcon className="h-4 w-4" />
              {t('guides.exportPdf')}
            </button>
          )}
          {isEdit && canDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <TrashIcon className="h-4 w-4" />
              {t('common.delete')}
            </button>
          )}
          {user?.role === 'RESPONSABLE_PRODUCTION' && (!guide || guide.status === 'DRAFT' || guide.status === 'REJECTED') && (
            <button onClick={handleSaveAndValidate} disabled={saving || !canSave} className="btn-primary text-sm disabled:opacity-60">
              {saving ? t('common.loading') : t('guides.validate')}
            </button>
          )}
          {isEdit && guide && (
            <>
              {guide.status === 'SUBMITTED' && user?.role === 'RESPONSABLE_PRODUCTION' && (
                <>
                  <button onClick={() => handleAction('validate')} className="btn-primary text-sm">{t('guides.validate')}</button>
                  <button onClick={() => { setRejectReason(''); setShowRejectModal(true) }} className="btn-secondary text-sm text-red-600 border-red-300 hover:bg-red-50">{t('guides.reject')}</button>
                </>
              )}
              {guide.status === 'APPROVED' && user?.role === 'RESPONSABLE_PRODUCTION' && (
                <button onClick={() => handleAction('publish')} className="btn-primary text-sm">{t('guides.publish')}</button>
              )}
              {guide.status === 'FINAL_PUBLISHED' && user?.role === 'TECHNICIEN_COORDINATEUR' && (
                <button onClick={() => handleAction('startLive')} className="btn-primary text-sm">{t('guides.startLive')}</button>
              )}
              {guide.status === 'LIVE_IN_PROGRESS' && user?.role === 'TECHNICIEN_COORDINATEUR' && (
                <button onClick={() => handleAction('archive')} className="btn-secondary text-sm">{t('guides.archive')}</button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Rejection reason banner ── */}
      {guide?.status === 'REJECTED' && guide?.rejectionReason && (
        <div className="flex items-start gap-3 px-4 py-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700/60 rounded-xl print:hidden">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
              {t('guides.rejectedBy')}{guide.validatedBy?.name ? ` — ${guide.validatedBy.name}` : ''}
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap">{guide.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* ── Telephone photo warning ── */}
      {hasMissingTelephotoPhoto && !isReadonly && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-700 dark:text-amber-400 text-sm print:hidden">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{t('guides.telephonePhotoRequired')}</span>
        </div>
      )}

      {/* ── Interval error ── */}
      {isIntervalError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl text-red-600 dark:text-red-400 text-sm print:hidden">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>L'heure de fin doit être après l'heure de début.</span>
        </div>
      )}

      {/* ── Main card ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden" ref={printRef}>
        {/* Top accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-500 print:hidden" />

        {/* Header section */}
        <div className="p-6 border-b border-slate-100 dark:border-gray-700">
          {/* Logo + Title centered */}
          <div className="flex flex-col items-center mb-6">
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
            <label className="block text-[11px] font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-widest mb-1.5">{t('guides.programTitle')}</label>
            <input
              type="text"
              value={programTitle}
              onChange={e => setProgramTitle(e.target.value)}
              disabled={isReadonly}
              className="w-full text-base font-semibold text-slate-800 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder-slate-300 print:hidden"
              placeholder={t('guides.programTitle')}
            />
            <span className="hidden print:block text-lg font-semibold text-slate-800">{programTitle || '—'}</span>
          </div>

          {/* Info cards: Producer + Date + Interval + Theme — 2 cols on print/mobile, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Producteur */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-sky-400/10 dark:bg-sky-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <UserIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <label className="block text-[11px] rtl:text-xs font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-1.5">{t('guides.producerName')}</label>
              <input
                type="text"
                value={producerName}
                onChange={e => setProducerName(e.target.value)}
                disabled={isReadonly}
                className="w-full text-sm text-slate-800 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder-slate-300 print:hidden"
                placeholder={t('guides.producerName')}
              />
              <span className="hidden print:block text-sm text-slate-800">{producerName || '—'}</span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-400" />
            </div>
            {/* Date */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-cyan-400/10 dark:bg-cyan-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <CalendarDaysIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <label className="block text-[11px] rtl:text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-1.5">{t('guides.broadcastDate')}</label>
              <div className="print:hidden">
                <DatePickerInput
                  value={broadcastDate}
                  onChange={v => setBroadcastDate(v)}
                  disabled={isReadonly}
                  placeholder={t('guides.broadcastDate')}
                />
              </div>
              <span className="hidden print:block text-sm text-slate-800">{broadcastDate || '—'}</span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-400" />
            </div>
            {/* Interval */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-sky-400/10 dark:bg-sky-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <ClockIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <label className="block text-[11px] rtl:text-xs font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-1.5">{t('guides.programInterval')}</label>
              <div className="flex items-center gap-2 print:hidden" dir="ltr">
                {isRTL ? (
                  <>
                    <TimeInput value={programEndTime} onChange={v => setProgramEndTime(v)} disabled={isReadonly} />
                    <span className="text-sky-400 font-bold text-lg leading-none">←</span>
                    <TimeInput value={programStartTime} onChange={v => setProgramStartTime(v)} disabled={isReadonly} />
                  </>
                ) : (
                  <>
                    <TimeInput value={programStartTime} onChange={v => setProgramStartTime(v)} disabled={isReadonly} />
                    <span className="text-sky-400 font-bold text-lg leading-none">→</span>
                    <TimeInput value={programEndTime} onChange={v => setProgramEndTime(v)} disabled={isReadonly} />
                  </>
                )}
              </div>
              <p className="hidden print:block text-sm text-slate-800 font-mono" dir="ltr">
                {isRTL ? `${programEndTime || '—'} ← ${programStartTime || '—'}` : `${programStartTime || '—'} → ${programEndTime || '—'}`}
              </p>
              {computedDuration && (
                <p className="text-xs text-sky-500 dark:text-sky-400 mt-1.5 font-medium">{computedDuration}</p>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-400" />
            </div>
            {/* Theme */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4 shadow-sm info-card-print">
              <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-sky-400/10 dark:bg-sky-400/5" />
              <div className="mb-2 inline-flex p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30">
                <SparklesIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <label className="block text-[11px] rtl:text-xs font-semibold text-sky-500 dark:text-sky-400 uppercase tracking-wider mb-1.5">{t('guides.theme')}</label>
              <textarea
                ref={themeRef}
                value={theme}
                onChange={e => setTheme(e.target.value)}
                disabled={isReadonly}
                rows={1}
                className="w-full text-sm text-slate-800 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder-slate-300 print:hidden resize-none overflow-hidden"
                placeholder={t('guides.theme')}
              />
              <span className="hidden print:block text-sm text-slate-800 break-words">{theme || '—'}</span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-cyan-400" />
            </div>
          </div>
        </div>

        {/* ── Unified table ── */}
        <div className="mt-4 border border-slate-200 dark:border-slate-700/70 rounded-xl overflow-hidden bg-white dark:bg-slate-800/60 mx-4 mb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white">
                  <th className="px-2 py-3.5 font-semibold text-center border border-sky-400/30 w-20 print:hidden text-xs tracking-wide">{/* Type */}</th>
                  <th className="px-3 py-3.5 font-semibold text-center border border-sky-400/30 w-28 text-xs tracking-wide">{t('guides.startTime')}</th>
                  <th className="px-3 py-3.5 font-semibold text-center border border-sky-400/30 text-xs tracking-wide">{t('guides.content')}</th>
                  <th className="px-3 py-3.5 font-semibold text-center border border-sky-400/30 w-24 text-xs tracking-wide">{t('guides.duration')}</th>
                  <th className="px-3 py-3.5 font-semibold text-center border border-sky-400/30 w-64 text-xs tracking-wide">{t('guides.guestCol')}</th>
                  <th className="px-3 py-3.5 font-semibold text-center border border-sky-400/30 w-48 text-xs tracking-wide">{t('guides.attendanceCol')}</th>
                  <th className="px-2 py-3.5 font-semibold text-center border border-sky-400/30 w-24 text-xs tracking-wide">
                    <span className="flex items-center justify-center gap-1"><SignalIcon className="h-3.5 w-3.5" />{t('guides.streaming')}</span>
                  </th>
                  {!isReadonly && <th className="w-10 border border-sky-400/30 print:hidden"></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isChanson = row.rowType === 'CHANSON'
                  const isLigneProgramme = row.rowType === 'LIGNE_PROGRAMME'
                  const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50 dark:bg-gray-700/50'
                  const chansonBg = idx % 2 === 0 ? 'bg-purple-50/40 dark:bg-purple-900/10' : 'bg-purple-50/70 dark:bg-purple-900/15'
                  const ligneProgrammeBg = idx % 2 === 0 ? 'bg-emerald-50/40 dark:bg-emerald-900/10' : 'bg-emerald-50/70 dark:bg-emerald-900/15'
                  const streamingBg = 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-400'
                  const hasGuestConflict = !!rowConflicts[row._localId]
                  const computedRowBg = hasGuestConflict
                    ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500'
                    : row.streaming ? streamingBg : isChanson ? chansonBg : isLigneProgramme ? ligneProgrammeBg : rowBg

                  return (
                    <tr key={row._localId} className={computedRowBg}>

                      {/* Type badge — screen only */}
                      <td className="px-2 py-2 border border-slate-200 dark:border-gray-700 text-center print:hidden">
                        {isChanson ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                            <MusicalNoteIcon className="h-3 w-3" />
                            {t('guides.rowTypeChanson')}
                          </span>
                        ) : isLigneProgramme ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            <DocumentTextIcon className="h-3 w-3" />
                            {t('guides.rowTypeLigneProgramme')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50">
                            <DocumentTextIcon className="h-3 w-3" />
                            {t('guides.rowTypeProgramme')}
                          </span>
                        )}
                      </td>

                      {/* Start time / passageTime */}
                      <td className="px-2 py-3 border border-slate-200 dark:border-gray-700">
                        <TimeInput
                          value={row.startTime}
                          onChange={v => updateRow(idx, 'startTime', v)}
                          disabled={isReadonly}
                        />
                      </td>

                      {/* Content / Song title */}
                      <td className="px-2 py-2 border border-slate-200 dark:border-gray-700">
                        {isChanson ? (
                          <>
                            <div className="flex items-center gap-1.5 print:hidden">
                              <UserIcon className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                              <input
                                type="text"
                                value={row.songArtist}
                                onChange={e => updateRow(idx, 'songArtist', e.target.value)}
                                disabled={isReadonly}
                                placeholder={t('guides.songArtist')}
                                className="flex-1 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-300 rounded px-1 dark:text-white placeholder-slate-300"
                              />
                            </div>
                            <span className="hidden print:block text-sm text-slate-800">{row.songArtist || '—'}</span>
                          </>
                        ) : (
                          <>
                            <textarea
                              rows={1}
                              value={row.content}
                              onChange={e => updateRow(idx, 'content', e.target.value)}
                              disabled={isReadonly}
                              className="w-full text-sm bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-sky-300 rounded px-1 dark:text-white print:hidden overflow-hidden"
                              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                            />
                            <p className="hidden print:block text-sm text-slate-700 whitespace-pre-wrap break-words max-w-xs">{row.content || '—'}</p>
                          </>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-2 py-2 border border-slate-200 dark:border-gray-700">
                        <input
                          type="text"
                          value={row.duration}
                          onChange={e => updateRow(idx, 'duration', e.target.value)}
                          disabled={isReadonly}
                          className="w-full text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-sky-300 rounded px-1 dark:text-white print:hidden"
                        />
                        <span className="hidden print:block font-mono text-sky-600 font-medium text-xs text-center">{row.duration || '—'}</span>
                      </td>

                      {/* Guest / Artist */}
                      <td className="px-2 py-2 border border-slate-200 dark:border-gray-700" colSpan={isLigneProgramme ? 2 : 1}>
                        {isLigneProgramme ? null : isChanson ? (
                          <>
                            <input
                              type="text"
                              value={row.content}
                              onChange={e => updateRow(idx, 'content', e.target.value)}
                              disabled={isReadonly}
                              placeholder={t('songs.songTitle')}
                              className="w-full text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-300 rounded px-1 dark:text-white font-medium text-purple-700 dark:text-purple-300 placeholder-purple-300/60 print:hidden"
                            />
                            <span className="hidden print:block font-medium text-violet-700">{row.content || '—'}</span>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={row.guestFullName}
                              onChange={e => handleGuestNameChange(idx, e.target.value)}
                              disabled={isReadonly}
                              placeholder={t('guides.guestNamePlaceholder')}
                              className={`w-full text-sm bg-transparent focus:outline-none rounded px-1 mb-1 dark:text-white placeholder-slate-300 print:hidden ${hasGuestConflict ? 'focus:ring-1 focus:ring-red-400 text-red-700 dark:text-red-300 font-semibold' : 'focus:ring-1 focus:ring-sky-300'}`}
                            />
                            {hasGuestConflict && (
                              <p className="text-[10px] text-red-600 dark:text-red-400 font-medium leading-tight mb-1 print:hidden flex items-center gap-0.5">
                                <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0" />
                                {t('guides.guestConflictDetail', { programTitle: rowConflicts[row._localId].programTitle })}
                                {rowConflicts[row._localId].startTime && (
                                  <span dir="ltr" className="ms-1">({rowConflicts[row._localId].startTime}{rowConflicts[row._localId].endTime ? `→${rowConflicts[row._localId].endTime}` : ''})</span>
                                )}
                              </p>
                            )}
                            <input
                              type="text"
                              value={row.guestTitleFunction}
                              onChange={e => updateRow(idx, 'guestTitleFunction', e.target.value)}
                              disabled={isReadonly}
                              placeholder={t('guides.guestFunctionPlaceholder')}
                              className="w-full text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-sky-300 rounded px-1 dark:text-white placeholder-slate-300 text-xs italic print:hidden"
                            />
                            <p className="hidden print:block font-medium text-slate-800 text-sm">{row.guestFullName || '—'}</p>
                            <p className="hidden print:block text-xs text-sky-600">{row.guestTitleFunction}</p>
                          </>
                        )}
                      </td>

                      {/* Attendance / mode */}
                      {!isLigneProgramme && <td className="px-2 py-2 border border-slate-200 dark:border-gray-700">
                        {isChanson ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-violet-500 dark:text-violet-400">
                            <MusicalNoteIcon className="h-3.5 w-3.5" />
                            <span className="font-medium">{t('guides.rowTypeChanson')}</span>
                          </div>
                        ) : (
                          <>
                            {/* Print-only */}
                            <span className="hidden print:block text-sm font-medium text-slate-700">
                              {row.guestAttendanceMode === 'TELEPHONE' ? t('guides.attendancePhone') : t('guides.attendancePresent')}
                            </span>
                            {/* Screen-only */}
                            <div className="flex flex-col gap-1 print:hidden">
                              <label className="flex items-center gap-1 text-sm cursor-pointer">
                                <input
                                  type="radio"
                                  name={`attendance-${row._localId}`}
                                  value="PRESENT_STUDIO"
                                  checked={row.guestAttendanceMode === 'PRESENT_STUDIO'}
                                  onChange={() => updateRow(idx, 'guestAttendanceMode', 'PRESENT_STUDIO')}
                                  disabled={isReadonly}
                                  className="text-sky-500"
                                />
                                <span className="dark:text-slate-300">{t('guides.attendancePresent')}</span>
                              </label>
                              <label className="flex items-center gap-1 text-sm cursor-pointer">
                                <input
                                  type="radio"
                                  name={`attendance-${row._localId}`}
                                  value="TELEPHONE"
                                  checked={row.guestAttendanceMode === 'TELEPHONE'}
                                  onChange={() => updateRow(idx, 'guestAttendanceMode', 'TELEPHONE')}
                                  disabled={isReadonly}
                                  className="text-sky-500"
                                />
                                <span className="dark:text-slate-300">{t('guides.attendancePhone')}</span>
                              </label>
                              {row.guestAttendanceMode === 'TELEPHONE' && (
                                <div className="mt-1 space-y-2">
                                  <input
                                    type="tel"
                                    value={row.guestPhone}
                                    onChange={e => updateRow(idx, 'guestPhone', e.target.value)}
                                    disabled={isReadonly}
                                    className="w-full text-xs bg-slate-100 dark:bg-gray-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-300 dark:text-white"
                                    placeholder={t('guides.guestPhone')}
                                  />
                                  {/* Photo upload */}
                                  {/* Photo slot + upload + delete — all inline */}
                                  <div className="flex items-center gap-2">
                                    {/* Upload button */}
                                    {!isReadonly && (
                                      <label className={`flex items-center gap-1 text-xs cursor-pointer transition-colors ${
                                        !row.guestPhotoUrl && !row.guestPhotoFile && row.guestFullName?.trim()
                                          ? 'text-amber-600 hover:text-amber-700 font-semibold'
                                          : 'text-sky-600 hover:text-sky-700'
                                      }`}>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={e => {
                                            const file = e.target.files[0]
                                            if (file) updateRow(idx, 'guestPhotoFile', file)
                                          }}
                                        />
                                        <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                        <span>
                                          {!row.guestPhotoUrl && !row.guestPhotoFile && row.guestFullName?.trim()
                                            ? '⚠ ' + t('guides.guestPhoto')
                                            : t('guides.guestPhoto')
                                          }
                                        </span>
                                      </label>
                                    )}
                                    {/* Delete button */}
                                    {(row.guestPhotoFile || row.guestPhotoUrl) && !isReadonly && (
                                      <>
                                        {(() => {
                                          if (row.guestPhotoFile) {
                                            const previewUrl = URL.createObjectURL(row.guestPhotoFile)
                                            const ext = row.guestPhotoFile.name.substring(row.guestPhotoFile.name.lastIndexOf('.'))
                                            return (
                                              <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => downloadPhoto(previewUrl, row.guestFullName, ext)}>
                                                <img src={previewUrl} alt="preview" className="h-10 w-10 rounded-full object-cover border-2 border-sky-300 dark:border-sky-600 shadow-sm" />
                                                <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <ArrowDownTrayIcon className="h-3 w-3 text-white" />
                                                </span>
                                              </div>
                                            )
                                          }
                                          const photoSrc = row.guestPhotoUrl.startsWith('/uploads/') ? row.guestPhotoUrl : `/uploads/${row.guestPhotoUrl}`
                                          return (
                                            <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => downloadPhoto(photoSrc, row.guestFullName)}>
                                              <img src={photoSrc} alt="guest" className="h-10 w-10 rounded-full object-cover border-2 border-slate-200 dark:border-gray-600 shadow-sm" />
                                              <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowDownTrayIcon className="h-3 w-3 text-white" />
                                              </span>
                                            </div>
                                          )
                                        })()}
                                        <UserCircleIcon className="h-7 w-7 text-slate-400 dark:text-gray-500 flex-shrink-0" />
                                        <button type="button" onClick={() => updateRow(idx, { guestPhotoFile: null, guestPhotoUrl: '' })} className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title={t('common.delete')}>
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Print: phone number */}
                            {row.guestAttendanceMode === 'TELEPHONE' && row.guestPhone && (
                              <span className="hidden print:block text-xs text-slate-500 mt-1">{row.guestPhone}</span>
                            )}
                            {/* Print: photo + icon */}
                            {(row.guestPhotoUrl || row.guestPhotoFile) && (() => {
                              const src = row.guestPhotoFile
                                ? URL.createObjectURL(row.guestPhotoFile)
                                : (row.guestPhotoUrl.startsWith('/uploads/') ? row.guestPhotoUrl : `/uploads/${row.guestPhotoUrl}`)
                              return (
                                <div className="hidden print:flex items-center gap-1 mt-1">
                                  <img src={src} alt={row.guestFullName} className="h-10 w-10 rounded-full object-cover border border-slate-200" onError={e => { e.target.style.display = 'none' }} />
                                  <UserCircleIcon className="h-6 w-6 text-slate-400" />
                                </div>
                              )
                            })()}
                          </>
                        )}
                      </td>}

                      {/* Streaming — Ligne Invité only */}
                      <td className="px-2 py-2 text-center border border-slate-200 dark:border-gray-700">
                        {row.rowType === 'PROGRAMME' ? (
                          <>
                            {/* Screen: interactive */}
                            <div className="print:hidden">
                              {!isReadonly ? (
                                <label className="flex flex-col items-center gap-1.5 cursor-pointer select-none group">
                                  <div className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                                    row.streaming
                                      ? 'bg-orange-500 shadow-md shadow-orange-200 dark:shadow-orange-900/40'
                                      : 'bg-slate-100 dark:bg-gray-700 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30'
                                  }`}>
                                    {row.streaming && (
                                      <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-60" />
                                    )}
                                    <input
                                      type="checkbox"
                                      checked={!!row.streaming}
                                      onChange={() => handleToggleStreaming(idx)}
                                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                    />
                                    <SignalIcon className={`h-4 w-4 transition-colors ${row.streaming ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'}`} />
                                  </div>
                                  <span className={`text-[10px] font-semibold transition-colors ${row.streaming ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {t('guides.streaming')}
                                  </span>
                                </label>
                              ) : row.streaming ? (
                                <span className="flex items-center justify-center">
                                  <span className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                                    <SignalIcon className="h-4 w-4 text-white" />
                                  </span>
                                </span>
                              ) : null}
                            </div>
                            {/* Print: static */}
                            {row.streaming ? (
                              <div className="hidden print:flex flex-col items-center gap-1">
                                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                                  <SignalIcon className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-[9px] font-semibold text-orange-600">{t('guides.streaming')}</span>
                              </div>
                            ) : (
                              <span className="hidden print:inline text-slate-300 text-xs">—</span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-200 dark:text-gray-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Delete */}
                      {!isReadonly && (
                        <td className="px-1 py-2 text-center border border-slate-200 dark:border-gray-700 print:hidden">
                          <button
                            onClick={() => handleDeleteRow(row, idx)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Add row buttons */}
          {!isReadonly && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-700/50 print:hidden flex items-center gap-3 flex-wrap">
              <button
                onClick={handleAddProgrammeRow}
                className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
              >
                <UserIcon className="h-4 w-4" />
                {t('guides.addProgrammeRow')}
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                onClick={handleAddLigneProgrammeRow}
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                {t('guides.addLigneProgrammeRow')}
              </button>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <button
                onClick={handleAddChansonRow}
                className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                <MusicalNoteIcon className="h-4 w-4" />
                {t('guides.addSongRow')}
              </button>
            </div>
          )}
        </div>

        {/* ── Notes section ── */}
        <div className="p-6">
          <div className={`space-y-0 ${(isEdit ? notes.length === 0 : localNotes.length === 0) ? 'print:hidden' : ''}`}>
            <div className="song-header-bar flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-t-xl">
              <div className="flex items-center gap-2.5">
                <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-white/90" />
                <h3 className="font-semibold text-white text-sm">{t('guides.notes')}</h3>
                {(isEdit ? notes.length : localNotes.length) > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    {isEdit ? notes.length : localNotes.length}
                  </span>
                )}
              </div>
            </div>
            <div className="border border-t-0 border-slate-200 dark:border-slate-700/70 rounded-b-xl bg-white dark:bg-slate-800/60 p-4 space-y-2">
              {isEdit ? (
                <>
                  {notes.map(note => {
                    const nId = note._id || note.id
                    const isEditing = editingNoteId === nId
                    return (
                      <div key={nId} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <div className="space-y-2 print:hidden">
                            <textarea rows={2} value={editNoteText} onChange={e => setEditNoteText(e.target.value)} className="form-input flex-1 text-sm w-full" autoFocus />
                            <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => { setEditingNoteId(null); setEditNoteText('') }} className="btn-secondary text-xs py-1 px-3">{t('common.cancel')}</button>
                              <button type="button" onClick={handleUpdateNote} className="btn-primary text-xs py-1 px-3">{t('common.save')}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="whitespace-pre-wrap">{note.content}</p>
                              <p className="text-xs text-slate-400 mt-1">{note.authorId?.email || note.authorEmail}</p>
                            </div>
                            {!isReadonly && (
                              <div className="flex items-center gap-1 flex-shrink-0 print:hidden">
                                <button onClick={() => { setEditingNoteId(nId); setEditNoteText(note.content) }} className="text-slate-300 hover:text-sky-500 transition-colors" title={t('common.edit')}>
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteNote(nId)} className="text-slate-300 hover:text-red-500 transition-colors" title={t('common.delete')}>
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {!isReadonly && (
                    <div className="flex gap-2 print:hidden">
                      <textarea rows={2} value={noteText} onChange={e => setNoteText(e.target.value)} className="form-input flex-1 text-sm" placeholder={t('guides.addNote')} />
                      <button onClick={handleAddNote} className="btn-secondary text-sm self-start">{t('common.add')}</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {localNotes.map((content, idx) => {
                    const isEditing = editingLocalNoteIdx === idx
                    return (
                      <div key={idx} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <div className="space-y-2 print:hidden">
                            <textarea rows={2} value={editLocalNoteText} onChange={e => setEditLocalNoteText(e.target.value)} className="form-input flex-1 text-sm w-full" autoFocus />
                            <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => { setEditingLocalNoteIdx(null); setEditLocalNoteText('') }} className="btn-secondary text-xs py-1 px-3">{t('common.cancel')}</button>
                              <button type="button" onClick={() => {
                                if (!editLocalNoteText.trim()) return
                                setLocalNotes(prev => prev.map((n, i) => i === idx ? editLocalNoteText.trim() : n))
                                setEditingLocalNoteIdx(null)
                                setEditLocalNoteText('')
                              }} className="btn-primary text-xs py-1 px-3">{t('common.save')}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <p className="flex-1 whitespace-pre-wrap">{content}</p>
                            <div className="flex items-center gap-1 flex-shrink-0 print:hidden">
                              <button type="button" onClick={() => { setEditingLocalNoteIdx(idx); setEditLocalNoteText(content) }} className="text-slate-300 hover:text-sky-500 transition-colors" title={t('common.edit')}>
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => setLocalNotes(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors" title={t('common.delete')}>
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="flex gap-2 print:hidden">
                    <textarea rows={2} value={localNoteText} onChange={e => setLocalNoteText(e.target.value)} className="form-input flex-1 text-sm" placeholder={t('guides.addNote')} />
                    <button type="button" onClick={() => {
                      if (!localNoteText.trim()) return
                      setLocalNotes(prev => [...prev, localNoteText.trim()])
                      setLocalNoteText('')
                    }} className="btn-secondary text-sm self-start">{t('common.add')}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom action buttons ── */}
      {!isReadonly && (
        <div className="flex justify-end gap-3 print:hidden">
          <button type="button" onClick={() => navigate('/guides')} className="btn-secondary">
            {t('common.cancel')}
          </button>
          {(!guide?.status || guide.status === 'DRAFT' || guide.status === 'REJECTED') && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !canSave}
              title={hasMissingTelephotoPhoto ? t('guides.telephonePhotoRequired') : isIntervalError ? 'Horaire invalide' : undefined}
              className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t('common.loading') : t('guides.saveDraft')}
            </button>
          )}
          {['PRODUCTEUR', 'RESPONSABLE_ADMINISTRATIF'].includes(user?.role) && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !canSave}
              title={hasMissingTelephotoPhoto ? t('guides.telephonePhotoRequired') : isIntervalError ? 'Horaire invalide' : undefined}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t('common.loading') : t('guides.saveAndSubmit')}
            </button>
          )}
          {user?.role === 'RESPONSABLE_PRODUCTION' && ['SUBMITTED', 'FINAL_PUBLISHED'].includes(guide?.status) && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !canSave}
              title={hasMissingTelephotoPhoto ? t('guides.telephonePhotoRequired') : isIntervalError ? 'Horaire invalide' : undefined}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          )}
        </div>
      )}
      {isReadonly && (
        <div className="flex justify-end print:hidden">
          <Link to="/guides" className="btn-secondary">{t('common.cancel')}</Link>
        </div>
      )}

      {/* ── Reject Modal (with reason) ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !rejecting && setShowRejectModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">{t('guides.rejectModalTitle')}</h3>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('guides.rejectModalDesc')}</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('guides.rejectionReasonLabel')}
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder={t('guides.rejectionReasonPlaceholder')}
                  rows={4}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none transition"
                  disabled={rejecting}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
              <button onClick={() => setShowRejectModal(false)} disabled={rejecting} className="btn-secondary text-sm disabled:opacity-60">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting || !rejectReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ExclamationTriangleIcon className="h-4 w-4" />
                {rejecting ? t('common.loading') : t('guides.confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <p className="text-slate-700 dark:text-slate-200 text-center">{t('common.confirmDeleteMessage')}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleDeleteGuide} disabled={deleting} className="btn-primary bg-red-500 hover:bg-red-600 border-red-500 disabled:opacity-60">
                {deleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

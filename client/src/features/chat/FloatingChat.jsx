import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useChat } from '../../contexts/ChatContext'
import { useAuth } from '../../hooks/useAuth'
import api from '../../api/axios'
import {
  ChatBubbleOvalLeftEllipsisIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PaperClipIcon,
} from '@heroicons/react/24/solid'
import {
  ChatBubbleLeftRightIcon,
  CheckIcon,
  CheckCircleIcon,
  TrashIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { format, isToday, isYesterday, isThisWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  PRODUCTEUR: 'Producteur',
  RESPONSABLE_PRODUCTION: 'Chef Prod.',
  TECHNICIEN_COORDINATEUR: 'Technicien',
  RESPONSABLE_ADMINISTRATIF: 'Admin',
  RESPONSABLE_PUBLICITE: 'Publicité',
  RECEPTIONNISTE_POLICIER: 'Réceptionniste',
}

const ROLE_COLORS = {
  PRODUCTEUR: 'from-sky-400 to-cyan-500',
  RESPONSABLE_PRODUCTION: 'from-blue-400 to-sky-500',
  TECHNICIEN_COORDINATEUR: 'from-cyan-400 to-sky-500',
  RESPONSABLE_ADMINISTRATIF: 'from-indigo-400 to-blue-500',
  RESPONSABLE_PUBLICITE: 'from-violet-400 to-purple-500',
  RECEPTIONNISTE_POLICIER: 'from-sky-400 to-blue-500',
}

const ROLE_BADGE = {
  PRODUCTEUR: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  RESPONSABLE_PRODUCTION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  TECHNICIEN_COORDINATEUR: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  RESPONSABLE_ADMINISTRATIF: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  RESPONSABLE_PUBLICITE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  RECEPTIONNISTE_POLICIER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function fmtTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Hier'
  if (isThisWeek(d)) return format(d, 'EEE', { locale: fr })
  return format(d, 'dd/MM')
}

function fmtMsgTime(dateStr) {
  if (!dateStr) return ''
  return format(new Date(dateStr), 'HH:mm')
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 'md', showOnline = false, isOnline = false }) {
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  const grad = ROLE_COLORS[user?.role] || 'from-slate-400 to-slate-500'
  return (
    <div className="relative flex-shrink-0">
      <div className={`${sz} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm font-bold text-white`}>
        {getInitials(user?.name || user?.email || '?')}
      </div>
      {showOnline && (
        <span className={`absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-800 ${isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
      )}
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────
// Uses explicit `style` for margin so RTL cannot affect layout.
// Own messages: right side (blue). Received: left side (white/gray).
function MessageBubble({ msg, isOwn, showAvatar, isFirstInGroup, otherUser, currentUserName, isLastInGroup, onDeleteClick }) {
  const senderName = isOwn
    ? (currentUserName || 'Vous')
    : (otherUser?.name || otherUser?.email || '?')

  const grad = isOwn
    ? ROLE_COLORS[msg.senderId?.role] || 'from-sky-400 to-blue-500'
    : ROLE_COLORS[otherUser?.role] || 'from-slate-400 to-slate-500'

  return (
    // dir="ltr" + explicit marginLeft/Right ensure left=received, right=sent
    // regardless of whether the app's root is RTL or LTR
    <div
      dir="ltr"
      className="group"
      style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isOwn ? 'row-reverse' : 'row' }}
    >
      {/* Avatar — received messages only, left side */}
      <div style={{ width: 28, flexShrink: 0, opacity: (!isOwn && showAvatar) ? 1 : 0 }}>
        <div
          className={`h-7 w-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}
        >
          {getInitials(otherUser?.name || '?')}
        </div>
      </div>

      {/* Trash button — sibling of bubble column in the outer row-reverse.
          With row-reverse, DOM order [avatar][trash][bubble] renders visually as
          [bubble][trash][avatar] → trash is always to the RIGHT of the bubble,
          outside its max-width, never clipped by the bubble. */}
      {isOwn && onDeleteClick && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteClick() }}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 self-center flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Supprimer"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bubble column — standalone, max-width independent of trash button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '75%', alignItems: isOwn ? 'flex-end' : 'flex-start', minWidth: 0 }}>

          {/* Sender name — first message in group */}
          {isFirstInGroup && (
            <span
              style={{ fontSize: 11, fontWeight: 600, paddingLeft: 4, paddingRight: 4 }}
              className={isOwn ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}
            >
              {senderName}
            </span>
          )}

          {/* Bubble */}
          {(() => {
            const isImageOnly = msg.fileType === 'image' && msg.fileUrl && !msg.content
            return (
          <div
            className={`text-sm leading-relaxed overflow-hidden
              ${isImageOnly
                ? 'rounded-2xl shadow-md'
                : isOwn
                  ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm'
                  : 'bg-white dark:bg-gray-700 text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-sm border border-slate-100 dark:border-gray-600 shadow-sm'
              }
            `}
          >
            {/* Image attachment */}
            {msg.fileType === 'image' && msg.fileUrl && (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={msg.fileUrl}
                    alt={msg.fileName || 'image'}
                    className="max-w-[200px] max-h-[200px] object-cover w-full"
                    style={{ display: 'block' }}
                  />
                </a>
                <a
                  href={msg.fileUrl}
                  download={msg.fileName || 'image'}
                  onClick={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', bottom: 6, right: 6 }}
                  className="flex items-center justify-center h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
                  title="Télécharger"
                >
                  <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
            {/* PDF attachment */}
            {msg.fileType === 'pdf' && msg.fileUrl && (
              <a
                href={msg.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-opacity hover:opacity-80
                  ${isOwn ? 'bg-white/15' : 'bg-slate-50 dark:bg-gray-600/40'}
                `}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${isOwn ? 'bg-white/20' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <DocumentIcon className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-red-500'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold truncate ${isOwn ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                    {msg.fileName}
                  </p>
                  <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                    PDF {msg.fileSize ? `· ${(msg.fileSize / 1024 / 1024).toFixed(1)} Mo` : ''}
                  </p>
                </div>
                <ArrowDownTrayIcon className={`h-4 w-4 flex-shrink-0 ${isOwn ? 'text-white/80' : 'text-slate-400'}`} />
              </a>
            )}
            {/* Text content */}
            {msg.content && (
              <div className="px-3.5 py-2">{msg.content}</div>
            )}
          </div>
            )
          })()}

          {/* Timestamp + read receipt */}
          {isLastInGroup && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 3, flexDirection: isOwn ? 'row-reverse' : 'row', opacity: 0.65, paddingLeft: 2, paddingRight: 2 }}
            >
              <span style={{ fontSize: 10 }} className="text-slate-400 dark:text-slate-500">
                {fmtMsgTime(msg.createdAt)}
              </span>
              {isOwn && (
                msg.isRead
                  ? <CheckCircleIcon className="h-3 w-3 text-sky-400" />
                  : <CheckIcon className="h-3 w-3 text-slate-400" />
              )}
            </div>
          )}
        </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end" dir="ltr">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex-shrink-0" />
      <div className="bg-white dark:bg-gray-700 border border-slate-100 dark:border-gray-600 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main FloatingChat component ───────────────────────────────────────────────
export default function FloatingChat() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const { user } = useAuth()
  const {
    isOpen, setIsOpen,
    view, setView,
    conversations,
    activeConv,
    messages,
    totalUnread,
    onlineUsers,
    typingUsers,
    loadingConvs,
    loadingMsgs,
    chatUsers,
    isMe,
    selectConversation,
    openConversationWith,
    sendMessage,
    startTyping,
    stopTyping,
    closePanel,
    deleteMessage,
    deleteConversation,
  } = useChat()

  const [input, setInput] = useState('')
  const [searchConv, setSearchConv] = useState('')
  const [searchUsers, setSearchUsers] = useState('')
  const [deletingMsgId, setDeletingMsgId] = useState(null)
  const [deletingConvId, setDeletingConvId] = useState(null)
  const [attachedFile, setAttachedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  // ── Drag ────────────────────────────────────────────────────────────────────
  const [pos, setPos] = useState({ right: 16, bottom: 16 })
  const posRef = useRef({ right: 16, bottom: 16 })
  const dragInfo = useRef({ active: false, hasDragged: false, x0: 0, y0: 0, r0: 16, b0: 16 })
  const [isDragging, setIsDragging] = useState(false)

  const onMove = useCallback((e) => {
    if (!dragInfo.current.active) return
    const dx = e.clientX - dragInfo.current.x0
    const dy = e.clientY - dragInfo.current.y0
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragInfo.current.hasDragged = true
    const newPos = {
      right: Math.max(8, Math.min(window.innerWidth - 60, dragInfo.current.r0 - dx)),
      bottom: Math.max(8, Math.min(window.innerHeight - 60, dragInfo.current.b0 - dy)),
    }
    posRef.current = newPos
    setPos(newPos)
  }, [])

  const onUp = useCallback(() => {
    dragInfo.current.active = false
    setIsDragging(false)
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }, [onMove])

  const onBtnDown = useCallback((e) => {
    e.preventDefault()
    dragInfo.current = {
      active: true,
      hasDragged: false,
      x0: e.clientX,
      y0: e.clientY,
      r0: posRef.current.right,
      b0: posRef.current.bottom,
    }
    setIsDragging(true)
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onMove, onUp])

  const onBtnClick = useCallback(() => {
    if (dragInfo.current.hasDragged) return
    setIsOpen((v) => !v)
    if (!isOpen) setView('list')
  }, [isOpen, setIsOpen, setView])

  // ── Auto-scroll to bottom when new messages arrive ─────────────────────────
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, view])

  // ── Focus input when chat view opens ──────────────────────────────────────
  useEffect(() => {
    if (view === 'chat' && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [view, isOpen])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed && !attachedFile) return

    if (attachedFile) {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', attachedFile)
        // Do NOT set Content-Type manually — axios sets it with the boundary automatically
        const res = await api.post('/chat/upload', formData)
        const fileData = res.data?.data
        if (fileData?.fileUrl) {
          sendMessage(trimmed, fileData)
          setInput('')
          stopTyping()
        }
      } catch (err) {
        console.error('[chat] upload error:', err)
        setUploadError(true)
        setTimeout(() => setUploadError(false), 3000)
      } finally {
        setUploading(false)
        setAttachedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } else {
      sendMessage(trimmed)
      setInput('')
      stopTyping()
    }
  }, [input, attachedFile, sendMessage, stopTyping])

  const handleDeleteConv = useCallback(async (convId) => {
    setDeletingConvId(null)
    await deleteConversation(convId)
  }, [deleteConversation])

  const handleDeleteMsg = useCallback(async (msgId) => {
    if (!activeConv?._id) return
    await deleteMessage(activeConv._id, msgId)
  }, [activeConv, deleteMessage])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    if (e.target.value) startTyping()
    else stopTyping()
  }

  if (!user) return null

  // Get other user of active conversation
  const otherUser = activeConv?.other || activeConv?.participants?.find((p) => p._id !== user?.id && p._id !== user?._id)
  const isOtherOnline = otherUser && onlineUsers.has(otherUser._id?.toString?.() ?? otherUser._id)

  // Typing indicator for active conversation
  const isTyping = activeConv && typingUsers[activeConv._id]?.size > 0

  // Filter conversations by search
  const filteredConvs = conversations.filter((c) => {
    const other = c.other
    if (!other) return true
    const q = searchConv.toLowerCase()
    return (
      other.name?.toLowerCase().includes(q) ||
      other.email?.toLowerCase().includes(q) ||
      ROLE_LABELS[other.role]?.toLowerCase().includes(q)
    )
  })

  // Filter users by search
  const filteredUsers = chatUsers.filter((u) => {
    const q = searchUsers.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      ROLE_LABELS[u.role]?.toLowerCase().includes(q)
    )
  })

  // Group messages for display (consecutive same sender)
  const groupedMessages = messages.map((msg, i) => {
    const next = messages[i + 1]
    const isSameSenderNext = next && (
      (next.senderId?._id ?? next.senderId) === (msg.senderId?._id ?? msg.senderId)
    )
    const prev = messages[i - 1]
    const isSameSenderPrev = prev && (
      (prev.senderId?._id ?? prev.senderId) === (msg.senderId?._id ?? msg.senderId)
    )
    return {
      ...msg,
      isLastInGroup: !isSameSenderNext,
      isFirstInGroup: !isSameSenderPrev,
    }
  })

  // Panel positioned above the button
  const panelBottom = pos.bottom + 80

  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      <div
        style={{ right: pos.right, bottom: panelBottom, height: 520 }}
        className={`
          fixed z-50
          w-[370px] sm:w-[395px]
          bg-white dark:bg-gray-900
          rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/40
          border border-slate-200/60 dark:border-gray-700/60
          flex flex-col overflow-hidden
          transition-all duration-300 ease-out ltr:origin-bottom-right rtl:origin-bottom-left
          ${isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-90 pointer-events-none'
          }
        `}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-gradient-to-r from-sky-500 via-blue-500 to-sky-600 px-4 py-3.5 text-white select-none">
          <div className="flex items-center gap-3">
            {view === 'chat' || view === 'users' ? (
              <button
                onClick={() => { setView('list'); }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isRTL ? <ArrowRightIcon className="h-4 w-4" /> : <ArrowLeftIcon className="h-4 w-4" />}
              </button>
            ) : (
              <div className="p-1.5 rounded-lg bg-white/10">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              </div>
            )}

            {view === 'chat' && otherUser ? (
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Avatar user={otherUser} size="sm" showOnline isOnline={isOtherOnline} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{otherUser.name || otherUser.email}</p>
                  <p className="text-[11px] text-white/70">
                    {isOtherOnline ? t('chat.online') : t('chat.offline')}
                  </p>
                </div>
              </div>
            ) : view === 'users' ? (
              <div className="flex-1">
                <p className="font-bold text-base">{t('chat.newChat')}</p>
                <p className="text-[11px] text-white/70">{t('chat.selectUser')}</p>
              </div>
            ) : (
              <div className="flex-1">
                <p className="font-bold text-base">{t('chat.title')}</p>
                {totalUnread > 0 && (
                  <p className="text-[11px] text-white/70">{totalUnread} {t('chat.unread') || 'non lu(s)'}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 ms-auto">
              {view === 'list' && (
                <button
                  onClick={() => setView('users')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  title={t('chat.newChat')}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── VIEW: Conversation list ─────────────────────────────────────── */}
        {view === 'list' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search */}
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-gray-700/60 flex-shrink-0">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('chat.search')}
                  value={searchConv}
                  onChange={(e) => setSearchConv(e.target.value)}
                  className="w-full ps-8 pe-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800">
                    <ChatBubbleOvalLeftEllipsisIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('chat.noConversations')}</p>
                  <button
                    onClick={() => setView('users')}
                    className="mt-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {t('chat.startChat')} →
                  </button>
                </div>
              ) : (
                <div className="py-1">
                  {filteredConvs.map((conv) => {
                    const other = conv.other
                    if (!other) return null
                    const isOnline = onlineUsers.has(other._id?.toString?.() ?? other._id)
                    const hasUnread = conv.unreadCount > 0
                    const isTypingHere = typingUsers[conv._id]?.size > 0
                    const isConfirmingDel = deletingConvId === conv._id
                    return (
                      <div key={conv._id} className="relative group">
                        <button
                          onClick={() => {
                            if (isConfirmingDel) { setDeletingConvId(null); return }
                            selectConversation(conv)
                          }}
                          className="w-full flex items-center gap-3 ps-3.5 pe-10 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors text-start"
                        >
                          <Avatar user={other} showOnline isOnline={isOnline} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                                {other.name || other.email}
                              </p>
                              {isConfirmingDel ? (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteConv(conv._id) }}
                                    className="text-[10px] py-0.5 px-2 bg-red-500 hover:bg-red-600 text-white rounded font-bold transition-colors"
                                  >{t('common.yes')}</button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeletingConvId(null) }}
                                    className="text-[10px] py-0.5 px-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-slate-300 rounded font-bold transition-colors"
                                  >{t('common.no')}</button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                                  {fmtTime(conv.lastMessageAt || conv.updatedAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs truncate ${isConfirmingDel ? 'text-red-500 font-medium' : hasUnread ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                                {isConfirmingDel
                                  ? t('chat.deleteConvConfirm')
                                  : isTypingHere
                                    ? <span className="text-sky-500 italic">{t('chat.typing')}</span>
                                    : (conv.lastMessage || <span className="text-slate-300 dark:text-slate-600 italic">{t('chat.startChat')}</span>)
                                }
                              </p>
                              {hasUnread && !isConfirmingDel && (
                                <span className="flex-shrink-0 h-5 min-w-[20px] px-1 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">
                                  {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Trash icon — logical end positioning for RTL/LTR */}
                        {!isConfirmingDel && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingConvId(conv._id) }}
                            className="absolute end-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-md text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: User picker (new conversation) ───────────────────────── */}
        {view === 'users' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-gray-700/60 flex-shrink-0">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('chat.search')}
                  value={searchUsers}
                  onChange={(e) => setSearchUsers(e.target.value)}
                  className="w-full ps-8 pe-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <p className="text-sm text-slate-400 dark:text-slate-500">{t('common.noData')}</p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isOnline = onlineUsers.has(u._id?.toString?.() ?? u._id)
                  return (
                    <button
                      key={u._id}
                      onClick={() => { setSearchUsers(''); openConversationWith(u._id) }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <Avatar user={u} showOnline isOnline={isOnline} />
                      <div className="flex-1 min-w-0 text-start">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {u.name || u.email}
                        </p>
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </div>
                      {isOnline && (
                        <span className="text-[10px] font-semibold text-green-500 flex-shrink-0">{t('chat.online')}</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── VIEW: Chat window ──────────────────────────────────────────── */}
        {view === 'chat' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Messages area — dir="ltr" ensures left=received, right=sent regardless of app RTL */}
            <div
              dir="ltr"
              className="flex-1 overflow-y-auto px-3 py-4 bg-slate-50/50 dark:bg-gray-900/50"
              style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
                    <ChatBubbleLeftRightIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-medium text-center">
                    {t('chat.startChat')}
                  </p>
                </div>
              ) : (
                groupedMessages.map((msg) => {
                  const mine = isMe(msg.senderId)
                  const isConfirming = deletingMsgId === msg._id
                  return (
                    <div key={msg._id} style={{ marginTop: msg.isFirstInGroup ? 10 : 2 }}>
                      <MessageBubble
                        msg={msg}
                        isOwn={mine}
                        showAvatar={msg.isFirstInGroup}
                        isFirstInGroup={msg.isFirstInGroup}
                        otherUser={otherUser}
                        currentUserName={user?.name || user?.email}
                        isLastInGroup={msg.isLastInGroup}
                        onDeleteClick={mine && !isConfirming ? () => setDeletingMsgId(msg._id) : undefined}
                      />
                      {/* Inline delete confirm */}
                      {isConfirming && (
                        <div dir="ltr" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5, marginTop: 3, paddingRight: 2 }}>
                          <span className="text-[11px] text-red-500 font-medium">Supprimer ?</span>
                          <button
                            onClick={() => { handleDeleteMsg(msg._id); setDeletingMsgId(null) }}
                            className="text-[11px] py-0.5 px-2 bg-red-500 hover:bg-red-600 text-white rounded-md font-semibold transition-colors"
                          >Oui</button>
                          <button
                            onClick={() => setDeletingMsgId(null)}
                            className="text-[11px] py-0.5 px-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-slate-300 rounded-md font-semibold transition-colors"
                          >Non</button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              {/* Typing indicator */}
              {isTyping && <TypingIndicator />}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 px-3 py-3 border-t border-slate-100 dark:border-gray-700/60 bg-white dark:bg-gray-900">
              {/* Upload error */}
              {uploadError && (
                <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-xs text-red-600 dark:text-red-400">
                  Échec de l'envoi du fichier. Réessayez.
                </div>
              )}
              {/* Attached file preview */}
              {attachedFile && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700/40">
                  <PaperClipIcon className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                  <span className="text-xs text-sky-700 dark:text-sky-300 truncate flex-1">{attachedFile.name}</span>
                  <button onClick={() => { setAttachedFile(null); fileInputRef.current.value = '' }} className="text-sky-400 hover:text-red-500 transition-colors">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* File attachment button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 h-10 w-10 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:border-sky-400 dark:hover:border-sky-500 flex items-center justify-center transition-all duration-200"
                  title={t('chat.attachFile') || 'Joindre un fichier'}
                >
                  <PaperClipIcon className="h-4 w-4" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.typeMessage')}
                    className="w-full resize-none rounded-2xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 text-slate-800 dark:text-slate-100 text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 dark:focus:border-sky-500 placeholder:text-slate-400 transition-all leading-relaxed"
                    style={{ maxHeight: 96, overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
                    onInput={(e) => {
                      e.target.style.height = 'auto'
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !attachedFile) || uploading}
                  className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-md shadow-sky-500/30 transition-all duration-200 active:scale-95"
                >
                  {uploading
                    ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <PaperAirplaneIcon className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating button ─────────────────────────────────────────────────── */}
      <button
        onMouseDown={onBtnDown}
        onClick={onBtnClick}
        style={{ right: pos.right, bottom: pos.bottom }}
        className={`
          fixed z-50
          h-14 w-14 rounded-full
          bg-gradient-to-br from-sky-500 to-blue-600
          hover:from-sky-600 hover:to-blue-700
          text-white shadow-xl shadow-sky-500/40
          flex items-center justify-center
          transition-colors duration-200
          ${isDragging ? 'cursor-grabbing scale-95' : 'cursor-grab hover:scale-110'}
          active:scale-95
        `}
        aria-label="Chat"
      >
        <div className="relative">
          {isOpen
            ? <XMarkIcon className="h-6 w-6" />
            : <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
          }
          {/* Unread badge */}
          {!isOpen && totalUnread > 0 && (
            <span className="absolute -top-2 -end-2 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-bounce">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>
      </button>
    </>
  )
}

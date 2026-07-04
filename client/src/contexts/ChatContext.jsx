import React, {
  createContext, useContext, useEffect, useRef,
  useState, useCallback,
} from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../hooks/useAuth'
import api from '../api/axios'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user } = useAuth()

  const socketRef = useRef(null)
  const activeConvIdRef = useRef(null)
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // ── Panel state ──────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'chat' | 'users'

  // ── Data state ───────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [typingUsers, setTypingUsers] = useState({}) // convId → Set<userId>
  const [loadingConvs, setLoadingConvs] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [chatUsers, setChatUsers] = useState([])

  // Keep activeConvId ref in sync
  useEffect(() => {
    activeConvIdRef.current = activeConv?._id || null
  }, [activeConv])

  // ── Helper: is a sender ID equal to current user ─────────────────────────────
  const isMe = useCallback((senderId) => {
    // Support both id and _id on user object (JWT may store either)
    const myId = (userRef.current?.id ?? userRef.current?._id)?.toString()
    if (!myId) return false
    if (typeof senderId === 'string') return senderId === myId
    // Populated object: { _id, name, email, role }
    const sId = (senderId?._id ?? senderId?.id)?.toString()
    if (sId) return sId === myId
    return false
  }, [])

  // ── Load conversations ────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!userRef.current) return
    setLoadingConvs(true)
    try {
      const res = await api.get('/chat/conversations')
      const convs = res.data?.data || []
      setConversations(convs)
      const unread = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
      setTotalUnread(unread)
      // Join socket rooms for all conversations
      if (socketRef.current?.connected) {
        convs.forEach((c) => socketRef.current.emit('conv:join', c._id))
      }
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  // ── Load chat users list ──────────────────────────────────────────────────────
  const loadChatUsers = useCallback(async () => {
    try {
      const res = await api.get('/chat/users')
      setChatUsers(res.data?.data || [])
    } catch { /* ignore */ }
  }, [])

  // ── Socket setup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const token = localStorage.getItem('accessToken')
    const socket = io({
      auth: { token },
      transports: ['polling', 'websocket'],
      autoConnect: true,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      // Re-join all conversation rooms + active conversation after reconnect
      setConversations((prev) => {
        prev.forEach((c) => socket.emit('conv:join', c._id))
        return prev
      })
      if (activeConvIdRef.current) {
        socket.emit('conv:join', activeConvIdRef.current)
      }
    })

    // ── New message ──────────────────────────────────────────────────────────
    socket.on('message:new', (msg) => {
      const mine = isMe(msg.senderId)
      const convId = msg.conversationId?.toString?.() ?? msg.conversationId

      // Append to active conversation
      setMessages((prev) => {
        if (activeConvIdRef.current === convId) {
          if (prev.find((m) => m._id === msg._id)) return prev
          return [...prev, msg]
        }
        return prev
      })

      // Update conversation list
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id === convId) {
            const isActive = activeConvIdRef.current === convId
            return {
              ...conv,
              lastMessage: msg.content,
              lastMessageAt: msg.createdAt,
              unreadCount: isActive || mine ? conv.unreadCount : conv.unreadCount + 1,
            }
          }
          return conv
        })
      )

      // Update total unread badge
      if (!mine && activeConvIdRef.current !== convId) {
        setTotalUnread((prev) => prev + 1)
      }

      // Auto-read if this conversation is active
      if (activeConvIdRef.current === convId && !mine) {
        socket.emit('mark:read', { conversationId: convId })
      }
    })

    // ── Messages read ────────────────────────────────────────────────────────
    socket.on('message:read', ({ conversationId, readBy }) => {
      const convId = conversationId?.toString?.() ?? conversationId
      if (!isMe(readBy)) return // someone else read our messages
      setMessages((prev) =>
        prev.map((m) => (m.conversationId === convId ? { ...m, isRead: true } : m))
      )
    })

    // ── Typing indicators ────────────────────────────────────────────────────
    socket.on('typing:start', ({ userId: uid, conversationId }) => {
      setTypingUsers((prev) => {
        const set = new Set(prev[conversationId] || [])
        set.add(uid)
        return { ...prev, [conversationId]: set }
      })
    })
    socket.on('typing:stop', ({ userId: uid, conversationId }) => {
      setTypingUsers((prev) => {
        const set = new Set(prev[conversationId] || [])
        set.delete(uid)
        return { ...prev, [conversationId]: set }
      })
    })

    // ── Online presence ──────────────────────────────────────────────────────
    socket.on('user:online', ({ userId: uid }) => {
      setOnlineUsers((prev) => new Set([...prev, uid]))
    })
    socket.on('user:offline', ({ userId: uid }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(uid)
        return next
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, isMe])

  // ── Initial data load when user authenticates ────────────────────────────────
  useEffect(() => {
    if (user) {
      loadConversations()
      loadChatUsers()
    } else {
      setConversations([])
      setMessages([])
      setTotalUnread(0)
      setActiveConv(null)
      setOnlineUsers(new Set())
    }
  }, [user])

  // ── Open / start a conversation ──────────────────────────────────────────────
  const openConversationWith = useCallback(async (userId) => {
    try {
      const res = await api.post('/chat/conversations', { userId })
      const conv = res.data?.data
      if (!conv) return

      setActiveConv(conv)
      activeConvIdRef.current = conv._id
      setView('chat')
      setIsOpen(true)

      // Join socket room FIRST
      socketRef.current?.emit('conv:join', conv._id)

      // Mark read
      if ((conv.unreadCount || 0) > 0) {
        socketRef.current?.emit('mark:read', { conversationId: conv._id })
        setConversations((prev) =>
          prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
        )
        setTotalUnread((prev) => Math.max(0, prev - (conv.unreadCount || 0)))
      }

      // Ensure conversation is in the list
      setConversations((prev) => {
        if (prev.find((c) => c._id === conv._id)) return prev
        return [{ ...conv, unreadCount: 0 }, ...prev]
      })

      // Load messages
      setLoadingMsgs(true)
      try {
        const msgRes = await api.get(`/chat/conversations/${conv._id}/messages`)
        setMessages(msgRes.data?.data?.messages || [])
      } catch (err) {
        console.error('[chat] load messages error:', err)
      } finally {
        setLoadingMsgs(false)
      }
    } catch (err) {
      console.error('[chat] openConversationWith error:', err)
    }
  }, [])

  // Open an existing conversation from the list
  const selectConversation = useCallback(async (conv) => {
    setActiveConv(conv)
    activeConvIdRef.current = conv._id
    setView('chat')

    // Join socket room FIRST — ensures message:new is received even if API is slow/fails
    socketRef.current?.emit('conv:join', conv._id)

    if ((conv.unreadCount || 0) > 0) {
      socketRef.current?.emit('mark:read', { conversationId: conv._id })
      setTotalUnread((prev) => Math.max(0, prev - (conv.unreadCount || 0)))
      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unreadCount: 0 } : c))
      )
    }

    setLoadingMsgs(true)
    try {
      const msgRes = await api.get(`/chat/conversations/${conv._id}/messages`)
      setMessages(msgRes.data?.data?.messages || [])
    } catch (err) {
      console.error('[chat] selectConversation error:', err)
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── Send message (text and/or file) ──────────────────────────────────────────
  const sendMessage = useCallback((content, fileData = null) => {
    const hasText = content?.trim()
    const hasFile = fileData?.fileUrl
    if (!socketRef.current?.connected || !activeConvIdRef.current || (!hasText && !hasFile)) return
    socketRef.current.emit('message:send', {
      conversationId: activeConvIdRef.current,
      content: hasText ? content.trim() : '',
      ...(fileData || {}),
    })
  }, [])

  // ── Typing ────────────────────────────────────────────────────────────────────
  const typingTimerRef = useRef(null)
  const startTyping = useCallback(() => {
    if (!activeConvIdRef.current) return
    socketRef.current?.emit('typing:start', { conversationId: activeConvIdRef.current })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { conversationId: activeConvIdRef.current })
    }, 2500)
  }, [])

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (!activeConvIdRef.current) return
    socketRef.current?.emit('typing:stop', { conversationId: activeConvIdRef.current })
  }, [])

  // ── Delete conversation ───────────────────────────────────────────────────────
  const deleteConversation = useCallback(async (convId) => {
    try {
      await api.delete(`/chat/conversations/${convId}`)
      setConversations((prev) => prev.filter((c) => c._id !== convId))
      if (activeConvIdRef.current === convId) {
        setActiveConv(null)
        activeConvIdRef.current = null
        setMessages([])
        setView('list')
      }
    } catch (err) {
      console.error('[chat] deleteConversation error:', err)
    }
  }, [])

  // ── Delete message ────────────────────────────────────────────────────────────
  const deleteMessage = useCallback(async (convId, msgId) => {
    try {
      await api.delete(`/chat/conversations/${convId}/messages/${msgId}`)
      setMessages((prev) => prev.filter((m) => m._id !== msgId))
    } catch (err) {
      console.error('[chat] deleteMessage error:', err)
    }
  }, [])

  // ── Close panel ───────────────────────────────────────────────────────────────
  const closePanel = useCallback(() => {
    setIsOpen(false)
    setView('list')
    setActiveConv(null)
    activeConvIdRef.current = null
    setMessages([])
  }, [])

  return (
    <ChatContext.Provider
      value={{
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
        openConversationWith,
        selectConversation,
        sendMessage,
        startTyping,
        stopTyping,
        closePanel,
        loadConversations,
        deleteMessage,
        deleteConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

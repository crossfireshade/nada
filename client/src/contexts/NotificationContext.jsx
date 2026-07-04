import React, { createContext, useState, useCallback } from 'react'

export const NotificationContext = createContext(null)

let nextId = 1

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback(({ type = 'info', message }) => {
    const id = nextId++
    setNotifications(prev => [...prev, { id, type, message }])
    setTimeout(() => removeNotification(id), 5000)
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

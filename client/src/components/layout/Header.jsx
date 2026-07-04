import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BellIcon, ChevronDownIcon, UserCircleIcon, SunIcon, MoonIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { useDarkMode } from '../../hooks/useDarkMode'
import LanguageToggle from '../common/LanguageToggle'
import NotificationCenter from '../common/NotificationCenter'
import api from '../../api/axios'

const isMongoId = s => /^[a-f0-9]{24}$/i.test(s)

function useBreadcrumbs() {
  const location = useLocation()
  const { t } = useTranslation()
  const segments = location.pathname.split('/').filter(Boolean)
  const crumbs = []
  segments.forEach((seg, i) => {
    if (isMongoId(seg)) return
    crumbs.push({
      label: t(`nav.${seg}`, { defaultValue: seg }),
      path: '/' + segments.slice(0, i + 1).join('/'),
    })
  })
  return crumbs
}

export default function Header({ onMenuClick }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const breadcrumbs = useBreadcrumbs()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [dark, setDark] = useDarkMode()

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/alerts', { params: { limit: 20 } })
      const list = res.data?.data || []
      setNotifications(list)
      setUnreadCount(list.filter(n => n.status === 'UNREAD').length)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkRead = useCallback(async (id) => {
    try {
      await api.patch(`/alerts/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'READ' } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.patch('/alerts/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })))
      setUnreadCount(0)
    } catch { }
  }, [])

  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/alerts/${id}`)
      setNotifications(prev => {
        const removed = prev.find(n => n._id === id)
        if (removed?.status === 'UNREAD') setUnreadCount(c => Math.max(0, c - 1))
        return prev.filter(n => n._id !== id)
      })
    } catch { }
  }, [])

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 dark:text-slate-400 me-2"
        aria-label="Open menu"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm flex-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.path}>
            {i > 0 && <span className="text-slate-300 flex-shrink-0">/</span>}
            <span className={`truncate ${i === breadcrumbs.length - 1 ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500 hidden sm:inline'}`}>
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        {/* Dark mode toggle */}
        <button
          onClick={() => setDark(prev => !prev)}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>

        <LanguageToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(prev => !prev); setShowUserMenu(false) }}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-gray-700 rounded-lg"
          >
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 end-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationCenter
              notifications={notifications}
              onClose={() => setShowNotifications(false)}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              onMarkAllRead={handleMarkAllRead}
            />
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(prev => !prev); setShowNotifications(false) }}
            className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700"
          >
            <UserCircleIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            <span className="max-w-[120px] truncate hidden sm:block">{user?.name || user?.email}</span>
            <ChevronDownIcon className="h-4 w-4 text-slate-400" />
          </button>
          {showUserMenu && (
            <div className="absolute end-0 top-10 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-100 dark:border-gray-700 z-50 py-1">
              <div className="px-4 py-2 border-b border-slate-50 dark:border-gray-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{t(`roles.${user?.role}`)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-start px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowUserMenu(false) }}
        />
      )}
    </header>
  )
}

import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import {
  HomeIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  BellIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  MusicalNoteIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  NoSymbolIcon,
  XMarkIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import LogoMain from '../logo/LogoMain'
import { useLanguage } from '../../hooks/useLanguage'

const PUBLICITY_ROLES = ['RESPONSABLE_PUBLICITE']
const NON_PUBLICITY = ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'TECHNICIEN_COORDINATEUR', 'RESPONSABLE_ADMINISTRATIF', 'RECEPTIONNISTE_POLICIER', 'RESPONSABLE_SECURITE', 'RESPONSABLE']

const ALL_NAV = [
  { key: 'dashboard', to: '/dashboard', icon: HomeIcon, roles: ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'TECHNICIEN_COORDINATEUR', 'RESPONSABLE_ADMINISTRATIF', 'RESPONSABLE_PUBLICITE', 'RECEPTIONNISTE_POLICIER', 'RESPONSABLE_SECURITE'] },
  { key: 'guides', to: '/guides', icon: BookOpenIcon, roles: ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'TECHNICIEN_COORDINATEUR', 'RESPONSABLE_ADMINISTRATIF'] },
  { key: 'entryPermissions', to: '/entry-permissions', icon: ClipboardDocumentCheckIcon, roles: ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF', 'RECEPTIONNISTE_POLICIER', 'RESPONSABLE_SECURITE', 'RESPONSABLE', 'RESPONSABLE_PUBLICITE'] },
  { key: 'winners', to: '/winners', icon: TrophyIcon, roles: PUBLICITY_ROLES },
  { key: 'blacklist', to: '/winners/blacklist', icon: NoSymbolIcon, roles: PUBLICITY_ROLES },
  { key: 'history', to: '/history/guides', icon: ArchiveBoxIcon, roles: ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'TECHNICIEN_COORDINATEUR', 'RESPONSABLE_ADMINISTRATIF'] },
  { key: 'songHistory', to: '/history/songs', icon: MusicalNoteIcon, roles: ['RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF'] },
  { key: 'copyright', to: '/history/copyright', icon: ScaleIcon, roles: ['RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF'] },
  { key: 'notifications', to: '/notifications', icon: BellIcon, roles: NON_PUBLICITY },
  { key: 'users', to: '/users', icon: UsersIcon, roles: ['RESPONSABLE_ADMINISTRATIF'] },
  { key: 'producerTracking', to: '/admin/producers', icon: ArrowTrendingUpIcon, roles: ['RESPONSABLE_ADMINISTRATIF'] },
  { key: 'recurringGuides', to: '/admin/recurring-guides', icon: CalendarDaysIcon, roles: ['RESPONSABLE_ADMINISTRATIF'] },
  { key: 'settings', to: '/admin/settings', icon: Cog6ToothIcon, roles: ['RESPONSABLE_ADMINISTRATIF'] },
]

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isRTL } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = ALL_NAV.filter(item => {
    if (!item.roles) return true
    return user && item.roles.includes(user.role)
  })

  return (
    <aside
      className={`
        fixed left-0 top-0 bottom-0 z-50
        lg:relative lg:left-auto lg:top-auto lg:bottom-auto lg:z-auto lg:translate-x-0
        flex flex-col bg-white dark:bg-gray-900 border-e border-slate-100 dark:border-gray-700 shadow-sm
        transition-all duration-300
        min-h-screen
        ${collapsed ? 'w-16' : 'w-52'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-3 border-b border-slate-100 dark:border-gray-700">
        {!collapsed && <LogoMain width={100} height={60} />}

        {/* Close button on mobile, collapse toggle on desktop */}
        <button
          onClick={() => {
            if (window.innerWidth < 1024) {
              onMobileClose()
            } else {
              setCollapsed(prev => !prev)
            }
          }}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-500 ms-auto lg:flex"
          title="Toggle sidebar"
        >
          {/* Mobile: always show X */}
          <XMarkIcon className="h-4 w-4 lg:hidden" />
          {/* Desktop: show chevron */}
          <span className="hidden lg:inline">
            {isRTL
              ? collapsed ? <ChevronLeftIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />
              : collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />
            }
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === '/winners'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900'
              } ${collapsed ? 'lg:justify-center' : ''}`
            }
            title={collapsed ? t(`nav.${item.key}`) : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>{t(`nav.${item.key}`)}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className={`px-3 py-3 border-t border-slate-100 dark:border-gray-700 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{t(`roles.${user.role}`)}</p>
        </div>
      )}
    </aside>
  )
}

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { LanguageProvider } from './contexts/LanguageContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ChatProvider } from './contexts/ChatContext'
import FloatingChat from './features/chat/FloatingChat'
import ProtectedRoute from './components/guards/ProtectedRoute'
import RoleGuard from './components/guards/RoleGuard'
import MainLayout from './components/layout/MainLayout'
import ToastContainer from './components/common/Toast'
import { useNotifications } from './hooks/useNotifications'

// Pages
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import GuideListPage from './features/guides/GuideListPage'
import GuideEditorPage from './features/guides/GuideEditorPage'
import GuideViewPage from './features/guides/GuideViewPage'
import GuideValidationPage from './features/guides/GuideValidationPage'
import LiveChecklistPage from './features/guides/LiveChecklistPage'
import EntryPermissionListPage from './features/entryPermissions/EntryPermissionListPage'
import EntryPermissionFormPage from './features/entryPermissions/EntryPermissionFormPage'
import ReceptionInboxPage from './features/entryPermissions/ReceptionInboxPage'
import CheckInPage from './features/entryPermissions/CheckInPage'
import GuideHistoryPage from './features/history/GuideHistoryPage'
import EntryHistoryPage from './features/history/EntryHistoryPage'
import SongHistoryPage from './features/history/SongHistoryPage'
import CopyrightPage from './features/history/CopyrightPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import UserListPage from './features/users/UserListPage'
import WinnersInboxPage from './features/winners/WinnersInboxPage'
import BlacklistPage from './features/winners/BlacklistPage'
import ProducerTrackingPage from './features/admin/ProducerTrackingPage'
import ProducerDetailPage from './features/admin/ProducerDetailPage'
import RecurringGuidesPage from './features/admin/RecurringGuidesPage'
import RecurringGuideDetailPage from './features/admin/RecurringGuideDetailPage'
import RecurringGuideGroupDetailPage from './features/admin/RecurringGuideGroupDetailPage'
import SettingsPage from './features/admin/SettingsPage'

const NON_RECEPTION = ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'TECHNICIEN_COORDINATEUR', 'RESPONSABLE_ADMINISTRATIF', 'RESPONSABLE_PUBLICITE', 'RESPONSABLE_SECURITE', 'RESPONSABLE']
const NON_RECEPTION_NO_PUBLICITY = ['PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'TECHNICIEN_COORDINATEUR', 'RESPONSABLE_ADMINISTRATIF']
const ADMIN_ROLES = ['RESPONSABLE_ADMINISTRATIF']

function ToastOverlay() {
  const { notifications, removeNotification } = useNotifications()
  return <ToastContainer notifications={notifications} onRemove={removeNotification} />
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user?.role === 'RESPONSABLE' ? '/entry-permissions' : '/dashboard'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <NotificationProvider>
            <ChatProvider>
            <ToastOverlay />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<HomeRedirect />} />

              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Guides */}
                <Route path="/guides" element={
                  <RoleGuard roles={NON_RECEPTION_NO_PUBLICITY}>
                    <GuideListPage />
                  </RoleGuard>
                } />
                <Route path="/guides/new" element={
                  <RoleGuard roles={NON_RECEPTION_NO_PUBLICITY}>
                    <GuideEditorPage />
                  </RoleGuard>
                } />
                <Route path="/guides/:id" element={
                  <RoleGuard roles={NON_RECEPTION_NO_PUBLICITY}>
                    <GuideViewPage />
                  </RoleGuard>
                } />
                <Route path="/guides/:id/edit" element={
                  <RoleGuard roles={NON_RECEPTION_NO_PUBLICITY}>
                    <GuideEditorPage />
                  </RoleGuard>
                } />
                <Route path="/guides/:id/validate" element={
                  <RoleGuard roles={['RESPONSABLE_PRODUCTION']}>
                    <GuideValidationPage />
                  </RoleGuard>
                } />
                <Route path="/guides/:id/live" element={
                  <RoleGuard roles={['TECHNICIEN_COORDINATEUR', 'PRODUCTEUR', 'RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF']}>
                    <LiveChecklistPage />
                  </RoleGuard>
                } />

                {/* Entry Permissions */}
                <Route path="/entry-permissions" element={<EntryPermissionListPage />} />
                <Route path="/entry-permissions/new" element={
                  <RoleGuard roles={NON_RECEPTION}>
                    <EntryPermissionFormPage />
                  </RoleGuard>
                } />
                <Route path="/entry-permissions/:id/edit" element={<EntryPermissionFormPage />} />
                <Route path="/entry-permissions/inbox" element={
                  <RoleGuard roles={['RECEPTIONNISTE_POLICIER']}>
                    <ReceptionInboxPage />
                  </RoleGuard>
                } />
                <Route path="/entry-permissions/:id" element={<CheckInPage />} />

                {/* Winners Inbox (Publicity only) */}
                <Route path="/winners" element={
                  <RoleGuard roles={['RESPONSABLE_PUBLICITE']}>
                    <WinnersInboxPage />
                  </RoleGuard>
                } />
                <Route path="/winners/blacklist" element={
                  <RoleGuard roles={['RESPONSABLE_PUBLICITE']}>
                    <BlacklistPage />
                  </RoleGuard>
                } />

                {/* History */}
                <Route path="/history/guides" element={
                  <RoleGuard roles={NON_RECEPTION_NO_PUBLICITY}>
                    <GuideHistoryPage />
                  </RoleGuard>
                } />
                <Route path="/history/entries" element={<EntryHistoryPage />} />
                <Route path="/history/songs" element={
                  <RoleGuard roles={['RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF']}>
                    <SongHistoryPage />
                  </RoleGuard>
                } />
                <Route path="/history/copyright" element={
                  <RoleGuard roles={['RESPONSABLE_PRODUCTION', 'RESPONSABLE_ADMINISTRATIF']}>
                    <CopyrightPage />
                  </RoleGuard>
                } />

                {/* Notifications */}
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Users */}
                <Route path="/users" element={
                  <RoleGuard roles={ADMIN_ROLES}>
                    <UserListPage />
                  </RoleGuard>
                } />

                {/* Admin – Producer Tracking */}
                <Route path="/admin/producers" element={
                  <RoleGuard roles={ADMIN_ROLES}>
                    <ProducerTrackingPage />
                  </RoleGuard>
                } />
                <Route path="/admin/producers/:id" element={
                  <RoleGuard roles={ADMIN_ROLES}>
                    <ProducerDetailPage />
                  </RoleGuard>
                } />

                {/* Admin – Recurring Guides */}
                <Route path="/admin/recurring-guides" element={
                  <RoleGuard roles={ADMIN_ROLES}>
                    <RecurringGuidesPage />
                  </RoleGuard>
                } />
                <Route path="/admin/recurring-guides/group/:groupId" element={
                  <RoleGuard roles={ADMIN_ROLES}>
                    <RecurringGuideGroupDetailPage />
                  </RoleGuard>
                } />
                <Route path="/admin/recurring-guides/:id" element={
                  <RoleGuard roles={ADMIN_ROLES}>
                    <RecurringGuideDetailPage />
                  </RoleGuard>
                } />
                <Route path="/admin/settings" element={
                  <RoleGuard roles={ADMIN_ROLES}>
                    <SettingsPage />
                  </RoleGuard>
                } />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <FloatingChat />
            </ChatProvider>
          </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

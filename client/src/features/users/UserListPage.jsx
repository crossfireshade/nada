import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  PencilSquareIcon, UsersIcon, PlusIcon, UserIcon, TrashIcon,
  EnvelopeIcon, ShieldCheckIcon, KeyIcon, ChevronRightIcon,
  MagnifyingGlassIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { getUsers, createUser, updateUser, deleteUser } from './api'
import { useForm } from 'react-hook-form'
import { ALL_ROLES } from '../../utils/roles'

const roleColors = {
  PRODUCTEUR:              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', icon: 'from-indigo-400 to-purple-400' },
  RESPONSABLE_PRODUCTION:  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: 'from-emerald-400 to-teal-400' },
  TECHNICIEN_COORDINATEUR: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', icon: 'from-rose-400 to-red-400' },
  RESPONSABLE_ADMINISTRATIF: { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', icon: 'from-sky-400 to-blue-400' },
  RESPONSABLE_PUBLICITE:   { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: 'from-amber-400 to-orange-400' },
  RECEPTIONNISTE_POLICIER: { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-700 dark:text-slate-400', icon: 'from-slate-400 to-gray-500' },
}
const defaultRoleColor = { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-600 dark:text-slate-400', icon: 'from-slate-400 to-gray-400' }

export default function UserListPage() {
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const { addNotification } = useNotifications()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const limit = 20

  const editForm = useForm()
  const createForm = useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getUsers({ limit, offset: (page - 1) * limit })
      setUsers(res.data?.data || [])
      setTotal(res.data?.pagination?.total || 0)
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page])

  const openEdit = (u) => {
    setEditUser(u)
    editForm.reset({ name: u.name, email: u.email, role: u.role, active: u.active })
  }

  const onSaveEdit = async (data) => {
    setSaving(true)
    try {
      await updateUser(editUser._id || editUser.id, data)
      addNotification({ type: 'success', message: t('users.updated') })
      setEditUser(null)
      fetchData()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    } finally {
      setSaving(false)
    }
  }

  const openCreate = () => {
    setShowCreateModal(true)
    createForm.reset({ name: '', email: '', role: 'PRODUCTEUR', password: '' })
  }

  const onCreateUser = async (data) => {
    setSaving(true)
    try {
      await createUser(data)
      addNotification({ type: 'success', message: t('users.created') })
      setShowCreateModal(false)
      fetchData()
    } catch (err) {
      const msg = err.response?.status === 409 ? t('users.emailExists') : t('errors.serverError')
      addNotification({ type: 'error', message: msg })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId) => {
    try {
      await deleteUser(userId)
      addNotification({ type: 'success', message: t('users.deleted') })
      setConfirmDeleteId(null)
      fetchData()
    } catch {
      addNotification({ type: 'error', message: t('errors.serverError') })
    }
  }

  const filtered = search
    ? users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        t(`roles.${u.role}`).toLowerCase().includes(search.toLowerCase())
      )
    : users

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 p-6 text-white shadow-lg shadow-sky-200/40 dark:shadow-sky-900/20">
        <div className="absolute top-0 end-0 -translate-y-4 translate-x-4 opacity-10">
          <UsersIcon className="h-48 w-48" />
        </div>
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="h-5 w-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">{t('users.management')}</span>
            </div>
            <h1 className="text-2xl font-bold">{t('nav.users')}</h1>
            <p className="text-sm text-white/60 mt-1">
              {total} {t('users.totalUsers')}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/20 shadow-lg transition-all duration-200"
          >
            <PlusIcon className="h-4 w-4" />
            {t('users.addUser')}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          className="w-full ps-12 pe-4 py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all text-sm"
        />
      </div>

      {/* Users list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/10 dark:to-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <UsersIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('nav.users')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('users.management')}</p>
            </div>
            {filtered.length > 0 && (
              <span className="ms-auto text-sm font-bold px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400">
                {total}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="p-5 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-2xl">
                <UsersIcon className="h-12 w-12 text-sky-300 dark:text-sky-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((u) => {
                const uId = u._id || u.id
                const rc = roleColors[u.role] || defaultRoleColor
                return (
                  <div
                    key={uId}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                  >
                    <div className={`h-1 bg-gradient-to-r ${rc.icon}`} />
                    <div className="p-4 flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${rc.icon} flex items-center justify-center shadow-sm`}>
                        <UserIcon className="h-5 w-5 text-white" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {u.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <EnvelopeIcon className="h-3.5 w-3.5" />
                            {u.email}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rc.bg} ${rc.text}`}>
                            {t(`roles.${u.role}`)}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            u.active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          }`}>
                            {u.active ? t('users.active') : t('users.inactive')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(uId)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <ChevronRightIcon className="h-5 w-5 text-slate-300 dark:text-slate-600 hidden sm:block" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {t('common.previous')}
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
            Math.max(0, page - 3),
            Math.min(totalPages, page + 2)
          ).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                p === page
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-200/40 dark:shadow-sky-900/20'
                  : 'border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('users.addUser')}>
        <form onSubmit={createForm.handleSubmit(onCreateUser)} className="space-y-4">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <UserIcon className="h-4 w-4 text-slate-400" />
              {t('users.fullName')}
            </label>
            <input
              className={`form-input ${createForm.formState.errors.name ? 'border-red-400' : ''}`}
              placeholder={t('users.fullNamePlaceholder')}
              {...createForm.register('name', { required: t('errors.required') })}
            />
            {createForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <EnvelopeIcon className="h-4 w-4 text-slate-400" />
              {t('auth.email')}
            </label>
            <input
              type="email"
              className={`form-input ${createForm.formState.errors.email ? 'border-red-400' : ''}`}
              placeholder="user@radio-monastir.tn"
              {...createForm.register('email', { required: t('errors.required') })}
            />
            {createForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 text-slate-400" />
              {t('users.role')}
            </label>
            <select className="form-input" {...createForm.register('role', { required: t('errors.required') })}>
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>{t(`roles.${r}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <KeyIcon className="h-4 w-4 text-slate-400" />
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                className={`form-input pr-10 ${createForm.formState.errors.password ? 'border-red-400' : ''}`}
                placeholder="••••••••"
                {...createForm.register('password', { required: t('errors.required'), minLength: { value: 6, message: t('users.passwordMin') } })}
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword(v => !v)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showCreatePassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {createForm.formState.errors.password && <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.password.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? t('common.loading') : t('users.addUser')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-5 border border-slate-100 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-center font-medium">
                {t('users.confirmDelete')}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary px-5">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={t('users.editUser')}>
        <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-4">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <UserIcon className="h-4 w-4 text-slate-400" />
              {t('users.fullName')}
            </label>
            <input
              className={`form-input ${editForm.formState.errors.name ? 'border-red-400' : ''}`}
              {...editForm.register('name', { required: t('errors.required') })}
            />
            {editForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{editForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <EnvelopeIcon className="h-4 w-4 text-slate-400" />
              {t('auth.email')}
            </label>
            <input
              type="email"
              className={`form-input ${editForm.formState.errors.email ? 'border-red-400' : ''}`}
              {...editForm.register('email', { required: t('errors.required') })}
            />
            {editForm.formState.errors.email && <p className="text-xs text-red-500 mt-1">{editForm.formState.errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 text-slate-400" />
              {t('users.role')}
            </label>
            <select className="form-input" {...editForm.register('role', { required: t('errors.required') })}>
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>{t(`roles.${r}`)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-gray-700/50">
            <input type="checkbox" id="active" {...editForm.register('active')} className="rounded border-slate-300 dark:border-gray-600 text-sky-500 focus:ring-sky-400" />
            <label htmlFor="active" className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t('users.accountActive')}</label>
          </div>
          <div>
            <label className="form-label flex items-center gap-1.5">
              <KeyIcon className="h-4 w-4 text-slate-400" />
              {t('users.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showEditPassword ? 'text' : 'password'}
                className="form-input pr-10"
                placeholder={t('users.passwordPlaceholder')}
                {...editForm.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(v => !v)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showEditPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditUser(null)} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getEntryHistory } from './api'
import { deleteEntryPermission } from '../entryPermissions/api'
import { format } from 'date-fns'

export default function EntryHistoryPage() {
  const { t } = useTranslation()
  const { addNotification } = useNotifications()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const limit = 20

  const fetchEntries = () => {
    setLoading(true)
    getEntryHistory({ limit, offset: (page - 1) * limit })
      .then(res => {
        setEntries(res.data?.data || [])
        setTotal(res.data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchEntries()
  }, [page])

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    try {
      await deleteEntryPermission(confirmDeleteId)
      addNotification({ type: 'success', message: t('entryPermissions.deleted') })
      setConfirmDeleteId(null)
      fetchEntries()
    } catch {
      addNotification({ type: 'error', message: t('entryPermissions.errorMessage') })
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'date', label: t('entryPermissions.date'), render: (v) => v ? format(new Date(v), 'dd/MM/yyyy') : '-' },
    { key: 'programTitle', label: t('entryPermissions.programTitle'), render: (v) => v || '—' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v || 'COMPLETED'} /> },
    {
      key: '_id', label: t('common.actions'), render: (_, row) => {
        const permId = row._id || row.id
        return (
          <div className="flex items-center gap-1">
            <Link to={`/entry-permissions/${permId}`} className="p-1.5 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors inline-flex" title={t('common.view')}>
              <EyeIcon className="h-4 w-4" />
            </Link>
            <Link to={`/entry-permissions/${permId}/edit`} className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors inline-flex" title={t('common.edit')}>
              <PencilIcon className="h-4 w-4" />
            </Link>
            <button onClick={() => setConfirmDeleteId(permId)} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors inline-flex" title={t('common.delete')}>
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )
      }
    },
  ]

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('nav.history')} — {t('entryPermissions.title')}</h1>

      <DataTable columns={columns} data={entries} loading={loading} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-40">{t('common.previous')}</button>
          <span className="text-sm text-slate-600">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-40">{t('common.next')}</button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-5 border border-slate-100 dark:border-gray-700">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrashIcon className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-center font-medium">
                {t('entryPermissions.confirmDelete')}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary px-5">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm disabled:opacity-60 transition-colors">
                {deleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

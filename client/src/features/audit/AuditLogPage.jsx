import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DataTable from '../../components/common/DataTable'
import { getAuditLogs } from './api'
import { format } from 'date-fns'

export default function AuditLogPage() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 30

  useEffect(() => {
    setLoading(true)
    getAuditLogs({ limit, offset: (page - 1) * limit })
      .then(res => {
        setLogs(res.data?.data || [])
        setTotal(res.data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  const columns = [
    { key: 'actorId', label: t('audit.actor'), render: (v) => v ? `${v.name || v.email}` : '—' },
    { key: 'action', label: t('audit.action') },
    { key: 'entityType', label: t('audit.entity') },
    { key: 'entityId', label: 'ID', render: (v) => v ? String(v).slice(-8) : '—' },
    {
      key: 'timestamp', label: t('audit.timestamp'),
      render: (v) => v ? format(new Date(v), 'dd/MM/yyyy HH:mm:ss') : '-'
    },
  ]

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('audit.title')}</h1>

      <DataTable columns={columns} data={logs} loading={loading} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-40">{t('common.previous')}</button>
          <span className="text-sm text-slate-600">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-40">{t('common.next')}</button>
        </div>
      )}
    </div>
  )
}

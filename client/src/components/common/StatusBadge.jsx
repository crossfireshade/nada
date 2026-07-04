import React from 'react'
import { useTranslation } from 'react-i18next'

const statusConfig = {
  DRAFT: { label: 'status.DRAFT', classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  SUBMITTED: { label: 'status.SUBMITTED', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  APPROVED: { label: 'status.APPROVED', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FINAL_PUBLISHED: { label: 'status.FINAL_PUBLISHED', classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  LIVE_IN_PROGRESS: { label: 'status.LIVE_IN_PROGRESS', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse' },
  LIVE_STOPPED: { label: 'status.LIVE_STOPPED', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  ARCHIVED: { label: 'status.ARCHIVED', classes: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
  REJECTED: { label: 'status.REJECTED', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  PENDING_APPROVAL: { label: 'status.PENDING_APPROVAL', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  PENDING: { label: 'status.PENDING', classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  RECEIVED: { label: 'status.RECEIVED', classes: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  COMPLETED: { label: 'status.COMPLETED', classes: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  VALIDATED: { label: 'status.VALIDATED', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

export default function StatusBadge({ status }) {
  const { t } = useTranslation()
  const config = statusConfig[status] || { label: status, classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {t(config.label)}
    </span>
  )
}

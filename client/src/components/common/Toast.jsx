import React, { useEffect, useState } from 'react'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const icons = {
  success: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  error: <ExclamationCircleIcon className="h-5 w-5 text-red-500" />,
  warning: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />,
  info: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
}

const colors = {
  success: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
  warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
}

function Toast({ id, type = 'info', message, onRemove }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md transition-all duration-300 ${colors[type]} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 ltr:translate-x-8 rtl:-translate-x-8'}`}
    >
      {icons[type]}
      <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">{message}</p>
      <button onClick={() => onRemove(id)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 flex-shrink-0">
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function ToastContainer({ notifications, onRemove }) {
  return (
    <div className="fixed top-4 end-4 z-50 flex flex-col gap-2 w-80">
      {notifications.map(n => (
        <Toast key={n.id} {...n} onRemove={onRemove} />
      ))}
    </div>
  )
}

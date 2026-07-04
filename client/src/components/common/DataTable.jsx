import React from 'react'
import { useTranslation } from 'react-i18next'
import LoadingSpinner from './LoadingSpinner'

export default function DataTable({ columns, data = [], loading, emptyMessage }) {
  const { t } = useTranslation()

  if (loading) {
    return <LoadingSpinner className="py-16" />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-gray-700 shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700">
        <thead className="bg-slate-50 dark:bg-gray-700/80">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="table-header tracking-widest">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="table-cell text-center text-slate-400 dark:text-slate-500 py-12"
              >
                {emptyMessage || t('common.noData')}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id || i}
                className={`
                  group border-l-[3px] border-l-transparent
                  hover:border-l-sky-400 dark:hover:border-l-cyan-400
                  hover:bg-sky-50/50 dark:hover:bg-sky-950/15
                  transition-all duration-150 cursor-default
                  ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50/40 dark:bg-gray-700/40'}
                `}
              >
                {columns.map(col => (
                  <td key={col.key} className="table-cell">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

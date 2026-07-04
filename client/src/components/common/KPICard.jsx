import React from 'react'

export default function KPICard({ icon, title, value, color = 'primary', subtitle, size = 'default' }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
  }

  const isLarge = size === 'large'

  return (
    <div className="card flex items-start gap-4">
      <div className={`${isLarge ? 'p-4' : 'p-3'} rounded-xl ${colorClasses[color] || colorClasses.primary}`}>
        {icon}
      </div>
      <div>
        <p className={`${isLarge ? 'text-base' : 'text-sm'} text-slate-500 dark:text-slate-400`}>{title}</p>
        <p className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-bold text-slate-800 dark:text-slate-100 mt-0.5`}>{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

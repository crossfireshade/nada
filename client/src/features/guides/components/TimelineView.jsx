import React from 'react'
import { useTranslation } from 'react-i18next'

export default function TimelineView({ segments = [] }) {
  const { t } = useTranslation()
  const sorted = [...segments].sort((a, b) => a.order - b.order)

  const typeColors = {
    TALK: 'bg-blue-100 border-blue-300 text-blue-700',
    MUSIC: 'bg-purple-100 border-purple-300 text-purple-700',
    AD: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    NEWS: 'bg-green-100 border-green-300 text-green-700',
    INTERVIEW: 'bg-orange-100 border-orange-300 text-orange-700',
    OTHER: 'bg-slate-100 border-slate-300 text-slate-700',
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">{t('common.noData')}</p>
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute start-6 top-4 bottom-4 w-0.5 bg-slate-200" />
      {sorted.map((seg, i) => (
        <div key={seg.id} className="flex gap-4 pb-4 relative">
          <div className={`relative z-10 flex-shrink-0 h-12 w-12 rounded-full border-2 flex items-center justify-center text-sm font-bold ${typeColors[seg.type] || typeColors.OTHER}`}>
            {seg.order}
          </div>
          <div className={`flex-1 p-3 rounded-lg border ${typeColors[seg.type] || typeColors.OTHER}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide">
                {t(`segments.types.${seg.type}`, { defaultValue: seg.type })}
              </span>
              <span className="text-xs font-medium">{seg.startTime} – {seg.endTime}</span>
            </div>
            {seg.content && <p className="text-sm">{seg.content}</p>}
            {seg.isCompleted && <p className="text-xs mt-1 font-medium text-green-600">✓ {t('status.COMPLETED')}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

import React, { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, getDay,
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { useLanguage } from '../../hooks/useLanguage'

export default function Calendar({ events = [], onDayClick }) {
  const [current, setCurrent] = useState(new Date())
  const { isRTL } = useLanguage()

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startWeekday = getDay(monthStart)

  const getEventsForDay = (day) =>
    events.filter(e => isSameDay(new Date(e.date), day))

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrent(prev => subMonths(prev, 1))}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isRTL ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </button>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">
          {format(current, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrent(prev => addMonths(prev, 1))}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isRTL ? <ChevronLeftIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startWeekday }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const dayEvents = getEventsForDay(day)
          const isToday = isSameDay(day, new Date())
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              className={`
                relative h-9 w-full rounded-lg text-sm transition-colors
                ${isToday ? 'bg-primary text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300'}
                ${!isSameMonth(day, current) ? 'opacity-30' : ''}
              `}
            >
              {format(day, 'd')}
              {dayEvents.length > 0 && (
                <span className={`absolute bottom-1 start-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-primary'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

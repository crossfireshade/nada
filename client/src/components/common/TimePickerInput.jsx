import React, { useRef } from 'react'

/**
 * HH:MM time picker with two separate text inputs.
 * Same logic as TimeInput (GuideEditorPage) — no auto-formatting, pure manual entry.
 */
export default function TimePickerInput({ value, onChange, compact = false }) {
  const mmRef = useRef(null)
  const hhRef = useRef(null)

  const parts = (value || '').split(':')
  const hh = parts[0] || ''
  const mm = parts[1] || ''

  const handleHH = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${v}:${mm}`)
    if (v.length === 2) mmRef.current?.focus()
  }

  const handleMM = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2)
    onChange(`${hh}:${v}`)
  }

  const handleMMKeyDown = (e) => {
    if (e.key === 'Backspace' && !mm) {
      hhRef.current?.focus()
    }
  }

  const inputBase = compact
    ? 'w-9 text-center text-sm font-mono bg-transparent text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-600 focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-300 rounded px-1 py-1'
    : 'w-12 text-center text-lg font-mono bg-transparent text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-gray-600 focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-300 rounded-lg px-1 py-2'

  return (
    <div className="inline-flex items-center gap-1" dir="ltr">
      <input
        ref={hhRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={hh}
        onChange={handleHH}
        placeholder="HH"
        className={inputBase}
      />
      <span className={`font-bold select-none ${compact ? 'text-sm text-sky-400' : 'text-lg text-sky-500'}`}>:</span>
      <input
        ref={mmRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={mm}
        onChange={handleMM}
        onKeyDown={handleMMKeyDown}
        placeholder="MM"
        className={inputBase}
      />
    </div>
  )
}

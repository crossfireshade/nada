import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PhotoIcon } from '@heroicons/react/24/outline'

export default function PhotoUpload({ onUpload, label, multiple = false }) {
  const { t } = useTranslation()
  const inputRef = useRef()

  const handleChange = (e) => {
    if (multiple) {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) onUpload(files)
    } else {
      const file = e.target.files?.[0]
      if (file) onUpload(file)
    }
    e.target.value = ''
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        ref={inputRef}
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <PhotoIcon className="h-4 w-4" />
        {label || t('guests.photo')}
      </button>
    </div>
  )
}

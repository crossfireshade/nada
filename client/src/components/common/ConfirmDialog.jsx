import React from 'react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, loading }) {
  const { t } = useTranslation()
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('common.confirmDelete')}
      size="sm"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
        {message || t('common.confirmDeleteMessage')}
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary" disabled={loading}>
          {t('common.cancel')}
        </button>
        <button onClick={onConfirm} className="btn-danger" disabled={loading}>
          {loading ? t('common.loading') : t('common.delete')}
        </button>
      </div>
    </Modal>
  )
}

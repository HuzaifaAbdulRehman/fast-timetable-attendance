import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { vibrate } from '../../utils/uiHelpers'
import BaseModal from './BaseModal'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' or 'warning'
  requiresTyping = false, // If true, requires typing confirmation text
  confirmationText = 'DELETE' // Text to type if requiresTyping is true
}) {
  const [typedText, setTypedText] = useState('')

  const handleConfirm = () => {
    if (requiresTyping && typedText !== confirmationText) {
      return
    }
    vibrate([10, 50, 10])
    onConfirm()
    onClose()
    setTypedText('')
  }

  const handleCancel = () => {
    vibrate([10])
    onClose()
    setTypedText('')
  }

  const isDanger = variant === 'danger'
  const canConfirm = requiresTyping ? typedText === confirmationText : true

  // Header icon
  const headerIcon = (
    <div className={`p-3 rounded-xl ${isDanger ? 'bg-attendance-danger/20' : 'bg-yellow-500/20'}`}>
      <AlertTriangle className={`w-6 h-6 ${isDanger ? 'text-attendance-danger' : 'text-yellow-400'}`} />
    </div>
  )

  // Footer with action buttons
  const footer = (
    <div className="flex gap-2 sm:gap-3">
      <button
        onClick={handleCancel}
        className="flex-1 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3 bg-dark-bg border border-dark-border rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base text-content-primary font-medium hover:bg-dark-surface-raised transition-all hover:scale-[1.02] active:scale-95"
      >
        {cancelText}
      </button>
      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className={`flex-1 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${
          isDanger
            ? 'bg-gradient-to-br from-attendance-danger to-red-600 text-white hover:shadow-lg hover:shadow-attendance-danger/30'
            : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-dark-bg hover:shadow-lg hover:shadow-yellow-500/30'
        }`}
      >
        {confirmText}
      </button>
    </div>
  )

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      size="sm"
      variant={variant}
      headerIcon={headerIcon}
      footer={footer}
      closeOnBackdrop={true}
      closeOnEscape={true}
    >
      <p className="text-sm text-content-secondary leading-relaxed mb-4">
        {message}
      </p>

      {requiresTyping && (
        <div>
          <label className="block text-sm font-medium text-content-primary mb-2">
            Type <span className="font-mono text-attendance-danger">{confirmationText}</span> to confirm:
          </label>
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 bg-dark-bg border-2 border-dark-border rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase font-mono"
            placeholder={confirmationText}
            autoFocus
          />
          {typedText && typedText !== confirmationText && (
            <p className="text-xs text-attendance-danger mt-2">
              Text doesn't match. Please type exactly "{confirmationText}"
            </p>
          )}
        </div>
      )}
    </BaseModal>
  )
}


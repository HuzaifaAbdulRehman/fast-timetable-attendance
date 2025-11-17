import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { vibrate, isMobile } from '../../utils/uiHelpers'

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
  const [portalTarget, setPortalTarget] = useState(null)
  const [typedText, setTypedText] = useState('')
  const [isMobileDevice] = useState(isMobile())

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body)
    }
  }, [])

  useEffect(() => {
    if (!portalTarget) return

    if (isOpen) {
      const previousOverflow = portalTarget.style.overflow
      const previousPaddingRight = portalTarget.style.paddingRight

      // Lock body scroll
      portalTarget.style.overflow = 'hidden'
      
      // Prevent scrollbar shift on desktop
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        portalTarget.style.paddingRight = `${scrollbarWidth}px`
      }

      return () => {
        portalTarget.style.overflow = previousOverflow
        portalTarget.style.paddingRight = previousPaddingRight
      }
    }
  }, [isOpen, portalTarget])

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

  if (!portalTarget || !isOpen) return null

  const isDanger = variant === 'danger'
  const canConfirm = requiresTyping ? typedText === confirmationText : true

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 ${
        isMobileDevice ? 'flex items-end' : 'flex items-center justify-center p-4'
      }`}
      onClick={handleCancel}
    >
      <div
        className={`bg-dark-surface/98 backdrop-blur-xl border border-dark-border/50 shadow-glass-lg w-full ${
          isMobileDevice
            ? 'rounded-t-3xl max-h-[92vh] animate-slide-up'
            : 'rounded-2xl max-w-md animate-scale-in'
        } flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle (Mobile) */}
        {isMobileDevice && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-content-disabled/30 rounded-full"></div>
          </div>
        )}

        {/* Header */}
        <div className="p-5 md:p-6 border-b border-dark-border/50">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl flex-shrink-0 ${
                isDanger
                  ? 'bg-attendance-danger/20'
                  : 'bg-yellow-500/20'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${
                  isDanger ? 'text-attendance-danger' : 'text-yellow-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-content-primary mb-1">
                {title}
              </h2>
              <p className="text-sm text-content-secondary leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-dark-surface-raised rounded-lg transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-content-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 flex-1">
          {requiresTyping && (
            <div className="mb-4">
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
        </div>

        {/* Footer */}
        <div className="p-5 md:p-6 border-t border-dark-border/50 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-5 py-3 bg-dark-bg border border-dark-border rounded-xl text-content-primary font-medium hover:bg-dark-surface-raised transition-all hover:scale-[1.02] active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 px-5 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              isDanger
                ? 'bg-gradient-to-br from-attendance-danger to-red-600 text-white hover:shadow-lg hover:shadow-attendance-danger/30'
                : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-dark-bg hover:shadow-lg hover:shadow-yellow-500/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    portalTarget
  )
}


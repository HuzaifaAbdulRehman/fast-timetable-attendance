import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { vibrate } from '../../utils/uiHelpers'

/**
 * Standardized Base Modal Component
 * Provides consistent styling, animations, and behavior across all modals
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.size - Modal size: 'sm' (400px), 'md' (540px), 'lg' (720px), 'xl' (900px), 'full' (95vw)
 * @param {boolean} props.showCloseButton - Show X button in header (default: true)
 * @param {boolean} props.closeOnBackdrop - Close on backdrop click (default: true)
 * @param {boolean} props.closeOnEscape - Close on Escape key (default: true)
 * @param {React.ReactNode} props.footer - Custom footer content (buttons, actions)
 * @param {string} props.headerIcon - Optional icon component for header
 * @param {string} props.variant - Modal variant: 'default', 'danger', 'success', 'warning'
 */
export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer = null,
  headerIcon = null,
  variant = 'default'
}) {
  const modalRef = useRef(null)
  const portalTarget = typeof document !== 'undefined' ? document.body : null

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen || !portalTarget) return

    const { style, classList } = portalTarget
    const previousOverflow = style.overflow
    const previousPaddingRight = style.paddingRight
    const previousPosition = style.position
    const previousTop = style.top
    const previousWidth = style.width

    // Calculate scrollbar width
    const scrollbarWidth = typeof window !== 'undefined'
      ? window.innerWidth - document.documentElement.clientWidth
      : 0

    // Lock body scroll completely
    if (scrollbarWidth > 0) {
      style.paddingRight = `${scrollbarWidth}px`
    }
    style.overflow = 'hidden'
    style.position = 'fixed'
    style.top = '0'
    style.width = '100%'
    classList.add('modal-open')

    return () => {
      style.overflow = previousOverflow
      style.paddingRight = previousPaddingRight
      style.position = previousPosition
      style.top = previousTop
      style.width = previousWidth
      classList.remove('modal-open')
    }
  }, [isOpen, portalTarget])

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        vibrate([10])
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTab = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Focus first element
    firstElement.focus()

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen || !portalTarget) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      vibrate([10])
      onClose()
    }
  }

  const handleClose = () => {
    vibrate([10])
    onClose()
  }

  // Size classes
  const sizeClasses = {
    sm: 'max-w-[90vw] sm:max-w-[400px]',
    md: 'max-w-[90vw] sm:max-w-[540px]',
    lg: 'max-w-[90vw] sm:max-w-[720px]',
    xl: 'max-w-[90vw] sm:max-w-[900px]',
    full: 'max-w-[95vw] sm:max-w-[95vw]'
  }

  // Variant classes
  const variantClasses = {
    default: 'border-dark-border',
    danger: 'border-attendance-danger/30',
    success: 'border-attendance-safe/30',
    warning: 'border-attendance-warning/30'
  }

  const variantHeaderClasses = {
    default: '',
    danger: 'border-attendance-danger/20 bg-attendance-danger/5',
    success: 'border-attendance-safe/20 bg-attendance-safe/5',
    warning: 'border-attendance-warning/20 bg-attendance-warning/5'
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in overflow-hidden"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`
          ${sizeClasses[size]}
          w-full md:mx-auto
          bg-dark-surface/95 backdrop-blur-xl
          border ${variantClasses[variant]}
          shadow-glass-lg
          rounded-t-3xl md:rounded-2xl
          animate-slide-up md:animate-slide-in
          flex flex-col
          max-h-[90vh] md:max-h-[85vh]
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-content-disabled/30 rounded-full" />
        </div>

        {/* Header */}
        <div className={`
          flex items-center justify-between gap-3
          px-4 sm:px-6 py-3 sm:py-4
          border-b ${variantClasses[variant]}
          ${variantHeaderClasses[variant]}
          flex-shrink-0
        `}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {headerIcon && (
              <div className="flex-shrink-0">
                {headerIcon}
              </div>
            )}
            <h2
              id="modal-title"
              className="text-base sm:text-lg font-semibold text-content-primary truncate"
            >
              {title}
            </h2>
          </div>

          {showCloseButton && (
            <button
              onClick={handleClose}
              className="p-1.5 sm:p-2 hover:bg-dark-surface-raised rounded-lg transition-colors flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-content-secondary" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="
            px-4 sm:px-6 py-3 sm:py-4
            border-t border-dark-border
            bg-dark-surface-raised/50
            flex-shrink-0
          ">
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalTarget
  )
}

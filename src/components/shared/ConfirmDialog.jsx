import { AlertTriangle } from 'lucide-react'
import BaseModal from './BaseModal'

/**
 * Reusable confirmation dialog component
 * Professional, accessible, mobile-friendly
 * Now using standardized BaseModal wrapper
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  children
}) {
  const typeStyles = {
    warning: {
      variant: 'warning',
      icon: AlertTriangle,
      iconColor: 'text-yellow-400',
      iconBg: 'bg-yellow-500/10',
      confirmBg: 'bg-yellow-500 hover:bg-yellow-600',
      confirmText: 'text-dark-bg'
    },
    danger: {
      variant: 'danger',
      icon: AlertTriangle,
      iconColor: 'text-attendance-danger',
      iconBg: 'bg-attendance-danger/10',
      confirmBg: 'bg-attendance-danger hover:bg-red-600',
      confirmText: 'text-white'
    },
    info: {
      variant: 'default',
      icon: AlertTriangle,
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
      confirmBg: 'bg-accent hover:bg-accent-hover',
      confirmText: 'text-dark-bg'
    }
  }

  const style = typeStyles[type] || typeStyles.warning
  const Icon = style.icon

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  // Header icon
  const headerIcon = (
    <div className={`w-10 h-10 ${style.iconBg} rounded-xl flex items-center justify-center`}>
      <Icon className={`w-5 h-5 ${style.iconColor}`} />
    </div>
  )

  // Footer with action buttons
  const footer = (
    <div className="flex items-center justify-end gap-2 sm:gap-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-content-secondary hover:text-content-primary bg-dark-surface hover:bg-dark-surface-raised rounded-lg transition-all border border-dark-border"
      >
        {cancelLabel}
      </button>
      <button
        onClick={handleConfirm}
        className={`px-4 py-2 text-sm font-medium ${style.confirmText} ${style.confirmBg} rounded-lg transition-all hover:scale-[1.02] active:scale-95`}
      >
        {confirmLabel}
      </button>
    </div>
  )

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      variant={style.variant}
      headerIcon={headerIcon}
      footer={footer}
      closeOnBackdrop={true}
      closeOnEscape={true}
    >
      {message && (
        <p className="text-sm text-content-secondary leading-relaxed mb-4">
          {message}
        </p>
      )}
      {children}
    </BaseModal>
  )
}

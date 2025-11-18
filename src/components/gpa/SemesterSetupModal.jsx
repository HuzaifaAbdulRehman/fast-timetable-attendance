import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Hash, Calendar, BookOpen, Plus } from 'lucide-react'
import { vibrate } from '../../utils/uiHelpers'

export default function SemesterSetupModal({
  onClose,
  onConfirm,
  nextSemesterNumber,
  hasEnrolledCourses,
  usedSemesterNumbers = [],
  editingSemesterId = null
}) {
  const [semesterNumber, setSemesterNumber] = useState(nextSemesterNumber)
  const [customName, setCustomName] = useState('')

  const handleImportAndStart = () => {
    vibrate([10])
    onConfirm({
      semesterNumber,
      name: customName.trim() || `Semester ${semesterNumber}`,
      importCourses: true
    })
  }

  const handleStartEmpty = () => {
    vibrate([10])
    onConfirm({
      semesterNumber,
      name: customName.trim() || `Semester ${semesterNumber}`,
      importCourses: false
    })
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      vibrate([5])
      onClose()
    }
  }

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-dark-surface rounded-2xl w-full max-w-md shadow-2xl border border-dark-border/50 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-dark-border/50">
          <div>
            <h2 className="text-lg font-bold text-content-primary">New Semester</h2>
            <p className="text-xs text-content-secondary mt-0.5">Set up your semester details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-surface-hover rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-content-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Semester Number */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-content-secondary mb-2">
              <Hash className="w-3.5 h-3.5 text-accent" />
              Semester Number
            </label>
            <select
              value={semesterNumber}
              onChange={(e) => setSemesterNumber(parseInt(e.target.value))}
              className="w-full bg-dark-surface-raised border border-dark-border rounded-lg px-3 py-2.5 text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(num => {
                const isUsed = usedSemesterNumbers.includes(num)
                return (
                  <option
                    key={num}
                    value={num}
                    disabled={isUsed}
                    style={isUsed ? { color: '#666', fontStyle: 'italic' } : {}}
                  >
                    Semester {num}{isUsed ? ' (Already exists)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Custom Name */}
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-content-secondary mb-2">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              Custom Name (Optional)
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={`Leave empty for "Semester ${semesterNumber}"`}
              className="w-full bg-dark-surface-raised border border-dark-border rounded-lg px-3 py-2.5 text-content-primary text-sm placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-content-secondary mb-3">How would you like to start?</p>

            {hasEnrolledCourses && (
              <button
                onClick={handleImportAndStart}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all text-sm shadow-lg"
              >
                <BookOpen className="w-4 h-4" />
                <span>Import My Courses</span>
              </button>
            )}

            <button
              onClick={handleStartEmpty}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-surface-raised border border-dark-border hover:bg-dark-surface-hover hover:border-accent/50 text-content-primary rounded-lg font-medium transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Start with Empty Courses</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-dark-border/50 bg-dark-surface-raised/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-content-secondary hover:text-content-primary text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

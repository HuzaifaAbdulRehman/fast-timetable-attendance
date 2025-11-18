import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Edit2, Trash2, Award, Calendar, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import { formatGPA, calculateCGPA, getGPAColor } from '../../utils/gpaCalculator'
import { vibrate } from '../../utils/uiHelpers'

export default function SemesterModal({ semesters, onClose, onEdit, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, name }

  // Calculate CGPA
  const cgpa = useMemo(() => calculateCGPA(semesters), [semesters])
  const cgpaColor = useMemo(() => getGPAColor(cgpa), [cgpa])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      vibrate([10])
      onClose()
    }
  }

  const handleEdit = (semester) => {
    vibrate([10])
    onEdit(semester)
  }

  const handleDeleteClick = (semesterId, semesterName) => {
    vibrate([10])
    setDeleteConfirm({ id: semesterId, name: semesterName })
  }

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      vibrate([15])
      onDelete(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const handleCancelDelete = () => {
    vibrate([5])
    setDeleteConfirm(null)
  }

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
    >
      <div className="bg-dark-surface w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl border border-dark-border/50 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-dark-border/50 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-content-primary mb-1">All Semesters</h2>
            <p className="text-xs sm:text-sm text-content-secondary">View and manage your academic history</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-surface-hover rounded-lg transition-colors flex-shrink-0 ml-3"
            title="Close"
          >
            <X className="w-5 h-5 text-content-secondary" />
          </button>
        </div>

        {/* CGPA Display */}
        {semesters.length > 0 && (
          <div className={`mx-4 sm:mx-5 mt-4 p-4 rounded-xl border ${cgpaColor.bgColor} ${cgpaColor.borderColor} flex-shrink-0`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${cgpaColor.bgColor} border ${cgpaColor.borderColor} flex items-center justify-center flex-shrink-0`}>
                  <TrendingUp className={`w-6 h-6 ${cgpaColor.color}`} />
                </div>
                <div>
                  <p className="text-xs text-content-secondary mb-0.5">Cumulative GPA (CGPA)</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-bold ${cgpaColor.color}`}>{formatGPA(cgpa)}</span>
                    <span className={`text-sm ${cgpaColor.color} font-medium`}>/ 4.00</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-content-secondary mb-0.5">Semesters</p>
                <p className="text-2xl sm:text-3xl font-bold text-content-primary">{semesters.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Semester List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {semesters.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-content-tertiary" />
              </div>
              <p className="text-content-secondary mb-2">No saved semesters yet</p>
              <p className="text-sm text-content-tertiary">Calculate and save your first semester GPA to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {semesters.map((semester) => {
                const semesterColor = getGPAColor(semester.gpa)
                return (
                  <div
                    key={semester.id}
                    className="bg-dark-surface-raised border border-dark-border rounded-xl p-3 sm:p-4 hover:border-accent/30 transition-all"
                  >
                    {/* Semester Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg ${semesterColor.bgColor} border ${semesterColor.borderColor} flex items-center justify-center flex-shrink-0`}>
                          <Calendar className={`w-5 h-5 ${semesterColor.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-content-primary mb-1 truncate">
                            {semester.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {semester.courses.length} {semester.courses.length === 1 ? 'course' : 'courses'}
                            </span>
                            <span>{semester.totalCredits} credits</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(semester)}
                          className="p-2 hover:bg-dark-surface-hover text-content-tertiary hover:text-accent rounded-lg transition-colors"
                          title="Edit semester"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(semester.id, semester.name)}
                          className="p-2 hover:bg-red-500/10 text-content-tertiary hover:text-red-400 rounded-lg transition-colors"
                          title="Delete semester"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* GPA Display */}
                    <div className={`flex items-center justify-between p-3 rounded-lg ${semesterColor.bgColor} border ${semesterColor.borderColor}`}>
                      <div>
                        <p className="text-xs text-content-secondary mb-0.5">Semester GPA</p>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl sm:text-2xl font-bold ${semesterColor.color}`}>
                            {formatGPA(semester.gpa)}
                          </span>
                          <span className={`text-xs ${semesterColor.color} font-medium`}>/ 4.00</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full ${semesterColor.bgColor} border ${semesterColor.borderColor}`}>
                        <span className={`text-xs font-semibold ${semesterColor.color}`}>
                          {semesterColor.label}
                        </span>
                      </div>
                    </div>

                    {/* Course List (Collapsed) */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-accent hover:text-accent-hover font-medium select-none">
                        View courses ({semester.courses.length})
                      </summary>
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-dark-border/50">
                        {semester.courses.map((course, index) => (
                          <div key={index} className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-content-secondary truncate flex-1 min-w-0">{course.courseName}</span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-content-tertiary tabular-nums w-10 text-right">{course.creditHours} cr</span>
                              <span className="font-semibold text-accent w-8 text-center tabular-nums">{course.grade}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-dark-border/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all text-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelDelete()
          }}
        >
          <div className="bg-dark-surface rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-dark-border/50 animate-scale-in">
            {/* Warning Icon */}
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-content-primary text-center mb-2">
              Delete Semester?
            </h3>

            {/* Message */}
            <p className="text-sm text-content-secondary text-center mb-6">
              Are you sure you want to delete <span className="font-semibold text-content-primary">"{deleteConfirm.name}"</span>? This action cannot be undone.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2.5 bg-dark-surface-raised border border-dark-border hover:bg-dark-surface-hover text-content-primary rounded-lg font-medium transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

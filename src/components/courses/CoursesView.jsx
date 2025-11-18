import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { BookOpen, Calendar, AlertCircle, CheckCircle2, Plus, Trash2, Edit, FolderOpen, X } from 'lucide-react'
import TimetableSelector from './TimetableSelector'
import CourseForm from './CourseForm'
import ConfirmModal from '../shared/ConfirmModal'
import SemesterSelector from '../shared/SemesterSelector'
import CacheReminderBanner from '../shared/CacheReminderBanner'
import Toast from '../shared/Toast'
import { createPortal } from 'react-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { clearTimetableCache } from '../../utils/cacheManager'

export default function CoursesView() {
  const { courses, deleteCourse, deleteAllCourses, updateCourse, addCourse, semesters, activeSemesterId, switchSemester, createSemester, deleteSemester } = useApp()
  const [showTimetableSelector, setShowTimetableSelector] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [showDeleteAllOptions, setShowDeleteAllOptions] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState(null)
  const [newSemesterName, setNewSemesterName] = useState('')
  const [showNewSemesterInput, setShowNewSemesterInput] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)
  const [showCacheReminder, setShowCacheReminder] = useState(false)

  const handleEditCourse = (course) => {
    setEditingCourse(course)
    setShowCourseForm(true)
  }

  const handleDeleteCourse = (course) => {
    setCourseToDelete(course)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteCourse = () => {
    if (courseToDelete) {
      deleteCourse(courseToDelete.id)
      setCourseToDelete(null)
    }
  }

  const handleDeleteAll = () => {
    setShowDeleteAllOptions(true)
  }

  const confirmDeleteAll = () => {
    deleteAllCourses()
    // Delete the current semester if it exists and has no courses
    if (activeSemesterId && courses.length > 0) {
      // Check if there are other semesters to switch to
      const otherSemesters = semesters.filter(s => s.id !== activeSemesterId && !s.isArchived)
      if (otherSemesters.length > 0) {
        // Switch to another semester before deleting
        switchSemester(otherSemesters[0].id)
      }
      // Delete the semester
      deleteSemester(activeSemesterId)
    }
    setShowDeleteAllOptions(false)
  }

  const handleSwitchSemester = (semesterId) => {
    switchSemester(semesterId)
    setShowDeleteAllOptions(false)
  }

  const handleCreateNewSemester = () => {
    if (newSemesterName.trim()) {
      createSemester({ name: newSemesterName.trim() })
      setNewSemesterName('')
      setShowNewSemesterInput(false)
      setShowDeleteAllOptions(false)
    }
  }

  // Pull to refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    // Clear timetable cache and refresh
    clearTimetableCache()
    await new Promise(resolve => setTimeout(resolve, 500))
    setRefreshing(false)
    setToast({
      message: 'Courses refreshed.',
      type: 'success'
    })
  }

  // Handle manual cache clear from banner
  const handleCacheClear = () => {
    clearTimetableCache()
    setToast({
      message: 'Timetable cache cleared successfully',
      type: 'success'
    })
    setShowCacheReminder(false) // Hide banner after clearing cache
    // Reload page after a short delay to fetch fresh data
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  // Check if we should show cache reminder
  // Show only when there are courses with missing data
  useEffect(() => {
    if (courses.length === 0) {
      setShowCacheReminder(false)
      return
    }

    // Check if any course has missing critical data
    const hasMissingData = courses.some(course => {
      // Check for missing instructor, section, or schedule
      if (!course.instructor || !course.section) {
        return true
      }

      // Check if course lacks schedule data
      if (!course.schedule || course.schedule.length === 0) {
        return true
      }

      return false
    })

    setShowCacheReminder(hasMissingData)
  }, [courses])

  // Filter semesters - show all non-archived semesters
  const activeSemesters = semesters.filter(s => !s.isArchived)
  const currentSemester = semesters.find(s => s.id === activeSemesterId)

  const renderContent = () => (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Semester Selector - Always visible */}
      <div className="mb-4">
        <SemesterSelector compact={true} />
      </div>

      {/* Cache Reminder - Only show when data issues detected */}
      {showCacheReminder && courses.length > 0 && (
        <CacheReminderBanner
          message="Some course data may be missing. Refresh to reload."
          onRefresh={handleCacheClear}
          dismissible={true}
          show={showCacheReminder}
          autoDismissAfter={10000}
        />
      )}

        {courses.length === 0 ? (
          // Welcome Screen - No Courses Yet
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-accent/10">
              <BookOpen className="w-10 h-10 text-accent" />
            </div>

            <h2 className="text-2xl font-bold text-content-primary mb-2">
              Select Your Courses
            </h2>
            <p className="text-lg font-semibold text-accent mb-4">
              Step 1: Build Your Schedule
            </p>

            <p className="text-content-secondary leading-relaxed mb-8 max-w-md">
              Start by selecting courses from your FAST NUCES timetable.
              We'll automatically set up your schedule and attendance tracking.
            </p>

            {/* Feature List */}
            <div className="grid gap-4 mb-8 w-full max-w-md">
              <div className="flex items-start gap-3 bg-dark-card p-4 rounded-xl border border-dark-border">
                <div className="p-1.5 bg-blue-500/10 rounded-lg mt-0.5 flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-content-primary">Select from Timetable</p>
                  <p className="text-xs text-content-tertiary">Choose your section, import all courses instantly</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-dark-card p-4 rounded-xl border border-dark-border">
                <div className="p-1.5 bg-purple-500/10 rounded-lg mt-0.5 flex-shrink-0">
                  <Calendar className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-content-primary">Configure Dates</p>
                  <p className="text-xs text-content-tertiary">Set semester dates or choose quick presets</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-dark-card p-4 rounded-xl border border-dark-border">
                <div className="p-1.5 bg-green-500/10 rounded-lg mt-0.5 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-content-primary">Auto Setup</p>
                  <p className="text-xs text-content-tertiary">Timetable and attendance tracking ready instantly</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-md">
              <button
                onClick={() => setShowTimetableSelector(true)}
                className="px-4 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-white rounded-xl font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                Select from Timetable
              </button>

              <button
                onClick={() => setShowCourseForm(true)}
                className="px-4 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4 bg-dark-card border-2 border-dark-border hover:border-accent/50 text-content-primary rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Add Course Manually
              </button>
            </div>

            <p className="text-xs text-content-tertiary mt-6 text-center">
              Plan Smart. Take Leaves. Chill at Home. Still Hit 80%.
            </p>
          </div>
        ) : (
          // Course List - Courses Already Added
          <div>
            {/* Header with Actions */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-content-primary mb-2">
                  Your Courses
                </h2>
                <p className="text-content-secondary text-sm">
                  {courses.length} {courses.length === 1 ? 'course' : 'courses'} selected for this semester
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTimetableSelector(true)}
                  className="px-3 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add More</span>
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              </div>
            </div>

            {/* Success Message */}
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-400 mb-1">
                  Courses Imported Successfully!
                </p>
                <p className="text-xs text-content-secondary">
                  Your timetable and attendance tracking are ready.
                  Switch to <span className="font-medium text-accent">Timetable</span> to view your schedule
                  or <span className="font-medium text-accent">Attendance</span> to track absences.
                </p>
              </div>
            </div>

            {/* Course Cards */}
            <div className="grid gap-3 mb-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-dark-card rounded-xl p-3 sm:p-4 border border-dark-border hover:border-accent/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-content-primary mb-1">
                        {course.name}
                      </h3>
                      {course.courseCode && (
                        <p className="text-xs text-content-tertiary font-mono">
                          {course.courseCode}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="p-2 bg-dark-bg hover:bg-accent/10 text-content-secondary hover:text-accent rounded-lg transition-all"
                        title="Edit course"
                        aria-label="Edit course"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-2 bg-dark-bg hover:bg-red-500/10 text-content-secondary hover:text-red-400 rounded-lg transition-all"
                        title="Delete course"
                        aria-label="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: course.color?.hex || '#3B82F6' }}
                      />
                    </div>
                  </div>

                  {/* Course metadata - mobile optimized layout */}
                  <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3 text-xs">
                    {/* Instructor - Full width on mobile */}
                    {course.instructor && (
                      <div className="sm:col-span-2">
                        <p className="text-content-tertiary text-[10px] sm:text-xs">Instructor</p>
                        <p className="text-content-primary font-medium text-xs sm:text-sm truncate">{course.instructor}</p>
                      </div>
                    )}

                    {/* Section (if available) and Credit Hours on same row */}
                    <div className="flex items-start justify-between gap-3 sm:col-span-2">
                      {/* Section */}
                      {course.section && (
                        <div className="flex-shrink-0">
                          <p className="text-content-tertiary text-[10px] sm:text-xs">Section</p>
                          <p className="text-content-primary font-medium text-xs sm:text-sm">{course.section}</p>
                        </div>
                      )}

                      {/* Credit Hours - Aligned to right */}
                      {course.creditHours && (
                        <div className="flex-shrink-0 text-right">
                          <p className="text-content-tertiary text-[10px] sm:text-xs">Credit Hours</p>
                          <p className="text-content-primary font-medium text-xs sm:text-sm">{course.creditHours} CH</p>
                        </div>
                      )}

                      {/* Days - Aligned to right if section not present */}
                      {!course.section && course.schedule && course.schedule.length > 0 && (
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-content-tertiary text-[10px] sm:text-xs">Days</p>
                          <p className="text-content-primary font-medium text-xs sm:text-sm truncate">
                            {course.schedule.map(s => s.day.slice(0, 3)).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Days - Full row if section is present */}
                    {course.section && course.schedule && course.schedule.length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="text-content-tertiary text-[10px] sm:text-xs">Class Days</p>
                        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1">
                          {course.schedule.map((session, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 sm:px-2 py-0.5 bg-accent/10 text-accent text-[9px] sm:text-[10px] font-medium rounded border border-accent/20"
                            >
                              {session.day}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-content-primary font-medium mb-1">
                  Need to modify your courses?
                </p>
                <p className="text-content-secondary text-xs">
                  To change courses or add more sections, you can clear your current selection
                  and reimport from the timetable.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )

  return (
    <>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent=""
        refreshingContent={<div className="text-center py-4 text-accent text-sm">Refreshing...</div>}
        isPullable={true}
        resistance={2}
      >
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </PullToRefresh>

      {/* Timetable Selector Modal */}
      {showTimetableSelector && (
        <TimetableSelector
          onCoursesSelected={() => {
            setShowTimetableSelector(false)
          }}
          onClose={() => setShowTimetableSelector(false)}
          showManualOption={true}
        />
      )}

      {/* Course Form Modal */}
      {showCourseForm && (
        <CourseForm
          existingCourse={editingCourse}
          onClose={() => {
            setShowCourseForm(false)
            setEditingCourse(null)
          }}
          onSave={() => {
            setShowCourseForm(false)
            setEditingCourse(null)
          }}
        />
      )}

      {/* Delete Course Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setCourseToDelete(null)
          }}
          onConfirm={confirmDeleteCourse}
          title="Delete Course"
          message={
            courseToDelete
              ? `Are you sure you want to delete "${courseToDelete.name}"? This will also remove all attendance records for this course. This action cannot be undone.`
              : 'Are you sure you want to delete this course?'
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}

      {/* Delete All Options Modal */}
      {showDeleteAllOptions && createPortal(
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteAllOptions(false)}
        >
          <div
            className="bg-dark-surface/98 backdrop-blur-xl border border-dark-border/50 shadow-glass-lg rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 p-5 z-10 rounded-t-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-content-primary">
                  Manage Semesters
                </h2>
                <button
                  onClick={() => setShowDeleteAllOptions(false)}
                  className="p-2 hover:bg-dark-surface-raised rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-content-secondary" />
                </button>
              </div>
              <p className="text-sm text-content-secondary">
                Switch to another semester or create a new one. Current: <span className="font-medium text-content-primary">{currentSemester?.name || 'Unknown'}</span>
              </p>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Active Semesters */}
              {activeSemesters.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Active Semesters
                  </h3>
                  <div className="space-y-2">
                    {activeSemesters.map((semester) => (
                      <button
                        key={semester.id}
                        onClick={() => handleSwitchSemester(semester.id)}
                        disabled={semester.id === activeSemesterId}
                        className={`w-full p-3 rounded-xl border transition-all text-left ${
                          semester.id === activeSemesterId
                            ? 'bg-accent/10 border-accent/30 text-accent cursor-not-allowed'
                            : 'bg-dark-surface-raised border-dark-border hover:border-accent/30 hover:bg-dark-bg text-content-primary cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{semester.name}</span>
                          {semester.id === activeSemesterId && (
                            <span className="text-xs text-accent">Current</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Semester */}
              <div>
                <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Semester
                </h3>
                {showNewSemesterInput ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newSemesterName}
                      onChange={(e) => setNewSemesterName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateNewSemester()
                        } else if (e.key === 'Escape') {
                          setShowNewSemesterInput(false)
                          setNewSemesterName('')
                        }
                      }}
                      placeholder="Enter semester name..."
                      className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateNewSemester}
                        disabled={!newSemesterName.trim()}
                        className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover text-dark-bg font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowNewSemesterInput(false)
                          setNewSemesterName('')
                        }}
                        className="px-4 py-2 bg-dark-bg border border-dark-border text-content-primary rounded-xl hover:bg-dark-surface-raised transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewSemesterInput(true)}
                    className="w-full p-3 rounded-xl border border-dashed border-dark-border bg-dark-surface-raised hover:border-accent/30 hover:bg-dark-bg text-content-primary transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Semester</span>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-dark-border my-4"></div>

              {/* Delete All Option */}
              {courses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-content-danger mb-3 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete All Courses
                  </h3>
                  <button
                    onClick={() => {
                      setShowDeleteAllOptions(false)
                      setShowDeleteAllConfirm(true)
                    }}
                    className="w-full p-3 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all text-left"
                  >
                    <div className="font-medium mb-1">Delete all {courses.length} courses</div>
                    <div className="text-xs text-red-400/80">This will remove all courses and attendance for this semester</div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete All Courses Confirmation Modal */}
      {showDeleteAllConfirm && (
        <ConfirmModal
          isOpen={showDeleteAllConfirm}
          onClose={() => setShowDeleteAllConfirm(false)}
          onConfirm={confirmDeleteAll}
          title="Delete All Courses"
          message={`Are you sure you want to delete all ${courses.length} courses? This will also remove all attendance records. This action cannot be undone.`}
          confirmText="Delete All"
          cancelText="Cancel"
          variant="danger"
          requiresTyping={true}
          confirmationText="DELETE ALL"
        />
      )}
    </>
  )
}

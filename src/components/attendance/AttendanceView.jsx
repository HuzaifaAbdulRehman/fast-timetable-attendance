import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import AttendanceTable from './AttendanceTable'
import CourseForm from '../courses/CourseForm'
import Toast from '../shared/Toast'
import SemesterSelector from '../shared/SemesterSelector'
import { AlertCircle, CheckCircle2, Calendar, AlertTriangle, ChevronUp, ChevronDown, BookOpen } from 'lucide-react'
import { getTodayISO } from '../../utils/dateHelpers'
import { DEFAULT_WEEKS_TO_SHOW } from '../../utils/constants'
import PullToRefresh from 'react-simple-pull-to-refresh'
import Confetti, { celebratePerfectAttendance, celebrateMilestone } from '../shared/Confetti'
import { vibrate } from '../../utils/uiHelpers'

export default function AttendanceView() {
  const { courses, undoHistory, undo } = useApp()
  const [refreshing, setRefreshing] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [toast, setToast] = useState(null) // { message, type, action }
  const [showAllControls, setShowAllControls] = useState(true) // Track if ALL controls are visible - default to true

  // Show undo toast when action is performed
  useEffect(() => {
    if (undoHistory) {
      setToast({
        message: undoHistory.description,
        type: 'info',
        action: {
          label: 'UNDO',
          onClick: () => {
            undo()
            setToast(null)
          }
        }
      })
    }
  }, [undoHistory, undo])

  const handleEditCourse = (course) => {
    setEditingCourse(course)
    setShowCourseForm(true)
  }

  const handleCloseForm = () => {
    setShowCourseForm(false)
    setEditingCourse(null)
  }

  const handleSaveCourse = () => {
    setShowCourseForm(false)
    setEditingCourse(null)
    setToast({
      message: editingCourse ? 'Course updated successfully' : 'Course added successfully',
      type: 'success'
    })
  }

  const handleDeleteCourse = (courseName) => {
    setToast({
      message: `"${courseName}" deleted`,
      type: 'info'
    })
  }

  const handleBulkMarkComplete = (count) => {
    setToast({
      message: `Marked ${count} date${count > 1 ? 's' : ''} absent`,
      type: 'success'
    })
  }

  // Pull to refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay (data is already in sync via context)
    await new Promise(resolve => setTimeout(resolve, 500))
    setRefreshing(false)
    setToast({
      message: 'Attendance refreshed',
      type: 'success'
    })
  }

  // Calculate semester length in weeks - memoized
  const semesterWeeks = useMemo(() => {
    if (!courses || courses.length === 0) return 16

    const today = new Date()
    const endDates = courses
      .filter(c => c && c.endDate) // Filter out invalid courses
      .map(c => new Date(c.endDate))

    if (endDates.length === 0) return 16

    const latestEndDate = new Date(Math.max(...endDates))

    const diffTime = latestEndDate - today
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))

    return Math.max(diffWeeks, 1) // At least 1 week
  }, [courses]) // Recalculate only when courses change

  // Default to End of Semester
  const [weeksToShow, setWeeksToShow] = useState(semesterWeeks)

  // Update weeksToShow when semesterWeeks changes
  useEffect(() => {
    setWeeksToShow(semesterWeeks)
  }, [semesterWeeks])

  if (courses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-content-tertiary" />
          </div>
          <h3 className="text-xl font-semibold text-content-primary mb-2">
            No Courses Yet
          </h3>
          <p className="text-content-secondary mb-6">
            Select your courses first to start tracking attendance.
            Go to the <span className="font-medium text-accent">Courses</span> tab to get started.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg text-sm">
            <BookOpen className="w-4 h-4" />
            <span>Go to Courses tab to add courses</span>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => (
    <div className="relative">
      {/* App Tagline - Always visible */}
      {courses.length > 0 && (
        <div className="mb-3 text-center">
          <p className="text-xs md:text-sm text-content-tertiary/80 font-medium">
            Plan Smart. Take Leaves. Chill at Home. Still Hit 80%. 
          </p>
        </div>
      )}

      {/* Unified Toggle Bar for ALL controls */}
      <div
        onClick={() => {
          vibrate([10])
          setShowAllControls(!showAllControls)
        }}
        className="mb-2 flex items-center justify-center py-1 bg-dark-surface border border-dark-border/50 rounded-lg cursor-pointer hover:bg-dark-surface-raised hover:border-accent/30 transition-all group"
        title={showAllControls ? "Hide controls" : "Show controls"}
      >
        {showAllControls ? (
          <ChevronUp className="w-4 h-4 text-accent group-hover:text-accent-hover transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-accent group-hover:text-accent-hover transition-colors" />
        )}
      </div>

      {/* Unified Controls Row - Semester + Weeks */}
      {showAllControls && (
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Compact Semester Selector */}
        <SemesterSelector compact />

        {/* Weeks Dropdown */}
        <select
          value={weeksToShow}
          onChange={(e) => setWeeksToShow(Number(e.target.value))}
          className="bg-dark-surface-raised border border-dark-border rounded-lg px-2 py-1.5 text-content-primary text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all flex-shrink-0"
        >
          <option value={4}>4w</option>
          <option value={8}>8w</option>
          <option value={12}>12w</option>
          <option value={16}>16w</option>
          <option value={semesterWeeks}>All ({semesterWeeks}w)</option>
        </select>
      </div>
      )}

      {/* Attendance Table */}
      <AttendanceTable
        startDate={getTodayISO()}
        weeksToShow={weeksToShow}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDeleteCourse}
        onBulkMarkComplete={handleBulkMarkComplete}
        showActions={showAllControls}
      />

      {/* Course Form Modal */}
      {showCourseForm && (
        <CourseForm
          existingCourse={editingCourse}
          onClose={handleCloseForm}
          onSave={handleSaveCourse}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          action={toast.action}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent=""
      refreshingContent={<div className="text-center py-4 text-accent text-sm">Refreshing...</div>}
      isPullable={true}
      resistance={2}
    >
      {renderContent()}
    </PullToRefresh>
  )
}

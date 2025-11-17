import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import AttendanceTable from './AttendanceTable'
import CourseForm from '../courses/CourseForm'
import Toast from '../shared/Toast'
import SemesterSelector from '../shared/SemesterSelector'
import { Plus, AlertCircle, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react'
import { getTodayISO } from '../../utils/dateHelpers'
import { DEFAULT_WEEKS_TO_SHOW } from '../../utils/constants'
import PullToRefresh from 'react-simple-pull-to-refresh'
import Confetti, { celebratePerfectAttendance, celebrateMilestone } from '../shared/Confetti'

export default function AttendanceView() {
  const { courses, undoHistory, undo } = useApp()
  const [refreshing, setRefreshing] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [toast, setToast] = useState(null) // { message, type, action }

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

  // Calculate semester length in weeks
  const getSemesterWeeks = () => {
    if (courses.length === 0) return 16

    const today = new Date()
    const endDates = courses.map(c => new Date(c.endDate))
    const latestEndDate = new Date(Math.max(...endDates))

    const diffTime = latestEndDate - today
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))

    return Math.max(diffWeeks, 1) // At least 1 week
  }

  // Default to End of Semester
  const [weeksToShow, setWeeksToShow] = useState(getSemesterWeeks())

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] px-4">
        {/* Animated illustration */}
        <div className="relative mb-8 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 rounded-full blur-3xl"></div>
          <div className="relative p-8 bg-gradient-to-br from-accent/15 to-accent/5 rounded-3xl border border-accent/20">
            <AlertCircle className="w-16 h-16 text-accent" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center max-w-sm space-y-4 animate-slide-in">
          <h2 className="text-2xl font-bold text-content-primary">
            Welcome to Absence Tracker
          </h2>
          <p className="text-content-secondary leading-relaxed">
            Never worry about attendance again. Track your absences strategically and stay above the 80% threshold.
          </p>

          {/* Features list */}
          <div className="pt-4 pb-6 space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-attendance-safe/10 rounded-lg mt-0.5 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-attendance-safe" />
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">Real-time tracking</p>
                <p className="text-xs text-content-tertiary">See exactly how many absences you have left</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-accent/10 rounded-lg mt-0.5 flex-shrink-0">
                <Calendar className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">Date-based marking</p>
                <p className="text-xs text-content-tertiary">Mark entire days absent with one tap</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-attendance-warning/10 rounded-lg mt-0.5 flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-attendance-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-content-primary">Smart alerts</p>
                <p className="text-xs text-content-tertiary">Get warned when you're approaching the limit</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => setShowCourseForm(true)}
            className="w-full bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold px-6 py-4 rounded-xl transition-all duration-200 shadow-accent hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Course
          </button>
        </div>

        {/* Course Form Modal */}
        {showCourseForm && (
          <CourseForm
            existingCourse={editingCourse}
            onClose={handleCloseForm}
            onSave={handleCloseForm}
          />
        )}
      </div>
    )
  }

  const renderContent = () => (
    <div>
      {/* Unified Controls Row - Semester + Weeks + Add Course */}
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
          <option value={getSemesterWeeks()}>All ({getSemesterWeeks()}w)</option>
        </select>

        {/* Add Course Button */}
        <button
          onClick={() => {
            setEditingCourse(null)
            setShowCourseForm(true)
          }}
          className="ml-auto bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-medium px-2.5 md:px-3 py-1.5 rounded-lg transition-all duration-200 shadow-accent hover:scale-[1.02] active:scale-95 inline-flex items-center gap-1.5 text-xs flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Attendance Table */}
      <AttendanceTable
        startDate={getTodayISO()}
        weeksToShow={weeksToShow}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDeleteCourse}
        onBulkMarkComplete={handleBulkMarkComplete}
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

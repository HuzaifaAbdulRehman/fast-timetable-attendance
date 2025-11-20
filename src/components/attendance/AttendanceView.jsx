import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import AttendanceTable from './AttendanceTable'
import CourseForm from '../courses/CourseForm'
import Toast from '../shared/Toast'
import SemesterSelector from '../shared/SemesterSelector'
import QuickMarkToday from './QuickMarkToday'
import { AlertCircle, CheckCircle2, Calendar, AlertTriangle, ChevronUp, ChevronDown, BookOpen, CheckSquare, Square, ArrowLeftRight } from 'lucide-react'
import { getTodayISO } from '../../utils/dateHelpers'
import { DEFAULT_WEEKS_TO_SHOW } from '../../utils/constants'
import PullToRefresh from 'react-simple-pull-to-refresh'
import Confetti, { celebratePerfectAttendance, celebrateMilestone } from '../shared/Confetti'
import { vibrate } from '../../utils/uiHelpers'
import { startOfWeek } from 'date-fns'

export default function AttendanceView() {
  const { courses, undoHistory, undo, markDaysAbsent } = useApp()
  const [refreshing, setRefreshing] = useState(false)
  const [loadingWeeks, setLoadingWeeks] = useState(false)

  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [toast, setToast] = useState(null) // { message, type, action }
  const [showAllControls, setShowAllControls] = useState(true) // Track if ALL controls are visible - default to true
  const [scrollVisible, setScrollVisible] = useState(true)
  const tableContainerRef = useRef(null)
  const scrollTimeoutRef = useRef(null)
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])
  const [reorderMode, setReorderMode] = useState(false)

  // Track if we've already shown toast for current undo history
  const lastUndoHistoryRef = useRef(undoHistory)
  const hasShownToastRef = useRef(false)

  // Show undo toast only when a NEW action is performed (not on tab navigation)
  useEffect(() => {
    // Only show toast if undoHistory is new and different from last shown
    // AND we haven't already shown a toast for this undo history
    if (undoHistory && undoHistory !== lastUndoHistoryRef.current && !hasShownToastRef.current) {
      lastUndoHistoryRef.current = undoHistory
      hasShownToastRef.current = true
      setToast({
        message: undoHistory.description,
        type: 'info',
        action: {
          label: 'UNDO',
          onClick: () => {
            undo()
            setToast(null)
            lastUndoHistoryRef.current = null
            hasShownToastRef.current = false
          }
        }
      })
    } else if (!undoHistory && lastUndoHistoryRef.current) {
      // Clear reference when undo history is cleared
      lastUndoHistoryRef.current = null
      hasShownToastRef.current = false
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

  // Cleanup scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Cleanup toast on unmount to prevent persistence across tab switches
  useEffect(() => {
    return () => setToast(null)
  }, [])

  // Calculate attendance start date - earliest enrollment date (not week-aligned)
  // This prevents showing empty pre-enrollment days at the start
  const attendanceStartDate = useMemo(() => {
    if (!courses || courses.length === 0) return getTodayISO()

    // Find earliest enrollment date across all courses
    const enrollmentDates = courses
      .map(c => c.enrollmentStartDate || c.startDate)
      .filter(Boolean)
      .map(d => new Date(d))

    if (enrollmentDates.length === 0) return getTodayISO()

    const earliestEnrollment = new Date(Math.min(...enrollmentDates))

    // Return the actual enrollment date (not week start)
    // The week generation logic will handle full weeks automatically
    return earliestEnrollment.toISOString().split('T')[0]
  }, [courses])

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

  const handleToggleControls = () => {
    vibrate([10])
    setShowAllControls(!showAllControls)
  }

  const toggleBulkSelectMode = () => {
    vibrate([10])
    setBulkSelectMode(prev => {
      const newValue = !prev
      if (newValue) {
        setReorderMode(false)
      }
      return newValue
    })
    setSelectedDates([])
  }

  const handleBulkMarkAbsent = () => {
    if (selectedDates.length > 0) {
      markDaysAbsent(selectedDates)
      handleBulkMarkComplete(selectedDates.length)
      setSelectedDates([])
      setBulkSelectMode(false)
    }
  }

  const renderContent = () => (
    <div className="relative">
      {/* Collapsible Header Container - smooth fade with transform and height */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${scrollVisible
            ? 'opacity-100 translate-y-0 max-h-[500px]'
            : 'opacity-0 -translate-y-2 max-h-0 pointer-events-none'
          }
        `}
        style={{
          overflow: scrollVisible ? 'visible' : 'hidden'
        }}
      >
        {/* App Tagline - More compact on mobile */}
        {courses.length > 0 && (
          <div className="mb-0.5 sm:mb-1 flex items-center justify-center py-0.5">
            <p className="text-[9px] sm:text-[10px] md:text-sm text-content-tertiary font-medium leading-tight">
              Plan Smart. Skip Smart. Stay Above 80%
            </p>
          </div>
        )}

        {/* Unified Toggle Bar - More compact on mobile */}
        <div
          onClick={handleToggleControls}
          className="mb-1 sm:mb-2 mx-2 sm:mx-3 md:mx-4 flex items-center justify-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 bg-dark-surface border border-dark-border/50 rounded-lg cursor-pointer hover:bg-dark-surface-raised hover:border-accent/30 transition-all duration-200 ease-out group"
          title={showAllControls ? "Hide controls" : "Show controls"}
        >
          {showAllControls ? (
            <>
              <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent group-hover:text-accent-hover transition-colors" />
              <span className="text-[9px] sm:text-[10px] text-content-secondary group-hover:text-content-primary transition-colors">
                Collapse
              </span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent group-hover:text-accent-hover transition-colors" />
              <span className="text-[9px] sm:text-[10px] text-content-secondary group-hover:text-content-primary transition-colors">
                Expand
              </span>
            </>
          )}
        </div>

        {/* Unified Controls Row - Semester + Weeks - More compact on mobile */}
        {showAllControls && (
        <div className="mb-1.5 sm:mb-2 md:mb-3 space-y-1.5 sm:space-y-2 px-2 sm:px-3 md:px-4">
          {/* Row 1: Semester + Weeks */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2">
            <SemesterSelector compact />
            <select
              value={weeksToShow}
              onChange={(e) => {
                setLoadingWeeks(true)
                setWeeksToShow(Number(e.target.value))
                setTimeout(() => setLoadingWeeks(false), 300) // Brief loading state
              }}
              disabled={loadingWeeks}
              className="bg-dark-surface-raised border border-dark-border rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-content-primary text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all flex-shrink-0 min-w-[70px] disabled:opacity-50 disabled:cursor-wait"
            >
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
              <option value={16}>16 weeks</option>
              <option value={semesterWeeks}>All ({semesterWeeks}w)</option>
            </select>
          </div>

          {/* Row 2: Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <button
                onClick={toggleBulkSelectMode}
                className={`
                  flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0
                  focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-dark-bg
                  ${bulkSelectMode
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-dark-surface-raised border border-dark-border text-content-primary hover:bg-dark-surface-hover hover:border-accent/40'
                  }
                `}
              >
                {bulkSelectMode ? <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span className="whitespace-nowrap">Select</span>
              </button>

              {!bulkSelectMode && courses.length > 1 && (
                <button
                  onClick={() => {
                    vibrate([10])
                    if (!reorderMode) {
                      setBulkSelectMode(false)
                      setSelectedDates([])
                    }
                    setReorderMode(!reorderMode)
                  }}
                  className={`
                    flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0
                    focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-dark-bg
                    ${reorderMode
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-dark-surface-raised border border-dark-border text-content-primary hover:bg-dark-surface-hover hover:border-accent/40'
                    }
                  `}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">Reorder</span>
                </button>
              )}

              {bulkSelectMode && selectedDates.length > 0 && (
                <span className="text-xs sm:text-sm text-content-secondary font-medium flex-shrink-0 tabular-nums">
                  {selectedDates.length} selected
                </span>
              )}

              {reorderMode && (
                <span className="text-xs sm:text-sm text-accent font-medium flex-shrink-0">
                  Use arrows
                </span>
              )}
            </div>

            {!bulkSelectMode && !reorderMode && (
              <QuickMarkToday inline />
            )}
          </div>
        </div>
      )}
      </div>

      {/* Loading Overlay for Week Changes */}
      {loadingWeeks && (
        <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-dark-surface border border-dark-border rounded-xl px-4 py-3 flex items-center gap-2 shadow-glass-lg">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-content-primary font-medium">Updating...</span>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <AttendanceTable
        startDate={attendanceStartDate}
        weeksToShow={weeksToShow}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDeleteCourse}
        onBulkMarkComplete={handleBulkMarkComplete}
        showActions={false}
        bulkSelectMode={bulkSelectMode}
        selectedDates={selectedDates}
        setSelectedDates={setSelectedDates}
        reorderMode={reorderMode}
onScroll={(scrollTop) => {
          // Clear any pending timeout
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
          }

          // Show header when at top (with smooth delay)
          if (scrollTop < 10) {
            scrollTimeoutRef.current = setTimeout(() => {
              setScrollVisible(true)
            }, 150) // Small delay for smooth appearance
          } else if (scrollTop > 50) {
            // Check scroll direction via ref
            const lastScroll = tableContainerRef.current?.lastScrollTop || 0
            if (scrollTop > lastScroll) {
              // Scrolling down - hide immediately
              setScrollVisible(false)
            } else {
              // Scrolling up - show with delay
              scrollTimeoutRef.current = setTimeout(() => {
                setScrollVisible(true)
              }, 100)
            }
            if (tableContainerRef.current) {
              tableContainerRef.current.lastScrollTop = scrollTop
            }
          }
        }}
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

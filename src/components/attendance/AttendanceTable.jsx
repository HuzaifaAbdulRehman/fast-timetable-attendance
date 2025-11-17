import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { generateWeeks, formatDateShort, courseHasClassOnDate } from '../../utils/dateHelpers'
import { getDayStatus, getSessionStatus, calculateAttendanceStats } from '../../utils/attendanceCalculator'
import { SESSION_STATUS, COURSE_COLORS } from '../../utils/constants'
import { Check, X, Minus, Circle, Edit2, Trash2, CheckSquare, Square, MoreVertical, ArrowLeft, ArrowRight, ArrowLeftRight, Menu, ChevronUp } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'
import QuickMarkToday from './QuickMarkToday'

// Haptic feedback utility
const vibrate = (pattern = [10]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Get color classes for a course
const getCourseColor = (course) => {
  const color = COURSE_COLORS.find(c => c.name === course.color) || COURSE_COLORS[0]
  return color
}

export default function AttendanceTable({ startDate, weeksToShow, onEditCourse, onDeleteCourse, onBulkMarkComplete }) {
  const { courses, attendance, toggleDay, toggleSession, deleteCourse, markDaysAbsent, reorderCourse } = useApp()
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { course }
  const [longPressTimer, setLongPressTimer] = useState(null)
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])
  const [swipedCourse, setSwipedCourse] = useState(null) // Track swiped course for delete reveal
  const [openMenuCourse, setOpenMenuCourse] = useState(null) // Track which course menu is open
  const [reorderMode, setReorderMode] = useState(false) // Track reorder mode
  const [showActions, setShowActions] = useState(false) // Track if action buttons are visible

  // Close swipe when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Close swiped course if clicking anywhere outside the table
      if (swipedCourse) {
        const isClickOnSwipedCourse = e.target.closest(`[data-course-id="${swipedCourse}"]`)
        if (!isClickOnSwipedCourse) {
          setSwipedCourse(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [swipedCourse])

  // Get latest course end date
  const getLatestEndDate = () => {
    if (courses.length === 0) return null
    const endDates = courses.map(c => new Date(c.endDate))
    return new Date(Math.max(...endDates))
  }

  const latestEndDate = getLatestEndDate()

  // Generate weeks with dates
  let weeks = generateWeeks(startDate, weeksToShow)

  // Filter out dates beyond course end dates
  if (latestEndDate) {
    weeks = weeks.map(week => ({
      ...week,
      days: week.days.filter(day => new Date(day.date) <= latestEndDate)
    })).filter(week => week.days.length > 0) // Remove empty weeks
  }

  // Handle day toggle (mark all classes on that date)
  const handleDayClick = (date) => {
    vibrate([15, 30, 15]) // Medium feedback for day toggle
    toggleDay(date)
  }

  // Handle bulk select mode
  const toggleBulkSelectMode = () => {
    vibrate([10])
    setBulkSelectMode(prev => {
      const newValue = !prev
      if (newValue) {
        // Entering bulk select mode - exit reorder mode
        setReorderMode(false)
      }
      return newValue
    })
    setSelectedDates([]) // Clear selection when toggling mode
  }

  const handleDateClick = (date) => {
    if (bulkSelectMode) {
      // In bulk mode: toggle date selection
      vibrate([10])
      setSelectedDates(prev =>
        prev.includes(date)
          ? prev.filter(d => d !== date)
          : [...prev, date]
      )
    } else {
      // Normal mode: toggle entire day
      handleDayClick(date)
    }
  }

  const handleBulkMarkAbsent = () => {
    if (selectedDates.length === 0) return

    vibrate([20, 50, 20])
    const count = selectedDates.length
    markDaysAbsent(selectedDates)

    // Exit bulk mode and clear selection
    setBulkSelectMode(false)
    setSelectedDates([])

    // Notify parent for toast
    if (onBulkMarkComplete) {
      onBulkMarkComplete(count)
    }
  }

  const handleCancelBulkSelect = () => {
    vibrate([10])
    setBulkSelectMode(false)
    setSelectedDates([])
  }

  // Long press handlers for mobile
  const handleLongPressStart = (date) => {
    const timer = setTimeout(() => {
      vibrate([20, 50, 20]) // Triple vibration for long press
      handleDayClick(date)
      setLongPressTimer(null)
    }, 500) // 500ms for long press
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Handle individual cell toggle
  const handleCellClick = (e, courseId, date) => {
    e.stopPropagation() // Prevent day toggle when clicking cell

    const currentStatus = getSessionStatus(courseId, date, attendance)

    // Cycle through: present (null) → absent → cancelled (no class) → present
    if (currentStatus === SESSION_STATUS.ABSENT) {
      vibrate([15]) // Medium tap for marking cancelled
      toggleSession(courseId, date, SESSION_STATUS.CANCELLED) // Mark as cancelled/no class
    } else if (currentStatus === SESSION_STATUS.CANCELLED) {
      vibrate([10]) // Quick tap for marking present
      toggleSession(courseId, date, null) // Mark present (remove record)
    } else {
      vibrate([20]) // Slightly longer for marking absent
      toggleSession(courseId, date, SESSION_STATUS.ABSENT) // Mark absent
    }
  }

  // Handle delete course
  const handleDeleteCourse = (course) => {
    vibrate([50, 100, 50]) // Error pattern
    deleteCourse(course.id)
    setDeleteConfirm(null)
    if (onDeleteCourse) {
      onDeleteCourse(course.name)
    }
  }

  // Get cell className based on status - minimal hover effects only
  const getCellClassName = (courseId, date, hasClass) => {
    if (!hasClass) return 'cursor-not-allowed'

    const status = getSessionStatus(courseId, date, attendance)

    if (status === SESSION_STATUS.ABSENT) {
      return 'cursor-pointer hover:bg-red-500/10 transition-colors'
    } else if (status === SESSION_STATUS.CANCELLED) {
      return 'cursor-pointer hover:bg-amber-500/10 transition-colors'
    } else {
      return 'cursor-pointer hover:bg-dark-surface-overlay transition-colors'
    }
  }

  // Get cell content icon
  const getCellIcon = (courseId, date, hasClass) => {
    if (!hasClass) return <Minus className="w-4 h-4 mx-auto" />

    const status = getSessionStatus(courseId, date, attendance)

    if (status === SESSION_STATUS.ABSENT) {
      return <X className="w-4 h-4 mx-auto" />
    } else if (status === SESSION_STATUS.CANCELLED) {
      return <Circle className="w-4 h-4 mx-auto" />
    } else {
      return <Check className="w-4 h-4 mx-auto" />
    }
  }

  // Get day indicator
  const getDayIndicator = (date) => {
    const status = getDayStatus(date, courses, attendance)

    if (status === 'absent') {
      return <span className="text-attendance-danger">✗</span>
    } else if (status === 'mixed') {
      return <span className="text-attendance-warning">~</span>
    } else if (status === 'present') {
      return <span className="text-attendance-safe">✓</span>
    }
    return <span className="text-content-tertiary">○</span>
  }

  return (
    <div className="card p-0 relative">
      {/* Floating Action Button to toggle actions - Fixed position */}
      <button
        onClick={() => {
          vibrate([10])
          setShowActions(!showActions)
        }}
        className={`
          fixed bottom-20 right-4 z-30 p-3 rounded-full shadow-2xl transition-all duration-200
          ${showActions
            ? 'bg-accent text-dark-bg rotate-180'
            : 'bg-dark-surface-raised text-accent border-2 border-accent/50'
          }
        `}
        title={showActions ? "Hide actions" : "Show actions"}
        aria-label={showActions ? "Hide actions" : "Show actions"}
      >
        {showActions ? <ChevronUp className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className="overflow-auto max-h-[calc(100vh-13rem)] md:max-h-[calc(100vh-14rem)] scroll-smooth pb-4">
        <table className="attendance-table w-full min-w-full">
          <thead className="sticky top-0 z-[5] bg-dark-surface">
            {/* Row 1: Action Buttons - Collapsible */}
            {showActions && (
            <tr>
              <th colSpan={courses.length + 1} className="py-1.5 border-b border-dark-border bg-dark-surface">
                <div className="flex items-center justify-between gap-1.5 px-2 md:px-4">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <button
                      onClick={toggleBulkSelectMode}
                      className={`
                        flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 flex-shrink-0
                        ${bulkSelectMode
                          ? 'bg-accent text-dark-bg shadow-accent'
                          : 'bg-dark-bg border border-dark-border text-content-secondary hover:bg-dark-surface-raised hover:text-content-primary hover:border-accent/30'
                        }
                      `}
                    >
                      {bulkSelectMode ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span className="whitespace-nowrap">Bulk Select</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          <span className="whitespace-nowrap">Select</span>
                        </>
                      )}
                    </button>

                    {/* Reorder Mode Toggle */}
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
                          flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all duration-200 flex-shrink-0
                          ${reorderMode
                            ? 'bg-accent text-dark-bg shadow-accent'
                            : 'bg-dark-bg border border-dark-border text-content-secondary hover:bg-dark-surface-raised hover:text-content-primary hover:border-accent/30'
                          }
                        `}
                        title="Reorder courses"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span className="whitespace-nowrap">Reorder</span>
                      </button>
                    )}
                  </div>

                  {/* Right side content */}
                  <div className="flex items-center gap-2">
                    {bulkSelectMode && selectedDates.length > 0 && (
                      <span className="text-xs text-content-tertiary font-medium flex-shrink-0 tabular-nums">
                        {selectedDates.length} selected
                      </span>
                    )}

                    {reorderMode && (
                      <span className="text-xs text-accent font-medium flex-shrink-0">
                        Use arrows to reorder
                      </span>
                    )}

                    {/* Quick Mark Today Button - on the right */}
                    {!bulkSelectMode && !reorderMode && <QuickMarkToday inline />}
                  </div>
                </div>
              </th>
            </tr>
            )}

            {/* Row 2: Date and Course Headers */}
            <tr className="border-b border-dark-border">
              <th className="text-left min-w-[60px] md:min-w-[80px] px-3 md:px-4 py-1">
                <span className="text-xs md:text-sm font-semibold text-content-primary">Date</span>
              </th>
              {courses.map((course, index) => {
                const stats = calculateAttendanceStats(course, attendance)
                const absencesUsed = stats.absences
                const absencesAllowed = course.allowedAbsences
                const percentage = absencesAllowed > 0 ? (absencesUsed / absencesAllowed) * 100 : 0
                const courseColor = getCourseColor(course)

                // Determine status color
                const statusColor = percentage >= 85
                  ? 'text-attendance-danger'
                  : percentage >= 65
                  ? 'text-attendance-warning'
                  : 'text-attendance-safe'

                // Swipe handlers
                const swipeHandlers = useSwipeable({
                  onSwipedLeft: () => {
                    vibrate([10])
                    setSwipedCourse(course.id)
                  },
                  onSwipedRight: () => {
                    setSwipedCourse(null)
                  },
                  trackMouse: false,
                  preventScrollOnSwipe: true,
                })

                const isSwipedOpen = swipedCourse === course.id

                const isMenuOpen = openMenuCourse === course.id

                return (
                  <th
                    key={course.id}
                    data-course-id={course.id}
                    className="min-w-[64px] max-w-[64px] md:min-w-[74px] md:max-w-[74px] text-center px-1 md:px-1.5 relative overflow-hidden"
                  >
                    {/* Swipe reveal delete button background */}
                    {isSwipedOpen && (
                      <div className="absolute inset-0 bg-attendance-danger flex items-center justify-center z-0">
                        <button
                          onClick={() => {
                            vibrate([10])
                            setDeleteConfirm(course)
                            setSwipedCourse(null)
                          }}
                          className="text-white font-medium text-xs uppercase tracking-wider"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    <div
                      className={`py-1 px-0.5 transition-transform duration-200 relative z-10 bg-dark-surface ${isSwipedOpen ? '-translate-x-full' : 'translate-x-0'}`}
                      {...swipeHandlers}
                    >
                      {/* Badge Style with Status - Modern & Polished */}

                      {/* Course name with colored dot - TOP */}
                      <div className="flex items-center justify-center gap-1 min-w-0 mb-0.5">
                        <div
                          className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: courseColor.hex }}
                        />
                        <div
                          className="text-[11px] md:text-sm font-bold truncate text-content-primary max-w-[48px] md:max-w-[58px]"
                          title={course.name}
                        >
                          {course.shortName || course.name}
                        </div>
                      </div>

                      {/* Horizontal divider */}
                      <div className="w-full h-px bg-dark-border/40 mb-0.5"></div>

                      {/* Stats with status background - MIDDLE */}
                      <div className={`
                        px-1.5 py-0.5 rounded-md mb-0.5 text-[10px] md:text-xs font-bold tabular-nums
                        ${percentage < 60
                          ? 'bg-attendance-safe/15 text-attendance-safe border border-attendance-safe/20'
                          : percentage < 85
                            ? 'bg-attendance-warning/15 text-attendance-warning border border-attendance-warning/20'
                            : 'bg-attendance-danger/15 text-attendance-danger border border-attendance-danger/20'
                        }
                      `}>
                        {absencesUsed}/{absencesAllowed}
                      </div>

                      {/* Action buttons - BOTTOM */}
                      <div className="flex items-center justify-center gap-1">
                        {reorderMode ? (
                          <>
                            {/* Reorder arrows */}
                            <button
                              onClick={() => {
                                vibrate([10])
                                reorderCourse(course.id, 'left')
                              }}
                              disabled={index === 0}
                              className={`p-1 md:p-1.5 rounded transition-colors border border-dark-border/30 ${
                                index === 0
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-dark-surface-raised hover:border-accent/40'
                              }`}
                              title="Move left"
                            >
                              <ArrowLeft className="w-2.5 h-2.5 md:w-3 md:h-3 text-content-tertiary hover:text-accent" />
                            </button>
                            <button
                              onClick={() => {
                                vibrate([10])
                                reorderCourse(course.id, 'right')
                              }}
                              disabled={index === courses.length - 1}
                              className={`p-1 md:p-1.5 rounded transition-colors border border-dark-border/30 ${
                                index === courses.length - 1
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-dark-surface-raised hover:border-accent/40'
                              }`}
                              title="Move right"
                            >
                              <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-content-tertiary hover:text-accent" />
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Edit/Delete buttons */}
                            <button
                              onClick={() => {
                                vibrate([10])
                                onEditCourse(course)
                              }}
                              className="p-1 md:p-1.5 hover:bg-dark-surface-raised rounded transition-colors border border-dark-border/30 hover:border-accent/40"
                              title="Edit course"
                            >
                              <Edit2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-content-tertiary hover:text-accent" />
                            </button>
                            <button
                              onClick={() => {
                                vibrate([10])
                                setDeleteConfirm(course)
                              }}
                              className="p-1 md:p-1.5 hover:bg-dark-surface-raised rounded transition-colors border border-dark-border/30 hover:border-attendance-danger/40"
                              title="Delete course"
                            >
                              <Trash2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-content-tertiary hover:text-attendance-danger" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {weeks.map((week) => (
              <React.Fragment key={week.weekNumber}>
                {/* Week Header Row */}
                <tr className="bg-dark-bg week-header-row">
                  <td className="py-2 px-4 sticky-week-label">
                    <span className="text-xs uppercase tracking-wider text-content-tertiary font-medium">
                      {week.label}
                    </span>
                  </td>
                  <td colSpan={courses.length} className="bg-dark-bg"></td>
                </tr>

                {/* Day Rows */}
                {week.days
                  .filter(day => day.dayOfWeek >= 1 && day.dayOfWeek <= 5) // Mon-Fri only
                  .map((day) => {
                    const dayStatus = getDayStatus(day.date, courses, attendance)
                    const isToday = day.isToday

                    return (
                      <tr
                        key={day.date}
                        className={`
                          hover:bg-dark-surface-raised transition-colors
                          ${isToday ? 'border-l-4 border-accent bg-accent/5' : ''}
                        `}
                        style={bulkSelectMode && selectedDates.includes(day.date) ? {
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          borderRight: '4px solid var(--color-secondary)'
                        } : {}}
                        onTouchStart={() => !bulkSelectMode && handleLongPressStart(day.date)}
                        onTouchEnd={handleLongPressEnd}
                        onTouchMove={handleLongPressEnd}
                      >
                        {/* Date Column - Click to toggle whole day or select in bulk mode */}
                        <td
                          className={`
                            text-left cursor-pointer
                            ${isToday ? 'font-semibold' : ''}
                            ${bulkSelectMode ? 'relative' : ''}
                          `}
                          onClick={() => handleDateClick(day.date)}
                        >
                          <div className="flex items-center gap-2 px-2">
                            {bulkSelectMode ? (
                              <div
                                className={`
                                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                  ${selectedDates.includes(day.date)
                                    ? ''
                                    : 'border-content-disabled/30'
                                  }
                                `}
                                style={selectedDates.includes(day.date) ? {
                                  backgroundColor: 'var(--color-secondary)',
                                  borderColor: 'var(--color-secondary)'
                                } : {}}
                              >
                                {selectedDates.includes(day.date) && (
                                  <Check className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>
                            ) : (
                              <span className="text-lg">{getDayIndicator(day.date)}</span>
                            )}
                            <div>
                              <div className="text-sm text-content-primary">
                                {day.dayShort} {formatDateShort(day.date).split(' ')[1]}
                              </div>
                              {isToday && (
                                <div className="text-xs text-accent">Today</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Course Cells */}
                        {courses.map((course) => {
                          const hasClass = courseHasClassOnDate(course, day.date)

                          return (
                            <td
                              key={course.id}
                              className={getCellClassName(course.id, day.date, hasClass)}
                              onClick={(e) => hasClass && handleCellClick(e, course.id, day.date)}
                            >
                              {getCellIcon(course.id, day.date, hasClass)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Select Action Bar */}
      {bulkSelectMode && (
        <div className="border-t border-dark-border bg-dark-surface-raised/98 backdrop-blur-lg z-20 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-content-secondary">
              {selectedDates.length === 0
                ? 'Select dates to mark absent'
                : `${selectedDates.length} date${selectedDates.length > 1 ? 's' : ''} selected`
              }
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelBulkSelect}
                className="px-4 py-2 bg-dark-bg/50 hover:bg-dark-surface-raised text-content-primary border border-dark-border/30 rounded-lg transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkMarkAbsent}
                disabled={selectedDates.length === 0}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all
                  ${selectedDates.length > 0
                    ? 'bg-attendance-danger hover:bg-attendance-danger/90 text-white'
                    : 'bg-dark-surface-raised text-content-disabled cursor-not-allowed'
                  }
                `}
              >
                Mark Absent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Footer - Consistent for dark/light themes */}
      {!bulkSelectMode && (
        <div className="border-t border-dark-border bg-dark-surface backdrop-blur-sm">
          <div className="px-4 py-2.5 flex items-center justify-center min-h-[44px]">
            <div className="flex items-center gap-3 md:gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-attendance-safe flex-shrink-0" />
                <span className="text-content-secondary font-medium">Present</span>
              </div>
              <span className="text-content-disabled/50">•</span>
              <div className="flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-attendance-danger flex-shrink-0" />
                <span className="text-content-secondary font-medium">Absent</span>
              </div>
              <span className="text-content-disabled/50">•</span>
              <div className="flex items-center gap-1.5">
                <Circle className="w-3.5 h-3.5 text-attendance-warning flex-shrink-0" />
                <span className="text-content-secondary font-medium">Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center md:p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-dark-surface/95 backdrop-blur-xl border border-attendance-danger/30 shadow-glass-lg w-full animate-slide-up rounded-t-3xl md:rounded-2xl md:max-w-md md:animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-content-disabled/30 rounded-full"></div>
            </div>

            <div className="flex items-start gap-4 p-6">
              <div className="p-3 bg-attendance-danger/10 rounded-xl border border-attendance-danger/20 flex-shrink-0">
                <Trash2 className="w-6 h-6 text-attendance-danger" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-content-primary mb-2">
                  Delete Course?
                </h3>
                <p className="text-sm text-content-secondary mb-1">
                  Are you sure you want to delete <span className="font-medium text-content-primary">"{deleteConfirm.name}"</span>?
                </p>
                <p className="text-xs text-content-tertiary">
                  This will permanently remove the course and all its attendance records.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 px-6 pb-6">
              <button
                onClick={() => handleDeleteCourse(deleteConfirm)}
                className="flex-1 bg-attendance-danger hover:bg-attendance-danger/90 text-white font-medium px-4 py-2.5 rounded-xl transition-all duration-200"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  vibrate([10])
                  setDeleteConfirm(null)
                }}
                className="flex-1 bg-dark-bg/50 hover:bg-dark-surface-raised text-content-primary border border-dark-border/30 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

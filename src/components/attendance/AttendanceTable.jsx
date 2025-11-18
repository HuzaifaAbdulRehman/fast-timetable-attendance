import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { generateWeeks, formatDateShort, courseHasClassOnDate } from '../../utils/dateHelpers'
import { getDayStatus, getSessionStatus } from '../../utils/attendanceCalculator'
import { SESSION_STATUS } from '../../utils/constants'
import { Check, X, Minus, Circle, Trash2, CheckSquare, Square, ArrowLeftRight } from 'lucide-react'
import QuickMarkToday from './QuickMarkToday'
import CourseHeader from './CourseHeader'
import { vibrate } from '../../utils/uiHelpers'

export default function AttendanceTable({ startDate, weeksToShow, onEditCourse, onDeleteCourse, onBulkMarkComplete, showActions = false, bulkSelectMode: externalBulkSelectMode, selectedDates: externalSelectedDates, setSelectedDates: externalSetSelectedDates, reorderMode: externalReorderMode, onScroll }) {
  const { courses, attendance, toggleDay, toggleSession, deleteCourse, markDaysAbsent, reorderCourse } = useApp()
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { course }
  const [longPressTimer, setLongPressTimer] = useState(null)

  // Use external state if provided, otherwise use internal state
  const [internalBulkSelectMode, setInternalBulkSelectMode] = useState(false)
  const [internalSelectedDates, setInternalSelectedDates] = useState([])
  const [internalReorderMode, setInternalReorderMode] = useState(false)

  const bulkSelectMode = externalBulkSelectMode !== undefined ? externalBulkSelectMode : internalBulkSelectMode
  const setBulkSelectMode = externalBulkSelectMode !== undefined ? (() => {}) : setInternalBulkSelectMode
  const selectedDates = externalSelectedDates !== undefined ? externalSelectedDates : internalSelectedDates
  const setSelectedDates = externalSetSelectedDates !== undefined ? externalSetSelectedDates : setInternalSelectedDates
  const reorderMode = externalReorderMode !== undefined ? externalReorderMode : internalReorderMode
  const setReorderMode = externalReorderMode !== undefined ? (() => {}) : setInternalReorderMode


  // Get latest course end date - memoized
  const latestEndDate = useMemo(() => {
    if (!courses || courses.length === 0) return null
    const endDates = courses
      .filter(c => c && c.endDate) // Filter out invalid courses
      .map(c => new Date(c.endDate))

    if (endDates.length === 0) return null

    return new Date(Math.max(...endDates))
  }, [courses])

  // Generate weeks with dates - memoized
  const weeks = useMemo(() => {
    // Generate weeks
    let generatedWeeks = generateWeeks(startDate, weeksToShow)

    // Filter out dates beyond course end dates
    if (latestEndDate) {
      generatedWeeks = generatedWeeks.map(week => ({
        ...week,
        days: week.days.filter(day => new Date(day.date) <= latestEndDate)
      })).filter(week => week.days.length > 0) // Remove empty weeks
    }

    return generatedWeeks
  }, [startDate, weeksToShow, latestEndDate])

  // Handle day toggle (mark all classes on that date)
  const handleDayClick = (date) => {
    vibrate([15, 30, 15]) // Medium feedback for day toggle
    toggleDay(date)
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

  // Get cell className based on status - enhanced hover effects with scale
  const getCellClassName = (courseId, date, hasClass) => {
    if (!hasClass) return 'cursor-not-allowed opacity-40'

    const status = getSessionStatus(courseId, date, attendance)

    if (status === SESSION_STATUS.ABSENT) {
      return 'cursor-pointer hover:bg-attendance-danger/15 hover:scale-105 active:scale-95 transition-all duration-200 group'
    } else if (status === SESSION_STATUS.CANCELLED) {
      return 'cursor-pointer hover:bg-attendance-warning/15 hover:scale-105 active:scale-95 transition-all duration-200 group'
    } else {
      return 'cursor-pointer hover:bg-attendance-safe/10 hover:scale-105 active:scale-95 transition-all duration-200 group'
    }
  }

  // Get cell content icon with color coding
  const getCellIcon = (courseId, date, hasClass) => {
    if (!hasClass) return <Minus className="w-4 h-4 mx-auto text-content-disabled" />

    const status = getSessionStatus(courseId, date, attendance)

    if (status === SESSION_STATUS.ABSENT) {
      return <X className="w-4 h-4 mx-auto text-attendance-danger group-hover:scale-110 transition-transform" />
    } else if (status === SESSION_STATUS.CANCELLED) {
      return <Circle className="w-4 h-4 mx-auto text-attendance-warning group-hover:scale-110 transition-transform" />
    } else {
      return <Check className="w-4 h-4 mx-auto text-attendance-safe group-hover:scale-110 transition-transform" />
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
    <div className="card p-0 relative" role="region" aria-label="Attendance tracker table">
      {/* Scrollable Table Container */}
      <div
        className="overflow-auto max-h-[calc(100dvh-7.5rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-14rem)] scroll-smooth pb-12 sm:pb-14"
        role="table"
        aria-label="Course attendance grid"
        onScroll={(e) => {
          if (onScroll) {
            onScroll(e.target.scrollTop)
          }
        }}
      >
        <table className="attendance-table w-full min-w-full">
          <thead className="sticky top-0 z-[15] bg-dark-surface shadow-sm">
            <tr className="border-b-2 border-accent/30" role="row">
              <th className="text-left min-w-[52px] sm:min-w-[60px] md:min-w-[80px] px-1 sm:px-2 md:px-4 py-0.5 sm:py-1 md:py-1.5 sticky left-0 z-[20] bg-dark-surface" scope="col">
                <span className="text-[9px] sm:text-[10px] md:text-sm text-content-primary" style={{ fontWeight: 600 }}>Date</span>
              </th>
              {courses.map((course, index) => (
                <CourseHeader
                  key={course.id}
                  course={course}
                  index={index}
                  totalCourses={courses.length}
                  attendance={attendance}
                  reorderMode={reorderMode}
                  reorderCourse={reorderCourse}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {weeks.map((week) => (
              <React.Fragment key={week.weekNumber}>
                {/* Week Header Row */}
                <tr className="bg-dark-bg week-header-row">
                  <td className="py-1 sm:py-1.5 md:py-2 px-1 sm:px-2 md:px-4 sticky-week-label sticky left-0 z-[8] bg-dark-bg">
                    <span className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider text-content-tertiary font-medium">
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
                          hover:bg-dark-surface-raised transition-all duration-200
                          ${isToday ? 'border-l-4 border-accent bg-accent/[0.08] shadow-[inset_0_0_12px_rgba(99,102,241,0.15)]' : ''}
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
                            text-left cursor-pointer sticky left-0 z-[10] bg-dark-surface
                            ${isToday ? 'font-semibold' : ''}
                            ${bulkSelectMode ? 'relative' : ''}
                          `}
                          onClick={() => handleDateClick(day.date)}
                        >
                          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-1 sm:px-1.5 md:px-2">
                            {bulkSelectMode ? (
                              <div
                                className={`
                                  w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
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
                                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                )}
                              </div>
                            ) : (
                              <span className="text-sm sm:text-base md:text-lg flex-shrink-0">{getDayIndicator(day.date)}</span>
                            )}
                            <div className="min-w-0">
                              <div
                                className={`text-[10px] sm:text-xs md:text-sm truncate ${isToday ? 'text-accent' : 'text-content-primary'}`}
                                style={{ fontWeight: isToday ? 700 : 600 }}
                              >
                                {day.dayShort} {formatDateShort(day.date).split(' ')[1]}
                              </div>
                              {isToday && (
                                <div className="text-[8px] sm:text-[10px] md:text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded-md inline-block" style={{ fontWeight: 600 }}>Today</div>
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
      {/* End Scrollable Container */}

      {/* Bulk Select Action Bar - Fixed at bottom */}
      {bulkSelectMode && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-dark-border bg-dark-surface-raised/98 backdrop-blur-lg z-30 px-4 py-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
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

      {/* Professional Footer - Fixed at bottom */}
      {!bulkSelectMode && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-dark-border bg-dark-surface/98 backdrop-blur-lg z-30 shadow-2xl">
          <div className="px-4 py-2.5 flex items-center justify-center min-h-[44px] max-w-7xl mx-auto">
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

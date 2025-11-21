import { useState, memo, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Check, Clock, MapPin, User, BookOpen, AlertTriangle, ChevronDown, ChevronUp, CheckCheck, CheckSquare, Square, X, Lock } from 'lucide-react'
import { vibrate } from '../../utils/uiHelpers'
import { getHighlightedText } from '../../hooks/useClassSearch'
import { formatTimeTo12Hour } from '../../utils/dateHelpers'
import { generateShortName } from '../../utils/courseNameHelper'

/**
 * Day color mapping for left border accent
 */
const DAY_COLORS = {
  Monday: '#3B82F6',    // Blue
  Tuesday: '#8B5CF6',   // Purple
  Wednesday: '#10B981', // Green
  Thursday: '#F59E0B',  // Orange
  Friday: '#EF4444',    // Red
  Saturday: '#6366F1',  // Indigo
  Sunday: '#EC4899'     // Pink
}

/**
 * HighlightedText Component - Shows text with highlighted search matches
 */
const HighlightedText = memo(function HighlightedText({ text, searchTerm }) {
  const parts = getHighlightedText(text, searchTerm)

  return (
    <span>
      {parts.map((part, index) => (
        part.highlight ? (
          <mark key={index} className="bg-accent/30 text-accent font-medium px-0.5 rounded">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      ))}
    </span>
  )
})

/**
 * ClassCard Component - Production-grade card design
 * Features: Visual hierarchy, day-based color coding, animated interactions, responsive
 * Memoized for performance optimization with large lists
 */
const ClassCard = memo(function ClassCard({
  classData,
  onAdd,
  isAdded,
  isExactMatch,
  enrolledCourse,
  isAdding,
  hasConflict,
  conflictMessage,
  searchTerm,
  multiSelectMode = false,
  isSelected = false,
  selectedDifferentSection = null,
  isExpanded = false,
  onToggleExpand
}) {
  const [showFullCourseName, setShowFullCourseName] = useState(false)
  const [showFullInstructor, setShowFullInstructor] = useState(false)

  const handleToggle = () => {
    vibrate(10)
    if (onToggleExpand) {
      onToggleExpand()
    }
  }

  const handleAdd = (e) => {
    e.stopPropagation()

    // Prevent interaction with already enrolled courses in ALL modes
    if (isAdded || isAdding) {
      // Haptic feedback to indicate can't select
      vibrate([15, 30, 15])
      return
    }

    vibrate(15)
    onAdd(classData)
  }

  // Memoize primary day for border color
  const primaryDay = useMemo(() =>
    classData.days?.[0] || classData.day || 'Monday',
    [classData.days, classData.day]
  )
  const dayColor = DAY_COLORS[primaryDay] || DAY_COLORS.Monday

  // Format sessions by day (memoized to prevent recalculation)
  const { sessionsByDay, days } = useMemo(() => {
    const sessionsMap = classData.sessions?.reduce((acc, session) => {
      if (!acc[session.day]) {
        acc[session.day] = []
      }
      acc[session.day].push(session)
      return acc
    }, {}) || {}

    const sortedDays = Object.keys(sessionsMap).sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      return dayOrder.indexOf(a) - dayOrder.indexOf(b)
    })

    return { sessionsByDay: sessionsMap, days: sortedDays }
  }, [classData.sessions])

  return (
    <>
      <div
        className={`
          relative group
          bg-dark-surface rounded-xl
          border-l-[3px] border-r border-t border-b
          min-h-[140px] sm:min-h-[160px]
          transition-all duration-300 ease-out
          ${isAdded
            ? 'border-r-attendance-safe/30 border-t-attendance-safe/30 border-b-attendance-safe/30 bg-attendance-safe/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : hasConflict
            ? 'border-r-attendance-warning/30 border-t-attendance-warning/30 border-b-attendance-warning/30'
            : 'border-r-dark-border border-t-dark-border border-b-dark-border hover:border-r-accent/40 hover:border-t-accent/40 hover:border-b-accent/40'
          }
          ${!isAdded && !hasConflict && 'hover:shadow-lg hover:shadow-accent/10'}
          sm:hover:-translate-y-0.5 active:translate-y-0
        `}
        style={{ borderLeftColor: dayColor }}
      >
      {/* Compact View - Always Visible */}
      <div className="p-3 sm:p-4 flex flex-col rounded-t-xl">
        {/* Fixed header with button */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          {/* Course Info - Primary */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Course Code + Section Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-content-primary hover:text-accent transition-colors">
                <HighlightedText text={classData.courseCode || 'N/A'} searchTerm={searchTerm} />
              </h3>
              {/* Show auto-generated short name for long course codes (>12 chars) */}
              {classData.courseCode && classData.courseCode.length > 12 && (
                <span className="text-[9px] sm:text-[10px] font-medium text-content-tertiary" title="Auto-generated short name for timetable">
                  ({generateShortName(classData.courseName, classData.courseCode, 10)})
                </span>
              )}
              <span className="text-[10px] sm:text-xs font-semibold text-accent px-1.5 sm:px-2 py-0.5 rounded-full bg-accent/10">
                <HighlightedText text={classData.section || 'N/A'} searchTerm={searchTerm} />
              </span>
            </div>
            {/* Row 2: Course Name - Always on separate line */}
            <p className="text-xs sm:text-sm text-content-secondary mt-1 leading-snug line-clamp-2 w-full">
              <HighlightedText text={classData.courseName || 'Unnamed Course'} searchTerm={searchTerm} />
            </p>
            {/* Row 2: Enrollment status indicator (separate row for cleaner layout) */}
            {isAdded && (
              <div className="mt-1 sm:mt-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded cursor-help transition-all ${
                    isExactMatch
                      ? 'text-green-700 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20'
                      : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                  }`}
                  title={
                    isExactMatch
                      ? `Already enrolled in ${classData.courseCode} Section ${enrolledCourse?.section || classData.section}${enrolledCourse?.instructor ? `\nInstructor: ${enrolledCourse.instructor}` : ''}`
                      : `Cannot enroll - Already enrolled in Section ${enrolledCourse?.section}${enrolledCourse?.instructor ? `\nInstructor: ${enrolledCourse.instructor}` : ''}\n\nTo change sections, go to Courses tab and click the Change Section button.`
                  }
                >
                  {isExactMatch ? 'Added' : (
                    <>
                      <span className="whitespace-nowrap">In {enrolledCourse?.section}</span>
                      {enrolledCourse?.instructor && (
                        <>
                          <span className="text-amber-500/50 dark:text-amber-400/50 hidden sm:inline">·</span>
                          <span className="truncate max-w-[60px] sm:max-w-[100px] hidden sm:inline">{enrolledCourse.instructor}</span>
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Add/Select Button - Fixed right side */}
          <button
            onClick={handleAdd}
            disabled={isAdded || isAdding}
            className={`
              relative flex-shrink-0
              w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14
              flex items-center justify-center
              rounded-lg sm:rounded-xl
              font-semibold text-sm
              transition-all duration-300
              ${multiSelectMode
                ? (isAdded
                  ? (isExactMatch
                    ? 'bg-attendance-safe/30 text-attendance-safe cursor-not-allowed border-2 border-attendance-safe/50'
                    : 'bg-blue-500/10 text-blue-400 cursor-not-allowed border-2 border-blue-400/30')
                  : selectedDifferentSection
                  ? 'bg-dark-surface border-2 border-orange-400/30 text-orange-400/50 cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'bg-accent text-dark-bg border-2 border-accent shadow-lg shadow-accent/30'
                  : 'bg-dark-surface border-2 border-dark-border hover:border-accent/50 hover:scale-105 active:scale-95')
                : (isExactMatch
                  ? 'bg-attendance-safe/30 text-attendance-safe cursor-default border-2 border-attendance-safe/50 shadow-lg shadow-attendance-safe/20'
                  : isAdded
                  ? 'bg-blue-500/10 text-blue-400 cursor-not-allowed border border-blue-400/30'
                  : isAdding
                  ? 'bg-accent/30 text-accent cursor-wait'
                  : hasConflict
                  ? 'bg-attendance-warning/20 text-attendance-warning hover:bg-attendance-warning/30 hover:scale-105 active:scale-95'
                  : 'bg-accent/20 text-accent hover:bg-accent hover:text-dark-bg hover:scale-105 hover:shadow-lg hover:shadow-accent/30 active:scale-95')
              }
              disabled:cursor-not-allowed disabled:hover:scale-100
            `}
            title={
              multiSelectMode && selectedDifferentSection
                ? `Cannot select - ${classData.courseCode} Section ${selectedDifferentSection.section} already selected`
                : multiSelectMode && isAdded
                ? (isExactMatch
                  ? `✓ Already enrolled in this section`
                  : `Already enrolled in ${classData.courseCode} Section ${enrolledCourse?.section}`)
                : isExactMatch
                ? `✓ Enrolled in ${classData.courseCode} Section ${enrolledCourse?.section || classData.section}`
                : isAdded && enrolledCourse
                ? `Already enrolled in ${classData.courseCode} Section ${enrolledCourse.section}`
                : isAdded
                ? 'Already enrolled in this course (different section)'
                : isAdding
                ? 'Adding...'
                : hasConflict
                ? 'Has conflict'
                : multiSelectMode
                ? 'Select to add'
                : 'Add to My Courses'
            }
            aria-label={isAdded ? 'Already added to courses' : multiSelectMode ? 'Select course' : 'Add to my courses'}
          >
            <div className={`transition-transform duration-300 ${isAdding ? 'animate-spin' : (isAdded || isExactMatch || isSelected) ? 'scale-110' : ''}`}>
              {multiSelectMode ? (
                isAdded ? (
                  isExactMatch ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" strokeWidth={2.5} />
                  ) : (
                    <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" strokeWidth={2} />
                  )
                ) : isSelected ? (
                  <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" strokeWidth={2} />
                ) : (
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" strokeWidth={1.5} />
                )
              ) : (
                isExactMatch ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" strokeWidth={2.5} />
                ) : isAdded ? (
                  <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" strokeWidth={2} />
                ) : isAdding ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" strokeWidth={2} />
                )
              )}
            </div>
          </button>
        </div>

        {/* Flexible content area */}
        <div
          onClick={handleToggle}
          className="flex-1 flex flex-col text-left cursor-pointer focus:outline-none group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleToggle()
            }
          }}
        >
          {/* Quick Info Row - Tertiary */}
          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-xs md:text-sm text-content-tertiary">
            {/* Instructor - show full name naturally, tap to expand if truncated */}
            {classData.instructor && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  vibrate(5)
                  setShowFullInstructor(!showFullInstructor)
                }}
                className="flex items-center gap-1 hover:text-content-secondary transition-colors cursor-pointer"
                title={classData.instructor}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    vibrate(5)
                    setShowFullInstructor(!showFullInstructor)
                  }
                }}
              >
                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                <span className={showFullInstructor ? 'break-words' : ''}>
                  <HighlightedText text={classData.instructor} searchTerm={searchTerm} />
                </span>
              </div>
            )}

            {/* Days */}
            {days.length > 0 && (
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                <span>{days.map(d => d.substring(0, 3)).join(', ')}</span>
              </div>
            )}

            {/* Credit Hours */}
            {classData.creditHours && (
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                <span>{classData.creditHours} CH</span>
              </div>
            )}
          </div>

          {/* Conflict Warning */}
          {hasConflict && !isAdded && (
            <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-attendance-warning/10 border border-attendance-warning/30">
              <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-attendance-warning" />
              <span className="text-[10px] sm:text-xs text-attendance-warning font-medium">Conflict</span>
            </div>
          )}

          {/* Section Conflict Warning (Multiselect) */}
          {multiSelectMode && selectedDifferentSection && !isSelected && (
            <div className="flex items-center gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-orange-500/10 border border-orange-400/30">
              <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-orange-400" />
              <span className="text-[10px] sm:text-xs text-orange-400 font-medium">
                {selectedDifferentSection.section} selected
              </span>
            </div>
          )}

          {/* Expand Indicator - Pushed to bottom */}
          <div className="flex items-center gap-0.5 sm:gap-1 mt-auto pt-1.5 sm:pt-2 -ml-0.5 sm:-ml-1 -mb-0.5 sm:-mb-1 px-0.5 sm:px-1 py-0.5 sm:py-1 text-[10px] sm:text-xs text-content-tertiary group-hover:text-accent transition-colors">
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>View schedule</span>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Inline Expansion - Mobile Only (< 640px) */}
      {isExpanded && (
        <div className="sm:hidden border-t-2 border-accent bg-dark-bg/80 rounded-b-xl">
          <div className="px-3 py-3 space-y-3">
            {/* Schedule */}
            {days.length > 0 ? (
              <div className="space-y-2">
                {days.map(day => (
                  <div key={day}>
                    {sessionsByDay[day].map((session, idx) => {
                      let formattedTime = 'TBA'
                      if (session.timeSlot) {
                        const [start, end] = session.timeSlot.split('-')
                        formattedTime = `${formatTimeTo12Hour(start)} - ${formatTimeTo12Hour(end)}`
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-dark-surface/50 rounded-lg p-2.5 border border-dark-border/30"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: DAY_COLORS[day] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                              <span className="font-semibold text-content-primary text-sm">{day}</span>
                              <span className="text-xs text-content-tertiary font-mono whitespace-nowrap">{formattedTime}</span>
                            </div>
                            {session.room && (
                              <div className="flex items-center gap-1 text-xs text-content-secondary">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{session.room}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-content-tertiary">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No schedule information</p>
              </div>
            )}

            {/* Conflict Warning */}
            {hasConflict && conflictMessage && !isAdded && (
              <div className="p-2.5 bg-attendance-warning/10 border border-attendance-warning/30 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-attendance-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-attendance-warning mb-0.5">Scheduling Conflict</p>
                    <p className="text-xs text-content-secondary leading-relaxed">{conflictMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Button */}
            {!isExactMatch && !isAdded && (
              <button
                onClick={handleAdd}
                disabled={isAdding}
                className={`
                  w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all
                  ${hasConflict
                    ? 'bg-attendance-warning text-dark-bg hover:bg-attendance-warning/90'
                    : 'bg-gradient-to-r from-accent to-accent-hover text-dark-bg'
                  }
                  hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                `}
              >
                {isAdding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {hasConflict ? 'Add Anyway' : 'Add to My Courses'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Overlay - Tablet/Desktop Only (≥ 640px) - Rendered via Portal */}
      {isExpanded && createPortal(
        <div
          className="hidden sm:block fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={handleToggle}
        >
          {/* Modal Container */}
          <div className="absolute inset-0 flex items-center justify-center p-4" onClick={handleToggle}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-dark-surface rounded-2xl shadow-2xl border border-dark-border/50 animate-scale-in relative"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-dark-surface border-b border-dark-border/50 px-4 py-4 flex items-start justify-between gap-4 z-10">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-content-primary">
                      {classData.courseCode || 'N/A'}
                      {/* Show abbreviated name for long course codes */}
                      {classData.courseCode && classData.courseCode.length > 12 && (
                        <span className="text-sm font-medium text-content-tertiary ml-2">
                          ({generateShortName(classData.courseName, classData.courseCode, 8)})
                        </span>
                      )}
                    </h3>
                    <span className="text-sm font-semibold text-accent px-3 py-1 rounded-full bg-accent/10">
                      {classData.section || 'N/A'}
                    </span>
                  </div>
                  <p className="text-base text-content-secondary">
                    {classData.courseName || 'Unnamed Course'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggle()
                  }}
                  className="flex-shrink-0 p-3 hover:bg-dark-surface-raised rounded-lg transition-colors text-content-tertiary hover:text-content-primary cursor-pointer"
                  aria-label="Close schedule details"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-4 py-4 space-y-4">
                {/* Course Meta Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-content-tertiary pb-4 border-b border-dark-border/30">
                  {classData.instructor && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span>{classData.instructor}</span>
                    </div>
                  )}
                  {classData.creditHours && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 flex-shrink-0" />
                      <span>{classData.creditHours} Credit Hours</span>
                    </div>
                  )}
                </div>

                {/* Session Schedule */}
                <div>
                  <h4 className="text-xs font-semibold text-content-tertiary uppercase tracking-wide mb-4">
                    Weekly Schedule
                  </h4>
                  {days.length > 0 ? (
                    <div className="space-y-2.5">
                      {days.map(day => (
                        <div key={day} className="space-y-2.5">
                          {sessionsByDay[day].map((session, idx) => {
                            let formattedTime = 'TBA'
                            if (session.timeSlot) {
                              const [start, end] = session.timeSlot.split('-')
                              formattedTime = `${formatTimeTo12Hour(start)} - ${formatTimeTo12Hour(end)}`
                            }

                            return (
                              <div
                                key={idx}
                                className="group relative flex items-center gap-4 bg-dark-bg/50 hover:bg-dark-bg/70 rounded-xl p-4 border border-dark-border/30 hover:border-dark-border/50 transition-all duration-200"
                              >
                                {/* Day Accent Bar */}
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                                  style={{ backgroundColor: DAY_COLORS[day] }}
                                  aria-hidden="true"
                                />

                                {/* Content */}
                                <div className="flex-1 min-w-0 pl-3">
                                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                                    <span className="text-lg font-bold text-content-primary">{day}</span>
                                    <span className="text-sm font-semibold text-content-secondary tabular-nums whitespace-nowrap">{formattedTime}</span>
                                  </div>
                                  {session.room && (
                                    <div className="flex items-center gap-2 text-sm text-content-tertiary">
                                      <MapPin className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate">{session.room}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-content-tertiary">
                      <div className="w-16 h-16 mx-auto mb-4 bg-dark-bg/50 rounded-full flex items-center justify-center">
                        <Clock className="w-8 h-8 opacity-40" />
                      </div>
                      <p className="text-sm font-medium">No schedule information available</p>
                      <p className="text-xs mt-1 opacity-60">Add schedule details to see class timings</p>
                    </div>
                  )}
                </div>

                {/* Conflict Warning */}
                {hasConflict && conflictMessage && !isAdded && (
                  <div className="p-4 bg-attendance-warning/10 border border-attendance-warning/30 rounded-xl">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-attendance-warning flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-attendance-warning mb-1">
                          Scheduling Conflict Detected
                        </p>
                        <p className="text-sm text-content-secondary leading-relaxed">
                          {conflictMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer - Action Buttons */}
              {!isExactMatch && !isAdded && (
                <div className="sticky bottom-0 bg-dark-surface border-t border-dark-border/50 px-4 py-4">
                  <button
                    onClick={handleAdd}
                    disabled={isAdding}
                    className={`
                      w-full flex items-center justify-center gap-2
                      px-6 py-3 rounded-xl
                      font-semibold text-base
                      transition-all duration-200
                      ${hasConflict
                        ? 'bg-attendance-warning text-dark-bg hover:bg-attendance-warning/90'
                        : 'bg-gradient-to-r from-accent to-accent-hover text-dark-bg'
                      }
                      hover:scale-[1.02] active:scale-95
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    `}
                  >
                    {isAdding ? (
                      <>
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        {hasConflict ? 'Add Anyway' : 'Add to My Courses'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </>
  )
})

export default ClassCard

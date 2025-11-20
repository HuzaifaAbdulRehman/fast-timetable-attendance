import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { calculateAttendanceStats } from '../../utils/attendanceCalculator'
import { COURSE_COLORS } from '../../utils/constants'

// Haptic feedback utility
const vibrate = (pattern = [10]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Get color classes for a course
const getCourseColor = (course) => {
  if (!course || !course.color) return COURSE_COLORS[0]
  const color = COURSE_COLORS.find(c => c.name === course.color) || COURSE_COLORS[0]
  return color
}

export default function CourseHeader({
  course,
  index,
  totalCourses,
  attendance,
  reorderMode,
  reorderCourse
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Safely calculate stats with error handling
  let stats, absencesUsed, absencesAllowed, percentage, courseColor
  try {
    stats = calculateAttendanceStats(course, attendance)
    absencesUsed = stats.absences
    absencesAllowed = course.allowedAbsences || 0
    percentage = absencesAllowed > 0 ? (absencesUsed / absencesAllowed) * 100 : 0
    courseColor = getCourseColor(course)
  } catch (error) {
    console.error('Error rendering course:', error, course)
    // Set default values to prevent crash
    stats = { absences: 0, percentage: 100 }
    absencesUsed = 0
    absencesAllowed = 0
    percentage = 0
    courseColor = COURSE_COLORS[0]
  }

  return (
    <th
      key={course.id}
      className="min-w-[56px] max-w-[56px] sm:min-w-[64px] sm:max-w-[64px] md:min-w-[74px] md:max-w-[74px] text-center px-0.5 sm:px-1 md:px-1.5 relative"
    >
      <div
        className="py-0.5 sm:py-1 px-0.5 relative z-10 bg-dark-surface"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Hover Tooltip - Desktop only */}
        {showTooltip && (
          <div className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="bg-dark-surface-raised border border-dark-border shadow-glass-lg rounded-lg p-2 min-w-[180px] animate-fade-in">
              <div className="text-xs font-semibold text-content-primary mb-1">{course.name}</div>
              {course.instructor && (
                <div className="text-[10px] text-content-secondary">Instructor: {course.instructor}</div>
              )}
              {course.room && (
                <div className="text-[10px] text-content-secondary">Room: {course.room}</div>
              )}
              {course.enrollmentStartDate && (
                <div className="text-[10px] text-blue-400 mt-1 border-t border-dark-border/30 pt-1">
                  Enrolled from {new Date(course.enrollmentStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              )}
              <div className="text-[10px] text-content-tertiary mt-1">
                {stats.percentage.toFixed(1)}% attendance
              </div>
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="border-4 border-transparent border-t-dark-border" />
              </div>
            </div>
          </div>
        )}

        {/* Badge Style with Status - Compact Mobile Design */}

        {/* Course name with colored dot - TOP */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-0 mb-0.5">
          <div
            className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: course.colorHex || courseColor?.hex || '#6366f1' }}
          />
          <div
            className="text-[9px] sm:text-[10px] md:text-sm font-bold text-content-primary max-w-[38px] sm:max-w-[44px] md:max-w-[58px] min-w-0"
            style={{ fontWeight: 700 }}
            title={course.name || 'Course'}
          >
            {(() => {
              const displayName = course.shortName || course.name || 'N/A'
              // Check if the name contains "LAB" (case-insensitive)
              const labMatch = displayName.match(/^(.+?)\s+(LAB)$/i)

              if (labMatch) {
                // Split into two lines: main part and "LAB"
                return (
                  <div className="flex flex-col items-center leading-tight">
                    <span className="truncate max-w-full">{labMatch[1]}</span>
                    <span className="text-[8px] sm:text-[9px] md:text-xs">{labMatch[2].toUpperCase()}</span>
                  </div>
                )
              }

              // For non-lab courses, use standard truncate
              return <span className="truncate">{displayName}</span>
            })()}
          </div>
        </div>

        {/* Horizontal divider - thinner on mobile */}
        <div className="w-full h-px bg-dark-border/30 mb-0.5"></div>

        {/* Stats with status background - MIDDLE - More compact on mobile */}
        <div className={`
          px-0.5 sm:px-1 md:px-1.5 py-0.5 rounded-md mb-0.5 text-[8px] sm:text-[9px] md:text-xs tabular-nums
          ${percentage < 60
            ? 'bg-attendance-safe/15 text-attendance-safe border border-attendance-safe/20'
            : percentage < 85
              ? 'bg-attendance-warning/15 text-attendance-warning border border-attendance-warning/20'
              : 'bg-attendance-danger/15 text-attendance-danger border border-attendance-danger/20'
          }
        `}
        style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
        >
          {absencesUsed}/{absencesAllowed}
        </div>

        {/* Reorder buttons - Only show when in reorder mode */}
        {reorderMode && (
          <div className="flex items-center justify-center gap-0.5 sm:gap-1">
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
              disabled={index === totalCourses - 1}
              className={`p-1 md:p-1.5 rounded transition-colors border border-dark-border/30 ${
                index === totalCourses - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-dark-surface-raised hover:border-accent/40'
              }`}
              title="Move right"
            >
              <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-content-tertiary hover:text-accent" />
            </button>
          </div>
        )}
      </div>
    </th>
  )
}

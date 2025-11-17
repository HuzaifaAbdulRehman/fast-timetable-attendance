import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Edit2, Trash2, ArrowLeft, ArrowRight } from 'lucide-react'
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
  swipedCourse,
  setSwipedCourse,
  setDeleteConfirm,
  onEditCourse,
  reorderCourse
}) {
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

  // Swipe handlers - NOW SAFE because it's in a component, not a loop
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
            style={{ backgroundColor: course.colorHex || courseColor?.hex || '#6366f1' }}
          />
          <div
            className="text-[11px] md:text-sm font-bold truncate text-content-primary max-w-[48px] md:max-w-[58px]"
            title={course.name || 'Course'}
          >
            {course.shortName || course.name || 'N/A'}
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
}

import { useApp } from '../../context/AppContext'
import { calculateAttendanceStats } from '../../utils/attendanceCalculator'
import { COURSE_COLORS } from '../../utils/constants'
import { Trash2, Edit } from 'lucide-react'

export default function CourseCard({ course }) {
  const { attendance, deleteCourse } = useApp()
  const stats = calculateAttendanceStats(course, attendance)

  // Get course color
  const courseColor = COURSE_COLORS.find(c => c.name === course.color) || COURSE_COLORS[0]

  const handleDelete = () => {
    if (confirm(`Delete "${course.name}"? This will remove all attendance records.`)) {
      deleteCourse(course.id)
    }
  }

  return (
    <div className="card border-t-4" style={{ borderTopColor: courseColor.hex }}>
      {/* Course Name */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: courseColor.hex }}>
          {course.name}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="p-1 text-content-tertiary hover:text-attendance-danger transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Attendance Percentage */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-3xl font-semibold ${
            stats.status === 'safe' ? 'text-attendance-safe' :
            stats.status === 'warning' ? 'text-attendance-warning' :
            'text-attendance-danger'
          }`}>
            {stats.percentage.toFixed(1)}%
          </span>
          <span className="text-sm text-content-tertiary">attendance</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              stats.status === 'safe' ? 'bg-attendance-safe' :
              stats.status === 'warning' ? 'bg-attendance-warning' :
              'bg-attendance-danger'
            }`}
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-content-secondary">
          <span>Absences</span>
          <span className="font-medium text-content-primary">
            {stats.absences} / {course.allowedAbsences}
          </span>
        </div>

        <div className="flex justify-between text-content-secondary">
          <span>Safe absences left</span>
          <span className={`font-medium ${
            stats.remainingAbsences > 2 ? 'text-attendance-safe' :
            stats.remainingAbsences > 0 ? 'text-attendance-warning' :
            'text-attendance-danger'
          }`}>
            {stats.remainingAbsences}
          </span>
        </div>

        <div className="flex justify-between text-content-secondary">
          <span>Total classes</span>
          <span className="font-medium text-content-primary">
            {stats.adjustedTotal}
          </span>
        </div>
      </div>

      {/* Status Badge */}
      {stats.isAtRisk && (
        <div className="mt-4 p-2 bg-attendance-danger/10 border border-attendance-danger/20 rounded-lg">
          <p className="text-xs text-attendance-danger font-medium text-center">
            Below 80% - Be careful!
          </p>
        </div>
      )}
    </div>
  )
}

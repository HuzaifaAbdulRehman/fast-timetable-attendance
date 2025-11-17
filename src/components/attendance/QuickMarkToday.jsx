import { useState } from 'react'
import { Calendar, X, Check, XIcon } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getTodayISO, courseHasClassOnDate, formatDateLong } from '../../utils/dateHelpers'
import { getDayStatus } from '../../utils/attendanceCalculator'
import { SESSION_STATUS } from '../../utils/constants'

export default function QuickMarkToday({ inline = false }) {
  const { courses, attendance, toggleSession } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const today = getTodayISO()

  // Filter courses that have classes today
  const todaysCourses = courses.filter(course => courseHasClassOnDate(course, today))

  // Mobile detection
  const isMobile = window.innerWidth < 768

  // Haptic feedback
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  // Get status for a specific course today
  const getCourseStatus = (courseId) => {
    const record = attendance.find(r => r.courseId === courseId && r.date === today)
    if (!record) return 'present'
    return record.status
  }

  // Handle marking attendance
  const handleMark = (courseId, status) => {
    vibrate(15)
    toggleSession(courseId, today, status === 'present' ? null : status)
  }

  // Count unmarked classes
  const unmarkedCount = todaysCourses.filter(course => {
    const status = getCourseStatus(course.id)
    return !status || status === 'present'
  }).length

  if (todaysCourses.length === 0) {
    return null // Don't show if no classes today
  }

  return (
    <>
      {/* Inline Button (for AttendanceTable) */}
      {inline && !isOpen && (
        <button
          onClick={() => {
            vibrate(15)
            setIsOpen(true)
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 bg-dark-bg border border-dark-border text-content-secondary hover:bg-dark-surface-raised hover:text-content-primary hover:border-accent/30 flex-shrink-0"
          aria-label="Quick mark today"
          title="Quick mark today's attendance"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Mark Today</span>
          {unmarkedCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold tabular-nums">
              {unmarkedCount}
            </span>
          )}
        </button>
      )}

      {/* Bottom Sheet Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center md:justify-center animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className={`bg-dark-surface-raised rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-dark-border w-full md:max-w-lg md:mx-4 max-h-[85vh] flex flex-col ${
              isMobile ? 'animate-slide-up' : 'animate-scale-in'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle (Mobile only) */}
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1.5 bg-dark-border rounded-full"></div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-dark-border flex-shrink-0">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-content-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Mark Today's Attendance
                </h2>
                <p className="text-xs md:text-sm text-content-tertiary mt-0.5">
                  {formatDateLong(today)}
                </p>
              </div>
              <button
                onClick={() => {
                  vibrate(10)
                  setIsOpen(false)
                }}
                className="p-1.5 rounded-lg hover:bg-dark-surface transition-colors text-content-secondary hover:text-content-primary"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Course List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
              {todaysCourses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-3 bg-accent/10 rounded-full inline-block mb-3">
                    <Calendar className="w-8 h-8 text-accent" />
                  </div>
                  <p className="text-content-secondary">No classes scheduled for today</p>
                  <p className="text-xs text-content-tertiary mt-1">Enjoy your day off!</p>
                </div>
              ) : (
                todaysCourses.map(course => {
                  const status = getCourseStatus(course.id)
                  const isPresent = status === 'present' || !status
                  const isAbsent = status === SESSION_STATUS.ABSENT

                  return (
                    <div
                      key={course.id}
                      className="bg-dark-surface border border-dark-border rounded-xl p-4 transition-all hover:border-accent/30"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: course.colorHex }}
                          ></div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-content-primary truncate">
                              {course.name}
                            </h3>
                            <p className="text-xs text-content-tertiary">
                              {course.creditHours} session{course.creditHours > 1 ? 's' : ''}/week
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                            isPresent
                              ? 'bg-attendance-safe/10 text-attendance-safe'
                              : 'bg-attendance-danger/10 text-attendance-danger'
                          }`}
                        >
                          {isPresent ? 'Present' : 'Absent'}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleMark(course.id, 'present')}
                          disabled={isPresent}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            isPresent
                              ? 'bg-attendance-safe/20 text-attendance-safe border-2 border-attendance-safe'
                              : 'bg-dark-surface-raised border border-dark-border text-content-primary hover:bg-attendance-safe/10 hover:border-attendance-safe/30'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          Present
                        </button>
                        <button
                          onClick={() => handleMark(course.id, SESSION_STATUS.ABSENT)}
                          disabled={isAbsent}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            isAbsent
                              ? 'bg-attendance-danger/20 text-attendance-danger border-2 border-attendance-danger'
                              : 'bg-dark-surface-raised border border-dark-border text-content-primary hover:bg-attendance-danger/10 hover:border-attendance-danger/30'
                          }`}
                        >
                          <XIcon className="w-4 h-4" />
                          Absent
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 md:p-5 border-t border-dark-border flex-shrink-0">
              <button
                onClick={() => {
                  vibrate(15)
                  setIsOpen(false)
                }}
                className="w-full bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold rounded-lg px-4 py-3 transition-all shadow-accent hover:shadow-accent-lg hover:scale-[1.02] active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

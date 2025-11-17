import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const DAYS_SHORT = {
  'Monday': 'MON',
  'Tuesday': 'TUE',
  'Wednesday': 'WED',
  'Thursday': 'THU',
  'Friday': 'FRI'
}

export default function TimetableView() {
  const { courses } = useApp()

  // Organize courses by day and time
  const scheduleByDay = useMemo(() => {
    const schedule = {}

    DAYS.forEach(day => {
      schedule[day] = []
    })

    courses.forEach(course => {
      if (course.schedule && Array.isArray(course.schedule)) {
        course.schedule.forEach(slot => {
          const day = slot.day
          if (schedule[day]) {
            schedule[day].push({
              courseName: course.name,
              courseCode: course.courseCode,
              instructor: course.instructor,
              room: course.room,
              building: course.building,
              timeSlot: course.timeSlot,
              startTime: slot.startTime,
              endTime: slot.endTime,
              day: slot.day
            })
          }
        })
      }
    })

    // Sort each day's classes by start time
    Object.keys(schedule).forEach(day => {
      schedule[day].sort((a, b) => {
        const timeA = convertTo24Hour(a.startTime)
        const timeB = convertTo24Hour(b.startTime)
        return timeA - timeB
      })
    })

    return schedule
  }, [courses])

  // Convert 12-hour time to 24-hour for sorting
  function convertTo24Hour(time) {
    if (!time) return 0
    const [timePart, period] = time.split(' ')
    let [hours, minutes] = timePart.split(':').map(Number)

    if (period === 'PM' && hours !== 12) {
      hours += 12
    } else if (period === 'AM' && hours === 12) {
      hours = 0
    }

    return hours * 60 + minutes
  }

  if (courses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-content-tertiary" />
          </div>
          <h3 className="text-xl font-semibold text-content-primary mb-2">
            No Timetable Yet
          </h3>
          <p className="text-content-secondary mb-6">
            Select courses first to see your complete weekly schedule here.
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-content-primary mb-2">
            Your Weekly Schedule
          </h2>
          <p className="text-content-secondary text-sm">
            Complete timetable with rooms, timings, and instructors
          </p>
        </div>

        {/* Days Schedule */}
        {DAYS.map(day => {
          const dayClasses = scheduleByDay[day]
          const hasClasses = dayClasses && dayClasses.length > 0

          return (
            <div key={day} className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden">
              {/* Day Header */}
              <div className="bg-gradient-to-r from-accent/10 to-accent/5 px-4 py-3 border-b border-dark-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-content-primary">
                        {day}
                      </h3>
                      <p className="text-xs text-content-tertiary">
                        {hasClasses ? `${dayClasses.length} ${dayClasses.length === 1 ? 'class' : 'classes'}` : 'No classes'}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-dark-bg rounded-lg">
                    <span className="text-xs font-bold text-accent">
                      {DAYS_SHORT[day]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Classes */}
              {hasClasses ? (
                <div className="p-3 space-y-2">
                  {dayClasses.map((classInfo, index) => (
                    <div
                      key={index}
                      className="bg-dark-bg rounded-xl p-4 border border-dark-border hover:border-accent/30 transition-all"
                    >
                      {/* Course Name & Code */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-content-primary mb-1">
                            {classInfo.courseName}
                          </h4>
                          {classInfo.courseCode && (
                            <p className="text-xs text-content-tertiary font-mono">
                              {classInfo.courseCode}
                            </p>
                          )}
                        </div>
                        {classInfo.timeSlot && (
                          <div className="px-2 py-1 bg-accent/10 rounded-lg ml-2 flex-shrink-0">
                            <p className="text-xs font-medium text-accent">
                              {classInfo.timeSlot}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Class Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Time */}
                        {classInfo.startTime && classInfo.endTime && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs text-content-tertiary">Time</p>
                              <p className="text-sm font-medium text-content-primary">
                                {classInfo.startTime} - {classInfo.endTime}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Location */}
                        {(classInfo.room || classInfo.building) && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-xs text-content-tertiary">Location</p>
                              <p className="text-sm font-medium text-content-primary">
                                {classInfo.room}
                                {classInfo.building && `, ${classInfo.building}`}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Instructor */}
                        {classInfo.instructor && (
                          <div className="flex items-center gap-2 text-sm sm:col-span-2">
                            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-green-400" />
                            </div>
                            <div>
                              <p className="text-xs text-content-tertiary">Instructor</p>
                              <p className="text-sm font-medium text-content-primary">
                                {classInfo.instructor}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-dark-bg rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-content-tertiary" />
                  </div>
                  <p className="text-sm text-content-tertiary">
                    No classes scheduled
                  </p>
                  <p className="text-xs text-content-tertiary/60 mt-1">
                    Enjoy your day off! 🏠
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* Footer Message */}
        <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-content-secondary text-center">
            Plan Smart. Take Leaves. Chill at Home. Still Hit 80%. 🏠
          </p>
        </div>
      </div>
    </div>
  )
}

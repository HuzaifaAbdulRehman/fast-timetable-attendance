import { useState, useEffect } from 'react'
import { Search, X, Check, MapPin, User, Clock, Calendar, BookOpen, Loader } from 'lucide-react'
import { dayToWeekday } from '../../utils/timetableParser'

// Haptic feedback
const vibrate = (pattern = [10]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Mobile detection
const isMobile = () => window.innerWidth < 768

export default function TimetableSelector({ onCoursesSelected, onClose }) {
  const [section, setSection] = useState('')
  const [timetable, setTimetable] = useState(null)
  const [filteredCourses, setFilteredCourses] = useState([])
  const [selectedCourses, setSelectedCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isMobileDevice] = useState(isMobile())

  // Fetch timetable from API
  useEffect(() => {
    fetchTimetable()
  }, [])

  const fetchTimetable = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try to fetch from API
      const response = await fetch('/api/timetable?mock=true')
      const data = await response.json()

      if (data.success) {
        setTimetable(data.data)
      } else {
        throw new Error(data.error || 'Failed to load timetable')
      }
    } catch (err) {
      console.error('Error fetching timetable:', err)
      setError('Failed to load timetable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (!section.trim() || !timetable) {
      setFilteredCourses([])
      return
    }

    const sectionUpper = section.toUpperCase().trim()
    const courses = timetable[sectionUpper] || []

    // Group courses by course code to avoid duplicates
    const uniqueCourses = {}
    courses.forEach(course => {
      if (!uniqueCourses[course.courseCode]) {
        uniqueCourses[course.courseCode] = {
          ...course,
          sessions: [course]
        }
      } else {
        uniqueCourses[course.courseCode].sessions.push(course)
      }
    })

    setFilteredCourses(Object.values(uniqueCourses))
    vibrate([10])
  }

  const toggleCourse = (course) => {
    const isSelected = selectedCourses.find(c => c.courseCode === course.courseCode)

    if (isSelected) {
      setSelectedCourses(selectedCourses.filter(c => c.courseCode !== course.courseCode))
    } else {
      setSelectedCourses([...selectedCourses, course])
    }

    vibrate([10])
  }

  const handleAddCourses = () => {
    if (selectedCourses.length === 0) return

    // Convert to app format
    const appCourses = selectedCourses.map(course => convertToAppFormat(course))
    onCoursesSelected(appCourses)
    vibrate([10, 50, 10])
  }

  const convertToAppFormat = (course) => {
    // Get all sessions for this course
    const sessions = course.sessions || [course]

    // Extract unique weekdays
    const weekdays = [...new Set(sessions.map(s => dayToWeekday(s.day)))].sort()

    // Get time slot (use first session)
    const timeSlot = sessions[0].timeSlot

    return {
      name: course.courseName,
      shortName: course.courseCode,
      creditHours: course.creditHours || sessions.length,
      weekdays,

      // Additional metadata
      section: course.section,
      roomNumber: course.room,
      instructor: course.instructor,
      timeSlot,
      building: course.room?.includes('-') ? course.room.split('-')[0] : 'Academic Block'
    }
  }

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 ${
        isMobileDevice ? 'flex items-end' : 'flex items-center justify-center p-4'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-dark-surface/98 backdrop-blur-xl border border-dark-border/50 shadow-glass-lg w-full ${
          isMobileDevice
            ? 'rounded-t-3xl max-h-[92vh] animate-slide-up'
            : 'rounded-2xl max-w-2xl max-h-[90vh] animate-scale-in'
        } flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle (Mobile) */}
        {isMobileDevice && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-content-disabled/30 rounded-full"></div>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 p-4 md:p-5 z-10 rounded-t-3xl md:rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl border border-accent/20">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-content-primary">
                  Select from Timetable
                </h2>
                <p className="text-xs text-content-tertiary">
                  Search by section (e.g., BCS-5F, BSE-5A)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-surface-raised rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-content-secondary" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter section (e.g., BCS-5F)"
                className="w-full pl-10 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!section.trim() || loading}
              className="px-5 py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Search
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-8 h-8 text-accent animate-spin mb-3" />
              <p className="text-sm text-content-tertiary">Loading timetable...</p>
            </div>
          )}

          {error && (
            <div className="bg-attendance-danger/10 border border-attendance-danger/30 rounded-xl p-4 text-center">
              <p className="text-sm text-attendance-danger">{error}</p>
              <button
                onClick={fetchTimetable}
                className="mt-3 text-xs text-accent hover:underline"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredCourses.length === 0 && section && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-dark-surface-raised rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-content-tertiary" />
              </div>
              <p className="text-sm text-content-secondary mb-1">
                No courses found for section "{section}"
              </p>
              <p className="text-xs text-content-tertiary">
                Try a different section (e.g., BCS-5F, BSE-5A)
              </p>
            </div>
          )}

          {!loading && filteredCourses.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-content-secondary mb-3">
                Found {filteredCourses.length} course{filteredCourses.length > 1 ? 's' : ''} for {section}
              </p>

              {filteredCourses.map((course) => {
                const isSelected = selectedCourses.find(c => c.courseCode === course.courseCode)

                return (
                  <div
                    key={course.courseCode}
                    onClick={() => toggleCourse(course)}
                    className={`relative bg-dark-surface-raised border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-dark-border hover:border-accent/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-4 right-4">
                      <div
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-accent border-accent'
                            : 'border-dark-border bg-dark-surface'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-dark-bg" />}
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="pr-10">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-mono font-semibold rounded">
                          {course.courseCode}
                        </span>
                        <h3 className="text-base font-semibold text-content-primary leading-tight">
                          {course.courseName}
                        </h3>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-content-tertiary flex-shrink-0" />
                          <span className="text-xs text-content-secondary truncate">
                            {course.room}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-content-tertiary flex-shrink-0" />
                          <span className="text-xs text-content-secondary truncate">
                            {course.instructor}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-content-tertiary flex-shrink-0" />
                          <span className="text-xs text-content-secondary">
                            {course.timeSlot}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-content-tertiary flex-shrink-0" />
                          <span className="text-xs text-content-secondary">
                            {course.sessions?.map(s => s.day.slice(0, 3)).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-dark-surface/98 backdrop-blur-lg border-t border-dark-border/50 p-4 md:p-5 shadow-2xl rounded-b-3xl md:rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-5 py-3 bg-dark-bg border border-dark-border rounded-xl text-content-primary font-medium hover:bg-dark-surface-raised transition-all hover:scale-[1.02] active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCourses}
              disabled={selectedCourses.length === 0}
              className="flex-1 px-5 py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-bold rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Add Selected ({selectedCourses.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Search, X, Check, MapPin, User, Clock, Calendar, BookOpen, Loader, RefreshCw, ArrowRight, ArrowLeft, AlertCircle, Plus } from 'lucide-react'
import { dayToWeekday } from '../../utils/timetableParser'
import { vibrate, isMobile } from '../../utils/uiHelpers'
import { useApp } from '../../context/AppContext'
import { getTodayISO } from '../../utils/dateHelpers'
import CourseForm from './CourseForm'

// Convert 24-hour time to 12-hour format
const formatTimeTo12Hour = (time24) => {
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// Available departments in FAST NUCES
const DEPARTMENTS = [
  { code: 'BCS', name: 'Computer Science' },
  { code: 'BSE', name: 'Software Engineering' },
  { code: 'BAI', name: 'Artificial Intelligence' },
  { code: 'BSEE', name: 'Electrical Engineering' },
  { code: 'BCY', name: 'Cyber Security' },
  { code: 'BDS', name: 'Data Science' },
  { code: 'BSCE', name: 'Computer Engineering' },
  { code: 'BSFT', name: 'FinTech' },
  { code: 'BSBA', name: 'Business Analytics' },
  { code: 'BSFBA', name: 'Finance & Business Analytics' }
]

export default function TimetableSelector({ onCoursesSelected, onClose, showManualOption = false }) {
  const { addCourse, addMultipleCourses } = useApp()
  const [step, setStep] = useState('select') // 'select' or 'configure'
  const [department, setDepartment] = useState('BCS') // Default to BCS
  const [section, setSection] = useState('')
  const [timetable, setTimetable] = useState(null)
  const [filteredCourses, setFilteredCourses] = useState([])
  const [selectedCourses, setSelectedCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [isMobileDevice] = useState(isMobile())
  const [hasSearched, setHasSearched] = useState(false) // Track if search has been performed

  // Date configuration state (Step 2)
  const parseDate = (isoDate) => {
    if (!isoDate) return { year: '', month: '', day: '' }
    const [year, month, day] = isoDate.split('-')
    return { year, month, day }
  }

  const today = parseDate(getTodayISO())
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState({ year: '', month: '', day: '' })
  const [endDateMode, setEndDateMode] = useState('duration') // 'exact' or 'duration'
  const [semesterDuration, setSemesterDuration] = useState(16) // weeks
  const [initialAbsences, setInitialAbsences] = useState(0)
  const [allowedAbsences, setAllowedAbsences] = useState(null)

  // Auto-calculate end date from duration
  useEffect(() => {
    if (endDateMode === 'duration' && startDate.year && startDate.month && startDate.day) {
      const start = new Date(startDate.year, parseInt(startDate.month) - 1, parseInt(startDate.day))
      const end = new Date(start)
      end.setDate(end.getDate() + (semesterDuration * 7)) // Add weeks in days

      setEndDate({
        year: end.getFullYear().toString(),
        month: (end.getMonth() + 1).toString().padStart(2, '0'),
        day: end.getDate().toString().padStart(2, '0')
      })
    }
  }, [endDateMode, semesterDuration, startDate])

  // Auto-calculate allowed absences based on total courses selected
  useEffect(() => {
    if (selectedCourses.length > 0 && allowedAbsences === null) {
      // Average 3 absences per credit hour per course
      const avgCreditHours = 3
      const totalAllowed = selectedCourses.length * avgCreditHours * 3
      setAllowedAbsences(totalAllowed)
    }
  }, [selectedCourses, allowedAbsences])

  // Fetch timetable from API or localStorage
  useEffect(() => {
    fetchTimetable()
  }, [])

  const fetchTimetable = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try to get from localStorage first (for local development)
      const stored = localStorage.getItem('timetable')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          // Validate it's actually timetable data
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            setTimetable(data)
            setLoading(false)
            return
          }
        } catch (parseError) {
          console.warn('Invalid localStorage data, clearing:', parseError)
          localStorage.removeItem('timetable')
        }
      }

      // Try to fetch from JSON file (works in dev and production)
      const response = await fetch('/timetable/timetable.json')
      const data = await response.json()

      if (data.data) {
        setTimetable(data.data)
        // Cache in localStorage
        localStorage.setItem('timetable', JSON.stringify(data.data))
      } else {
        throw new Error('Invalid timetable format')
      }
    } catch (err) {
      console.error('Error fetching timetable:', err)
      // Clear corrupted localStorage
      localStorage.removeItem('timetable')

      // Use mock data for development
      const mockData = {
        'BCS-5B': [
          {
            courseCode: 'DAA',
            courseName: 'Design & Analysis of Algorithms',
            section: 'BCS-5B',
            instructor: 'Fahad Sherwani',
            room: 'E-1',
            day: 'Monday',
            timeSlot: '08:55-09:45',
            slotNumber: 2,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'E-1', timeSlot: '08:55-09:45' },
              { day: 'Wednesday', room: 'E-1', timeSlot: '08:55-09:45' },
              { day: 'Friday', room: 'E-1', timeSlot: '08:55-09:45' }
            ]
          },
          {
            courseCode: 'DBS',
            courseName: 'Database Systems',
            section: 'BCS-5B',
            instructor: 'Javeria Farooq',
            room: 'E-2',
            day: 'Monday',
            timeSlot: '11:40-12:30',
            slotNumber: 5,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'E-2', timeSlot: '11:40-12:30' },
              { day: 'Wednesday', room: 'E-2', timeSlot: '11:40-12:30' },
              { day: 'Friday', room: 'E-2', timeSlot: '11:40-12:30' }
            ]
          },
          {
            courseCode: 'SDA',
            courseName: 'Software Design & Architecture',
            section: 'BCS-5B',
            instructor: 'Ahmed Qaiser',
            room: 'E-4',
            day: 'Monday',
            timeSlot: '09:50-10:40',
            slotNumber: 3,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'E-4', timeSlot: '09:50-10:40' },
              { day: 'Tuesday', room: 'E-4', timeSlot: '09:50-10:40' }
            ]
          },
          {
            courseCode: 'CN',
            courseName: 'Computer Networks',
            section: 'BCS-5B',
            instructor: 'Dr. Farrukh Salim',
            room: 'E-1',
            day: 'Monday',
            timeSlot: '14:25-15:15',
            slotNumber: 8,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'E-1', timeSlot: '14:25-15:15' },
              { day: 'Thursday', room: 'E-1', timeSlot: '14:25-15:15' }
            ]
          }
        ],
        'BCS-5F': [
          {
            courseCode: 'DAA',
            courseName: 'Design & Analysis of Algorithms',
            section: 'BCS-5F',
            instructor: 'Sandesh Kumar',
            room: 'E-3',
            day: 'Monday',
            timeSlot: '13:30-14:20',
            slotNumber: 7,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'E-3', timeSlot: '13:30-14:20' },
              { day: 'Wednesday', room: 'E-3', timeSlot: '13:30-14:20' }
            ]
          },
          {
            courseCode: 'CN',
            courseName: 'Computer Networks',
            section: 'BCS-5F',
            instructor: 'Shaheer Khan',
            room: 'E-5',
            day: 'Monday',
            timeSlot: '08:55-09:45',
            slotNumber: 2,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'E-5', timeSlot: '08:55-09:45' }
            ]
          },
          {
            courseCode: 'SDA',
            courseName: 'Software Design & Architecture',
            section: 'BCS-5F',
            instructor: 'Syed Ahmed Khan',
            room: 'E-6',
            day: 'Monday',
            timeSlot: '15:20-16:05',
            slotNumber: 9,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'E-6', timeSlot: '15:20-16:05' }
            ]
          },
          {
            courseCode: 'DBS',
            courseName: 'Database Systems',
            section: 'BCS-5F',
            instructor: 'Dr. Zulfiqar Ali',
            room: 'A-1',
            day: 'Monday',
            timeSlot: '15:20-16:05',
            slotNumber: 9,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'A-1', timeSlot: '15:20-16:05' }
            ]
          }
        ]
      }

      setTimetable(mockData)
      localStorage.setItem('timetable', JSON.stringify(mockData))
      setError(null) // Clear error since we have mock data
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (!section || !section.trim() || !timetable || !department) {
      setFilteredCourses([])
      setHasSearched(false)
      return
    }

    // Mark that search has been performed
    setHasSearched(true)

    // Combine department and section (e.g., BCS + 5F = BCS-5F)
    const fullSection = `${department}-${section.toUpperCase().trim()}`
    console.log('Searching for section:', fullSection)
    console.log('Available sections:', timetable ? Object.keys(timetable) : [])
    console.log('Timetable data:', timetable)

    const courses = (timetable && timetable[fullSection]) || []
    console.log('Found courses:', courses)

    // Validate courses is an array
    if (!Array.isArray(courses)) {
      console.error('Invalid courses data, expected array')
      setFilteredCourses([])
      return
    }

    // Group courses by course code and collect all sessions
    const uniqueCourses = {}
    courses.forEach(course => {
      // Validate course has required fields
      if (!course || !course.courseCode || !course.courseName) {
        console.warn('Skipping invalid course entry:', course)
        return
      }

      if (!uniqueCourses[course.courseCode]) {
        uniqueCourses[course.courseCode] = {
          ...course,
          sessions: [course] // Always start with array
        }
      } else {
        // Add this session to the existing course
        uniqueCourses[course.courseCode].sessions.push(course)
      }
    })

    console.log('Filtered courses:', Object.values(uniqueCourses))
    setFilteredCourses(Object.values(uniqueCourses))
    vibrate([10])
  }

  const clearCache = () => {
    localStorage.removeItem('timetable')
    setTimetable(null)
    setFilteredCourses([])
    setSection('')
    fetchTimetable()
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

  const handleNextToConfiguration = () => {
    if (!selectedCourses || selectedCourses.length === 0) return
    setStep('configure')
    vibrate([10])
  }

  const handleBackToSelection = () => {
    setStep('select')
    vibrate([10])
  }

  const handleFinalSubmit = () => {
    if (!selectedCourses || selectedCourses.length === 0) return

    // Validate required fields - Start Date is mandatory
    if (!startDate.year || !startDate.month || !startDate.day) {
      setError('Please select a start date')
      return
    }

    // Validate absences fields only for single course selection
    if (selectedCourses.length === 1) {
      if (allowedAbsences !== null && (isNaN(allowedAbsences) || allowedAbsences < 0)) {
        setError('Maximum allowed absences must be a positive number')
        return
      }

      if (initialAbsences < 0 || isNaN(initialAbsences)) {
        setError('Absences so far must be a positive number')
        return
      }
    }

    setError(null)

    // Build date strings
    const startDateISO = `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`
    const endDateISO = endDate.year && endDate.month && endDate.day
      ? `${endDate.year}-${String(endDate.month).padStart(2, '0')}-${String(endDate.day).padStart(2, '0')}`
      : null

    // Convert to app format and add date configuration
    const appCourses = selectedCourses
      .map(course => {
        const converted = convertToAppFormat(course)
        if (!converted) return null

        return {
          ...converted,
          startDate: startDateISO,
          endDate: endDateISO,
          // For single course, use configured values; for multiple, use defaults per course
          initialAbsences: selectedCourses.length === 1 ? (initialAbsences || 0) : 0,
          allowedAbsences: selectedCourses.length === 1 
            ? (allowedAbsences || (converted.creditHours || 3) * 3)
            : (converted.creditHours || 3) * 3
        }
      })
      .filter(course => course !== null)

    // Only proceed if we have valid courses
    if (appCourses.length === 0) {
      console.error('No valid courses to add')
      return
    }

    // Add courses using context - use batch add function for multiple courses
    console.log('Adding courses to context:', appCourses)
    console.log(`Total courses to add: ${appCourses.length}`)
    
    try {
      // Use batch add function if multiple courses, single add if one course
      const addedCourses = appCourses.length > 1 
        ? addMultipleCourses(appCourses)
        : [addCourse(appCourses[0])].filter(Boolean)
      
      if (addedCourses.length > 0) {
        console.log(`Successfully added ${addedCourses.length}/${appCourses.length} courses:`, 
          addedCourses.map(c => ({ id: c.id, name: c.name, courseCode: c.courseCode }))
        )
        
        onCoursesSelected(appCourses)
        vibrate([10, 50, 10])
      } else {
        console.error('Failed to add any courses')
        setError('Failed to add courses. Please check the console for details.')
      }
    } catch (error) {
      console.error('Error adding courses:', error)
      setError('An error occurred while adding courses. Please try again.')
    }
  }

  const convertToAppFormat = (course) => {
    // Validate course object
    if (!course || !course.courseName || !course.courseCode) {
      console.error('Invalid course data in convertToAppFormat:', course)
      return null
    }

    // Get all sessions for this course
    const sessions = Array.isArray(course.sessions) && course.sessions.length > 0
      ? course.sessions
      : [course]

    // Extract unique weekdays, with null checks
    const weekdays = [...new Set(
      sessions
        .filter(s => s && s.day) // Filter out invalid sessions
        .map(s => dayToWeekday(s.day))
        .filter(day => day !== undefined && day !== null) // Filter out invalid weekdays
    )].sort()

    // Validate we have at least one valid weekday
    if (weekdays.length === 0) {
      console.error('No valid weekdays found for course:', course)
      return null
    }

    // Get time slot (use first valid session)
    const firstValidSession = sessions.find(s => s && s.timeSlot)
    const timeSlot = firstValidSession ? firstValidSession.timeSlot : '08:00-09:00'

    // Build schedule array for TimetableView
    // Ensure day names match exactly what TimetableView expects (Monday, Tuesday, etc.)
    const schedule = sessions
      .filter(s => s && s.day && s.timeSlot)
      .map(s => {
        const [startTime, endTime] = s.timeSlot.split('-')
        // Normalize day name to match TimetableView format
        // Input might be "Monday", "MONDAY", "monday" - normalize to "Monday"
        const dayName = s.day.charAt(0).toUpperCase() + s.day.slice(1).toLowerCase()
        const formatted = {
          day: dayName,
          startTime: formatTimeTo12Hour(startTime.trim()),
          endTime: formatTimeTo12Hour(endTime.trim())
        }
        console.log('Creating schedule slot:', {
          originalDay: s.day,
          normalizedDay: dayName,
          timeSlot: s.timeSlot,
          formatted: formatted
        })
        return formatted
      })
      .filter(s => s.day && s.startTime && s.endTime) // Ensure all fields are valid

    console.log('Course schedule array created:', {
      courseName: course.courseName,
      courseCode: course.courseCode,
      scheduleLength: schedule.length,
      schedule: schedule
    })

    return {
      name: course.courseName,
      shortName: course.courseCode,
      courseCode: course.courseCode,
      creditHours: course.creditHours || sessions.length,
      weekdays,

      // Additional metadata with null checks
      section: course.section || '',
      room: course.room || 'TBA',
      roomNumber: course.room || 'TBA',
      instructor: course.instructor || 'TBA',
      // Convert timeSlot to 12-hour format for display
      timeSlot: (() => {
        if (!timeSlot || timeSlot.includes('AM') || timeSlot.includes('PM')) {
          return timeSlot
        }
        const [start, end] = timeSlot.split('-')
        if (!start || !end) return timeSlot
        return `${formatTimeTo12Hour(start.trim())} - ${formatTimeTo12Hour(end.trim())}`
      })(),
      building: course.room && course.room.includes('-')
        ? course.room.split('-')[0]
        : 'Academic Block',

      // Schedule array for TimetableView
      schedule
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
                  Select Courses from Timetable
                </h2>
                <p className="text-xs text-content-tertiary">
                  Choose your department and enter section
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showManualOption && (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="px-3 py-2 text-sm bg-dark-bg border border-dark-border rounded-lg text-content-primary hover:bg-dark-surface-raised transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Manually
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-dark-surface-raised rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-content-secondary" />
              </button>
            </div>
          </div>

          {/* Department and Section Search */}
          <div className="space-y-2.5 mb-2">
            {/* Department Dropdown */}
            <div>
              <label className="text-xs font-medium text-content-secondary mb-1.5 block">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept.code} value={dept.code}>
                    {dept.code} - {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Input + Search Button */}
            <div>
              <label className="text-xs font-medium text-content-secondary mb-1.5 block">
                Section (e.g., 5F, 3A, 7B)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => {
                      setSection(e.target.value.toUpperCase())
                      // Reset search state when user types
                      setHasSearched(false)
                      setFilteredCourses([])
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g., 5F"
                    className="w-full pl-10 pr-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={!section.trim() || loading}
                  className="px-5 py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
                >
                  Search
                </button>
              </div>
              <p className="text-xs text-content-tertiary mt-1.5">
                Searching: <span className="text-accent font-medium">{department}-{section || '___'}</span>
              </p>
            </div>
          </div>

          {/* Clear Cache Button */}
          <button
            onClick={clearCache}
            className="text-xs text-content-tertiary hover:text-accent transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Clear cache & reload timetable
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {step === 'configure' ? (
            // Step 2: Date Configuration
            <div className="space-y-5">
              {/* Error Display */}
              {error && (
                <div className="bg-attendance-danger/10 border border-attendance-danger/30 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-attendance-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-attendance-danger">{error}</p>
                </div>
              )}

              {/* Selected Courses Summary */}
              <div className="bg-dark-surface-raised border border-dark-border rounded-xl p-4">
                <p className="text-sm font-medium text-content-primary mb-2">
                  {selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} selected
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedCourses.map(course => (
                    <span key={course.courseCode} className="px-2 py-1 bg-accent/20 text-accent text-xs font-mono rounded">
                      {course.courseCode}
                    </span>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-sm font-medium text-content-primary mb-2 block">
                  Start Date
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={startDate.day}
                    onChange={(e) => setStartDate({ ...startDate, day: e.target.value })}
                    className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select
                    value={startDate.month}
                    onChange={(e) => setStartDate({ ...startDate, month: e.target.value })}
                    className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  >
                    <option value="">Month</option>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                      <option key={i + 1} value={i + 1}>{month}</option>
                    ))}
                  </select>
                  <select
                    value={startDate.year}
                    onChange={(e) => setStartDate({ ...startDate, year: e.target.value })}
                    className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  >
                    <option value="">Year</option>
                    {[2024, 2025, 2026].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* End Date Mode Selector */}
              <div>
                <label className="text-sm font-medium text-content-primary mb-2 block">
                  Semester End Date
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setEndDateMode('duration')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      endDateMode === 'duration'
                        ? 'bg-gradient-to-br from-accent to-accent-hover text-dark-bg'
                        : 'bg-dark-bg/50 text-content-secondary hover:bg-dark-surface-raised border border-dark-border/30'
                    }`}
                  >
                    Duration (weeks)
                  </button>
                  <button
                    onClick={() => setEndDateMode('exact')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      endDateMode === 'exact'
                        ? 'bg-gradient-to-br from-accent to-accent-hover text-dark-bg'
                        : 'bg-dark-bg/50 text-content-secondary hover:bg-dark-surface-raised border border-dark-border/30'
                    }`}
                  >
                    Exact Date
                  </button>
                </div>

                {endDateMode === 'duration' ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      {[4, 8, 12, 16].map(weeks => (
                        <button
                          key={weeks}
                          onClick={() => setSemesterDuration(weeks)}
                          className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                            semesterDuration === weeks
                              ? 'bg-accent/20 text-accent border border-accent/30'
                              : 'bg-dark-bg/50 text-content-secondary hover:bg-dark-surface-raised border border-dark-border/30'
                          }`}
                        >
                          {weeks}w
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={semesterDuration}
                      onChange={(e) => setSemesterDuration(Number(e.target.value) || 16)}
                      className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                      placeholder="Custom weeks"
                    />
                    {endDate.year && (
                      <p className="text-xs text-content-tertiary mt-2">
                        Ends on: {endDate.day}/{endDate.month}/{endDate.year}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={endDate.day}
                      onChange={(e) => setEndDate({ ...endDate, day: e.target.value })}
                      className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                    >
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    <select
                      value={endDate.month}
                      onChange={(e) => setEndDate({ ...endDate, month: e.target.value })}
                      className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                    >
                      <option value="">Month</option>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                        <option key={i + 1} value={i + 1}>{month}</option>
                      ))}
                    </select>
                    <select
                      value={endDate.year}
                      onChange={(e) => setEndDate({ ...endDate, year: e.target.value })}
                      className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                    >
                      <option value="">Year</option>
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Absences Configuration - Only show for single course selection */}
              {selectedCourses.length === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-content-primary mb-2 block">
                      Maximum Allowed Absences
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={allowedAbsences ?? ''}
                      onChange={(e) => setAllowedAbsences(e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                      placeholder="Auto-calculated"
                    />
                    <p className="text-xs text-content-tertiary mt-1.5">
                      Based on credit hours (auto-calculated if empty)
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-content-primary mb-2 block">
                      Absences So Far
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={initialAbsences || ''}
                      onChange={(e) => setInitialAbsences(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                      placeholder="0"
                    />
                    <p className="text-xs text-content-tertiary mt-1.5">
                      Already taken absences
                    </p>
                  </div>
                </div>
              )}
              
              {/* Info message for multiple courses */}
              {selectedCourses.length > 1 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-content-secondary">
                    <strong className="text-content-primary">Note:</strong> Each course will have its allowed absences auto-calculated based on credit hours. You can edit individual courses later to adjust absences.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Step 1: Course Selection
            <>
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

          {!loading && !error && filteredCourses.length === 0 && section && hasSearched && (
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
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-content-tertiary flex-shrink-0" />
                          <span className="text-xs text-content-secondary truncate">
                            {course.instructor}
                          </span>
                        </div>

                        {/* Show schedule for each day */}
                        {(() => {
                          // Group sessions by day
                          const sessionsByDay = {}
                          course.sessions?.forEach(session => {
                            if (!sessionsByDay[session.day]) {
                              sessionsByDay[session.day] = []
                            }
                            sessionsByDay[session.day].push(session)
                          })

                          return Object.entries(sessionsByDay).map(([day, sessions]) => {
                            // Sort sessions by slot number for this day
                            const sortedSessions = sessions.sort((a, b) => a.slotNumber - b.slotNumber)

                            // Get time range (start of first slot to end of last slot)
                            const startTime = sortedSessions[0].timeSlot.split('-')[0]
                            const endTime = sortedSessions[sortedSessions.length - 1].timeSlot.split('-')[1]
                            const timeRange = `${formatTimeTo12Hour(startTime)} - ${formatTimeTo12Hour(endTime)}`

                            // Get room (use first session's room)
                            const room = sortedSessions[0].room

                            return (
                              <div key={day} className="flex items-start gap-1.5 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-content-tertiary flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <span className="text-content-primary font-medium">{day.slice(0, 3)}</span>
                                  <span className="text-content-tertiary mx-1">•</span>
                                  <span className="text-content-secondary">{timeRange}</span>
                                  <span className="text-content-tertiary mx-1">•</span>
                                  <span className="text-content-secondary">{room}</span>
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
            </>
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
            {step === 'select' ? (
                <button
                  onClick={handleNextToConfiguration}
                  disabled={selectedCourses.length === 0}
                  className="flex-1 px-5 py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  Next: Configure Dates
                  <ArrowRight className="w-4 h-4" />
                </button>
            ) : (
              <>
                <button
                  onClick={handleBackToSelection}
                  className="flex-1 px-5 py-3 bg-dark-bg border border-dark-border rounded-xl text-content-primary font-medium hover:bg-dark-surface-raised transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={selectedCourses.length === 0}
                  className="flex-1 px-5 py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Add {selectedCourses.length} Course{selectedCourses.length > 1 ? 's' : ''}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Manual Course Form Modal */}
      {showManualForm && (
        <CourseForm
          onClose={() => setShowManualForm(false)}
          onSave={() => {
            setShowManualForm(false)
            onCoursesSelected([]) // Close timetable selector after manual add
          }}
        />
      )}
    </div>
  )
}

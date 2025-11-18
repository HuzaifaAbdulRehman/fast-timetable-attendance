import { useState, useEffect } from 'react'
import { Search, X, Check, MapPin, User, Clock, Calendar, BookOpen, Loader, RefreshCw, ArrowRight, ArrowLeft, AlertCircle, Plus, RefreshCcw } from 'lucide-react'
import { dayToWeekday } from '../../utils/timetableParser'
import { vibrate, isMobile } from '../../utils/uiHelpers'
import { useApp } from '../../context/AppContext'
import { getTodayISO } from '../../utils/dateHelpers'
import CourseForm from './CourseForm'
import Toast from '../shared/Toast'
import ConfirmDialog from '../shared/ConfirmDialog'
import SectionSelectorDialog from '../shared/SectionSelectorDialog'

// Convert 24-hour time to 12-hour format
const formatTimeTo12Hour = (time24) => {
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// Generate comprehensive tooltip with full schedule information
const generateScheduleTooltip = (course) => {
  if (!course) return ''

  const parts = []

  // Section and instructor
  if (course.section) {
    parts.push(`Section: ${course.section}`)
  }
  if (course.instructor) {
    parts.push(`Instructor: ${course.instructor}`)
  }

  // Full schedule from sessions array
  if (course.sessions && course.sessions.length > 0) {
    parts.push('\nSchedule:')
    course.sessions.forEach(session => {
      const timeFormatted = session.timeSlot ?
        session.timeSlot.split('-').map(t => {
          const [h, m] = t.trim().split(':')
          const hour = parseInt(h)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const hour12 = hour % 12 || 12
          return `${hour12}:${m} ${ampm}`
        }).join(' - ') :
        'TBA'
      parts.push(`  • ${session.day}: ${timeFormatted} (${session.room || 'TBA'})`)
    })
  } else if (course.day && course.timeSlot) {
    // Fallback to single session
    const timeFormatted = course.timeSlot.split('-').map(t => {
      const [h, m] = t.trim().split(':')
      const hour = parseInt(h)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${m} ${ampm}`
    }).join(' - ')
    parts.push(`\nSchedule: ${course.day} at ${timeFormatted}`)
    if (course.room) {
      parts.push(`Room: ${course.room}`)
    }
  }

  return parts.join('\n')
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
  const { addCourse, addMultipleCourses, courses, changeCourseSection } = useApp()
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
  const [toast, setToast] = useState(null) // Toast notification state
  const [confirmDialog, setConfirmDialog] = useState(null) // Confirmation dialog state

  // Handle section change with confirmation - shows all available sections
  const handleChangeSectionClick = (course, existingCourse) => {
    // Find all sections offering this course from the timetable
    const availableSections = []

    // Handle both direct timetable object and nested data structure
    const timetableData = timetable?.data || timetable

    if (timetableData && typeof timetableData === 'object') {
      Object.entries(timetableData).forEach(([sectionName, sectionCourses]) => {
        // Skip metadata fields
        if (!Array.isArray(sectionCourses)) return

        const matchingCourse = sectionCourses.find(c => c.courseCode === course.courseCode)
        if (matchingCourse) {
          availableSections.push({
            ...matchingCourse,
            section: sectionName,
            isCurrent: sectionName === existingCourse.section,
            isViewing: sectionName === course.section
          })
        }
      })
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Available sections for', course.courseCode, ':', availableSections.length)
      console.log('Available sections:', availableSections.map(s => s.section))
    }

    // Sort: current first, then viewing section, then alphabetically
    availableSections.sort((a, b) => {
      if (a.isCurrent) return -1
      if (b.isCurrent) return 1
      if (a.isViewing) return -1
      if (b.isViewing) return 1
      return a.section.localeCompare(b.section)
    })

    setConfirmDialog({
      course,
      existingCourse,
      availableSections,
      type: 'info',
      title: `Change Section for ${course.courseCode}`,
      message: 'Select a new section from the options below:',
      showSectionSelector: true
    })
  }

  const handleConfirmSectionChange = (selectedSectionCourse) => {
    const { existingCourse } = confirmDialog

    if (!selectedSectionCourse) {
      setToast({ message: 'Please select a section', type: 'warning' })
      return
    }

    // Prevent changing to the same section
    if (selectedSectionCourse.section === existingCourse.section) {
      setToast({ message: 'Course is already in this section', type: 'info' })
      setConfirmDialog(null)
      return
    }

    // Prepare new course data with proper format
    const newCourseData = buildCourseData(selectedSectionCourse)

    const result = changeCourseSection(existingCourse.id, newCourseData)

    if (result.success) {
      setToast({
        message: `Changed ${selectedSectionCourse.courseCode} from ${result.oldCourse.section} to ${result.course.section}`,
        type: 'success',
        action: {
          label: 'UNDO',
          onClick: () => {
            // Undo by changing back to old section
            const oldCourseData = {
              ...result.oldCourse,
              weekdays: result.oldCourse.weekdays || [],
              schedule: result.oldCourse.schedule || []
            }
            changeCourseSection(result.course.id, oldCourseData)
            setToast({ message: `Restored ${selectedSectionCourse.courseCode} to ${result.oldCourse.section}`, type: 'info' })
          }
        }
      })
      vibrate([10, 50, 10])
    } else {
      setToast({ message: result.message, type: 'error' })
    }

    setConfirmDialog(null)
  }

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
            instructor: 'Hajra Ahmed',
            room: 'A-1',
            day: 'Monday',
            timeSlot: '15:20-16:05',
            slotNumber: 9,
            creditHours: 3,
            sessions: [
              { day: 'Monday', room: 'A-1', timeSlot: '15:20-16:05', instructor: 'Hajra Ahmed' }
            ]
          },
          {
            courseCode: 'CN Lab',
            courseName: 'Computer Networks Lab',
            section: 'BCS-5F',
            instructor: 'Sameer Faisal',
            room: 'Academic Block II LAB-11 (46)',
            day: 'Monday',
            timeSlot: '10:45-11:35',
            slotNumber: 4,
            creditHours: 1,
            sessions: [
              { day: 'Monday', room: 'Academic Block II LAB-11 (46)', timeSlot: '10:45-11:35', instructor: 'Sameer Faisal' }
            ]
          },
          {
            courseCode: 'DBS Lab',
            courseName: 'Database Systems Lab',
            section: 'BCS-5F',
            instructor: 'Fareeha Jabeen',
            room: 'Academic Block II Lab-13 (47)',
            day: 'Wednesday',
            timeSlot: '08:00-08:50',
            slotNumber: 1,
            creditHours: 1,
            sessions: [
              { day: 'Wednesday', room: 'Academic Block II Lab-13 (47)', timeSlot: '08:00-08:50', instructor: 'Fareeha Jabeen' }
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
    if (process.env.NODE_ENV === 'development') {
      console.log('Searching for section:', fullSection)
      console.log('Available sections:', timetable ? Object.keys(timetable) : [])
    }

    const courses = (timetable && timetable[fullSection]) || []

    if (process.env.NODE_ENV === 'development') {
      console.log('Searching for section:', fullSection)
      console.log('Found courses:', courses)
      console.log('First course sessions:', courses[0]?.sessions)
    }

    // Validate courses is an array
    if (!Array.isArray(courses)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Invalid courses data, expected array')
      }
      setFilteredCourses([])
      return
    }

    // Validate each course has required fields
    const validCourses = courses.filter(course => {
      if (!course || !course.courseCode || !course.courseName) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Skipping invalid course entry:', course)
        }
        return false
      }
      return true
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Valid courses with sessions:', validCourses.map(c => ({
        code: c.courseCode,
        sessionsCount: c.sessions?.length,
        sessions: c.sessions
      })))
    }

    // Courses from timetable.json are already aggregated with sessions array
    // No need to re-group, just use them directly
    setFilteredCourses(validCourses)
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
    const selectedMatch = selectedCourses.find(c => c.courseCode === course.courseCode)

    if (selectedMatch) {
      // If clicking the same course in the same section, deselect it
      if (selectedMatch.section === course.section) {
        setSelectedCourses(selectedCourses.filter(c => c.courseCode !== course.courseCode))
      } else {
        // If clicking the same course in a different section, replace the old selection
        setSelectedCourses([
          ...selectedCourses.filter(c => c.courseCode !== course.courseCode),
          course
        ])
      }
    } else {
      // New course selection
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
      if (process.env.NODE_ENV === 'development') {
        console.error('No valid courses to add')
      }
      return
    }

    // Add courses using context - use batch add function for multiple courses
    if (process.env.NODE_ENV === 'development') {
      console.log('Adding courses to context:', appCourses)
      console.log(`Total courses to add: ${appCourses.length}`)
    }
    
    try {
      // Use batch add function if multiple courses, single add if one course
      if (appCourses.length > 1) {
        const result = addMultipleCourses(appCourses)

        if (result.success && result.added.length > 0) {
          let message = `Successfully added ${result.added.length} courses!`

          if (result.duplicates.length > 0) {
            const dupInfo = result.duplicates.map(d =>
              d.existingSection && d.section !== d.existingSection
                ? `${d.courseCode || d.name} (already in ${d.existingSection})`
                : d.courseCode || d.name
            ).join(', ')
            message = `Added ${result.added.length} courses. Skipped ${result.duplicates.length}: ${dupInfo}`
          }

          setToast({ message, type: 'success' })
          onCoursesSelected(appCourses)
          vibrate([10, 50, 10])
        } else if (result.duplicates.length > 0 && result.added.length === 0) {
          const duplicateNames = result.duplicates.map(d => {
            const courseId = d.courseCode || d.name
            if (d.existingSection && d.section !== d.existingSection) {
              return `${courseId} (already in ${d.existingSection})`
            }
            return `${courseId} (${d.section})`
          }).join(', ')
          setToast({
            message: `All selected courses already exist: ${duplicateNames}`,
            type: 'warning'
          })
        } else {
          setError('Failed to add courses. Please check the console for details.')
        }
      } else {
        const result = addCourse(appCourses[0])

        if (result.success) {
          setToast({ message: `Successfully added ${result.course.name}!`, type: 'success' })
          onCoursesSelected(appCourses)
          vibrate([10, 50, 10])
        } else if (result.error === 'DUPLICATE') {
          setToast({ message: result.message, type: 'warning' })
        } else {
          setError(result.message || 'Failed to add course')
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error adding courses:', error)
      }
      setError('An error occurred while adding courses. Please try again.')
    }
  }

  const convertToAppFormat = (course) => {
    // Validate course object
    if (!course || !course.courseName || !course.courseCode) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Invalid course data in convertToAppFormat:', course)
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('No valid weekdays found for course:', course)
      }
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
          endTime: formatTimeTo12Hour(endTime.trim()),
          // Include per-session metadata
          // Note: instructor is at course level, not session level, so use course.instructor
          instructor: s.instructor || course.instructor || 'TBA',
          room: s.room || 'TBA'
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('Creating schedule slot:', {
            originalDay: s.day,
            normalizedDay: dayName,
            timeSlot: s.timeSlot,
            instructor: formatted.instructor,
            room: s.room,
            formatted: formatted
          })
        }
        return formatted
      })
      .filter(s => s.day && s.startTime && s.endTime) // Ensure all fields are valid

    if (process.env.NODE_ENV === 'development') {
      console.log('Course schedule array created:', {
        courseName: course.courseName,
        courseCode: course.courseCode,
        scheduleLength: schedule.length,
        schedule: schedule
      })
    }

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

  // Helper function to build course data for section changes
  // Ensures all session data is preserved when changing sections
  const buildCourseData = (sectionCourse) => {
    return convertToAppFormat(sectionCourse)
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
        <div className="sticky top-0 bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 p-2 sm:p-3 md:p-5 z-10 rounded-t-3xl md:rounded-t-2xl">
          <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg sm:rounded-xl border border-accent/20">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm md:text-lg lg:text-xl font-bold text-content-primary">
                  Select Courses from Timetable
                </h2>
                <p className="text-[10px] sm:text-xs text-content-tertiary hidden sm:block">
                  Choose your department and enter section
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {showManualOption && (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-xs md:text-sm bg-dark-bg border border-dark-border rounded-lg text-content-primary hover:bg-dark-surface-raised transition-all flex items-center gap-1 sm:gap-2"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Add Manually</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-dark-surface-raised rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-content-secondary" />
              </button>
            </div>
          </div>

          {/* Department and Section Search */}
          <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5 mb-1 sm:mb-2">
            {/* Department Dropdown */}
            <div>
              <label className="text-xs sm:text-xs font-medium text-content-secondary mb-1 sm:mb-1.5 block">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 bg-dark-bg border border-dark-border rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
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
              <label className="text-xs sm:text-xs font-medium text-content-secondary mb-1 sm:mb-1.5 block">
                Section (e.g., 5F, 3A, 7B)
              </label>
              <div className="flex gap-1.5 sm:gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-content-tertiary" />
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
                    className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 md:py-3 bg-dark-bg border border-dark-border rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base text-content-primary placeholder-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={!section.trim() || loading}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold text-xs sm:text-sm md:text-base rounded-lg sm:rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
                >
                  Search
                </button>
              </div>
              <p className="text-xs sm:text-xs text-content-tertiary mt-1 sm:mt-1.5">
                Searching: <span className="text-accent font-medium">{department}-{section || '___'}</span>
              </p>
            </div>
          </div>

          {/* Clear Cache Button */}
          <button
            onClick={clearCache}
            className="mt-2 px-3 py-1.5 text-xs sm:text-sm text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/20 rounded-lg transition-all flex items-center gap-1.5 sm:gap-2 border border-accent/20 hover:border-accent/30"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Clear cache & reload timetable</span>
            <span className="sm:hidden">Clear cache</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-5">
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
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              <p className="text-xs sm:text-sm text-content-secondary mb-1.5 sm:mb-2 md:mb-3">
                Found {filteredCourses.length} course{filteredCourses.length > 1 ? 's' : ''} for {section}
              </p>

              {filteredCourses.map((course) => {
                // Find if this course is selected (in selectedCourses state)
                const selectedCourseMatch = selectedCourses.find(c => c.courseCode === course.courseCode)
                const isSelected = !!selectedCourseMatch
                const isSelectedInSameSection = isSelected && selectedCourseMatch?.section === course.section

                // Check if already added to app (by course code only, regardless of section)
                const existingCourseMatch = courses.find(existingCourse => {
                  if (course.courseCode && existingCourse.courseCode) {
                    return existingCourse.courseCode === course.courseCode
                  }
                  return existingCourse.name === course.courseName
                })

                const isAlreadyAdded = !!existingCourseMatch
                const existingSection = existingCourseMatch?.section
                const isSameSection = existingSection === course.section

                return (
                  <div
                    key={course.courseCode}
                    onClick={() => {
                      // Allow clicking if not already added, OR if selected in different section
                      if (!isAlreadyAdded) {
                        toggleCourse(course)
                      } else if (isSelected && !isSelectedInSameSection) {
                        // Allow switching sections for selected courses
                        toggleCourse(course)
                      }
                    }}
                    className={`relative bg-dark-surface-raised border-2 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 transition-all ${
                      isAlreadyAdded
                        ? 'border-yellow-600/40 dark:border-yellow-500/30 bg-yellow-500/8 dark:bg-yellow-500/5 cursor-not-allowed opacity-80'
                        : isSelected
                        ? 'border-accent/60 dark:border-accent/50 bg-accent/8 dark:bg-accent/5 cursor-pointer'
                        : 'border-dark-border hover:border-accent/40 dark:hover:border-accent/30 cursor-pointer'
                    }`}
                  >
                    {/* Status Indicator - Top Right */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-10 max-w-[calc(100%-6rem)] sm:max-w-[calc(100%-8rem)]">
                      {isAlreadyAdded ? (
                        // Course already added to app
                        isSameSection ? (
                          // Same section - show enhanced indicator with section info and full schedule tooltip
                          <div
                            className="bg-green-500/15 dark:bg-green-500/20 border-2 border-green-600/50 dark:border-green-500/40 rounded-lg shadow-sm overflow-hidden cursor-help"
                            title={generateScheduleTooltip(existingCourseMatch)}
                          >
                            <div className="px-1.5 sm:px-2 py-1 flex items-center gap-1">
                              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] sm:text-xs text-green-700 dark:text-green-400 font-semibold">Added</span>
                                <span className="text-[8px] sm:text-[9px] text-green-600 dark:text-green-300/80 font-medium truncate">
                                  {existingSection} {existingCourseMatch?.instructor && `• ${existingCourseMatch.instructor.split(' ')[0]}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Different section - compact yellow badge with full schedule tooltip, responsive padding
                          <div
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-yellow-500/15 dark:bg-yellow-500/20 border-2 border-yellow-600/50 dark:border-yellow-500/40 rounded-md sm:rounded-lg shadow-sm cursor-help"
                            title={generateScheduleTooltip(existingCourseMatch)}
                          >
                            <span className="text-[9px] sm:text-[10px] md:text-xs text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-wide whitespace-nowrap">Unavailable</span>
                          </div>
                        )
                      ) : isSelected ? (
                        // Course selected but not yet added
                        isSelectedInSameSection ? (
                          // Selected in same section - simple checkmark
                          <div
                            className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-md sm:rounded-lg border-2 bg-accent border-accent flex items-center justify-center transition-all"
                          >
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-dark-bg" />
                          </div>
                        ) : (
                          // Selected in different section - show enhanced badge with section info
                          <div
                            className="bg-accent/20 border border-accent/40 rounded-lg shadow-sm overflow-hidden cursor-help"
                            title={generateScheduleTooltip(selectedCourseMatch)}
                          >
                            <div className="px-2 py-1 flex items-center gap-1">
                              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent flex-shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] sm:text-xs text-accent font-medium">Selected</span>
                                <span className="text-[8px] sm:text-[9px] text-accent/80 truncate">
                                  {selectedCourseMatch.section} {selectedCourseMatch?.instructor && `• ${selectedCourseMatch.instructor.split(' ')[0]}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      ) : (
                        // Not selected, not added - empty checkbox
                        <div
                          className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-md sm:rounded-lg border-2 border-dark-border bg-dark-surface flex items-center justify-center transition-all"
                        >
                        </div>
                      )}
                    </div>

                    {/* Course Info */}
                    <div className={
                      (isAlreadyAdded && isSameSection) || (isSelected && !isSelectedInSameSection)
                        ? "pr-32 sm:pr-36 md:pr-40"  // Wide padding for enhanced badges
                        : "pr-20 sm:pr-24 md:pr-28"  // Standard padding for simple indicators
                    }>
                      <div className="flex items-start gap-1.5 sm:gap-2 mb-2">
                        <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-accent/20 text-accent text-[10px] sm:text-xs font-mono font-semibold rounded flex-shrink-0">
                          {course.courseCode}
                        </span>
                        <h3 className="text-xs sm:text-sm md:text-base font-semibold text-content-primary leading-tight flex-1 min-w-0">
                          {course.courseName}
                        </h3>
                      </div>

                      {/* Cross-section duplicate warning with Change Section button */}
                      {isAlreadyAdded && !isSameSection && existingSection && (
                        <div className="mb-2 sm:mb-3 px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          {/* Header with icon and title - responsive wrapping */}
                          <div className="flex items-start gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                            <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] sm:text-[11px] md:text-xs text-yellow-400 font-semibold">
                                Course already enrolled
                              </p>
                            </div>
                          </div>

                          {/* Details and button - fully responsive stacked layout for mobile */}
                          <div className="flex flex-col gap-2">
                            {/* Details section - better spacing on mobile */}
                            <div className="ml-4 sm:ml-5 md:ml-6 space-y-0.5">
                              <p className="text-[9px] sm:text-[10px] md:text-xs text-yellow-300/90 break-words">
                                <span className="font-medium">Section:</span> <span className="inline-block">{existingSection}</span>
                              </p>
                              {existingCourseMatch?.instructor && (
                                <p className="text-[9px] sm:text-[10px] md:text-xs text-yellow-300/90 break-words">
                                  <span className="font-medium">Prof:</span> <span className="inline-block">{existingCourseMatch.instructor}</span>
                                </p>
                              )}
                            </div>

                            {/* Change button - full width on all mobile screens */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleChangeSectionClick(course, existingCourseMatch)
                              }}
                              className="w-full px-2.5 sm:px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-dark-bg text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow-md"
                              title="Change to a different section"
                            >
                              <RefreshCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span className="whitespace-nowrap">Change Section</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Details Grid */}
                      <div className="space-y-1 sm:space-y-1.5 md:space-y-2 mt-1.5 sm:mt-2 md:mt-3">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-content-tertiary flex-shrink-0" />
                          <span className="text-[10px] sm:text-xs text-content-secondary truncate">
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
                              <div key={day} className="flex items-start gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
                                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-content-tertiary flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <span className="text-content-primary font-medium">{day.slice(0, 3)}</span>
                                  <span className="text-content-tertiary mx-0.5 sm:mx-1">•</span>
                                  <span className="text-content-secondary">{timeRange}</span>
                                  <span className="text-content-tertiary mx-0.5 sm:mx-1">•</span>
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
        <div className="sticky bottom-0 bg-dark-surface/98 backdrop-blur-lg border-t border-dark-border/50 p-2 sm:p-3 md:p-5 shadow-2xl rounded-b-3xl md:rounded-b-2xl">
          <div className="flex gap-1.5 sm:gap-2 md:gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2.5 sm:px-3 sm:py-2.5 md:px-5 md:py-3 bg-dark-bg border border-dark-border rounded-lg sm:rounded-xl text-xs sm:text-xs md:text-sm text-content-primary font-medium hover:bg-dark-surface-raised transition-all hover:scale-[1.02] active:scale-95"
            >
              Cancel
            </button>
            {step === 'select' ? (
                <button
                  onClick={handleNextToConfiguration}
                  disabled={selectedCourses.length === 0}
                  className="flex-1 px-3 py-2.5 sm:px-3 sm:py-2.5 md:px-5 md:py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1 sm:gap-2"
                >
                  <span className="hidden sm:inline">Next: Configure Dates</span>
                  <span className="sm:hidden">Next</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                </button>
            ) : (
              <>
                <button
                  onClick={handleBackToSelection}
                  className="flex-1 px-3 py-2.5 sm:px-3 sm:py-2.5 md:px-5 md:py-3 bg-dark-bg border border-dark-border rounded-lg sm:rounded-xl text-xs sm:text-xs md:text-sm text-content-primary font-medium hover:bg-dark-surface-raised transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 sm:gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={selectedCourses.length === 0}
                  className="flex-1 px-3 py-2.5 sm:px-3 sm:py-2.5 md:px-5 md:py-3 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-semibold text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl transition-all hover:shadow-accent-lg hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1 sm:gap-2"
                >
                  <Check className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Add {selectedCourses.length} Course{selectedCourses.length > 1 ? 's' : ''}</span>
                  <span className="sm:hidden">Add {selectedCourses.length}</span>
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

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          action={toast.action}
        />
      )}

      {/* Section Change Confirmation Dialog */}
      {confirmDialog && confirmDialog.showSectionSelector && (
        <SectionSelectorDialog
          isOpen={true}
          onClose={() => setConfirmDialog(null)}
          onConfirm={handleConfirmSectionChange}
          courseCode={confirmDialog.course?.courseCode}
          courseName={confirmDialog.course?.courseName}
          currentSection={confirmDialog.existingCourse?.section}
          availableSections={confirmDialog.availableSections || []}
        />
      )}

      {/* Generic Confirmation Dialog */}
      {confirmDialog && !confirmDialog.showSectionSelector && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => handleConfirmSectionChange(confirmDialog.course)}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
        >
          {confirmDialog.details && (
            <div className="space-y-2">
              {confirmDialog.details.map((detail, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-content-tertiary">{detail.label}:</span>
                  <span className="text-content-primary font-medium">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}

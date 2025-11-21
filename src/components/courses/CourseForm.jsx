import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { Calendar, BookOpen, Hash, ChevronDown, ChevronUp, User, MapPin, Tag } from 'lucide-react'
import { getTodayISO } from '../../utils/dateHelpers'
import { WEEKDAY_FULL_NAMES } from '../../utils/constants'
import Toast from '../shared/Toast'
import BaseModal from '../shared/BaseModal'

// Haptic feedback utility
const vibrate = (pattern = [10]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export default function CourseForm({ onClose, onSave, existingCourse = null, isNewCourse = false }) {
  const { addCourse, updateCourse } = useApp()
  const [toast, setToast] = useState(null)

  // Parse existing date or use today
  const parseDate = (isoDate) => {
    if (!isoDate) return { year: '', month: '', day: '' }
    const [year, month, day] = isoDate.split('-')
    return { year, month, day }
  }

  const today = parseDate(getTodayISO())
  const existingStart = parseDate(existingCourse?.startDate)
  const existingEnd = parseDate(existingCourse?.endDate)

  const [formData, setFormData] = useState({
    name: existingCourse?.name || '',
    shortName: existingCourse?.shortName || '',
    creditHours: existingCourse?.creditHours || 2,
    weekdays: existingCourse?.weekdays || [],
    initialAbsences: existingCourse?.initialAbsences || 0,
    allowedAbsences: existingCourse?.allowedAbsences || null,
    // Preserve timetable metadata if passed from ExploreClassesView
    instructor: existingCourse?.instructor,
    schedule: existingCourse?.schedule,
    room: existingCourse?.room,
    roomNumber: existingCourse?.roomNumber,
    building: existingCourse?.building,
    courseCode: existingCourse?.courseCode,
    section: existingCourse?.section,
    timeSlot: existingCourse?.timeSlot,
  })

  const [userModifiedAbsences, setUserModifiedAbsences] = useState(!!existingCourse?.allowedAbsences)

  // Calculate initial end date mode and duration
  const calculateInitialMode = () => {
    if (!existingCourse) return { mode: 'duration', duration: 16 }

    // If editing, check if we have both start and end dates
    if (existingStart.year && existingEnd.year) {
      const start = new Date(existingStart.year, parseInt(existingStart.month) - 1, parseInt(existingStart.day))
      const end = new Date(existingEnd.year, parseInt(existingEnd.month) - 1, parseInt(existingEnd.day))
      const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24))
      const weeks = Math.round(diffDays / 7)

      // Check if it's close to a standard duration (within 3 days)
      const standardWeeks = [4, 8, 12, 16, 20, 24]
      const isStandardDuration = standardWeeks.some(w => Math.abs(diffDays - (w * 7)) <= 3)

      if (isStandardDuration) {
        return { mode: 'duration', duration: weeks }
      }
    }

    // Default to duration mode for consistency
    return { mode: 'duration', duration: 16 }
  }

  const initialModeData = calculateInitialMode()

  const [startDate, setStartDate] = useState(existingStart.year ? existingStart : today)
  const [endDate, setEndDate] = useState(existingEnd.year ? existingEnd : { year: '', month: '', day: '' })
  const [endDateMode, setEndDateMode] = useState(initialModeData.mode)
  const [semesterDuration, setSemesterDuration] = useState(initialModeData.duration)
  const [errors, setErrors] = useState({})
  const [sessionSelections, setSessionSelections] = useState(
    existingCourse?.weekdays || Array(formData.creditHours).fill('')
  )
  const [showOptionalFields, setShowOptionalFields] = useState(
    // Auto-expand if any optional field has data
    !!(existingCourse?.instructor || existingCourse?.courseCode || existingCourse?.section || existingCourse?.room)
  )

  // Auto-calculate allowed absences: credit hours × 3 (only if user hasn't manually set it)
  useEffect(() => {
    if (!userModifiedAbsences) {
      const defaultAllowed = formData.creditHours * 3
      setFormData(prev => ({ ...prev, allowedAbsences: defaultAllowed }))
    }
  }, [formData.creditHours, userModifiedAbsences])

  // Auto-calculate end date from duration
  useEffect(() => {
    if (endDateMode === 'duration' && startDate.year && startDate.month && startDate.day) {
      const start = new Date(startDate.year, parseInt(startDate.month) - 1, parseInt(startDate.day))
      const end = new Date(start)
      end.setDate(end.getDate() + (semesterDuration * 7)) // Add weeks in days

      setEndDate({
        year: end.getFullYear().toString(),
        month: (end.getMonth() + 1).toString(),
        day: end.getDate().toString()
      })
    }
  }, [endDateMode, semesterDuration, startDate])

  const handleCreditHoursChange = (hours) => {
    vibrate([10]) // Quick tap feedback
    setFormData(prev => ({ ...prev, creditHours: hours, weekdays: [] }))
    setSessionSelections(Array(hours).fill(''))
    // Reset user modification flag so it auto-calculates with new credit hours
    setUserModifiedAbsences(false)
  }

  const handleSessionDaySelect = (sessionIndex, dayIndex) => {
    vibrate([10]) // Quick tap feedback
    const newSelections = [...sessionSelections]
    newSelections[sessionIndex] = dayIndex
    setSessionSelections(newSelections)

    const weekdays = newSelections.filter(day => day !== '')
    setFormData(prev => ({ ...prev, weekdays }))
  }

  const formatDate = ({ year, month, day }) => {
    if (!year || !month || !day) return ''
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const startDateISO = formatDate(startDate)
    const endDateISO = formatDate(endDate)

    // Validation
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Course name is required'
    if (!formData.shortName.trim()) {
      newErrors.shortName = 'Short name is required'
    } else if (formData.shortName.length < 2) {
      newErrors.shortName = 'Short name must be at least 2 characters'
    } else if (formData.shortName.length > 12) {
      newErrors.shortName = 'Short name must not exceed 12 characters'
    }
    if (formData.weekdays.length !== formData.creditHours) {
      newErrors.weekdays = `Select ${formData.creditHours} session day(s)`
    }
    if (!startDateISO) newErrors.startDate = 'Start date is required'
    if (!endDateISO) newErrors.endDate = 'End date is required'
    if (endDateISO && startDateISO && endDateISO <= startDateISO) {
      newErrors.endDate = 'End date must be after start date'
    }

    if (Object.keys(newErrors).length > 0) {
      vibrate([50, 100, 50]) // Error pattern
      setErrors(newErrors)
      return
    }

    // Save
    const courseData = {
      ...formData,
      startDate: startDateISO,
      endDate: endDateISO,
      allowedAbsences: formData.allowedAbsences || 0,
    }

    if (existingCourse && existingCourse.id && !isNewCourse) {
      // Updating existing course
      updateCourse(existingCourse.id, courseData)
      vibrate([10, 50, 10]) // Success pattern

      if (typeof onSave === 'function') {
        onSave()
      }
      if (typeof onClose === 'function' && onClose !== onSave) {
        onClose()
      }
    } else {
      // Adding new course
      const result = addCourse(courseData)

      if (result.success) {
        vibrate([10, 50, 10]) // Success pattern
        setToast({ message: `Successfully added ${result.course.name}!`, type: 'success' })

        // Close after showing toast briefly
        setTimeout(() => {
          if (typeof onSave === 'function') {
            onSave()
          }
          if (typeof onClose === 'function' && onClose !== onSave) {
            onClose()
          }
        }, 500)
      } else if (result.error === 'DUPLICATE') {
        setToast({ message: result.message, type: 'warning' })
      } else {
        setToast({ message: result.message || 'Failed to add course', type: 'error' })
      }
    }
  }

  // Generate year/month/day options
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i)
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  // Header icon
  const headerIcon = (
    <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl border border-accent/20">
      <BookOpen className="w-5 h-5 text-accent" />
    </div>
  )

  // Custom title with subtitle - Standardized typography
  const titleContent = (
    <div>
      <h2 className="text-base sm:text-lg font-semibold text-content-primary">
        {existingCourse ? 'Edit Course' : 'Add New Course'}
      </h2>
      <p className="text-xs sm:text-sm text-content-tertiary mt-0.5">
        Track your attendance
      </p>
    </div>
  )

  // Footer with action buttons - Mobile optimized
  const footer = (
    <div className="flex gap-2 sm:gap-3">
      <button
        type="submit"
        form="course-form"
        className="flex-1 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-medium px-3 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-200 shadow-accent hover:shadow-accent-lg hover:scale-[1.02] active:scale-95"
      >
        {existingCourse && existingCourse.id && !isNewCourse ? 'Update Course' : 'Add Course to Your List'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base bg-dark-bg/50 hover:bg-dark-surface-raised text-content-primary border border-dark-border/30 rounded-lg sm:rounded-xl transition-all hover:scale-[1.02] active:scale-95"
      >
        Cancel
      </button>
    </div>
  )

  return (
    <>
      <BaseModal
        isOpen={true}
        onClose={onClose}
        title={titleContent}
        size="lg"
        variant="default"
        headerIcon={headerIcon}
        footer={footer}
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={false}
      >
        {/* Form - Scrollable */}
        <form id="course-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Course Name */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              Course Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/50 rounded-xl text-content-primary placeholder-content-disabled focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              placeholder="e.g., Data Structures & Algorithms"
            />
            {errors.name && (
              <p className="text-xs text-attendance-danger mt-1.5">{errors.name}</p>
            )}
          </div>

          {/* Short Name */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              Short Name * <span className="text-content-tertiary font-normal text-xs">({formData.shortName.length}/12 characters)</span>
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().slice(0, 12)
                setFormData({ ...formData, shortName: value })
              }}
              maxLength={12}
              className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/50 rounded-xl text-content-primary placeholder-content-disabled focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase"
              placeholder="e.g., DSA or TOA LAB"
            />
            <p className="text-xs text-content-tertiary mt-1.5">
              Short form for column display (2-12 characters)
            </p>
            {errors.shortName && (
              <p className="text-xs text-attendance-danger mt-1.5">{errors.shortName}</p>
            )}
          </div>

          {/* Credit Hours */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              Credit Hours *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3].map(hours => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => handleCreditHoursChange(hours)}
                  className={`
                    px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${formData.creditHours === hours
                      ? 'bg-gradient-to-br from-accent to-accent-hover text-dark-bg shadow-accent'
                      : 'bg-dark-bg/50 text-content-secondary hover:bg-dark-surface-raised border border-dark-border/30'
                    }
                  `}
                >
                  {hours}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="6"
                value={formData.creditHours > 3 ? formData.creditHours : ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 2 : Number(e.target.value)
                  handleCreditHoursChange(value)
                }}
                className="px-2 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                placeholder="4+"
              />
            </div>
            <p className="text-xs text-content-tertiary mt-2 flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              Sessions per week
            </p>
          </div>

          {/* Session Days */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              Session Days * ({formData.creditHours} session{formData.creditHours > 1 ? 's' : ''}  per week)
            </label>
            <div className="space-y-2">
              {Array.from({ length: formData.creditHours }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-content-secondary min-w-[70px]">
                    Session {index + 1}
                  </span>
                  <select
                    value={sessionSelections[index]}
                    onChange={(e) => handleSessionDaySelect(index, Number(e.target.value))}
                    className="flex-1 px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  >
                    <option value="">Select day...</option>
                    {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => (
                      <option key={dayIndex} value={dayIndex}>
                        {WEEKDAY_FULL_NAMES[dayIndex]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {errors.weekdays && (
              <p className="text-xs text-attendance-danger mt-1.5">{errors.weekdays}</p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Start Date *
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <select
                value={startDate.day}
                onChange={(e) => setStartDate({ ...startDate, day: e.target.value })}
                className="px-2 sm:px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              >
                <option value="">Day</option>
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={startDate.month}
                onChange={(e) => setStartDate({ ...startDate, month: e.target.value })}
                className="px-2 sm:px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              >
                <option value="">Month</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                ))}
              </select>
              <select
                value={startDate.year}
                onChange={(e) => setStartDate({ ...startDate, year: e.target.value })}
                className="px-2 sm:px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              >
                <option value="">Year</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {errors.startDate && (
              <p className="text-xs text-attendance-danger mt-1.5">{errors.startDate}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              End Date *
            </label>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  vibrate([10])
                  setEndDateMode('exact')
                }}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all
                  ${endDateMode === 'exact'
                    ? 'bg-gradient-to-br from-accent to-accent-hover text-dark-bg'
                    : 'bg-dark-bg/50 text-content-secondary hover:bg-dark-surface-raised border border-dark-border/30'
                  }
                `}
              >
                Exact Date
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrate([10])
                  setEndDateMode('duration')
                }}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all
                  ${endDateMode === 'duration'
                    ? 'bg-gradient-to-br from-accent to-accent-hover text-dark-bg'
                    : 'bg-dark-bg/50 text-content-secondary hover:bg-dark-surface-raised border border-dark-border/30'
                  }
                `}
              >
                Duration
              </button>
            </div>

            {/* Exact Date Mode */}
            {endDateMode === 'exact' && (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <select
                  value={endDate.day}
                  onChange={(e) => setEndDate({ ...endDate, day: e.target.value })}
                  className="px-2 sm:px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                >
                  <option value="">Day</option>
                  {days.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={endDate.month}
                  onChange={(e) => setEndDate({ ...endDate, month: e.target.value })}
                  className="px-2 sm:px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                >
                  <option value="">Month</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>
                  ))}
                </select>
                <select
                  value={endDate.year}
                  onChange={(e) => setEndDate({ ...endDate, year: e.target.value })}
                  className="px-2 sm:px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                >
                  <option value="">Year</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration Mode */}
            {endDateMode === 'duration' && (
              <div>
                <div className="flex gap-1.5 sm:gap-2 mb-2">
                  {[4, 8, 12, 16].map(weeks => (
                    <button
                      key={weeks}
                      type="button"
                      onClick={() => {
                        vibrate([10])
                        setSemesterDuration(weeks)
                      }}
                      className={`
                        flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all
                        ${semesterDuration === weeks
                          ? 'bg-accent/20 text-accent border border-accent/30'
                          : 'bg-dark-bg/50 text-content-secondary hover:bg-dark-surface-raised border border-dark-border/30'
                        }
                      `}
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
                  onChange={(e) => {
                    const value = e.target.value === '' ? 16 : Number(e.target.value)
                    setSemesterDuration(value)
                  }}
                  className="w-full px-3 sm:px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  placeholder="Custom weeks"
                />
                {endDate.year && endDate.month && endDate.day && (
                  <p className="text-xs text-content-tertiary mt-2">
                    End date: {endDate.day} {months.find(m => m.value === String(endDate.month))?.label} {endDate.year}
                  </p>
                )}
              </div>
            )}

            {errors.endDate && (
              <p className="text-xs text-attendance-danger mt-1.5">{errors.endDate}</p>
            )}
            <p className="text-xs text-content-tertiary mt-2 flex items-start gap-1.5">
              <Calendar className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Default: 16 weeks from start date if not specified. Switch to "Exact Date" for custom end dates.</span>
            </p>
          </div>

          {/* Maximum Allowed Absences */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              Maximum Allowed Absences *
            </label>
            <input
              type="number"
              min="0"
              value={formData.allowedAbsences ?? ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : Number(e.target.value)
                setFormData({ ...formData, allowedAbsences: value })
                setUserModifiedAbsences(true)
              }}
              className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-content-tertiary mt-1.5">
              Default: {formData.creditHours} credit hour{formData.creditHours > 1 ? 's' : ''} × 3 = {formData.creditHours * 3} absences • Fully customizable
            </p>
          </div>

          {/* Initial Absences */}
          <div>
            <label className="block text-sm font-medium text-content-primary mb-2">
              Absences So Far
            </label>
            <input
              type="number"
              min="0"
              value={formData.initialAbsences || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : Number(e.target.value)
                setFormData({ ...formData, initialAbsences: value })
              }}
              className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              placeholder="0"
            />
            <p className="text-xs text-content-tertiary mt-1.5">
              Classes missed before using this app
            </p>
          </div>

          {/* Optional Details Section */}
          <div className="border-t border-dark-border/30 pt-4">
            <button
              type="button"
              onClick={() => {
                vibrate([10])
                setShowOptionalFields(!showOptionalFields)
              }}
              className="w-full flex items-center justify-between text-sm font-medium text-content-secondary hover:text-content-primary transition-colors"
            >
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Optional Details
              </span>
              {showOptionalFields ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <p className="text-xs text-content-tertiary mt-1">
              Add instructor, course code, section, and room info
            </p>

            {showOptionalFields && (
              <div className="space-y-4 mt-4">
                {/* Instructor Name */}
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    Instructor Name
                  </label>
                  <input
                    type="text"
                    value={formData.instructor || ''}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary placeholder-content-disabled focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                    placeholder="e.g., Dr. Ahmed Khan"
                  />
                </div>

                {/* Course Code */}
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={formData.courseCode || ''}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary placeholder-content-disabled focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase"
                    placeholder="e.g., CS-301"
                  />
                </div>

                {/* Section */}
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2">
                    Section
                  </label>
                  <input
                    type="text"
                    value={formData.section || ''}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary placeholder-content-disabled focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase"
                    placeholder="e.g., BCS-5B"
                  />
                </div>

                {/* Room / Location */}
                <div>
                  <label className="block text-sm font-medium text-content-primary mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Room / Location
                  </label>
                  <input
                    type="text"
                    value={formData.room || ''}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary placeholder-content-disabled focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                    placeholder="e.g., Room 301, Block A"
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </BaseModal>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  )
}

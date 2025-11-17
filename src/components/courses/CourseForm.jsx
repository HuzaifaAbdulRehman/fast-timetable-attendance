import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { X, Calendar, BookOpen, Hash } from 'lucide-react'
import { getTodayISO } from '../../utils/dateHelpers'
import { WEEKDAY_FULL_NAMES } from '../../utils/constants'

// Haptic feedback utility
const vibrate = (pattern = [10]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Detect mobile device
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
}

export default function CourseForm({ onClose, onSave, existingCourse = null }) {
  const { addCourse, updateCourse } = useApp()
  const modalRef = useRef(null)
  const [isMobileDevice] = useState(isMobile())

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
  })

  const [userModifiedAbsences, setUserModifiedAbsences] = useState(!!existingCourse?.allowedAbsences)

  const [startDate, setStartDate] = useState(existingStart.year ? existingStart : today)
  const [endDate, setEndDate] = useState(existingEnd)
  const [endDateMode, setEndDateMode] = useState('exact') // 'exact' or 'duration'
  const [semesterDuration, setSemesterDuration] = useState(16) // weeks
  const [errors, setErrors] = useState({})
  const [sessionSelections, setSessionSelections] = useState(
    existingCourse?.weekdays || Array(formData.creditHours).fill('')
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
    } else if (formData.shortName.length > 6) {
      newErrors.shortName = 'Short name must not exceed 6 characters'
    }
    if (formData.weekdays.length !== formData.creditHours) {
      newErrors.weekdays = `Select ${formData.creditHours} session day(s)`
    }
    if (!endDateISO) newErrors.endDate = 'End date is required'
    if (endDateISO && endDateISO <= startDateISO) {
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

    if (existingCourse) {
      updateCourse(existingCourse.id, courseData)
    } else {
      addCourse(courseData)
    }

    vibrate([10, 50, 10]) // Success pattern
    onSave()
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

  return (
    <div
      className={`
        fixed inset-0 bg-black/60 backdrop-blur-sm z-50
        ${isMobileDevice
          ? 'flex items-end'
          : 'flex items-center justify-center p-4 overflow-y-auto'
        }
      `}
      onClick={onClose}
    >
      <div
        className={`
          bg-dark-surface/95 backdrop-blur-xl border border-dark-border/50 shadow-glass-lg w-full
          ${isMobileDevice
            ? 'rounded-t-3xl max-h-[92vh] animate-slide-up'
            : 'relative rounded-2xl max-w-lg my-8'
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        {isMobileDevice && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-content-disabled/30 rounded-full"></div>
          </div>
        )}

        {/* Header - Sticky */}
        <div className={`sticky top-0 bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 p-5 z-10 ${isMobileDevice ? 'rounded-t-3xl' : 'rounded-t-2xl'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl border border-accent/20">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-content-primary">
                  {existingCourse ? 'Edit Course' : 'Add New Course'}
                </h2>
                <p className="text-xs text-content-tertiary">
                  Track your attendance
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-dark-surface-raised rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-content-secondary" />
            </button>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
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
              Short Name * <span className="text-content-tertiary font-normal text-xs">({formData.shortName.length}/6 characters)</span>
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().slice(0, 6)
                setFormData({ ...formData, shortName: value })
              }}
              maxLength={6}
              className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/50 rounded-xl text-content-primary placeholder-content-disabled focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all uppercase"
              placeholder="e.g., DSA or TOA"
            />
            <p className="text-xs text-content-tertiary mt-1.5">
              Short form for column display (2-6 characters)
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
                onChange={(e) => handleCreditHoursChange(Number(e.target.value) || 2)}
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
                    {[1, 2, 3, 4, 5].map(dayIndex => (
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
              Start Date
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={startDate.day}
                onChange={(e) => setStartDate({ ...startDate, day: e.target.value })}
                className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              >
                <option value="">Day</option>
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={startDate.month}
                onChange={(e) => setStartDate({ ...startDate, month: e.target.value })}
                className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              >
                <option value="">Month</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={startDate.year}
                onChange={(e) => setStartDate({ ...startDate, year: e.target.value })}
                className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              >
                <option value="">Year</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
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
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={endDate.day}
                  onChange={(e) => setEndDate({ ...endDate, day: e.target.value })}
                  className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                >
                  <option value="">Day</option>
                  {days.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={endDate.month}
                  onChange={(e) => setEndDate({ ...endDate, month: e.target.value })}
                  className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                >
                  <option value="">Month</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={endDate.year}
                  onChange={(e) => setEndDate({ ...endDate, year: e.target.value })}
                  className="px-3 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
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
                <div className="flex gap-2 mb-2">
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
                  onChange={(e) => setSemesterDuration(Number(e.target.value) || 16)}
                  className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  placeholder="Custom weeks"
                />
                {endDate.year && (
                  <p className="text-xs text-content-tertiary mt-2">
                    End date: {months.find(m => m.value === endDate.month)?.label} {endDate.day}, {endDate.year}
                  </p>
                )}
              </div>
            )}

            {errors.endDate && (
              <p className="text-xs text-attendance-danger mt-1.5">{errors.endDate}</p>
            )}
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
                setFormData({ ...formData, allowedAbsences: Number(e.target.value) || 0 })
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
              onChange={(e) => setFormData({ ...formData, initialAbsences: Number(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border/30 rounded-xl text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
              placeholder="0"
            />
            <p className="text-xs text-content-tertiary mt-1.5">
              Classes missed before using this app
            </p>
          </div>

          {/* Actions - Sticky */}
          <div className="sticky bottom-0 bg-gradient-to-t from-dark-surface via-dark-surface to-transparent pt-4 pb-1 -mx-5 px-5">
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-br from-accent to-accent-hover text-dark-bg font-medium px-5 py-3 rounded-xl transition-all duration-200 shadow-accent hover:shadow-accent hover:scale-[1.02]"
              >
                {existingCourse ? 'Update Course' : 'Add Course'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 bg-dark-bg/50 hover:bg-dark-surface-raised text-content-primary border border-dark-border/30 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

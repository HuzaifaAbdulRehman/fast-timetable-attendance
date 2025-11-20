import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  getDay,
  isToday,
  isFuture,
  isPast,
  addWeeks,
  isSameDay,
  startOfDay,
} from 'date-fns'

import { WEEKDAY_NAMES, WEEKDAY_FULL_NAMES } from './constants'

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
export function toISODate(date) {
  return format(new Date(date), 'yyyy-MM-dd')
}

/**
 * Parse ISO date string to Date object
 */
export function fromISODate(isoString) {
  return parseISO(isoString)
}

/**
 * Format date for display (e.g., "Mon 18")
 */
export function formatDateShort(date) {
  const d = new Date(date)
  return format(d, 'EEE d')
}

/**
 * Format date for display (e.g., "Monday, November 18")
 */
export function formatDateLong(date) {
  const d = new Date(date)
  return format(d, 'EEEE, MMMM d')
}

/**
 * Get weekday name (e.g., "Monday")
 */
export function getWeekdayName(date) {
  const dayIndex = getDay(new Date(date))
  return WEEKDAY_FULL_NAMES[dayIndex]
}

/**
 * Get short weekday name (e.g., "Mon")
 */
export function getWeekdayShort(date) {
  const dayIndex = getDay(new Date(date))
  return WEEKDAY_NAMES[dayIndex]
}

/**
 * Check if date is today
 */
export function checkIsToday(date) {
  return isToday(new Date(date))
}

/**
 * Check if date is in the future
 */
export function checkIsFuture(date) {
  return isFuture(new Date(date))
}

/**
 * Check if date is in the past
 */
export function checkIsPast(date) {
  return isPast(new Date(date))
}

/**
 * Generate weeks with dates from start to end
 * Returns array of weeks, each containing array of dates
 */
export function generateWeeks(startDate, numberOfWeeks = 4) {
  const start = startOfDay(new Date(startDate))
  const end = addWeeks(start, numberOfWeeks)

  const weeks = eachWeekOfInterval(
    { start, end },
    { weekStartsOn: 1 } // Monday
  )

  return weeks.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return {
      weekNumber: index + 1,
      startDate: toISODate(weekStart),
      endDate: toISODate(weekEnd),
      label: `Week ${index + 1} • ${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`,
      days: days.map(day => ({
        date: toISODate(day),
        dayName: getWeekdayName(day),
        dayShort: getWeekdayShort(day),
        dayOfWeek: getDay(day),
        isToday: checkIsToday(day),
        isFuture: checkIsFuture(day),
        isPast: checkIsPast(day),
      }))
    }
  })
}

/**
 * Get all dates between start and end that match the given weekdays
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {number[]} weekdays - Array of weekday numbers (0=Sun, 1=Mon, etc.)
 * @returns {string[]} Array of ISO date strings
 */
export function getDatesForWeekdays(startDate, endDate, weekdays) {
  const start = fromISODate(startDate)
  const end = fromISODate(endDate)

  const allDates = eachDayOfInterval({ start, end })

  return allDates
    .filter(date => weekdays.includes(getDay(date)))
    .map(date => toISODate(date))
}

/**
 * Check if a course has a class on a given date
 * @param {Object} course - Course object with weekdays array
 * @param {string} date - ISO date string
 * @returns {boolean}
 */
export function courseHasClassOnDate(course, date) {
  const dayOfWeek = getDay(fromISODate(date))
  return course.weekdays.includes(dayOfWeek)
}

/**
 * Get the number of sessions a course has on a given date
 * Handles back-to-back classes (e.g., weekdays: [1, 1, 3] = 2 sessions on Monday)
 * @param {Object} course - Course object with weekdays array
 * @param {string} date - ISO date string
 * @returns {number} Number of sessions (0 if no class)
 */
export function getSessionCountOnDate(course, date) {
  const dayOfWeek = getDay(fromISODate(date))
  return course.weekdays.filter(day => day === dayOfWeek).length
}

/**
 * Count total classes for a course
 * Correctly handles multiple sessions on the same day (e.g., back-to-back classes)
 * Uses enrollmentStartDate if available to only count classes after enrollment
 * @param {Object} course - Course object
 * @returns {number}
 */
export function calculateTotalClasses(course) {
  if (!course || !course.startDate || !course.endDate || !course.weekdays) return 0

  try {
    // Use enrollmentStartDate for attendance calculation (when student actually enrolled)
    // This ensures we only count classes from the day they joined
    const effectiveStartDate = course.enrollmentStartDate || course.startDate

    const dates = getDatesForWeekdays(
      effectiveStartDate,
      course.endDate,
      course.weekdays
    )

    // Count total sessions across all dates
    // Each date might have multiple sessions (back-to-back classes)
    return dates.reduce((total, date) => {
      return total + getSessionCountOnDate(course, date)
    }, 0)
  } catch (error) {
    console.error('Error calculating total classes:', error, course)
    return 0
  }
}

/**
 * Check if two dates are the same day
 */
export function areSameDay(date1, date2) {
  return isSameDay(new Date(date1), new Date(date2))
}

/**
 * Get today's date as ISO string
 */
export function getTodayISO() {
  return toISODate(new Date())
}

/**
 * Convert 24-hour time to 12-hour format
 * @param {string} time24 - Time in 24-hour format (e.g., "14:30" or "09:00")
 * @returns {string} Time in 12-hour format (e.g., "2:30 PM" or "9:00 AM")
 */
export function formatTimeTo12Hour(time24) {
  if (!time24) return '9:00 AM'

  // If already in 12-hour format, return as is
  if (time24.includes('AM') || time24.includes('PM')) {
    return time24.trim()
  }

  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes || '00'} ${ampm}`
}

/**
 * Convert time range from 24-hour to 12-hour format
 * @param {string} timeRange - Time range in 24-hour format (e.g., "14:30-16:00")
 * @returns {string} Time range in 12-hour format (e.g., "2:30 PM - 4:00 PM")
 */
export function formatTimeRangeTo12Hour(timeRange) {
  if (!timeRange) return 'TBA'

  // If already in 12-hour format, return as is
  if (timeRange.includes('AM') || timeRange.includes('PM')) {
    return timeRange.trim()
  }

  const [start, end] = timeRange.split('-').map(t => t.trim())
  if (!start || !end) return timeRange

  const startTime12 = formatTimeTo12Hour(start)
  const endTime12 = formatTimeTo12Hour(end)

  return `${startTime12} - ${endTime12}`
}

import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { STORAGE_KEYS, SESSION_STATUS, DEFAULT_ALLOWED_ABSENCE_PERCENTAGE, COURSE_COLORS } from '../utils/constants'
import { calculateTotalClasses, courseHasClassOnDate, getSessionCountOnDate, getTodayISO } from '../utils/dateHelpers'
import { calculateAttendanceStats, getDayStatus } from '../utils/attendanceCalculator'
import {
  getNotificationSettings,
  saveNotificationSettings,
  initNotificationScheduler,
  cleanupNotificationScheduler,
  DEFAULT_NOTIFICATION_SETTINGS
} from '../utils/notificationManager'
import { generateId } from '../utils/id'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [allCourses, setAllCourses] = useLocalStorage(STORAGE_KEYS.COURSES, [])
  const [allAttendance, setAllAttendance] = useLocalStorage(STORAGE_KEYS.ATTENDANCE, [])
  const [semesters, setSemesters] = useLocalStorage(STORAGE_KEYS.SEMESTERS, [])
  const [activeSemesterId, setActiveSemesterId] = useLocalStorage(STORAGE_KEYS.ACTIVE_SEMESTER, null)

  // Undo history (not persisted, only for current session)
  const [undoHistory, setUndoHistory] = useState(null)

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState(getNotificationSettings())
  const [notificationSchedulerId, setNotificationSchedulerId] = useState(null)

  // Initialize default semester if none exists
  useEffect(() => {
    // Avoid race condition by checking both conditions in one effect
    let shouldUpdate = false
    let newSemesters = semesters
    let newActiveSemesterId = activeSemesterId

    if (semesters.length === 0) {
      // No semesters exist, create default
      const defaultSemester = {
        id: generateId('semester'),
        name: 'Current Semester',
        createdAt: Date.now(),
        isActive: true
      }
      newSemesters = [defaultSemester]
      newActiveSemesterId = defaultSemester.id
      shouldUpdate = true
    } else if (!activeSemesterId) {
      // Semesters exist but no active one, select first
      newActiveSemesterId = semesters[0].id
      shouldUpdate = true
    }

    if (shouldUpdate) {
      // Batch updates to avoid race condition
      if (newSemesters !== semesters) {
        setSemesters(newSemesters)
      }
      if (newActiveSemesterId !== activeSemesterId) {
        setActiveSemesterId(newActiveSemesterId)
      }
    }
  }, []) // Only run once on mount

  // Filter data by active semester
  const courses = allCourses.filter(c => c.semesterId === activeSemesterId)
  const attendance = allAttendance.filter(a => a.semesterId === activeSemesterId)

  const ensureActiveSemester = useCallback(() => {
    if (activeSemesterId) return activeSemesterId

    if (semesters.length > 0) {
      const fallbackId = semesters[0].id
      setActiveSemesterId(fallbackId)
      return fallbackId
    }

    const fallbackSemester = {
      id: generateId('semester'),
      name: 'Current Semester',
      createdAt: Date.now(),
      isActive: true
    }

    setSemesters(prev => [...prev, fallbackSemester])
    setActiveSemesterId(fallbackSemester.id)
    return fallbackSemester.id
  }, [activeSemesterId, semesters, setSemesters, setActiveSemesterId])

  const setCourses = useCallback((updater) => {
    setAllCourses(prev => {
      const currentSemesterCourses = prev.filter(c => c.semesterId === activeSemesterId)
      const otherCourses = prev.filter(c => c.semesterId !== activeSemesterId)
      const updated = typeof updater === 'function' ? updater(currentSemesterCourses) : updater
      return [...otherCourses, ...updated]
    })
  }, [activeSemesterId, setAllCourses])

  const setAttendance = useCallback((updater) => {
    setAllAttendance(prev => {
      const currentSemesterAttendance = prev.filter(a => a.semesterId === activeSemesterId)
      const otherAttendance = prev.filter(a => a.semesterId !== activeSemesterId)
      const updated = typeof updater === 'function' ? updater(currentSemesterAttendance) : updater
      return [...otherAttendance, ...updated]
    })
  }, [activeSemesterId, setAllAttendance])

  // Migrate existing courses to have colors, semesterIds, and shortNames
  useEffect(() => {
    const coursesNeedingMigration = allCourses.filter(c => !c.semesterId || !c.color || !c.colorHex || !c.shortName)
    if (coursesNeedingMigration.length > 0 && activeSemesterId) {
      setAllCourses(prev => prev.map((course, index) => {
        const updates = { ...course }
        if (!course.semesterId) updates.semesterId = activeSemesterId
        if (!course.color || !course.colorHex) {
          const assignedColor = COURSE_COLORS[index % COURSE_COLORS.length]
          updates.color = assignedColor.name
          updates.colorHex = assignedColor.hex
        }
        if (!course.shortName) {
          // Auto-generate short name from first letters of each word, max 6 chars
          const words = course.name.trim().split(/\s+/)
          updates.shortName = words.map(w => w[0]).join('').toUpperCase().slice(0, 6)
        }
        return updates
      }))
    }

    // Migrate attendance records
    const attendanceNeedingMigration = allAttendance.filter(a => !a.semesterId)
    if (attendanceNeedingMigration.length > 0 && activeSemesterId) {
      setAllAttendance(prev => prev.map(record =>
        record.semesterId ? record : { ...record, semesterId: activeSemesterId }
      ))
    }
  }, [activeSemesterId])

  // Initialize notification scheduler
  useEffect(() => {
    if (notificationSettings.enabled) {
      const schedulerId = initNotificationScheduler()
      setNotificationSchedulerId(schedulerId)

      return () => {
        cleanupNotificationScheduler(schedulerId)
      }
    } else {
      if (notificationSchedulerId) {
        cleanupNotificationScheduler(notificationSchedulerId)
        setNotificationSchedulerId(null)
      }
    }
  }, [notificationSettings.enabled, notificationSettings.time])

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  const addCourse = useCallback((courseData) => {
    // Validate required fields
    if (!courseData || typeof courseData !== 'object') {
      console.error('Invalid course data: must be an object')
      return null
    }

    if (!courseData.name || typeof courseData.name !== 'string' || courseData.name.trim() === '') {
      console.error('Invalid course data: name is required')
      return null
    }

    // Validate weekdays array
    if (!courseData.weekdays || !Array.isArray(courseData.weekdays) || courseData.weekdays.length === 0) {
      console.error('Invalid course data: weekdays must be a non-empty array')
      return null
    }

    // Validate weekday values (0-6)
    const validWeekdays = courseData.weekdays.every(day =>
      typeof day === 'number' && day >= 0 && day <= 6
    )
    if (!validWeekdays) {
      console.error('Invalid course data: weekdays must be numbers between 0-6')
      return null
    }

    // Validate dates if provided
    if (courseData.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(courseData.startDate)) {
      console.error('Invalid course data: startDate must be in YYYY-MM-DD format')
      return null
    }

    if (courseData.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(courseData.endDate)) {
      console.error('Invalid course data: endDate must be in YYYY-MM-DD format')
      return null
    }

    // Validate credit hours
    if (courseData.creditHours !== undefined) {
      const creditHours = Number(courseData.creditHours)
      if (isNaN(creditHours) || creditHours < 0 || creditHours > 10) {
        console.error('Invalid course data: creditHours must be a number between 0-10')
        return null
      }
    }

    // Find the first available color not currently in use
    const usedColors = courses.map(c => c.color)
    let assignedColor = COURSE_COLORS[0] // Default to first color

    // Try to find an unused color
    for (let i = 0; i < COURSE_COLORS.length; i++) {
      if (!usedColors.includes(COURSE_COLORS[i].name)) {
        assignedColor = COURSE_COLORS[i]
        break
      }
    }

    // If all colors are used, cycle through based on course count
    if (usedColors.includes(assignedColor.name) && courses.length >= COURSE_COLORS.length) {
      assignedColor = COURSE_COLORS[courses.length % COURSE_COLORS.length]
    }

    const normalizedStartDate = courseData.startDate || courseData.endDate || getTodayISO()
    const normalizedEndDate = courseData.endDate || normalizedStartDate

    let totalClassesEstimate = courseData.creditHours * 16
    try {
      totalClassesEstimate = calculateTotalClasses({
        ...courseData,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate
      })
    } catch (error) {
      console.error('Failed to calculate total classes, falling back to heuristic value.', error)
    }

    const computedAllowedAbsences = courseData.allowedAbsences ??
      Math.floor(totalClassesEstimate * DEFAULT_ALLOWED_ABSENCE_PERCENTAGE)

    const semesterIdForCourse = ensureActiveSemester()

    const newCourse = {
      id: generateId('course'),
      name: courseData.name,
      shortName: courseData.shortName,
      creditHours: courseData.creditHours || 2,
      weekdays: courseData.weekdays,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      initialAbsences: courseData.initialAbsences || 0,
      allowedAbsences: computedAllowedAbsences,
      color: courseData.color || assignedColor.name,
      colorHex: assignedColor.hex,
      semesterId: semesterIdForCourse,
      createdAt: Date.now(),
      
      // Preserve timetable metadata for TimetableView
      schedule: courseData.schedule || [],
      instructor: courseData.instructor,
      room: courseData.room || courseData.roomNumber,
      roomNumber: courseData.roomNumber || courseData.room,
      building: courseData.building,
      courseCode: courseData.courseCode,
      section: courseData.section,
      timeSlot: courseData.timeSlot,
    }

    setCourses(prev => [...prev, newCourse])
    return newCourse
  }, [setCourses, courses, ensureActiveSemester])

  const updateCourse = useCallback((courseId, updates) => {
    setCourses(prev =>
      prev.map(course =>
        course.id === courseId ? { ...course, ...updates } : course
      )
    )
  }, [setCourses])

  const deleteCourse = useCallback((courseId) => {
    setCourses(prev => prev.filter(course => course.id !== courseId))
    // Also delete all attendance records for this course
    setAttendance(prev => prev.filter(record => record.courseId !== courseId))
  }, [setCourses, setAttendance])

  /**
   * Reorder course columns (move left or right)
   */
  const reorderCourse = useCallback((courseId, direction) => {
    setCourses(prev => {
      const currentIndex = prev.findIndex(c => c.id === courseId && c.semesterId === activeSemesterId)
      if (currentIndex === -1) return prev

      const semesterCourses = prev.filter(c => c.semesterId === activeSemesterId)
      const otherCourses = prev.filter(c => c.semesterId !== activeSemesterId)

      const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1

      // Check bounds
      if (newIndex < 0 || newIndex >= semesterCourses.length) return prev

      // Swap courses
      const temp = semesterCourses[currentIndex]
      semesterCourses[currentIndex] = semesterCourses[newIndex]
      semesterCourses[newIndex] = temp

      // Update order field for persistence
      const reorderedCourses = semesterCourses.map((c, idx) => ({
        ...c,
        order: idx
      }))

      return [...otherCourses, ...reorderedCourses]
    })
  }, [setCourses, activeSemesterId])

  // ============================================
  // ATTENDANCE MANAGEMENT
  // ============================================

  /**
   * Toggle attendance for a specific session
   */
  const toggleSession = useCallback((courseId, date, newStatus = null) => {
    setAttendance(prev => {
      const existing = prev.find(r => r.courseId === courseId && r.date === date)

      if (existing) {
        if (newStatus === null) {
          // Remove record (mark as present by removing absence)
          return prev.filter(r => !(r.courseId === courseId && r.date === date))
        } else {
          // Update existing record
          return prev.map(r =>
            r.courseId === courseId && r.date === date
              ? { ...r, status: newStatus, isOverride: true }
              : r
          )
        }
      } else {
        // Add new record (only if marking absent/cancelled/proxy)
        if (newStatus && newStatus !== SESSION_STATUS.PRESENT) {
          return [
            ...prev,
            {
              id: generateId('attendance'),
              courseId,
              date,
              status: newStatus,
              isOverride: false,
              semesterId: activeSemesterId,
              createdAt: Date.now(),
            }
          ]
        }
        return prev
      }
    })
  }, [setAttendance, activeSemesterId])

  /**
   * Toggle an entire day (all courses on that date)
   */
  const toggleDay = useCallback((date) => {
    const dayStatus = getDayStatus(date, courses, attendance)
    const coursesOnDate = courses.filter(course => courseHasClassOnDate(course, date))

    if (coursesOnDate.length === 0) return

    // Save current state for undo
    const previousAttendance = attendance.filter(record => record.date === date)
    const coursesCount = coursesOnDate.length

    if (dayStatus === 'absent' || dayStatus === 'mixed') {
      // Mark all as present (remove all absence records for this date)
      setAttendance(prev =>
        prev.filter(record => record.date !== date)
      )

      // Save undo action
      setUndoHistory({
        type: 'toggleDay',
        date,
        coursesCount,
        previousState: previousAttendance,
        description: `Marked ${coursesCount} course${coursesCount > 1 ? 's' : ''} present`
      })
    } else {
      // Mark all as absent
      // Create one record per session (handles back-to-back classes)
      const newRecords = []
      coursesOnDate.forEach(course => {
        const sessionCount = getSessionCountOnDate(course, date)
        for (let i = 0; i < sessionCount; i++) {
          newRecords.push({
            id: generateId('attendance'),
            courseId: course.id,
            date,
            status: SESSION_STATUS.ABSENT,
            isOverride: false,
            semesterId: activeSemesterId,
            createdAt: Date.now(),
          })
        }
      })

      setAttendance(prev => {
        // Remove existing records for this date, then add new ones
        const filtered = prev.filter(record => record.date !== date)
        return [...filtered, ...newRecords]
      })

      // Save undo action
      setUndoHistory({
        type: 'toggleDay',
        date,
        coursesCount,
        previousState: previousAttendance,
        description: `Marked ${coursesCount} course${coursesCount > 1 ? 's' : ''} absent`
      })
    }
  }, [courses, attendance, setAttendance, activeSemesterId])

  /**
   * Undo the last action
   */
  const undo = useCallback(() => {
    if (!undoHistory) return false

    if (undoHistory.type === 'toggleDay') {
      // Restore previous attendance state for this date
      setAttendance(prev => {
        // Remove all records for this date
        const filtered = prev.filter(record => record.date !== undoHistory.date)
        // Add back the previous state
        return [...filtered, ...undoHistory.previousState]
      })
    }

    // Clear undo history after using it
    setUndoHistory(null)
    return true
  }, [undoHistory, setAttendance])

  /**
   * Mark multiple days as absent
   */
  const markDaysAbsent = useCallback((dates) => {
    const newRecords = []

    dates.forEach(date => {
      const coursesOnDate = courses.filter(course => courseHasClassOnDate(course, date))

      coursesOnDate.forEach(course => {
        // Create one record per session (handles back-to-back classes)
        const sessionCount = getSessionCountOnDate(course, date)
        for (let i = 0; i < sessionCount; i++) {
          newRecords.push({
            id: generateId('attendance'),
            courseId: course.id,
            date,
            status: SESSION_STATUS.ABSENT,
            isOverride: false,
            semesterId: activeSemesterId,
            createdAt: Date.now(),
          })
        }
      })
    })

    setAttendance(prev => {
      // Remove existing records for these dates, then add new ones
      const filtered = prev.filter(record => !dates.includes(record.date))
      return [...filtered, ...newRecords]
    })
  }, [courses, setAttendance, activeSemesterId])

  /**
   * Clear all attendance data
   */
  const clearAttendance = useCallback(() => {
    setAttendance([])
  }, [setAttendance])

  // ============================================
  // SEMESTER MANAGEMENT
  // ============================================

  const createSemester = useCallback((semesterData) => {
    const newSemester = {
      id: generateId('semester'),
      name: semesterData.name || `Semester ${semesters.length + 1}`,
      createdAt: Date.now(),
      isActive: false,
      isArchived: false,
    }
    setSemesters(prev => [...prev, newSemester])
    setActiveSemesterId(newSemester.id)
    return newSemester
  }, [semesters, setSemesters, setActiveSemesterId])

  const switchSemester = useCallback((semesterId) => {
    setActiveSemesterId(semesterId)
  }, [setActiveSemesterId])

  const renameSemester = useCallback((semesterId, newName) => {
    setSemesters(prev => prev.map(s =>
      s.id === semesterId ? { ...s, name: newName } : s
    ))
  }, [setSemesters])

  const archiveSemester = useCallback((semesterId) => {
    setSemesters(prev => prev.map(s =>
      s.id === semesterId ? { ...s, isArchived: true } : s
    ))

    // Switch to another semester if this was the active one
    if (activeSemesterId === semesterId) {
      const remaining = semesters.filter(s => s.id !== semesterId && !s.isArchived)
      if (remaining.length > 0) {
        setActiveSemesterId(remaining[0].id)
      }
    }
  }, [semesters, activeSemesterId, setSemesters, setActiveSemesterId])

  const unarchiveSemester = useCallback((semesterId) => {
    setSemesters(prev => prev.map(s =>
      s.id === semesterId ? { ...s, isArchived: false } : s
    ))
  }, [setSemesters])

  const deleteSemester = useCallback((semesterId) => {
    // Don't delete if it's the only semester
    if (semesters.length === 1) return

    // Remove all courses and attendance for this semester
    setAllCourses(prev => prev.filter(c => c.semesterId !== semesterId))
    setAllAttendance(prev => prev.filter(a => a.semesterId !== semesterId))

    // Remove the semester
    setSemesters(prev => prev.filter(s => s.id !== semesterId))

    // Switch to another semester if this was the active one
    if (activeSemesterId === semesterId) {
      const remaining = semesters.filter(s => s.id !== semesterId)
      if (remaining.length > 0) {
        setActiveSemesterId(remaining[0].id)
      }
    }
  }, [semesters, activeSemesterId, setAllCourses, setAllAttendance, setSemesters, setActiveSemesterId])

  // ============================================
  // STATS CALCULATIONS
  // ============================================

  const getCourseStats = useCallback((courseId) => {
    const course = courses.find(c => c.id === courseId)
    if (!course) return null

    return calculateAttendanceStats(course, attendance)
  }, [courses, attendance])

  // ============================================
  // NOTIFICATION MANAGEMENT
  // ============================================

  const updateNotificationSettings = useCallback((newSettings) => {
    const updated = { ...notificationSettings, ...newSettings }
    setNotificationSettings(updated)
    saveNotificationSettings(updated)
  }, [notificationSettings])

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = {
    // State
    courses,
    attendance,
    semesters,
    activeSemesterId,
    undoHistory,
    notificationSettings,

    // Course management
    addCourse,
    updateCourse,
    deleteCourse,
    reorderCourse,

    // Attendance management
    toggleSession,
    toggleDay,
    markDaysAbsent,
    clearAttendance,
    undo,

    // Semester management
    createSemester,
    switchSemester,
    renameSemester,
    archiveSemester,
    unarchiveSemester,
    deleteSemester,

    // Stats
    getCourseStats,

    // Notifications
    updateNotificationSettings,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

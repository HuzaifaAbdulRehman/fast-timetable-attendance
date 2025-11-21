import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
import { useApp } from '../../context/AppContext'
import { GRADE_SCALE, calculateGPA, getGPAColor, formatGPA, getTotalCredits, calculateCGPA, getGradePoints } from '../../utils/gpaCalculator'
import { BookOpen, Plus, Save, Trash2, Calendar, Award, TrendingUp, Eye, EyeOff, ChevronDown, ChevronUp, Edit2, AlertTriangle, CheckCircle2, XCircle, Hash, Users, GraduationCap, ToggleLeft, ToggleRight } from 'lucide-react'
import Toast from '../shared/Toast'
import { vibrate } from '../../utils/uiHelpers'
import GPAForOthers from './GPAForOthers'
import SemesterSetupModal from './SemesterSetupModal'

export default function GPAView() {
  const { courses } = useApp()

  // Import courses from My Courses
  const [gpaCourses, setGpaCourses] = useState([])
  const [manualCourses, setManualCourses] = useState([])
  const [currentSemesterName, setCurrentSemesterName] = useState('')
  const [currentSemesterNumber, setCurrentSemesterNumber] = useState(1)
  const [savedSemesters, setSavedSemesters] = useState([])
  const [toast, setToast] = useState(null)
  const [editingSemester, setEditingSemester] = useState(null)
  const [showCurrentSemester, setShowCurrentSemester] = useState(true)
  const [expandedSemesters, setExpandedSemesters] = useState(new Set())

  // Undo state for deletions
  const [deletedCourse, setDeletedCourse] = useState(null)
  const [deletedSemester, setDeletedSemester] = useState(null)

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null) // { id, name }

  // Semester setup modal state
  const [showSemesterSetupModal, setShowSemesterSetupModal] = useState(false)

  // Tab state: 'your-gpa' or 'for-others'
  const [activeTab, setActiveTab] = useState('your-gpa')

  // Drag state for semester reordering
  const [draggedSemester, setDraggedSemester] = useState(null)
  const [dragOverSemester, setDragOverSemester] = useState(null)

  // Batch operations state
  const [batchMode, setBatchMode] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState(new Set())
  const [batchGrade, setBatchGrade] = useState('')

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false)

  // Refs for scrolling
  const currentSemesterRef = useRef(null)
  const savedSemestersRef = useRef(null)

  // Load saved semesters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedSemesters')
    if (saved) {
      try {
        setSavedSemesters(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading semesters:', error)
      }
    }
  }, [])

  // Cleanup: Dismiss toast when component unmounts (tab switch)
  useEffect(() => {
    return () => {
      setToast(null)
    }
  }, [])

  // Manual import courses from My Courses
  const handleImportCourses = () => {
    vibrate([10])

    if (!courses || courses.length === 0) {
      setToast({ message: 'No courses found in My Courses', type: 'warning' })
      return
    }

    const imported = courses.map(course => ({
      id: course.id,
      courseName: course.name,
      courseCode: course.code || course.courseCode,
      creditHours: course.creditHours || 3, // Default to 3 if not specified
      grade: '', // Empty by default
      isImported: true,
      hidden: false // Visible by default
    }))

    setGpaCourses(imported)
    setToast({ message: `${imported.length} courses imported from My Courses`, type: 'success' })
  }

  // Calculate current semester GPA (only visible courses)
  const allCourses = useMemo(() => [...gpaCourses, ...manualCourses], [gpaCourses, manualCourses])
  const visibleCourses = useMemo(() => allCourses.filter(c => !c.hidden), [allCourses])
  const currentGPA = useMemo(() => calculateGPA(visibleCourses), [visibleCourses])
  const totalCredits = useMemo(() => getTotalCredits(visibleCourses), [visibleCourses])
  const gpaColor = useMemo(() => getGPAColor(currentGPA), [currentGPA])

  // Calculate CGPA from included saved semesters only
  const includedSemesters = useMemo(() => savedSemesters.filter(s => s.includeInCGPA !== false), [savedSemesters])
  const cgpa = useMemo(() => calculateCGPA(includedSemesters), [includedSemesters])
  const cgpaColor = useMemo(() => getGPAColor(cgpa), [cgpa])

  // Calculate overall credits from all included semesters
  const overallCredits = useMemo(() => {
    return includedSemesters.reduce((sum, sem) => sum + sem.totalCredits, 0)
  }, [includedSemesters])

  // Handle grade change for imported courses
  const handleGradeChange = (courseId, newGrade) => {
    vibrate([5])
    setGpaCourses(prev => prev.map(course =>
      course.id === courseId ? { ...course, grade: newGrade } : course
    ))
  }

  // Handle credit hours change for imported courses
  const handleCreditChange = (courseId, newCredits) => {
    const credits = parseInt(newCredits)
    if (credits > 0 && credits <= 6) {
      setGpaCourses(prev => prev.map(course =>
        course.id === courseId ? { ...course, creditHours: credits } : course
      ))
    }
  }

  // Toggle course visibility (include/exclude from GPA calculation)
  const handleToggleCourseVisibility = (courseId, isManual = false) => {
    vibrate([5])
    if (isManual) {
      setManualCourses(prev => prev.map(course =>
        course.id === courseId ? { ...course, hidden: !course.hidden } : course
      ))
    } else {
      setGpaCourses(prev => prev.map(course =>
        course.id === courseId ? { ...course, hidden: !course.hidden } : course
      ))
    }
  }

  // Delete imported course with undo
  const handleDeleteImportedCourse = (courseId) => {
    vibrate([15])
    const courseToDelete = gpaCourses.find(c => c.id === courseId)
    if (!courseToDelete) return

    setGpaCourses(prev => prev.filter(course => course.id !== courseId))
    setDeletedCourse({ course: courseToDelete, isManual: false })
    setToast({
      message: 'Course removed',
      type: 'info',
      action: {
        label: 'UNDO',
        onClick: () => handleUndoCourseDelete()
      }
    })
  }

  // Undo course deletion
  const handleUndoCourseDelete = () => {
    if (!deletedCourse) return

    vibrate([10])
    if (deletedCourse.isManual) {
      setManualCourses(prev => [...prev, deletedCourse.course])
    } else {
      setGpaCourses(prev => [...prev, deletedCourse.course])
    }
    setDeletedCourse(null)
    setToast({ message: 'Course restored', type: 'success' })
  }

  // Toggle semester expansion
  const handleToggleSemester = (semesterId) => {
    vibrate([10])
    setExpandedSemesters(prev => {
      const newSet = new Set(prev)
      if (newSet.has(semesterId)) {
        newSet.delete(semesterId)
      } else {
        newSet.add(semesterId)
      }
      return newSet
    })
  }

  // Toggle semester inclusion in CGPA
  const handleToggleSemesterInclusion = (semesterId) => {
    vibrate([5])
    const updatedSemesters = savedSemesters.map(sem =>
      sem.id === semesterId ? { ...sem, includeInCGPA: sem.includeInCGPA === false ? true : false } : sem
    )
    setSavedSemesters(updatedSemesters)
    localStorage.setItem('savedSemesters', JSON.stringify(updatedSemesters))
  }

  // Generate next available semester number
  const generateSemesterNumber = () => {
    if (savedSemesters.length === 0) return 1

    // Get all semester numbers
    const semesterNumbers = savedSemesters
      .map(s => s.semesterNumber || 0)
      .filter(n => n > 0)

    if (semesterNumbers.length === 0) return savedSemesters.length + 1

    const maxNumber = Math.max(...semesterNumbers)
    return maxNumber + 1
  }

  // Add manual course
  const handleAddManualCourse = () => {
    vibrate([10])
    const newCourse = {
      id: `manual-${Date.now()}`,
      courseName: '',
      courseCode: '',
      creditHours: 3,
      grade: '',
      isImported: false,
      hidden: false
    }
    setManualCourses(prev => [...prev, newCourse])
  }

  // Update manual course
  const handleManualCourseChange = (courseId, field, value) => {
    setManualCourses(prev => prev.map(course =>
      course.id === courseId ? { ...course, [field]: value } : course
    ))
  }

  // Delete manual course with undo
  const handleDeleteManualCourse = (courseId) => {
    vibrate([15])
    const courseToDelete = manualCourses.find(c => c.id === courseId)
    if (!courseToDelete) return

    setManualCourses(prev => prev.filter(course => course.id !== courseId))
    setDeletedCourse({ course: courseToDelete, isManual: true })
    setToast({
      message: 'Course removed',
      type: 'info',
      action: {
        label: 'UNDO',
        onClick: () => handleUndoCourseDelete()
      }
    })
  }

  // Save current semester
  const handleSaveSemester = () => {
    // Use current semester number or generate next available
    const semesterNumber = currentSemesterNumber
    const semesterName = currentSemesterName.trim() || `Semester ${semesterNumber}`

    // Check for duplicate semester numbers (excluding current edit)
    const duplicateSemester = savedSemesters.find(s =>
      s.semesterNumber === semesterNumber &&
      (!editingSemester || s.id !== editingSemester.id)
    )

    if (duplicateSemester) {
      setToast({
        message: `Semester ${semesterNumber} already exists. Please choose a different number.`,
        type: 'warning'
      })
      return
    }

    const coursesWithGrades = allCourses.filter(c => c.grade && c.creditHours > 0)
    if (coursesWithGrades.length === 0) {
      setToast({ message: 'Please add grades to at least one course', type: 'warning' })
      return
    }

    // Check for empty course names
    const emptyNameCourses = coursesWithGrades.filter(c => !c.courseName || c.courseName.trim() === '')
    if (emptyNameCourses.length > 0) {
      setToast({ message: 'Please add names to all courses before saving', type: 'warning' })
      return
    }

    vibrate([10, 50, 10])

    const newSemester = {
      id: editingSemester?.id || `sem-${Date.now()}`,
      semesterNumber,
      name: semesterName,
      courses: coursesWithGrades,
      gpa: currentGPA,
      totalCredits,
      createdAt: editingSemester?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      includeInCGPA: editingSemester?.includeInCGPA !== undefined ? editingSemester.includeInCGPA : true
    }

    let updatedSemesters
    let hasChanges = false

    if (editingSemester) {
      // Check if anything actually changed
      const existingSemester = savedSemesters.find(s => s.id === editingSemester.id)

      if (existingSemester) {
        // Compare name, semester number, and courses (grades)
        const nameChanged = existingSemester.name !== semesterName
        const numberChanged = existingSemester.semesterNumber !== semesterNumber
        const coursesChanged = JSON.stringify(existingSemester.courses.map(c => ({ id: c.id, grade: c.grade, creditHours: c.creditHours })))
                              !== JSON.stringify(coursesWithGrades.map(c => ({ id: c.id, grade: c.grade, creditHours: c.creditHours })))

        hasChanges = nameChanged || numberChanged || coursesChanged

        if (!hasChanges) {
          // No changes detected - just close editing mode without saving
          setCurrentSemesterName('')
          setCurrentSemesterNumber(generateSemesterNumber())
          setManualCourses([])
          setGpaCourses([])
          setEditingSemester(null)
          setToast({ message: 'No changes made', type: 'info' })
          return
        }
      }

      // Update existing semester
      updatedSemesters = savedSemesters.map(sem =>
        sem.id === editingSemester.id ? newSemester : sem
      )
      setToast({ message: `"${semesterName}" updated successfully`, type: 'success' })
    } else {
      // Add new semester
      updatedSemesters = [...savedSemesters, newSemester]
      setToast({ message: `"${semesterName}" saved successfully`, type: 'success' })
    }

    setSavedSemesters(updatedSemesters)
    localStorage.setItem('savedSemesters', JSON.stringify(updatedSemesters))


    // Clear the editing state
    setCurrentSemesterName('')
    setCurrentSemesterNumber(generateSemesterNumber())
    setManualCourses([])
    setGpaCourses([])
    setEditingSemester(null)

    // Scroll to saved semesters section to show the newly saved semester
    setTimeout(() => {
      if (savedSemestersRef.current) {
        savedSemestersRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }

  // Load semester for editing
  const handleEditSemester = (semester) => {
    vibrate([10])
    setEditingSemester(semester)
    setCurrentSemesterName(semester.name)
    setCurrentSemesterNumber(semester.semesterNumber || 1)

    // Separate imported and manual courses from saved semester
    const imported = semester.courses.filter(c => c.isImported)
    const manual = semester.courses.filter(c => !c.isImported)

    // Restore imported courses directly from saved semester
    setGpaCourses(imported.map(c => ({
      ...c,
      hidden: false
    })))

    // Restore manual courses
    setManualCourses(manual.map(c => ({
      ...c,
      hidden: false
    })))

    // Scroll to editing section
    setTimeout(() => {
      if (currentSemesterRef.current) {
        currentSemesterRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)

    setToast({ message: `Now editing "${semester.name}"`, type: 'info', duration: 3000 })
  }

  // Show delete confirmation modal
  const handleDeleteSemester = (semesterId) => {
    vibrate([10])
    const semester = savedSemesters.find(s => s.id === semesterId)
    if (!semester) return
    setDeleteConfirmModal({ id: semesterId, name: semester.name })
  }

  // Confirm and delete semester
  const handleConfirmDelete = () => {
    if (!deleteConfirmModal) return

    vibrate([15])
    const semester = savedSemesters.find(s => s.id === deleteConfirmModal.id)
    if (!semester) return

    const updatedSemesters = savedSemesters.filter(sem => sem.id !== deleteConfirmModal.id)
    setSavedSemesters(updatedSemesters)
    localStorage.setItem('savedSemesters', JSON.stringify(updatedSemesters))
    setDeletedSemester(semester)
    setDeleteConfirmModal(null)
    setToast({
      message: `"${semester.name}" deleted`,
      type: 'info',
      action: {
        label: 'UNDO',
        onClick: () => handleUndoSemesterDelete()
      }
    })
  }

  // Cancel delete
  const handleCancelDelete = () => {
    vibrate([5])
    setDeleteConfirmModal(null)
  }

  // Undo semester deletion
  const handleUndoSemesterDelete = () => {
    if (!deletedSemester) return

    vibrate([10])
    const updatedSemesters = [...savedSemesters, deletedSemester]
    setSavedSemesters(updatedSemesters)
    localStorage.setItem('savedSemesters', JSON.stringify(updatedSemesters))
    setDeletedSemester(null)
    setToast({ message: `"${deletedSemester.name}" restored`, type: 'success' })
  }

  // Batch operations handlers
  const toggleBatchMode = () => {
    vibrate([10])
    setBatchMode(!batchMode)
    setSelectedCourses(new Set())
    setBatchGrade('')
  }

  const toggleCourseSelection = (courseId) => {
    vibrate([5])
    const newSelected = new Set(selectedCourses)
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId)
    } else {
      newSelected.add(courseId)
    }
    setSelectedCourses(newSelected)
  }

  const selectAllCourses = () => {
    vibrate([10])
    const allIds = new Set([...gpaCourses, ...manualCourses].map(c => c.id))
    setSelectedCourses(allIds)
  }

  const applyBatchGrade = () => {
    if (!batchGrade || selectedCourses.size === 0) {
      setToast({ message: 'Select courses and grade to apply', type: 'warning' })
      return
    }

    vibrate([10, 50, 10])

    // Apply grade to selected imported courses
    setGpaCourses(prev => prev.map(course =>
      selectedCourses.has(course.id) ? { ...course, grade: batchGrade } : course
    ))

    // Apply grade to selected manual courses
    setManualCourses(prev => prev.map(course =>
      selectedCourses.has(course.id) ? { ...course, grade: batchGrade } : course
    ))

    setToast({
      message: `Grade ${batchGrade} applied to ${selectedCourses.size} course${selectedCourses.size > 1 ? 's' : ''}`,
      type: 'success'
    })
    setSelectedCourses(new Set())
    setBatchGrade('')
    setBatchMode(false)
  }

  // Semester reordering handlers
  const handleDragStart = (semesterId) => {
    vibrate([5])
    setDraggedSemester(semesterId)
  }

  const handleDragOver = (e, semesterId) => {
    e.preventDefault()
    if (draggedSemester !== semesterId) {
      setDragOverSemester(semesterId)
    }
  }

  const handleDragEnd = () => {
    if (!draggedSemester || !dragOverSemester || draggedSemester === dragOverSemester) {
      setDraggedSemester(null)
      setDragOverSemester(null)
      return
    }

    vibrate([10])

    const draggedIndex = savedSemesters.findIndex(s => s.id === draggedSemester)
    const targetIndex = savedSemesters.findIndex(s => s.id === dragOverSemester)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSemester(null)
      setDragOverSemester(null)
      return
    }

    const updatedSemesters = [...savedSemesters]
    const [removed] = updatedSemesters.splice(draggedIndex, 1)
    updatedSemesters.splice(targetIndex, 0, removed)

    setSavedSemesters(updatedSemesters)
    localStorage.setItem('savedSemesters', JSON.stringify(updatedSemesters))
    setDraggedSemester(null)
    setDragOverSemester(null)
    setToast({ message: 'Semester order updated', type: 'success' })
  }

  // Start a new semester (reset form - fresh start with empty grades)
  const handleStartNewSemester = () => {
    vibrate([10])
    setCurrentSemesterName('')
    setManualCourses([])
    setGpaCourses(prev => prev.map(c => ({ ...c, grade: '', creditHours: c.creditHours || 3 })))
    setEditingSemester(null)
  }

  // Create a manual semester (for entering past semester data or other students)
  const handleCreateManualSemester = () => {
    vibrate([10])
    setShowSemesterSetupModal(true)
  }

  // Handle semester setup confirmation from modal
  const handleSemesterSetupConfirm = ({ semesterNumber, name, importCourses }) => {
    setCurrentSemesterNumber(semesterNumber)
    setCurrentSemesterName(name)
    setGpaCourses([])
    setManualCourses([])

    // Don't set editingSemester for new semesters - only for editing existing ones
    setEditingSemester(null)

    if (importCourses) {
      // Import courses from My Courses
      if (courses && courses.length > 0) {
        const imported = courses.map(course => {
          // Use short name if available, otherwise use full name
          const displayName = course.shortName || course.name

          // Check if it's a lab course (name or code contains 'Lab' or 'LAB')
          const isLab = /lab/i.test(course.name) || /lab/i.test(course.code || course.courseCode || '')

          // Labs typically have 1 credit hour, regular courses have 3
          const defaultCredits = isLab ? 1 : 3

          return {
            id: course.id,
            courseName: displayName,
            courseCode: course.code || course.courseCode,
            creditHours: course.creditHours || defaultCredits,
            grade: '',
            isImported: true,
            hidden: false
          }
        })
        setGpaCourses(imported)
        setToast({ message: `${imported.length} courses imported - add grades to save`, type: 'success' })
      }
    } else {
      // Create 6 pre-labeled manual course rows
      const emptyRows = Array.from({ length: 6 }, (_, i) => ({
        id: `manual-${Date.now()}-${i}`,
        courseName: `Course ${i + 1}`,
        courseCode: '',
        creditHours: 3,
        grade: '',
        isImported: false,
        hidden: false
      }))
      setManualCourses(emptyRows)
      setToast({ message: '6 courses ready to fill', type: 'info' })
    }

    setShowSemesterSetupModal(false)

    // Scroll to editing section
    setTimeout(() => {
      if (currentSemesterRef.current) {
        currentSemesterRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 100)
  }

  // Handle pull to refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    vibrate([10])

    // Reload saved semesters from localStorage
    const saved = localStorage.getItem('savedSemesters')
    if (saved) {
      try {
        setSavedSemesters(JSON.parse(saved))
      } catch (error) {
        console.error('Error reloading semesters:', error)
      }
    }

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 500))
    setRefreshing(false)
    setToast({
      message: 'GPA data refreshed',
      type: 'success',
      duration: 2000
    })
  }

  if (courses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-10 h-10 text-content-tertiary" />
          </div>
          <h3 className="text-xl font-semibold text-content-primary mb-2">
            No Courses Yet
          </h3>
          <p className="text-content-secondary mb-6">
            Add courses first to start calculating your GPA.
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
    <>
      {/* Your GPA Tab Content */}
      {activeTab === 'your-gpa' && (
        <PullToRefresh
          onRefresh={handleRefresh}
          pullingContent={<div className="text-center py-4 text-content-secondary text-sm">Pull to refresh...</div>}
          refreshingContent={<div className="text-center py-4 text-accent text-sm">Refreshing...</div>}
          isPullable={true}
          resistance={2}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto bg-dark-bg min-h-0">
            {/* Header with Toggle and Title */}
            <div className="sticky top-0 z-10 bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 px-3 sm:px-4 py-3 sm:py-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-content-primary truncate leading-tight">
                      GPA Calculator
                    </h2>
                    <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm text-content-secondary truncate leading-tight mt-0.5">
                      Track your grades and calculate GPA
                    </p>
                  </div>
                </div>

                {/* Mode Selector - Segmented Control Style */}
                <div className="flex gap-2 p-1 bg-dark-surface-raised rounded-lg border border-dark-border">
                  <button
                    onClick={() => {
                      vibrate([10])
                      setActiveTab('your-gpa')
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-semibold transition-all text-xs sm:text-sm ${
                      activeTab === 'your-gpa'
                        ? 'bg-accent text-white shadow-md'
                        : 'text-content-secondary hover:text-content-primary hover:bg-dark-surface-hover'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>My GPA</span>
                  </button>
                  <button
                    onClick={() => {
                      vibrate([10])
                      setActiveTab('for-others')
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-semibold transition-all text-xs sm:text-sm ${
                      activeTab === 'for-others'
                        ? 'bg-accent text-white shadow-md'
                        : 'text-content-secondary hover:text-content-primary hover:bg-dark-surface-hover'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>For Others</span>
                  </button>
                </div>

                {/* CGPA Display - Only show when semesters exist */}
                {savedSemesters.length > 0 && (
                  <div className={`flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border ${cgpaColor.bgColor} ${cgpaColor.borderColor}`}>
                    <div className="flex items-center gap-3 flex-1 w-full xs:w-auto min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${cgpaColor.bgColor} border ${cgpaColor.borderColor} flex items-center justify-center flex-shrink-0`}>
                        <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 ${cgpaColor.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] xs:text-[10px] sm:text-xs text-content-secondary mb-0.5 xs:mb-1 font-medium">Cumulative GPA (CGPA)</p>
                        <div className="flex items-baseline gap-1.5 xs:gap-2">
                          <span className={`text-xl xs:text-2xl sm:text-3xl font-bold ${cgpaColor.color} tabular-nums`}>{formatGPA(cgpa)}</span>
                          <span className={`text-[10px] xs:text-xs sm:text-sm ${cgpaColor.color} font-semibold`}>/ 4.00</span>
                        </div>
                      </div>
                    </div>
                    {savedSemesters.length > 0 && (
                      <div className="flex gap-4 flex-shrink-0 self-start xs:self-auto">
                        <div className="text-left xs:text-right">
                          <p className="text-[9px] xs:text-[10px] sm:text-xs text-content-secondary mb-0.5 xs:mb-1 font-medium">Overall Credits</p>
                          <p className="text-base xs:text-xl sm:text-2xl font-bold text-content-primary tabular-nums">{overallCredits}</p>
                        </div>
                        <div className="text-left xs:text-right">
                          <p className="text-[9px] xs:text-[10px] sm:text-xs text-content-secondary mb-0.5 xs:mb-1 font-medium">Semesters</p>
                          <p className="text-base xs:text-xl sm:text-2xl font-bold text-content-primary tabular-nums">{savedSemesters.length}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add Semester Button */}
                <button
                  onClick={handleCreateManualSemester}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all text-sm shadow-lg active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Semester</span>
                </button>
              </div>
            </div>

            {/* Empty State - When no semesters and not editing */}
            {savedSemesters.length === 0 && !editingSemester && gpaCourses.length === 0 && manualCourses.length === 0 && (
              <div className="px-3 sm:px-4 py-8 sm:py-12">
              <div className="max-w-md mx-auto text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-content-primary mb-2">
                  Start Tracking Your GPA
                </h3>
                <p className="text-xs sm:text-sm text-content-secondary mb-6">
                  Add your first semester to calculate and track your cumulative GPA across all your courses.
                </p>
                <div className="flex flex-col gap-2 text-xs sm:text-sm text-content-tertiary">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Import courses or add manually</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Enter grades and calculate GPA</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>Track CGPA across semesters</span>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* Semester Editing Section - Show when editing OR when courses are loaded */}
            {(editingSemester || gpaCourses.length > 0 || manualCourses.length > 0) && (
            <div ref={currentSemesterRef} className="px-3 sm:px-4 py-3 sm:py-4 bg-dark-surface/50 border-y border-dark-border">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Editing Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${gpaColor.bgColor} border ${gpaColor.borderColor} flex items-center justify-center`}>
                      <Edit2 className={`w-5 h-5 ${gpaColor.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-content-secondary">{editingSemester ? 'Editing Semester' : 'New Semester'}</p>
                      <p className="text-base font-bold text-content-primary">{currentSemesterName || `Semester ${currentSemesterNumber}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs text-content-secondary">GPA</p>
                      <p className={`text-xl font-bold ${gpaColor.color}`}>{formatGPA(currentGPA)}</p>
                    </div>
                  </div>
                </div>

                {/* Batch Operations Bar */}
                {(gpaCourses.length > 0 || manualCourses.length > 0) && (
                  <div className={`p-3 rounded-lg border transition-all ${
                    batchMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-dark-surface-raised border-dark-border'
                  }`}>
                    {!batchMode ? (
                      <button
                        onClick={toggleBatchMode}
                        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Batch Grade Entry</span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold text-blue-400">
                              {selectedCourses.size} selected
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={selectAllCourses}
                              className="text-xs px-2 py-1 bg-dark-surface hover:bg-dark-surface-hover text-content-secondary hover:text-accent rounded transition-all active:scale-90"
                            >
                              Select All
                            </button>
                            <button
                              onClick={toggleBatchMode}
                              className="text-xs px-2 py-1 bg-dark-surface hover:bg-dark-surface-hover text-content-secondary hover:text-red-400 rounded transition-all active:scale-90"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={batchGrade}
                            onChange={(e) => setBatchGrade(e.target.value)}
                            className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                          >
                            <option value="">Select grade to apply</option>
                            {GRADE_SCALE.map(g => (
                              <option key={g.grade} value={g.grade}>{g.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={applyBatchGrade}
                            disabled={!batchGrade || selectedCourses.size === 0}
                            className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:bg-dark-surface-raised disabled:text-content-tertiary disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all text-sm active:scale-95"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Course List */}
                <div className="space-y-4">
                  {/* Imported Courses */}
                  {gpaCourses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-accent" />
                        Your Courses
                      </h3>
                      <div className="space-y-2">
                        {gpaCourses.map(course => (
                          <CourseRow
                            key={course.id}
                            course={course}
                            onGradeChange={handleGradeChange}
                            onCreditChange={handleCreditChange}
                            onToggleVisibility={handleToggleCourseVisibility}
                            onDelete={handleDeleteImportedCourse}
                            batchMode={batchMode}
                            isSelected={selectedCourses.has(course.id)}
                            onToggleSelection={() => toggleCourseSelection(course.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Courses */}
                  {manualCourses.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-accent" />
                        Additional Courses
                      </h3>
                      <div className="space-y-2">
                        {manualCourses.map(course => (
                          <ManualCourseRow
                            key={course.id}
                            course={course}
                            onChange={handleManualCourseChange}
                            onDelete={handleDeleteManualCourse}
                            onToggleVisibility={handleToggleCourseVisibility}
                            batchMode={batchMode}
                            isSelected={selectedCourses.has(course.id)}
                            onToggleSelection={() => toggleCourseSelection(course.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add More Courses Button */}
                  <button
                    onClick={handleAddManualCourse}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-surface-raised border border-dashed border-dark-border hover:border-accent/50 hover:bg-dark-surface-hover text-content-secondary hover:text-accent rounded-lg font-medium transition-all text-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add More Courses</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingSemester(null)
                      setCurrentSemesterName('')
                      setManualCourses([])
                      setGpaCourses([])
                      setToast({ message: 'Editing cancelled', type: 'info' })
                    }}
                    className="flex-1 px-4 py-2.5 bg-dark-surface-raised border border-dark-border hover:bg-dark-surface-hover text-content-secondary rounded-lg font-medium transition-all text-sm active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSemester}
                    disabled={currentGPA === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-dark-surface-raised disabled:text-content-tertiary disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all text-sm active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savedSemesters.some(s => s.id === editingSemester?.id) ? 'Update Semester' : 'Save Semester'}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* Saved Semesters Section - Grid Layout */}
            {savedSemesters.length > 0 && (
              <div ref={savedSemestersRef} className="px-3 sm:px-4 pb-4 pt-4">
          <h3 className="text-sm sm:text-base font-bold text-content-primary mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            Saved Semesters ({savedSemesters.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {savedSemesters.map((semester) => {
              const semesterColor = getGPAColor(semester.gpa)
              const isExpanded = expandedSemesters.has(semester.id)
              const isIncluded = semester.includeInCGPA !== false
              const isDragging = draggedSemester === semester.id
              const isDragOver = dragOverSemester === semester.id

              return (
                <div
                  key={semester.id}
                  draggable
                  onDragStart={() => handleDragStart(semester.id)}
                  onDragOver={(e) => handleDragOver(e, semester.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-gradient-to-br from-dark-surface-raised to-dark-surface border rounded-xl sm:rounded-2xl overflow-hidden transition-all shadow-lg hover:shadow-xl cursor-move ${
                    isIncluded ? 'border-dark-border hover:border-accent/40' : 'border-dark-border/30 opacity-60'
                  } ${isDragging ? 'opacity-50 scale-95' : ''} ${isDragOver ? 'ring-2 ring-accent/50 scale-105' : ''}`}
                  role="article"
                  aria-label={`${semester.name}, GPA ${formatGPA(semester.gpa)}, ${semester.courses.length} courses, ${isIncluded ? 'included' : 'excluded'} in CGPA`}
                >
                  {/* Semester Header */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Semester Title with Icon */}
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${semesterColor.bgColor} border-2 ${semesterColor.borderColor} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <Calendar className={`w-5 h-5 sm:w-6 sm:h-6 ${semesterColor.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-content-primary truncate mb-1">
                            {semester.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-content-secondary">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {semester.courses.length} {semester.courses.length === 1 ? 'course' : 'courses'}
                            </span>
                            <span className="tabular-nums">{semester.totalCredits} credits</span>
                          </div>
                        </div>
                      </div>

                      {/* CGPA Toggle */}
                      <button
                        onClick={() => handleToggleSemesterInclusion(semester.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 active:scale-90 ${
                          isIncluded
                            ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
                            : 'bg-dark-surface-hover border border-dark-border hover:bg-dark-surface'
                        }`}
                        title={isIncluded ? "Exclude from CGPA" : "Include in CGPA"}
                        aria-label={isIncluded ? `Exclude ${semester.name} from CGPA calculation` : `Include ${semester.name} in CGPA calculation`}
                        aria-pressed={isIncluded}
                      >
                        {isIncluded ? (
                          <>
                            <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                            <span className="text-[9px] sm:text-[10px] font-semibold text-green-400 uppercase tracking-wide hidden xs:inline">In CGPA</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5 text-content-tertiary" />
                            <span className="text-[9px] sm:text-[10px] font-semibold text-content-tertiary uppercase tracking-wide hidden xs:inline">Excluded</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* GPA Display - Fully responsive */}
                    <div className={`p-2.5 xs:p-3 sm:p-4 rounded-xl ${semesterColor.bgColor} border-2 ${semesterColor.borderColor} mb-3`}>
                      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
                        <div className="flex-1 w-full xs:w-auto">
                          <p className="text-[9px] xs:text-[10px] sm:text-xs text-content-secondary mb-0.5 xs:mb-1 font-medium">Semester GPA</p>
                          <div className="flex items-baseline gap-1.5 xs:gap-2">
                            <span className={`text-xl xs:text-2xl sm:text-3xl font-bold ${semesterColor.color} tabular-nums`}>
                              {formatGPA(semester.gpa)}
                            </span>
                            <span className={`text-[10px] xs:text-xs sm:text-sm ${semesterColor.color} font-semibold`}>/ 4.00</span>
                          </div>
                        </div>
                        <div className={`px-2 xs:px-3 py-1 xs:py-1.5 rounded-full ${semesterColor.bgColor} border ${semesterColor.borderColor} self-start xs:self-auto`}>
                          <span className={`text-[9px] xs:text-[10px] sm:text-xs font-bold ${semesterColor.color} uppercase tracking-wide whitespace-nowrap`}>
                            {semesterColor.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row - Fully responsive */}
                    <div className="flex items-center gap-1.5 xs:gap-2">
                      <button
                        onClick={() => handleEditSemester(semester)}
                        className="flex-1 flex items-center justify-center gap-1 xs:gap-1.5 px-2 xs:px-3 py-1.5 xs:py-2 bg-dark-surface-hover hover:bg-accent/10 border border-dark-border hover:border-accent/50 text-content-secondary hover:text-accent rounded-lg transition-all text-[10px] xs:text-xs sm:text-sm font-medium active:scale-95"
                        title="Edit semester"
                        aria-label={`Edit ${semester.name}`}
                      >
                        <Edit2 className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
                        <span className="hidden xs:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => handleToggleSemester(semester.id)}
                        className="flex-1 flex items-center justify-center gap-1 xs:gap-1.5 px-2 xs:px-3 py-1.5 xs:py-2 bg-dark-surface-hover hover:bg-accent/10 border border-dark-border hover:border-accent/50 text-content-secondary hover:text-accent rounded-lg transition-all text-[10px] xs:text-xs sm:text-sm font-medium active:scale-95"
                        title={isExpanded ? "Hide courses" : "Show courses"}
                        aria-label={isExpanded ? `Hide courses for ${semester.name}` : `Show courses for ${semester.name}`}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
                            <span className="hidden xs:inline">Hide</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
                            <span className="hidden xs:inline">View</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSemester(semester.id)}
                        className="px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 hover:bg-red-500/10 border border-dark-border hover:border-red-500/50 text-content-tertiary hover:text-red-400 rounded-lg transition-all active:scale-95"
                        title="Delete semester"
                        aria-label={`Delete ${semester.name}`}
                      >
                        <Trash2 className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Course List */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-dark-border/50 space-y-1.5">
                      <p className="text-xs font-semibold text-content-secondary mb-2">
                        Courses ({semester.courses.length})
                      </p>
                      {semester.courses.map((course, index) => {
                        const courseGPA = getGradePoints(course.grade)
                        const courseColor = getGPAColor(courseGPA)

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-2 xs:gap-3 p-2 xs:p-2.5 rounded-lg bg-dark-surface/50 hover:bg-dark-surface transition-colors"
                          >
                            <span className="text-[10px] xs:text-xs text-content-secondary truncate flex-1 min-w-0">
                              {course.courseName}
                            </span>
                            <div className="flex items-center gap-2 xs:gap-3 flex-shrink-0">
                              <span className="text-[10px] xs:text-xs text-content-tertiary tabular-nums">
                                {course.creditHours} cr
                              </span>
                              <span className="text-[10px] xs:text-xs font-semibold text-accent w-6 xs:w-8 text-center tabular-nums">
                                {course.grade}
                              </span>
                              <span className={`text-[10px] xs:text-xs font-bold ${courseColor.color} w-8 xs:w-10 text-center tabular-nums`}>
                                {courseGPA.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
              </div>
              </div>
            )}
          </div>
        </PullToRefresh>
      )}

      {/* For Others Tab Content */}
      {activeTab === 'for-others' && (
        <div className="flex-1 overflow-y-auto bg-dark-bg">
          {/* Header - Same as Your GPA tab for consistency */}
          <div className="sticky top-0 z-10 bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-content-primary truncate leading-tight">
                    GPA Calculator
                  </h2>
                  <p className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm text-content-secondary truncate leading-tight mt-0.5">
                    Track your grades and calculate GPA
                  </p>
                </div>
              </div>

              {/* Mode Selector - Segmented Control Style */}
              <div className="flex gap-2 p-1 bg-dark-surface-raised rounded-lg border border-dark-border">
                <button
                  onClick={() => {
                    vibrate([10])
                    setActiveTab('your-gpa')
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-semibold transition-all text-xs sm:text-sm ${
                    activeTab === 'your-gpa'
                      ? 'bg-accent text-white shadow-md'
                      : 'text-content-secondary hover:text-content-primary hover:bg-dark-surface-hover'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>My GPA</span>
                </button>
                <button
                  onClick={() => {
                    vibrate([10])
                    setActiveTab('for-others')
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-semibold transition-all text-xs sm:text-sm ${
                    activeTab === 'for-others'
                      ? 'bg-accent text-white shadow-md'
                      : 'text-content-secondary hover:text-content-primary hover:bg-dark-surface-hover'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>For Others</span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-4 py-3 sm:py-4">
            <GPAForOthers />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          action={toast.action}
          duration={toast.duration}
        />
      )}

      {/* Semester Setup Modal */}
      {showSemesterSetupModal && (
        <SemesterSetupModal
          onClose={() => setShowSemesterSetupModal(false)}
          onConfirm={handleSemesterSetupConfirm}
          nextSemesterNumber={generateSemesterNumber()}
          hasEnrolledCourses={courses && courses.length > 0}
          usedSemesterNumbers={savedSemesters
            .filter(s => !editingSemester || s.id !== editingSemester.id)
            .map(s => s.semesterNumber)
            .filter(Boolean)}
          editingSemesterId={editingSemester?.id}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && createPortal(
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelDelete()
          }}
        >
          <div className="bg-dark-surface rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-dark-border/50 animate-scale-in">
            {/* Warning Icon */}
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-content-primary text-center mb-2">
              Delete Semester?
            </h3>

            {/* Message */}
            <p className="text-sm text-content-secondary text-center mb-6">
              Are you sure you want to delete <span className="font-semibold text-content-primary">"{deleteConfirmModal.name}"</span>?
              <br />
              <span className="text-xs text-content-tertiary mt-1 block">This action can be undone within 8 seconds.</span>
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2.5 bg-dark-surface-raised border border-dark-border hover:bg-dark-surface-hover text-content-primary rounded-lg font-medium transition-all text-sm active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all text-sm active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Course Row Component (Imported from My Courses) - with visibility toggle and delete
function CourseRow({ course, onGradeChange, onCreditChange, onToggleVisibility, onDelete, batchMode, isSelected, onToggleSelection }) {
  const [showGradePicker, setShowGradePicker] = useState(false)
  const courseGPA = course.grade ? getGradePoints(course.grade) : 0
  const gpaColor = getGPAColor(courseGPA)

  return (
    <div className={`bg-dark-surface-raised border rounded-lg p-3 transition-all ${course.hidden ? 'border-dark-border/30 opacity-50' : 'border-dark-border'} ${isSelected ? 'ring-2 ring-blue-500/50' : ''}`}>
      <div className="flex items-start gap-2 mb-3">
        {batchMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="mt-1 w-4 h-4 rounded border-dark-border bg-dark-surface text-accent focus:ring-2 focus:ring-accent/30 cursor-pointer"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${course.hidden ? 'text-content-tertiary line-through' : 'text-content-primary'}`}>
            {course.courseName}
          </p>
          {course.courseCode && (
            <p className="text-xs text-content-secondary">{course.courseCode}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleVisibility(course.id, false)}
            className="p-1.5 hover:bg-dark-surface-hover rounded transition-colors active:scale-90"
            title={course.hidden ? "Click to include in GPA calculation" : "Click to exclude from GPA calculation"}
            aria-label={course.hidden ? `Include ${course.courseName} in GPA calculation` : `Exclude ${course.courseName} from GPA calculation`}
          >
            {course.hidden ? (
              <EyeOff className="w-4 h-4 text-content-tertiary" />
            ) : (
              <Eye className="w-4 h-4 text-accent" />
            )}
          </button>
          <button
            onClick={() => onDelete(course.id)}
            className="p-1.5 hover:bg-red-500/10 text-content-tertiary hover:text-red-400 rounded transition-colors active:scale-90"
            title="Delete course"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        {/* Credit Hours - Cleaner Layout */}
        <div>
          <label className="block text-xs text-content-secondary mb-1.5">Credits</label>
          <input
            type="number"
            min="1"
            max="6"
            value={course.creditHours}
            onChange={(e) => onCreditChange(course.id, e.target.value)}
            disabled={course.hidden}
            className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-content-primary text-sm font-medium text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Credit hours for ${course.courseName}`}
          />
        </div>

        {/* Grade - Streamlined with Badge + Dropdown */}
        <div className="relative">
          <label className="block text-xs text-content-secondary mb-1.5">Grade</label>
          <div className="flex gap-2">
            {/* Current Grade Badge */}
            {course.grade && (
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${gpaColor.bgColor} border ${gpaColor.borderColor}`}>
                <span className={`text-sm font-bold ${gpaColor.color}`}>{course.grade}</span>
                <span className={`text-xs ${gpaColor.color} opacity-75`}>{courseGPA.toFixed(1)}</span>
              </div>
            )}

            {/* Grade Selector Dropdown */}
            <select
              value={course.grade}
              onChange={(e) => onGradeChange(course.id, e.target.value)}
              disabled={course.hidden}
              className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-content-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Select grade for ${course.courseName}`}
            >
              <option value="">Select Grade</option>
              {GRADE_SCALE.map(g => (
                <option key={g.grade} value={g.grade}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

// Manual Course Row Component - with visibility toggle
function ManualCourseRow({ course, onChange, onDelete, onToggleVisibility, batchMode, isSelected, onToggleSelection }) {
  const courseGPA = course.grade ? getGradePoints(course.grade) : 0
  const gpaColor = getGPAColor(courseGPA)

  return (
    <div className={`bg-dark-surface-raised border rounded-lg p-3 transition-all ${course.hidden ? 'border-dark-border/30 opacity-50' : 'border-dark-border'} ${isSelected ? 'ring-2 ring-blue-500/50' : ''}`}>
      <div className="flex items-start gap-2 mb-3">
        {batchMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="mt-1 w-4 h-4 rounded border-dark-border bg-dark-surface text-accent focus:ring-2 focus:ring-accent/30 cursor-pointer"
          />
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={course.courseName}
            onChange={(e) => onChange(course.id, 'courseName', e.target.value)}
            placeholder="e.g., Database Systems"
            disabled={course.hidden}
            className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-content-primary text-sm font-medium placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <input
            type="text"
            value={course.courseCode || ''}
            onChange={(e) => onChange(course.id, 'courseCode', e.target.value)}
            placeholder="Course Code (optional, e.g., CS-201)"
            disabled={course.hidden}
            className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-1.5 text-content-primary text-xs placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggleVisibility(course.id, true)}
            className="p-1.5 hover:bg-dark-surface-hover rounded transition-colors active:scale-90"
            title={course.hidden ? "Click to include in GPA calculation" : "Click to exclude from GPA calculation"}
            aria-label={course.hidden ? `Include ${course.courseName || 'course'} in GPA calculation` : `Exclude ${course.courseName || 'course'} from GPA calculation`}
          >
            {course.hidden ? (
              <EyeOff className="w-4 h-4 text-content-tertiary" />
            ) : (
              <Eye className="w-4 h-4 text-accent" />
            )}
          </button>
          <button
            onClick={() => onDelete(course.id)}
            className="p-1.5 hover:bg-red-500/10 text-content-tertiary hover:text-red-400 rounded transition-colors active:scale-90"
            title="Delete course"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-3">
        {/* Credit Hours - Cleaner Layout */}
        <div>
          <label className="block text-xs text-content-secondary mb-1.5">Credits</label>
          <input
            type="number"
            min="1"
            max="6"
            value={course.creditHours}
            onChange={(e) => onChange(course.id, 'creditHours', parseInt(e.target.value) || 1)}
            disabled={course.hidden}
            className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-content-primary text-sm font-medium text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Credit hours for ${course.courseName || 'course'}`}
          />
        </div>

        {/* Grade - Streamlined with Badge + Dropdown */}
        <div className="relative">
          <label className="block text-xs text-content-secondary mb-1.5">Grade</label>
          <div className="flex gap-2">
            {/* Current Grade Badge */}
            {course.grade && (
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${gpaColor.bgColor} border ${gpaColor.borderColor}`}>
                <span className={`text-sm font-bold ${gpaColor.color}`}>{course.grade}</span>
                <span className={`text-xs ${gpaColor.color} opacity-75`}>{courseGPA.toFixed(1)}</span>
              </div>
            )}

            {/* Grade Selector Dropdown */}
            <select
              value={course.grade}
              onChange={(e) => onChange(course.id, 'grade', e.target.value)}
              disabled={course.hidden}
              className="flex-1 bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-content-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Select grade for ${course.courseName || 'course'}`}
            >
              <option value="">Select Grade</option>
              {GRADE_SCALE.map(g => (
                <option key={g.grade} value={g.grade}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

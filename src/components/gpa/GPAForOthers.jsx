import { useState, useEffect } from 'react'
import { Plus, Trash2, User, Award, AlertTriangle, BookOpen } from 'lucide-react'
import { GRADE_SCALE, calculateGPA, formatGPA, getGPAColor } from '../../utils/gpaCalculator'
import { vibrate } from '../../utils/uiHelpers'
import Toast from '../shared/Toast'
import { useApp } from '../../context/AppContext'

export default function GPAForOthers() {
  const { courses: myCourses } = useApp() // Get courses from My Courses

  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [toast, setToast] = useState(null)
  const [deletedStudent, setDeletedStudent] = useState(null)
  const [deletedCourse, setDeletedCourse] = useState(null)
  const [previousState, setPreviousState] = useState(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('gpaForOthersData')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setStudents(parsed.students || [])
        setCourses(parsed.courses || [])
      } catch (error) {
        console.error('Error loading data:', error)
        initializeDefaults()
      }
    } else {
      initializeDefaults()
    }
  }, [])

  // Initialize with defaults
  function initializeDefaults() {
    const defaultStudents = [
      { id: `student-${Date.now()}-1`, name: 'Student 1' }
    ]
    const defaultCourses = Array.from({ length: 6 }, (_, i) => ({
      id: `course-${i}`,
      courseName: '',
      creditHours: 3
    }))
    setStudents(defaultStudents)
    setCourses(defaultCourses)
  }

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (students.length > 0 || courses.length > 0) {
      localStorage.setItem('gpaForOthersData', JSON.stringify({ students, courses }))
    }
  }, [students, courses])

  // Add student (max 20)
  const handleAddStudent = () => {
    if (students.length >= 20) {
      setToast({ message: 'Maximum 20 students allowed', type: 'warning' })
      vibrate([15])
      return
    }

    vibrate([10])
    const newStudent = {
      id: `student-${Date.now()}`,
      name: `Student ${students.length + 1}`
    }
    setStudents([...students, newStudent])
    setToast({ message: 'Student added', type: 'success' })
  }

  // Delete student with undo
  const handleDeleteStudent = (studentId) => {
    if (students.length === 1) {
      setToast({ message: 'At least one student required', type: 'warning' })
      return
    }

    vibrate([15])
    const studentToDelete = students.find(s => s.id === studentId)
    const updatedStudents = students.filter(s => s.id !== studentId)

    // Save current state for undo
    setDeletedStudent({ student: studentToDelete, previousStudents: students, previousCourses: courses })
    setStudents(updatedStudents)

    // Remove grades for this student from all courses
    const updatedCourses = courses.map(course => {
      if (course.grades && course.grades[studentId]) {
        const { [studentId]: removed, ...remainingGrades } = course.grades
        return { ...course, grades: remainingGrades }
      }
      return course
    })
    setCourses(updatedCourses)

    setToast({
      message: `${studentToDelete.name || 'Student'} removed`,
      type: 'info',
      action: {
        label: 'UNDO',
        onClick: () => handleUndoStudentDelete()
      }
    })
  }

  // Undo student deletion
  const handleUndoStudentDelete = () => {
    if (!deletedStudent) return

    vibrate([10])
    setStudents(deletedStudent.previousStudents)
    setCourses(deletedStudent.previousCourses)
    setDeletedStudent(null)
    setToast({ message: 'Student restored', type: 'success' })
  }

  // Update student name
  const handleUpdateStudentName = (studentId, name) => {
    setStudents(students.map(s => s.id === studentId ? { ...s, name } : s))
  }

  // Add course row
  const handleAddCourse = () => {
    vibrate([10])
    const newCourse = {
      id: `course-${Date.now()}`,
      courseName: '',
      creditHours: 3
    }
    setCourses([...courses, newCourse])
  }

  // Auto-import courses from My Courses
  const handleAutoImportCourses = () => {
    vibrate([10])

    // Get courses from AppContext
    if (!myCourses || myCourses.length === 0) {
      setToast({ message: 'No courses found in My Courses', type: 'warning' })
      return
    }

    // Map My Courses to the format needed for GPAForOthers
    const importedCourses = myCourses.map(course => {
      // Use short name if available, otherwise use full name
      const displayName = course.shortName || course.name || course.courseName || ''

      // Check if it's a lab course (name or code contains 'Lab' or 'LAB')
      const isLab = /lab/i.test(course.name || '') || /lab/i.test(course.code || course.courseCode || '')

      // Labs typically have 1 credit hour, regular courses have 3
      const defaultCredits = isLab ? 1 : 3

      return {
        id: `imported-${course.id || Date.now()}-${Math.random()}`,
        courseName: displayName,
        creditHours: course.creditHours || defaultCredits,
        grades: {} // Empty grades for all students
      }
    })

    setCourses(importedCourses)
    setToast({ message: `${importedCourses.length} courses imported from My Courses`, type: 'success' })
  }

  // Delete course row with undo
  const handleDeleteCourse = (courseId) => {
    if (courses.length === 1) {
      setToast({ message: 'At least one course required', type: 'warning' })
      return
    }

    vibrate([10])
    const courseToDelete = courses.find(c => c.id === courseId)
    const updatedCourses = courses.filter(c => c.id !== courseId)

    // Save current state for undo
    setDeletedCourse({ course: courseToDelete, previousCourses: courses })
    setCourses(updatedCourses)

    setToast({
      message: `${courseToDelete.courseName || 'Course'} removed`,
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
    setCourses(deletedCourse.previousCourses)
    setDeletedCourse(null)
    setToast({ message: 'Course restored', type: 'success' })
  }

  // Update course
  const handleUpdateCourse = (courseId, field, value) => {
    setCourses(courses.map(c => c.id === courseId ? { ...c, [field]: value } : c))
  }

  // Update grade for a student in a course
  const handleUpdateGrade = (courseId, studentId, grade) => {
    setCourses(courses.map(course => {
      if (course.id === courseId) {
        const grades = course.grades || {}
        return { ...course, grades: { ...grades, [studentId]: grade } }
      }
      return course
    }))
  }

  // Calculate GPA for a student
  const calculateStudentGPA = (studentId) => {
    const studentCourses = courses
      .filter(c => c.grades?.[studentId] && c.creditHours > 0)
      .map(c => ({
        grade: c.grades[studentId],
        creditHours: c.creditHours
      }))

    return calculateGPA(studentCourses)
  }

  // Reset all data with undo
  const handleReset = () => {
    vibrate([15])

    // Save current state for undo
    setPreviousState({ students, courses })
    initializeDefaults()

    setToast({
      message: 'Calculator reset',
      type: 'info',
      action: {
        label: 'UNDO',
        onClick: () => handleUndoReset()
      }
    })
  }

  // Undo reset
  const handleUndoReset = () => {
    if (!previousState) return

    vibrate([10])
    setStudents(previousState.students)
    setCourses(previousState.courses)
    setPreviousState(null)
    setToast({ message: 'Reset undone', type: 'success' })
  }

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto">
      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base md:text-lg font-bold text-content-primary mb-0.5 sm:mb-1">
            GPA Calculator for Others
          </h3>
          <p className="text-[10px] xs:text-xs sm:text-sm text-content-secondary">
            Calculate GPA for multiple students
          </p>
        </div>
        <div className="flex items-center gap-1.5 xs:gap-2 flex-wrap">
          <button
            onClick={handleAutoImportCourses}
            className="flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-400 rounded-lg font-medium transition-all text-[10px] xs:text-xs sm:text-sm active:scale-95"
            title="Import courses from My Courses"
            aria-label="Import courses from My Courses"
          >
            <BookOpen className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={handleAddStudent}
            disabled={students.length >= 20}
            className={`flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-lg font-medium transition-all text-[10px] xs:text-xs sm:text-sm whitespace-nowrap ${
              students.length >= 20
                ? 'bg-dark-surface-raised text-content-tertiary cursor-not-allowed border border-dark-border'
                : 'bg-accent hover:bg-accent-hover text-white active:scale-95 shadow-sm'
            }`}
            title={`Add student (${students.length}/20)`}
            aria-label={`Add student (${students.length} of 20)`}
          >
            <Plus className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Add</span>
            <span className="text-[9px] xs:text-[10px] opacity-80">({students.length}/20)</span>
          </button>
          <button
            onClick={handleReset}
            className="px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 bg-dark-surface-raised hover:bg-dark-surface-hover text-content-secondary hover:text-red-400 rounded-lg font-medium transition-all text-[10px] xs:text-xs sm:text-sm border border-dark-border hover:border-red-500/30 active:scale-95"
            title="Reset all data"
            aria-label="Reset calculator data"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table Container - Horizontal Scroll */}
      <div className="overflow-x-auto bg-dark-surface-raised rounded-xl border border-dark-border">
        <div className="min-w-max lg:min-w-full">
          {/* Table Header */}
          <div className="flex border-b border-dark-border bg-dark-surface/50 sticky top-0 z-10">
            {/* Course Name Column - Responsive */}
            <div className="w-28 xs:w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border flex-shrink-0">
              <p className="text-[10px] xs:text-xs sm:text-sm font-semibold text-content-secondary uppercase tracking-wide">Course</p>
            </div>

            {/* Credit Hours Column - Responsive */}
            <div className="w-14 xs:w-16 sm:w-20 md:w-24 lg:w-28 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border flex-shrink-0">
              <p className="text-[10px] xs:text-xs sm:text-sm font-semibold text-content-secondary uppercase tracking-wide text-center">Credits</p>
            </div>

            {/* Student Grade Columns - Responsive */}
            {students.map((student, index) => (
              <div key={student.id} className="w-24 xs:w-28 sm:w-32 md:w-40 lg:w-48 xl:w-56 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border flex-shrink-0">
                <div className="flex flex-col gap-1 md:gap-1.5">
                  <input
                    type="text"
                    value={student.name}
                    onChange={(e) => handleUpdateStudentName(student.id, e.target.value)}
                    placeholder={`Student ${index + 1}`}
                    maxLength="20"
                    className="w-full bg-transparent border-none text-[10px] xs:text-xs sm:text-sm md:text-base font-semibold text-content-primary placeholder:text-content-tertiary focus:outline-none text-center truncate"
                  />
                  {students.length > 1 && (
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="w-full px-1.5 py-1 md:py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-[9px] xs:text-[10px] sm:text-xs text-red-400 font-medium transition-all flex items-center justify-center gap-1 active:scale-95"
                      title="Remove student"
                      aria-label={`Remove ${student.name || `Student ${index + 1}`}`}
                    >
                      <Trash2 className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline md:inline">Remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Actions Column Header - Responsive */}
            <div className="w-12 xs:w-14 sm:w-16 md:w-20 lg:w-24 p-2 xs:p-2.5 sm:p-3 md:p-3.5 flex-shrink-0">
              <p className="text-[10px] xs:text-xs sm:text-sm font-semibold text-content-secondary uppercase tracking-wide text-center hidden xs:block">Action</p>
            </div>
          </div>

          {/* Course Rows */}
          {courses.map((course, courseIndex) => (
            <div key={course.id} className="flex border-b border-dark-border/50 hover:bg-dark-surface/30 transition-colors">
              {/* Course Name - Responsive */}
              <div className="w-28 xs:w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border/50 flex-shrink-0">
                <input
                  type="text"
                  value={course.courseName}
                  onChange={(e) => handleUpdateCourse(course.id, 'courseName', e.target.value)}
                  placeholder={`Course ${courseIndex + 1}`}
                  maxLength="30"
                  className="w-full bg-dark-surface border border-dark-border rounded px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 md:py-2.5 text-[10px] xs:text-xs sm:text-sm md:text-base text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  aria-label={`Course name for row ${courseIndex + 1}`}
                />
              </div>

              {/* Credit Hours - Responsive */}
              <div className="w-14 xs:w-16 sm:w-20 md:w-24 lg:w-28 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border/50 flex-shrink-0">
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={course.creditHours}
                  onChange={(e) => handleUpdateCourse(course.id, 'creditHours', parseInt(e.target.value) || 1)}
                  className="w-full bg-dark-surface border border-dark-border rounded px-1 xs:px-1.5 sm:px-2 py-1.5 xs:py-2 md:py-2.5 text-[10px] xs:text-xs sm:text-sm md:text-base text-content-primary text-center focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all tabular-nums"
                  aria-label={`Credit hours for ${course.courseName || `Course ${courseIndex + 1}`}`}
                />
              </div>

              {/* Grade for each student - Responsive */}
              {students.map((student) => (
                <div key={student.id} className="w-24 xs:w-28 sm:w-32 md:w-40 lg:w-48 xl:w-56 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border/50 flex-shrink-0">
                  <select
                    value={course.grades?.[student.id] || ''}
                    onChange={(e) => handleUpdateGrade(course.id, student.id, e.target.value)}
                    className="w-full bg-dark-surface border border-dark-border rounded px-1 xs:px-1.5 sm:px-2 md:px-3 py-1.5 xs:py-2 md:py-2.5 text-[10px] xs:text-xs sm:text-sm md:text-base text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all cursor-pointer"
                    aria-label={`Grade for ${student.name || 'student'} in ${course.courseName || 'course'}`}
                  >
                    <option value="">Select</option>
                    {GRADE_SCALE.map((g) => (
                      <option key={g.grade} value={g.grade}>
                        {g.grade}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Delete Course Button - Responsive */}
              <div className="w-12 xs:w-14 sm:w-16 md:w-20 lg:w-24 p-2 xs:p-2.5 sm:p-3 md:p-3.5 flex-shrink-0 flex items-center justify-center">
                {courses.length > 1 && (
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="p-1.5 md:p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all active:scale-95"
                    title="Delete course"
                    aria-label={`Delete ${course.courseName || `Course ${courseIndex + 1}`}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 md:w-5 md:h-5 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Course Button Row - Compact */}
          <div className="flex border-b border-dark-border/50">
            <div className="w-full p-2 xs:p-2.5 sm:p-3">
              <button
                onClick={handleAddCourse}
                className="w-full flex items-center justify-center gap-1.5 xs:gap-2 px-2 xs:px-3 py-2 xs:py-2.5 bg-dark-surface border border-dashed border-dark-border hover:border-accent/50 hover:bg-dark-surface-hover text-content-secondary hover:text-accent rounded-lg transition-all text-[10px] xs:text-xs font-medium active:scale-[0.99]"
                aria-label="Add new course row"
              >
                <Plus className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                <span>Add Course</span>
              </button>
            </div>
          </div>

          {/* GPA Results Row - Responsive */}
          <div className="flex bg-accent/5 border-t-2 border-accent/30">
            {/* Label - Responsive */}
            <div className="w-28 xs:w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border/50 flex-shrink-0 flex items-center">
              <div className="flex items-center gap-1 xs:gap-1.5 md:gap-2">
                <Award className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-accent" />
                <p className="text-[10px] xs:text-xs sm:text-sm md:text-base lg:text-lg font-bold text-content-primary">GPA</p>
              </div>
            </div>

            {/* Empty Credits Column - Responsive */}
            <div className="w-14 xs:w-16 sm:w-20 md:w-24 lg:w-28 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border/50 flex-shrink-0" />

            {/* Student GPAs - Responsive */}
            {students.map((student) => {
              const gpa = calculateStudentGPA(student.id)
              const gpaColor = getGPAColor(gpa)

              return (
                <div key={student.id} className="w-24 xs:w-28 sm:w-32 md:w-40 lg:w-48 xl:w-56 p-2 xs:p-2.5 sm:p-3 md:p-3.5 border-r border-dark-border/50 flex-shrink-0">
                  <div className={`px-1.5 xs:px-2 sm:px-3 md:px-4 py-1.5 xs:py-2 md:py-2.5 lg:py-3 rounded-lg ${gpaColor.bgColor} border ${gpaColor.borderColor}`}>
                    <p className={`text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${gpaColor.color} text-center tabular-nums`}>
                      {formatGPA(gpa)}
                    </p>
                    <p className={`text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs ${gpaColor.color} text-center font-medium mt-0.5 md:mt-1`}>
                      {gpaColor.label}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Empty Actions column for alignment - Responsive */}
            <div className="w-12 xs:w-14 sm:w-16 md:w-20 lg:w-24 p-2 xs:p-2.5 sm:p-3 md:p-3.5 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Info Footer - Compact */}
      <div className="flex items-start gap-1.5 xs:gap-2 p-2 xs:p-2.5 sm:p-3 bg-accent/5 border border-accent/20 rounded-lg">
        <AlertTriangle className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-[9px] xs:text-[10px] sm:text-xs text-content-secondary leading-relaxed">
          Independent from your semester GPAs. Auto-saved. Use horizontal scroll for multiple students.
        </p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          action={toast.action}
          duration={toast.duration || 3000}
        />
      )}
    </div>
  )
}

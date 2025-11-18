import { useState, useEffect } from 'react'
import { Plus, Trash2, User, Award, AlertTriangle, X, BookOpen } from 'lucide-react'
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

  // Add student (max 5)
  const handleAddStudent = () => {
    if (students.length >= 5) {
      setToast({ message: 'Maximum 5 students allowed', type: 'warning' })
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
    const importedCourses = myCourses.map(course => ({
      id: `imported-${course.id || Date.now()}-${Math.random()}`,
      courseName: course.name || course.courseName || '',
      creditHours: course.creditHours || 3,
      grades: {} // Empty grades for all students
    }))

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-content-primary mb-1">
            GPA Calculator for Others
          </h3>
          <p className="text-xs sm:text-sm text-content-secondary">
            Calculate GPA for multiple students with shared courses
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAutoImportCourses}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg font-medium transition-all text-xs sm:text-sm"
            title="Import courses from My Courses"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Auto Import</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={handleAddStudent}
            disabled={students.length >= 20}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
              students.length >= 20
                ? 'bg-dark-surface-raised text-content-tertiary cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-dark-surface-raised hover:bg-dark-surface-hover text-content-secondary hover:text-accent rounded-lg font-medium transition-all text-xs sm:text-sm border border-dark-border"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table Container - Horizontal Scroll */}
      <div className="overflow-x-auto bg-dark-surface-raised rounded-xl border border-dark-border">
        <div className="min-w-max">
          {/* Table Header */}
          <div className="flex border-b border-dark-border bg-dark-surface/50 sticky top-0 z-10">
            {/* Course Name Column */}
            <div className="w-48 sm:w-64 p-3 border-r border-dark-border flex-shrink-0">
              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide">Course Name</p>
            </div>

            {/* Credit Hours Column */}
            <div className="w-24 p-3 border-r border-dark-border flex-shrink-0">
              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide text-center">Credits</p>
            </div>

            {/* Student Grade Columns */}
            {students.map((student, index) => (
              <div key={student.id} className="w-32 sm:w-40 p-3 border-r border-dark-border flex-shrink-0">
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={student.name}
                    onChange={(e) => handleUpdateStudentName(student.id, e.target.value)}
                    placeholder={`Student ${index + 1}`}
                    className="w-full bg-transparent border-none text-xs font-semibold text-content-primary placeholder:text-content-tertiary focus:outline-none text-center"
                  />
                  {students.length > 1 && (
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="w-full px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-[10px] text-red-400 font-medium transition-all flex items-center justify-center gap-1"
                      title="Remove student"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Actions Column Header */}
            <div className="w-20 p-3 flex-shrink-0">
              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide text-center">Actions</p>
            </div>
          </div>

          {/* Course Rows */}
          {courses.map((course, courseIndex) => (
            <div key={course.id} className="flex border-b border-dark-border/50 hover:bg-dark-surface/30 transition-colors">
              {/* Course Name */}
              <div className="w-48 sm:w-64 p-3 border-r border-dark-border/50 flex-shrink-0">
                <input
                  type="text"
                  value={course.courseName}
                  onChange={(e) => handleUpdateCourse(course.id, 'courseName', e.target.value)}
                  placeholder={`Course ${courseIndex + 1}`}
                  className="w-full bg-dark-surface border border-dark-border rounded px-2.5 py-1.5 text-xs text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all"
                />
              </div>

              {/* Credit Hours */}
              <div className="w-24 p-3 border-r border-dark-border/50 flex-shrink-0">
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={course.creditHours}
                  onChange={(e) => handleUpdateCourse(course.id, 'creditHours', parseInt(e.target.value) || 1)}
                  className="w-full bg-dark-surface border border-dark-border rounded px-2.5 py-1.5 text-xs text-content-primary text-center focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all"
                />
              </div>

              {/* Grade for each student */}
              {students.map((student) => (
                <div key={student.id} className="w-32 sm:w-40 p-3 border-r border-dark-border/50 flex-shrink-0">
                  <select
                    value={course.grades?.[student.id] || ''}
                    onChange={(e) => handleUpdateGrade(course.id, student.id, e.target.value)}
                    className="w-full bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/50 transition-all"
                  >
                    <option value="">Grade</option>
                    {GRADE_SCALE.map((g) => (
                      <option key={g.grade} value={g.grade}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Delete Course Button - Always visible in Actions column */}
              <div className="w-20 p-3 flex-shrink-0 flex items-center justify-center">
                {courses.length > 1 && (
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete course"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Course Button Row */}
          <div className="flex border-b border-dark-border/50">
            <div className="w-full p-3">
              <button
                onClick={handleAddCourse}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-dark-surface border border-dashed border-dark-border hover:border-accent/50 hover:bg-dark-surface-hover text-content-secondary hover:text-accent rounded-lg transition-all text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Course</span>
              </button>
            </div>
          </div>

          {/* GPA Results Row */}
          <div className="flex bg-accent/5 border-t-2 border-accent/30">
            {/* Label */}
            <div className="w-48 sm:w-64 p-3 border-r border-dark-border/50 flex-shrink-0 flex items-center">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-accent" />
                <p className="text-sm font-bold text-content-primary">GPA</p>
              </div>
            </div>

            {/* Empty Credits Column */}
            <div className="w-24 p-3 border-r border-dark-border/50 flex-shrink-0" />

            {/* Student GPAs */}
            {students.map((student) => {
              const gpa = calculateStudentGPA(student.id)
              const gpaColor = getGPAColor(gpa)

              return (
                <div key={student.id} className="w-32 sm:w-40 p-3 border-r border-dark-border/50 flex-shrink-0">
                  <div className={`px-3 py-2 rounded-lg ${gpaColor.bgColor} border ${gpaColor.borderColor}`}>
                    <p className={`text-lg font-bold ${gpaColor.color} text-center tabular-nums`}>
                      {formatGPA(gpa)}
                    </p>
                    <p className={`text-[10px] ${gpaColor.color} text-center font-medium mt-0.5`}>
                      {gpaColor.label}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Empty Actions column for alignment */}
            <div className="w-20 p-3 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Info Footer */}
      <div className="flex items-start gap-2 p-3 bg-accent/5 border border-accent/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs text-content-secondary">
          This calculator is independent from your semester GPAs. Calculations are saved automatically and won't affect your CGPA. Use horizontal scroll to view all students.
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

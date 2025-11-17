import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { BookOpen, Calendar, AlertCircle, CheckCircle2, Plus, Trash2, Edit } from 'lucide-react'
import TimetableSelector from './TimetableSelector'
import CourseForm from './CourseForm'
import ConfirmModal from '../shared/ConfirmModal'
import SemesterSelector from '../shared/SemesterSelector'

export default function CoursesView() {
  const { courses, deleteCourse, deleteAllCourses, updateCourse, addCourse } = useApp()
  const [showTimetableSelector, setShowTimetableSelector] = useState(false)
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState(null)

  const handleEditCourse = (course) => {
    setEditingCourse(course)
    setShowCourseForm(true)
  }

  const handleDeleteCourse = (course) => {
    setCourseToDelete(course)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteCourse = () => {
    if (courseToDelete) {
      deleteCourse(courseToDelete.id)
      setCourseToDelete(null)
    }
  }

  const handleDeleteAll = () => {
    setShowDeleteAllConfirm(true)
  }

  const confirmDeleteAll = () => {
    deleteAllCourses()
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {courses.length === 0 ? (
          // Welcome Screen - No Courses Yet
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/5 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-accent/10">
              <BookOpen className="w-10 h-10 text-accent" />
            </div>

            <h2 className="text-2xl font-bold text-content-primary mb-2">
              Select Your Courses
            </h2>
            <p className="text-lg font-semibold text-accent mb-4">
              Step 1: Build Your Schedule
            </p>

            <p className="text-content-secondary leading-relaxed mb-8 max-w-md">
              Start by selecting courses from your FAST NUCES timetable.
              We'll automatically set up your schedule and attendance tracking.
            </p>

            {/* Feature List */}
            <div className="grid gap-4 mb-8 w-full max-w-md">
              <div className="flex items-start gap-3 bg-dark-card p-4 rounded-xl border border-dark-border">
                <div className="p-1.5 bg-blue-500/10 rounded-lg mt-0.5 flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-content-primary">Select from Timetable</p>
                  <p className="text-xs text-content-tertiary">Choose your section, import all courses instantly</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-dark-card p-4 rounded-xl border border-dark-border">
                <div className="p-1.5 bg-purple-500/10 rounded-lg mt-0.5 flex-shrink-0">
                  <Calendar className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-content-primary">Configure Dates</p>
                  <p className="text-xs text-content-tertiary">Set semester dates or choose quick presets</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-dark-card p-4 rounded-xl border border-dark-border">
                <div className="p-1.5 bg-green-500/10 rounded-lg mt-0.5 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-content-primary">Auto Setup</p>
                  <p className="text-xs text-content-tertiary">Timetable and attendance tracking ready instantly</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-md">
              <button
                onClick={() => setShowTimetableSelector(true)}
                className="px-8 py-4 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-white rounded-xl font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-200 flex items-center justify-center gap-3 text-base"
              >
                <BookOpen className="w-5 h-5" />
                Select from Timetable
              </button>

              <button
                onClick={() => setShowCourseForm(true)}
                className="px-8 py-4 bg-dark-card border-2 border-dark-border hover:border-accent/50 text-content-primary rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 text-base hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Add Course Manually
              </button>
            </div>

            <p className="text-xs text-content-tertiary mt-6 text-center">
              Plan Smart. Take Leaves. Chill at Home. Still Hit 80%.
            </p>
          </div>
        ) : (
          // Course List - Courses Already Added
          <div>
            {/* Semester Selector */}
            <div className="mb-4">
              <SemesterSelector compact={true} />
            </div>

            {/* Header with Actions */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-content-primary mb-2">
                  Your Courses
                </h2>
                <p className="text-content-secondary text-sm">
                  {courses.length} {courses.length === 1 ? 'course' : 'courses'} selected for this semester
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTimetableSelector(true)}
                  className="px-3 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/20 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add More</span>
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>
              </div>
            </div>

            {/* Success Message */}
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-400 mb-1">
                  Courses Imported Successfully!
                </p>
                <p className="text-xs text-content-secondary">
                  Your timetable and attendance tracking are ready.
                  Switch to <span className="font-medium text-accent">Timetable</span> to view your schedule
                  or <span className="font-medium text-accent">Attendance</span> to track absences.
                </p>
              </div>
            </div>

            {/* Course Cards */}
            <div className="grid gap-3 mb-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-dark-card rounded-xl p-4 border border-dark-border hover:border-accent/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-content-primary mb-1">
                        {course.name}
                      </h3>
                      {course.courseCode && (
                        <p className="text-xs text-content-tertiary font-mono">
                          {course.courseCode}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="p-2 bg-dark-bg hover:bg-accent/10 text-content-secondary hover:text-accent rounded-lg transition-all"
                        title="Edit course"
                        aria-label="Edit course"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="p-2 bg-dark-bg hover:bg-red-500/10 text-content-secondary hover:text-red-400 rounded-lg transition-all"
                        title="Delete course"
                        aria-label="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: course.color?.hex || '#3B82F6' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {course.instructor && (
                      <div>
                        <p className="text-content-tertiary">Instructor</p>
                        <p className="text-content-primary font-medium">{course.instructor}</p>
                      </div>
                    )}
                    {course.creditHours && (
                      <div>
                        <p className="text-content-tertiary">Credit Hours</p>
                        <p className="text-content-primary font-medium">{course.creditHours}</p>
                      </div>
                    )}
                    {course.room && (
                      <div>
                        <p className="text-content-tertiary">Room</p>
                        <p className="text-content-primary font-medium">{course.room}</p>
                      </div>
                    )}
                    {course.schedule && course.schedule.length > 0 && (
                      <div>
                        <p className="text-content-tertiary">Days</p>
                        <p className="text-content-primary font-medium">
                          {course.schedule.map(s => s.day.slice(0, 3)).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-content-primary font-medium mb-1">
                  Need to modify your courses?
                </p>
                <p className="text-content-secondary text-xs">
                  To change courses or add more sections, you can clear your current selection
                  and reimport from the timetable.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timetable Selector Modal */}
      {showTimetableSelector && (
        <TimetableSelector
          onCoursesSelected={() => {
            setShowTimetableSelector(false)
          }}
          onClose={() => setShowTimetableSelector(false)}
          showManualOption={true}
        />
      )}

      {/* Course Form Modal */}
      {showCourseForm && (
        <CourseForm
          existingCourse={editingCourse}
          onClose={() => {
            setShowCourseForm(false)
            setEditingCourse(null)
          }}
          onSave={() => {
            setShowCourseForm(false)
            setEditingCourse(null)
          }}
        />
      )}

      {/* Delete Course Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setCourseToDelete(null)
          }}
          onConfirm={confirmDeleteCourse}
          title="Delete Course"
          message={
            courseToDelete
              ? `Are you sure you want to delete "${courseToDelete.name}"? This will also remove all attendance records for this course. This action cannot be undone.`
              : 'Are you sure you want to delete this course?'
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}

      {/* Delete All Courses Confirmation Modal */}
      {showDeleteAllConfirm && (
        <ConfirmModal
          isOpen={showDeleteAllConfirm}
          onClose={() => setShowDeleteAllConfirm(false)}
          onConfirm={confirmDeleteAll}
          title="Delete All Courses"
          message={`Are you sure you want to delete all ${courses.length} courses? This will also remove all attendance records. This action cannot be undone.`}
          confirmText="Delete All"
          cancelText="Cancel"
          variant="danger"
          requiresTyping={true}
          confirmationText="DELETE ALL"
        />
      )}
    </div>
  )
}

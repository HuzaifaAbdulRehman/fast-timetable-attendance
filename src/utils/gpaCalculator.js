/**
 * GPA Calculator Utilities
 * Based on FAST NUCES Grading Scale
 */

// FAST NUCES Grade Scale (11 grades)
export const GRADE_SCALE = [
  { grade: 'A+', points: 4.0, label: 'A+ (4.0)' },
  { grade: 'A', points: 4.0, label: 'A (4.0)' },
  { grade: 'A-', points: 3.67, label: 'A- (3.67)' },
  { grade: 'B+', points: 3.33, label: 'B+ (3.33)' },
  { grade: 'B', points: 3.0, label: 'B (3.0)' },
  { grade: 'B-', points: 2.67, label: 'B- (2.67)' },
  { grade: 'C+', points: 2.33, label: 'C+ (2.33)' },
  { grade: 'C', points: 2.0, label: 'C (2.0)' },
  { grade: 'C-', points: 1.67, label: 'C- (1.67)' },
  { grade: 'D+', points: 1.33, label: 'D+ (1.33)' },
  { grade: 'D', points: 1.0, label: 'D (1.0)' }
]

/**
 * Get grade points for a given letter grade
 * @param {string} grade - Letter grade (e.g., 'A+', 'B', 'C-')
 * @returns {number} - Grade points (e.g., 4.0, 3.0, 1.67)
 */
export function getGradePoints(grade) {
  if (!grade) return 0
  const gradeObj = GRADE_SCALE.find(g => g.grade === grade.toUpperCase())
  return gradeObj ? gradeObj.points : 0
}

/**
 * Calculate GPA for a list of courses
 * Formula: (sum of grade points × credit hours) / total credit hours
 * @param {Array} courses - Array of {courseName, creditHours, grade}
 * @returns {number} - GPA rounded to 2 decimal places
 */
export function calculateGPA(courses) {
  if (!courses || courses.length === 0) return 0

  const validCourses = courses.filter(c => c.grade && c.creditHours > 0)
  if (validCourses.length === 0) return 0

  const totalQualityPoints = validCourses.reduce((sum, course) => {
    const gradePoints = getGradePoints(course.grade)
    return sum + (gradePoints * course.creditHours)
  }, 0)

  const totalCredits = validCourses.reduce((sum, course) => sum + course.creditHours, 0)

  if (totalCredits === 0) return 0

  return Math.round((totalQualityPoints / totalCredits) * 100) / 100
}

/**
 * Calculate CGPA (Cumulative GPA) from all semesters
 * Formula: (Total Quality Points across all semesters) / (Total Credit Hours across all semesters)
 * This gives a weighted CGPA based on credit hours
 * @param {Array} semesters - Array of semester objects with {gpa, totalCredits, courses}
 * @returns {number} - CGPA rounded to 2 decimal places
 */
export function calculateCGPA(semesters) {
  if (!semesters || semesters.length === 0) return 0

  const validSemesters = semesters.filter(s => s.gpa > 0 && s.totalCredits > 0)
  if (validSemesters.length === 0) return 0

  // Calculate weighted CGPA: sum(GPA × Credits) / sum(Credits)
  const totalQualityPoints = validSemesters.reduce((sum, semester) => {
    return sum + (semester.gpa * semester.totalCredits)
  }, 0)

  const totalCredits = validSemesters.reduce((sum, semester) => {
    return sum + semester.totalCredits
  }, 0)

  if (totalCredits === 0) return 0

  return Math.round((totalQualityPoints / totalCredits) * 100) / 100
}

/**
 * Get color class based on GPA value
 * Green (3.5-4.0): Excellent
 * Blue (3.0-3.49): Good
 * Orange (2.5-2.99): Average
 * Red (<2.5): Needs Improvement
 * @param {number} gpa - GPA value
 * @returns {Object} - {color, bgColor, borderColor, label}
 */
export function getGPAColor(gpa) {
  if (gpa >= 3.5) {
    return {
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      label: 'Excellent'
    }
  } else if (gpa >= 3.0) {
    return {
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      label: 'Good'
    }
  } else if (gpa >= 2.5) {
    return {
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      label: 'Average'
    }
  } else if (gpa > 0) {
    return {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      label: 'Needs Improvement'
    }
  } else {
    return {
      color: 'text-content-tertiary',
      bgColor: 'bg-dark-surface',
      borderColor: 'border-dark-border',
      label: 'No grades yet'
    }
  }
}

/**
 * Validate grade input
 * @param {string} grade - Letter grade
 * @returns {boolean} - True if valid grade
 */
export function isValidGrade(grade) {
  if (!grade) return false
  return GRADE_SCALE.some(g => g.grade === grade.toUpperCase())
}

/**
 * Get total credit hours from courses
 * @param {Array} courses - Array of course objects
 * @returns {number} - Total credit hours
 */
export function getTotalCredits(courses) {
  if (!courses || courses.length === 0) return 0
  return courses.reduce((sum, course) => sum + (course.creditHours || 0), 0)
}

/**
 * Format GPA for display (2 decimal places)
 * @param {number} gpa - GPA value
 * @returns {string} - Formatted GPA string
 */
export function formatGPA(gpa) {
  if (!gpa || gpa === 0) return '0.00'
  return gpa.toFixed(2)
}

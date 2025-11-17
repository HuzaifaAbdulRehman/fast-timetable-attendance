// FAST NUCES Timetable CSV Parser
// Converts room-based CSV format to section-based course catalog

// Course code to full name mapping
const COURSE_NAMES = {
  'DAA': 'Design & Analysis of Algorithms',
  'DBS': 'Database Systems',
  'SDA': 'Software Design & Architecture',
  'CN': 'Computer Networks',
  'TBW': 'Technical & Business Writing',
  'COAL': 'Computer Organization & Assembly Language',
  'DS': 'Data Structures',
  'TOA': 'Theory of Automata',
  'AP': 'Applied Physics',
  'Discrete': 'Discrete Mathematics',
  'IS': 'Information Security',
  'OOP': 'Object Oriented Programming',
  'PF': 'Programming Fundamentals',
  'ICT': 'Information & Communication Technologies',
  'LA': 'Linear Algebra',
  'Calculus': 'Calculus',
  'DLD': 'Digital Logic Design',
  'CAL': 'Computer Architecture & Logic Design',
  'OS': 'Operating Systems',
  'SE': 'Software Engineering',
  'AI': 'Artificial Intelligence',
  'ML': 'Machine Learning',
  'NLP': 'Natural Language Processing',
  'CV': 'Computer Vision',
  'Web': 'Web Technologies',
  'Mobile': 'Mobile Application Development',
  'Cloud': 'Cloud Computing',
  'Cyber': 'Cyber Security'
}

// Time slots mapping (based on your CSV)
const TIME_SLOTS = {
  1: '08:00-08:50',
  2: '08:55-09:45',
  3: '09:50-10:40',
  4: '10:45-11:35',
  5: '11:40-12:30',
  6: '12:35-13:25',
  7: '13:30-14:20',
  8: '14:25-15:15',
  9: '15:20-16:05'
}

/**
 * Parse a single cell entry from FAST NUCES timetable
 * Format: "COURSE_CODE SECTION\nInstructor Name"
 * Example: "DAA BCS-5B\nFahad Sherwani"
 */
function parseCellEntry(cellText, room, day, slotNumber) {
  if (!cellText || cellText.trim() === '' || cellText.toLowerCase().includes('reserved')) {
    return null
  }

  const lines = cellText.split('\n').map(l => l.trim()).filter(l => l)
  if (lines.length === 0) return null

  const firstLine = lines[0]
  const instructor = lines[1] || 'TBA'

  // Extract course code and section
  // Pattern: "COURSE_CODE SECTION" or "COURSE_CODE PROGRAM-SECTION"
  const match = firstLine.match(/^([A-Z]+)\s+([A-Z]+-?\d+[A-Z]?)/)

  if (!match) return null

  const courseCode = match[1]
  const section = match[2]

  return {
    courseCode,
    courseName: COURSE_NAMES[courseCode] || courseCode,
    section: section.toUpperCase(),
    instructor: instructor.trim(),
    room: room.trim(),
    day,
    timeSlot: TIME_SLOTS[slotNumber] || `Slot ${slotNumber}`,
    slotNumber
  }
}

/**
 * Parse FAST NUCES timetable CSV for a single day
 * @param {string} csvText - Raw CSV content
 * @param {string} day - Day name (Monday, Tuesday, etc.)
 * @returns {Array} - Array of parsed course entries
 */
export function parseDayTimetable(csvText, day) {
  const entries = []
  const lines = csvText.split('\n')

  // Skip first 4 lines (header, slots, time, CLASSROOMS)
  let currentRoom = ''

  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Split by comma, but handle quoted fields with newlines
    const columns = parseCSVLine(line)

    if (columns.length === 0) continue

    // First column is room name
    const roomName = columns[0]?.trim()
    if (roomName && roomName !== '') {
      currentRoom = roomName
    }

    // Process each slot (columns 1-9)
    for (let slot = 1; slot <= 9; slot++) {
      const cellText = columns[slot]
      if (!cellText) continue

      const entry = parseCellEntry(cellText, currentRoom, day, slot)
      if (entry) {
        entries.push(entry)
      }
    }
  }

  return entries
}

/**
 * Parse CSV line handling quoted fields with newlines
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current) // Add last field
  return result
}

/**
 * Group courses by section
 * @param {Array} entries - Array of course entries
 * @returns {Object} - Courses grouped by section
 */
export function groupBySection(entries) {
  const sections = {}

  entries.forEach(entry => {
    if (!sections[entry.section]) {
      sections[entry.section] = []
    }
    sections[entry.section].push(entry)
  })

  return sections
}

/**
 * Parse all 5 day CSVs and combine into one catalog
 * @param {Object} csvFiles - Object with day names as keys and CSV content as values
 * @returns {Object} - Complete timetable catalog grouped by section
 */
export function parseTimetable(csvFiles) {
  const allEntries = []

  // Parse each day
  Object.entries(csvFiles).forEach(([day, csvContent]) => {
    const dayEntries = parseDayTimetable(csvContent, day)
    allEntries.push(...dayEntries)
  })

  // Group by section
  const sections = groupBySection(allEntries)

  // Calculate credit hours for each course (count unique days)
  Object.values(sections).forEach(courses => {
    courses.forEach(course => {
      const sameCourse = courses.filter(c => c.courseCode === course.courseCode)
      const uniqueDays = new Set(sameCourse.map(c => c.day))
      course.creditHours = uniqueDays.size
    })
  })

  return sections
}

/**
 * Convert day string to weekday number
 */
export function dayToWeekday(day) {
  const mapping = {
    'SUNDAY': 0,
    'MONDAY': 1,
    'TUESDAY': 2,
    'WEDNESDAY': 3,
    'THURSDAY': 4,
    'FRIDAY': 5,
    'SATURDAY': 6
  }
  return mapping[day.toUpperCase()] ?? 1
}

/**
 * Get unique sections from timetable
 */
export function getAllSections(timetable) {
  return Object.keys(timetable).sort()
}

/**
 * Search courses by section
 */
export function getCoursesBySection(timetable, section) {
  const sectionUpper = section.toUpperCase().trim()
  return timetable[sectionUpper] || []
}

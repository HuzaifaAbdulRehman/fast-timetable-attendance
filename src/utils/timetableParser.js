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
  'Cyber': 'Cyber Security',
  // Lab courses
  'CN Lab': 'Computer Networks Lab',
  'DBS Lab': 'Database Systems Lab',
  'COAL Lab': 'Computer Organization & Assembly Language Lab',
  'DS Lab': 'Data Structures Lab',
  'PF Lab': 'Programming Fundamentals Lab',
  'ICT Lab': 'ICT Lab',
  'DS-Lab': 'Data Structures Lab',
  'BE Lab': 'Business Economics Lab',
  'DF Lab': 'Digital Forensics Lab',
  'FE Lab': 'Functional English Lab',
  'Eng-1 Lab': 'English Lab',
  'IT in Business lab': 'IT in Business Lab',
  'Intro to D. Sci Lab': 'Introduction to Data Science Lab',
  'Electrical Network Analysis lab': 'Electrical Network Analysis Lab',
  'Object Oriented Data Structures lab': 'Object Oriented Data Structures Lab',
  'Computer Architecture lab': 'Computer Architecture Lab',
  'Applied Physics lab': 'Applied Physics Lab',
  'Analog and Digital Communication lab': 'Analog and Digital Communication Lab',
  'AML Lab': 'Applied Machine Learning Lab',
  'OOP Lab': 'Object Oriented Programming Lab',
  'DLD Lab': 'Digital Logic Design Lab',
  'PAI Lab': 'Probability and Inference Lab',
  'OS Lab': 'Operating Systems Lab',
  'SCD Lab': 'Software Construction & Development Lab',
  'SSD Lab': 'System & Software Design Lab',
  'CV Lab': 'Computer Vision Lab',
  'FA Lab': 'Financial Accounting Lab',
  'FM Lab': 'Financial Management Lab',
  'ML Lab': 'Machine Learning Lab',
  'DCNet lab': 'Data Communication & Networking Lab',
  'ENA lab': 'Electrical Network Analysis Lab',
  'Electronic Devices and Circuits lab': 'Electronic Devices and Circuits Lab',
  'Engineering Drawing lab': 'Engineering Drawing Lab',
  'Application of ICT lab': 'Application of ICT Lab',
  'MPI lab': 'Microprocessor Interfacing Lab',
  'ICT lab': 'ICT Lab',
  'PF lab': 'Programming Fundamentals Lab',
  'IOOP-Lab': 'Introduction to OOP Lab',
  'DAB2 lAB': 'Database Systems 2 Lab',
  'DS&BA Lab': 'Data Structures & Business Analytics Lab',
  // Additional courses
  'Intro to D. Sci': 'Introduction to Data Science',
  'Intro. to SE': 'Introduction to Software Engineering',
  'Applied Physics': 'Applied Physics',
  'Cyber Security': 'Cyber Security',
  'Eng-1': 'Functional English',
  'IST / UoS': 'Introduction to Information Systems',
  'IT in Business': 'IT in Business',
  'Entrep': 'Entrepreneurship',
  'GenAI': 'Generative AI',
  'Macro Eco': 'Macroeconomics',
  'Psych': 'Psychology',
  'Socio': 'Sociology',
  'KRR': 'Knowledge Representation & Reasoning',
  'KKR': 'Knowledge Representation',
  'SQE': 'Software Quality Engineering',
  'SSD': 'System & Software Design',
  'PDC': 'Parallel & Distributed Computing',
  'NLP': 'Natural Language Processing',
  'OR': 'Operations Research',
  'OODS': 'Object Oriented Data Structures',
  'MVC': 'Multivariable Calculus',
  'MPI': 'Microprocessor Interfacing',
  'HRM': 'Human Resource Management',
  'GT': 'Graph Theory',
  'FOM': 'Fundamentals of Management',
  'FSPM': 'Fundamentals of Project Management',
  'FM': 'Financial Management',
  'FA': 'Financial Accounting',
  'Ethics': 'Ethics',
  'ENG': 'English',
  'EM': 'Engineering Mathematics',
  'EMT': 'Electromagnetic Theory',
  'ENA': 'Electrical Network Analysis',
  'EDC': 'Electronic Devices & Circuits',
  'Enter': 'Entrepreneurship',
  'DCNet': 'Data Communication & Networking',
  'DCB': 'Database Concepts',
  'DAB2': 'Database Systems 2',
  'DSA': 'Data Structures & Algorithms',
  'DLP': 'Deep Learning Projects',
  'BM1': 'Business Mathematics 1',
  'BM2': 'Business Mathematics 2',
  'AML': 'Applied Machine Learning',
  'AT': 'Antenna Theory',
  'ADC': 'Analog & Digital Communication',
  'AC': 'Applied Calculus',
  'CA': 'Computer Architecture',
  'CB': 'Consumer Behavior',
  'CCE': 'Computer Communication & Electronics',
  'CT': 'Coding Theory',
  'CV': 'Computer Vision',
  'CVT': 'Computer Vision Techniques',
  'C. Const.': 'Constitutional Law',
  'BF': 'Business Finance',
  'EIS': 'Enterprise Information Systems',
  'FOA': 'Foundations of Algorithms',
  'ICC': 'Introduction to Cloud Computing',
  'IA': 'Information Assurance',
  'IOOP': 'Introduction to Object Oriented Programming',
  'ME': 'Managerial Economics',
  'MFM': 'Mathematical Foundations',
  'MM': 'Marketing Management',
  'NC': 'Neural Computing',
  'OHS': 'Occupational Health & Safety',
  'POE': 'Principles of Economics',
  'PPIT': 'Pakistan & International Trade',
  'PST': 'Probability & Statistics',
  'PFB': 'Programming Fundamentals - Business',
  'RS': 'Recommender Systems',
  'SCD': 'Software Construction & Development',
  'ST': 'Software Testing',
  'UoS': 'Understanding of Self',
  'WP': 'Web Programming'
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
 * Example: "DAA BCS-5B\nFahad Sherwani" or "CN Lab BCS-5F\nSameer Faisal"
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
  // Pattern supports:
  // 1. Regular courses: "DAA BCS-5B"
  // 2. Lab courses: "CN Lab BCS-5F"
  // 3. Multi-word courses: "Intro to D. Sci Lab BDS-3A"
  // 4. Hyphenated courses: "DS-Lab BDS-3B"
  // Strategy: Match everything before the section pattern as the course code
  const sectionMatch = firstLine.match(/\s+([A-Z]{2,}[A-Z]?-?\d+[A-Z]{0,2})(?:\s|$)/)

  if (!sectionMatch) return null

  const section = sectionMatch[1]
  const sectionStartIndex = sectionMatch.index

  // Everything before the section is the course code
  const courseCode = firstLine.substring(0, sectionStartIndex).trim()

  if (!courseCode) return null

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

  // Parse entire CSV respecting quoted fields
  const rows = parseCSV(csvText)

  // Skip first 4 rows (header, slots, time, CLASSROOMS)
  let currentRoom = ''

  for (let i = 4; i < rows.length; i++) {
    const columns = rows[i]

    if (columns.length === 0) continue

    // First column is room name
    const roomName = columns[0]?.trim()
    if (roomName && roomName !== '') {
      currentRoom = roomName
    }

    // Process each slot (columns 1-9), detecting multi-slot LAB sessions
    for (let slot = 1; slot <= 9; slot++) {
      const cellText = columns[slot]
      if (!cellText) continue

      const entry = parseCellEntry(cellText, currentRoom, day, slot)
      if (entry) {
        // Detect multi-slot LAB courses by checking if next 1-2 cells are empty
        // LAB courses typically occupy 2-3 consecutive slots
        let consecutiveEmptySlots = 0
        for (let nextSlot = slot + 1; nextSlot <= Math.min(slot + 2, 9); nextSlot++) {
          if (!columns[nextSlot] || columns[nextSlot].trim() === '') {
            consecutiveEmptySlots++
          } else {
            break // Stop if we hit a non-empty cell
          }
        }

        // If we have 1-2 consecutive empty slots after a LAB course, it's a multi-slot session
        const isLikelyMultiSlot = (entry.courseCode.toLowerCase().includes('lab') ||
                                   entry.courseCode.toLowerCase().includes('lab-')) &&
                                  consecutiveEmptySlots >= 1

        if (isLikelyMultiSlot) {
          // Expand entry to cover empty slots
          const totalSlots = consecutiveEmptySlots + 1 // Current slot + empty slots
          const endSlot = slot + consecutiveEmptySlots
          const endTime = TIME_SLOTS[endSlot]?.split('-')[1] || TIME_SLOTS[slot]?.split('-')[1]

          // Update timeSlot to span all slots
          const startTime = entry.timeSlot.split('-')[0]
          entry.timeSlot = `${startTime}-${endTime}`
          entry.slotCount = totalSlots
        }

        entries.push(entry)
      }
    }
  }

  return entries
}

/**
 * Parse CSV properly handling quoted fields with newlines
 */
function parseCSV(csvText) {
  const rows = []
  const chars = csvText.split('')
  let currentRow = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    const nextChar = chars[i + 1]

    if (char === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell)
      if (currentRow.some(cell => cell.trim() !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else if (char === '\r') {
      // Skip carriage return
      continue
    } else {
      currentCell += char
    }
  }

  // Add last cell and row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell)
    if (currentRow.some(cell => cell.trim() !== '')) {
      rows.push(currentRow)
    }
  }

  return rows
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
 * Merge consecutive time slots for LAB courses
 * @param {Array} sessions - Array of session objects for a single course/day
 * @returns {Array} - Merged sessions with full time ranges
 */
function mergeConsecutiveSlots(sessions) {
  if (sessions.length <= 1) return sessions

  // Sort by slot number
  sessions.sort((a, b) => a.slotNumber - b.slotNumber)

  const merged = []
  let currentGroup = [sessions[0]]

  for (let i = 1; i < sessions.length; i++) {
    const prev = sessions[i - 1]
    const current = sessions[i]

    // Check if consecutive slot (same day and room)
    if (
      current.day === prev.day &&
      current.room === prev.room &&
      current.slotNumber === prev.slotNumber + 1
    ) {
      // Consecutive slot - add to current group
      currentGroup.push(current)
    } else {
      // Not consecutive - merge current group and start new one
      merged.push(mergeSlotGroup(currentGroup))
      currentGroup = [current]
    }
  }

  // Merge final group
  if (currentGroup.length > 0) {
    merged.push(mergeSlotGroup(currentGroup))
  }

  return merged
}

/**
 * Merge a group of consecutive slots into a single session
 * @param {Array} slots - Array of consecutive slot objects
 * @returns {Object} - Merged session with full time range
 */
function mergeSlotGroup(slots) {
  if (slots.length === 1) return slots[0]

  const firstSlot = slots[0]
  const lastSlot = slots[slots.length - 1]

  // Extract start time from first slot and end time from last slot
  const firstTimeSlot = firstSlot.timeSlot // "08:00-08:50"
  const lastTimeSlot = lastSlot.timeSlot   // "09:50-10:40"

  const startTime = firstTimeSlot.split('-')[0] // "08:00"
  const endTime = lastTimeSlot.split('-')[1]     // "10:40"

  return {
    ...firstSlot,
    timeSlot: `${startTime}-${endTime}`, // "08:00-10:40" (full LAB duration)
    slotNumber: firstSlot.slotNumber,     // Keep first slot number
    slotCount: slots.length               // Track how many slots merged
  }
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

  // Aggregate courses by courseCode + section, combining multiple days into sessions array
  Object.keys(sections).forEach(sectionName => {
    const courses = sections[sectionName]
    const courseMap = new Map()

    courses.forEach(entry => {
      const key = `${entry.courseCode}-${entry.section}`

      if (courseMap.has(key)) {
        // Add to existing course's sessions array
        const existingCourse = courseMap.get(key)
        existingCourse.sessions.push({
          day: entry.day,
          timeSlot: entry.timeSlot,
          room: entry.room,
          slotNumber: entry.slotNumber
        })
      } else {
        // Create new course with sessions array
        courseMap.set(key, {
          courseCode: entry.courseCode,
          courseName: entry.courseName,
          section: entry.section,
          instructor: entry.instructor,
          creditHours: 0, // Will be calculated below
          sessions: [{
            day: entry.day,
            timeSlot: entry.timeSlot,
            room: entry.room,
            slotNumber: entry.slotNumber
          }]
        })
      }
    })

    // Convert map to array and merge consecutive slots
    const aggregatedCourses = Array.from(courseMap.values())
    aggregatedCourses.forEach(course => {
      // Group sessions by day for merging
      const sessionsByDay = {}
      course.sessions.forEach(session => {
        if (!sessionsByDay[session.day]) {
          sessionsByDay[session.day] = []
        }
        sessionsByDay[session.day].push(session)
      })

      // Merge consecutive slots for each day
      const mergedSessions = []
      Object.values(sessionsByDay).forEach(daySessions => {
        const merged = mergeConsecutiveSlots(daySessions)
        mergedSessions.push(...merged)
      })

      course.sessions = mergedSessions
      course.creditHours = mergedSessions.length

      // Add backward compatibility fields (first session's data)
      if (course.sessions.length > 0) {
        const firstSession = course.sessions[0]
        course.day = firstSession.day
        course.timeSlot = firstSession.timeSlot
        course.room = firstSession.room
        course.slotNumber = firstSession.slotNumber
      }
    })

    sections[sectionName] = aggregatedCourses
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

/**
 * Course Name Helper Utility
 * Automatically generates short course names/abbreviations from long course names
 */

// Common words to exclude from abbreviation generation
const EXCLUDED_WORDS = new Set([
  'and', 'of', 'the', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'an', 'a',
  '&', '-', '/', '(', ')', 'i', 'ii', 'iii', 'iv', 'v'
])

// Common course name mappings (manual overrides for well-known courses)
const KNOWN_ABBREVIATIONS = {
  'object oriented programming': 'OOP',
  'data structures': 'DS',
  'data structures and algorithms': 'DSA',
  'design and analysis of algorithms': 'DAA',
  'design & analysis of algorithms': 'DAA',
  'database systems': 'DBS',
  'database management systems': 'DBMS',
  'operating systems': 'OS',
  'computer networks': 'CN',
  'software engineering': 'SE',
  'artificial intelligence': 'AI',
  'machine learning': 'ML',
  'deep learning': 'DL',
  'web development': 'WD',
  'web engineering': 'WE',
  'mobile application development': 'MAD',
  'human computer interaction': 'HCI',
  'computer architecture': 'CA',
  'computer organization': 'CO',
  'computer organization and assembly language': 'COAL',
  'digital logic design': 'DLD',
  'discrete mathematics': 'DM',
  'linear algebra': 'LA',
  'calculus': 'CALC',
  'applied calculus': 'AC',
  'probability and statistics': 'P&S',
  'numerical analysis': 'NA',
  'numerical computing': 'NC',
  'information security': 'IS',
  'cyber security': 'CS',
  'software design and architecture': 'SDA',
  'software design & architecture': 'SDA',
  'software quality assurance': 'SQA',
  'software project management': 'SPM',
  'project management': 'PM',
  'professional practices': 'PP',
  'technical writing': 'TW',
  'communication skills': 'CS',
  'english composition': 'EC',
  'pakistan studies': 'PS',
  'islamic studies': 'IS',
  'introduction to computing': 'ITC',
  'introduction to information technology': 'IIT',
  'programming fundamentals': 'PF',
  'application of ict': 'ICT',
  'application of ict lab': 'ICT Lab',
  'applications of ict': 'ICT',
  'applications of ict lab': 'ICT Lab',
  'information and communication technology': 'ICT',
  'theory of automata': 'TOA',
  'compiler construction': 'CC',
  'parallel and distributed computing': 'PDC',
  'cloud computing': 'CC',
  'big data analytics': 'BDA',
  'data mining': 'DM',
  'data warehousing': 'DW',
  'business intelligence': 'BI',
  'enterprise resource planning': 'ERP',
  'management information systems': 'MIS',
  'digital image processing': 'DIP',
  'computer graphics': 'CG',
  'computer vision': 'CV',
  'natural language processing': 'NLP',
  'internet of things': 'IoT',
  'embedded systems': 'ES',
  'real time systems': 'RTS',
  'software testing': 'ST',
  'agile software development': 'ASD',
  'devops': 'DevOps',
  'game development': 'GD',
  'virtual reality': 'VR',
  'augmented reality': 'AR',
  'blockchain': 'BC',
  'cryptography': 'Crypto',
  'network security': 'NS',
  'ethical hacking': 'EH',
  'penetration testing': 'PT',
  'functional english': 'FE',
  'technical and business writing': 'TBW',
  'expository writing': 'EW',
  'multivariate calculus': 'MVC',
  'differential equations': 'DE',
  'complex variables': 'CV',
  'graph theory': 'GT'
}

/**
 * Generate a short name/abbreviation from a course name
 * @param {string} courseName - Full course name
 * @param {string} courseCode - Existing course code (used as fallback)
 * @param {number} maxLength - Maximum length for the short name (default: 8)
 * @returns {string} - Short name/abbreviation
 */
export function generateShortName(courseName, courseCode = '', maxLength = 8) {
  // If no course name provided, try to generate from courseCode itself
  const nameToProcess = courseName || courseCode
  if (!nameToProcess) return 'N/A'

  const normalizedName = nameToProcess.toLowerCase().trim()

  // Check for known abbreviations first
  for (const [fullName, abbr] of Object.entries(KNOWN_ABBREVIATIONS)) {
    if (normalizedName.includes(fullName)) {
      // Check if it's a lab course
      const isLab = normalizedName.includes('lab')
      if (isLab && !abbr.toLowerCase().includes('lab')) {
        return abbr + ' Lab'
      }
      return abbr
    }
  }

  // Remove common suffixes for processing
  let processedName = normalizedName
    .replace(/\s*\(lab\)$/i, '')
    .replace(/\s*lab$/i, '')

  const isLab = normalizedName.includes('lab')

  // Split into words and filter
  const words = processedName
    .replace(/[&\/\-\(\)]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0 && !EXCLUDED_WORDS.has(word.toLowerCase()))

  if (words.length === 0) {
    return nameToProcess.substring(0, maxLength).toUpperCase()
  }

  let shortName = ''

  // Strategy 1: If single word, take first few characters
  if (words.length === 1) {
    shortName = words[0].substring(0, maxLength).toUpperCase()
  }
  // Strategy 2: If 2-3 words, take first letter of each
  else if (words.length <= 3) {
    shortName = words.map(w => w[0]).join('').toUpperCase()
  }
  // Strategy 3: For longer names, take first letter of significant words
  else {
    // Take first letter of first 3-4 significant words
    const significantWords = words.slice(0, 4)
    shortName = significantWords.map(w => w[0]).join('').toUpperCase()
  }

  // Add Lab suffix if needed
  if (isLab && !shortName.toLowerCase().includes('lab')) {
    const labSuffix = shortName.length <= 4 ? ' Lab' : 'L'
    shortName = shortName + labSuffix
  }

  // Ensure it doesn't exceed maxLength
  if (shortName.length > maxLength) {
    shortName = shortName.substring(0, maxLength)
  }

  return shortName || nameToProcess.substring(0, maxLength).toUpperCase()
}

/**
 * Check if a course name needs a short name generated
 * @param {string} courseName - Full course name
 * @param {string} courseCode - Existing course code
 * @param {number} threshold - Length threshold (default: 6)
 * @returns {boolean} - True if short name should be generated
 */
export function needsShortName(courseName, courseCode, threshold = 6) {
  // If courseCode is already short, no need
  if (courseCode && courseCode.length <= threshold) {
    return false
  }

  // If courseName is short, no need
  if (courseName && courseName.length <= threshold) {
    return false
  }

  return true
}

/**
 * Process course data and add shortName field if needed
 * @param {Object} courseData - Course data object
 * @returns {Object} - Course data with shortName added
 */
export function enrichCourseWithShortName(courseData) {
  if (!courseData) return courseData

  const { courseName, courseCode } = courseData

  // Generate short name if course code is long or missing
  if (needsShortName(courseName, courseCode)) {
    const shortName = generateShortName(courseName, courseCode)
    return {
      ...courseData,
      shortName,
      // Also provide the original as displayName if needed
      displayCode: shortName
    }
  }

  return {
    ...courseData,
    shortName: courseCode || courseName?.substring(0, 6) || 'N/A',
    displayCode: courseCode
  }
}

/**
 * Process array of courses and enrich with short names
 * @param {Array} courses - Array of course objects
 * @returns {Array} - Enriched courses array
 */
export function enrichCoursesWithShortNames(courses) {
  if (!Array.isArray(courses)) return courses
  return courses.map(enrichCourseWithShortName)
}

import { useMemo } from 'react'
import { useDebounce } from './useDebounce'

/**
 * Tokenize and normalize search term
 * Removes common prefixes (Dr., Engr., Prof.) and splits into words
 */
function tokenizeSearch(searchTerm) {
  if (!searchTerm) return []

  return searchTerm
    .toLowerCase()
    .replace(/^(dr\.|engr\.|prof\.|ms\.|mr\.|mrs\.)\s*/gi, '') // Remove titles
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .split(/\s+/) // Split by whitespace
    .filter(token => token.length > 0) // Remove empty tokens
}

/**
 * Normalize field value for matching
 */
function normalizeValue(value) {
  if (!value) return ''
  return String(value)
    .toLowerCase()
    .replace(/^(dr\.|engr\.|prof\.|ms\.|mr\.|mrs\.)\s*/gi, '')
}

/**
 * Fuzzy match - checks if search tokens match any field
 */
function fuzzyMatch(searchTokens, classData) {
  if (searchTokens.length === 0) return true // No search = match all

  // All searchable fields (including shortName/abbreviation if exists)
  const searchableFields = [
    classData.courseName,
    classData.courseCode,
    classData.shortName,
    classData.displayCode,
    classData.code,
    classData.abbreviation,
    classData.instructor,
    classData.section,
    classData.day,
    classData.days?.join(' ')
  ]

  // Normalize all field values
  const normalizedFields = searchableFields
    .filter(Boolean)
    .map(normalizeValue)
    .join(' ')

  // Check if ALL search tokens are found somewhere in the fields
  return searchTokens.every(token =>
    normalizedFields.includes(token)
  )
}

/**
 * Advanced search and filtering hook for class exploration
 * @param {Array} classes - Array of all available classes from timetable
 * @param {string} searchTerm - Search query (fuzzy, multi-field)
 * @param {Object} filters - Filter options (section, teacher, room, days, timeRange)
 * @returns {Array} - Filtered and sorted classes
 */
export function useClassSearch(classes, searchTerm, filters = {}) {
  return useMemo(() => {
    if (!classes || classes.length === 0) return []

    let results = [...classes]

    // 1. Fuzzy search filter (multi-field, tokenized)
    if (searchTerm && searchTerm.trim()) {
      const searchTokens = tokenizeSearch(searchTerm)
      results = results.filter(cls => fuzzyMatch(searchTokens, cls))
    }

    // 2. Section filter (primary filter)
    if (filters.section && filters.section !== 'all') {
      results = results.filter(cls =>
        cls.section?.toUpperCase() === filters.section.toUpperCase()
      )
    }

    // 3. Teacher filter
    if (filters.teacher && filters.teacher !== 'all') {
      const teacherNormalized = normalizeValue(filters.teacher)
      results = results.filter(cls =>
        normalizeValue(cls.instructor).includes(teacherNormalized)
      )
    }

    // 4. Room filter
    if (filters.room && filters.room !== 'all') {
      results = results.filter(cls =>
        normalizeValue(cls.room).includes(normalizeValue(filters.room))
      )
    }

    // 5. Day filter (multiple days support)
    if (filters.days && filters.days.length > 0) {
      results = results.filter(cls => {
        if (!cls.days || cls.days.length === 0) return false
        return cls.days.some(day => filters.days.includes(day))
      })
    }

    // 6. Time range filter
    if (filters.timeRange) {
      const { start, end } = filters.timeRange
      results = results.filter(cls => {
        if (!cls.startTime) return true
        const classStart = cls.startTime
        return classStart >= start && classStart <= end
      })
    }

    // 7. Credit hours filter
    if (filters.creditHours && filters.creditHours !== 'all') {
      results = results.filter(cls =>
        cls.creditHours === parseInt(filters.creditHours)
      )
    }

    // 8. Sort results (by course code, then section)
    results.sort((a, b) => {
      const codeCompare = (a.courseCode || '').localeCompare(b.courseCode || '')
      if (codeCompare !== 0) return codeCompare
      return (a.section || '').localeCompare(b.section || '')
    })

    return results
  }, [classes, searchTerm, filters])
}

/**
 * Extract unique filter options from classes array
 * @param {Array} classes - All available classes
 * @returns {Object} - Unique sections, teachers, rooms, days
 */
export function getFilterOptions(classes) {
  if (!classes || classes.length === 0) {
    return { sections: [], teachers: [], rooms: [], days: [] }
  }

  const sections = [...new Set(classes.map(c => c.section).filter(Boolean))].sort()
  const teachers = [...new Set(classes.map(c => c.instructor).filter(Boolean))].sort()
  const rooms = [...new Set(classes.map(c => c.room).filter(Boolean))].sort()

  const daysSet = new Set()
  classes.forEach(c => {
    if (c.days && Array.isArray(c.days)) {
      c.days.forEach(day => daysSet.add(day))
    }
  })
  const days = [...daysSet].sort((a, b) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return dayOrder.indexOf(a) - dayOrder.indexOf(b)
  })

  return { sections, teachers, rooms, days }
}

/**
 * Get highlighted text with search matches
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Search query
 * @returns {Array} - Array of {text, highlight} objects
 */
export function getHighlightedText(text, searchTerm) {
  if (!searchTerm || !text) return [{ text, highlight: false }]

  const tokens = tokenizeSearch(searchTerm)
  if (tokens.length === 0) return [{ text, highlight: false }]

  // Find all matches
  const normalizedText = normalizeValue(text)
  const matches = []

  tokens.forEach(token => {
    let index = normalizedText.indexOf(token)
    while (index !== -1) {
      matches.push({ start: index, end: index + token.length })
      index = normalizedText.indexOf(token, index + 1)
    }
  })

  if (matches.length === 0) return [{ text, highlight: false }]

  // Sort and merge overlapping matches
  matches.sort((a, b) => a.start - b.start)
  const merged = []
  let current = matches[0]

  for (let i = 1; i < matches.length; i++) {
    if (matches[i].start <= current.end) {
      current.end = Math.max(current.end, matches[i].end)
    } else {
      merged.push(current)
      current = matches[i]
    }
  }
  merged.push(current)

  // Build result array
  const result = []
  let lastIndex = 0

  merged.forEach(match => {
    if (match.start > lastIndex) {
      result.push({ text: text.substring(lastIndex, match.start), highlight: false })
    }
    result.push({ text: text.substring(match.start, match.end), highlight: true })
    lastIndex = match.end
  })

  if (lastIndex < text.length) {
    result.push({ text: text.substring(lastIndex), highlight: false })
  }

  return result
}

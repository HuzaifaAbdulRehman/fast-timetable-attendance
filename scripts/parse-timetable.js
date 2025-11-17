// Node.js script to parse all timetable CSVs and generate JSON
// Run by GitHub Actions on CSV upload

const fs = require('fs')
const path = require('path')

// Import parser functions
const { parseTimetable } = require('../src/utils/timetableParser.js')

const TIMETABLE_DIR = path.join(__dirname, '../public/timetable')
const OUTPUT_FILE = path.join(TIMETABLE_DIR, 'timetable.json')

// Day file mapping
const DAY_FILES = {
  'Monday': 'FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - MONDAY.csv',
  'Tuesday': 'FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - TUESDAY.csv',
  'Wednesday': 'FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - WEDNESDAY.csv',
  'Thursday': 'FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - THURSDAY.csv',
  'Friday': 'FAST NUCES - Karachi Campus - FALL 2025 TimeTable (All BS Programs) - FRIDAY.csv'
}

async function main() {
  console.log('🚀 Starting timetable CSV parsing...')

  try {
    // Create timetable directory if it doesn't exist
    if (!fs.existsSync(TIMETABLE_DIR)) {
      fs.mkdirSync(TIMETABLE_DIR, { recursive: true })
      console.log('✅ Created timetable directory')
    }

    // Read all CSV files
    const csvFiles = {}
    let filesFound = 0

    for (const [day, filename] of Object.entries(DAY_FILES)) {
      const filepath = path.join(TIMETABLE_DIR, filename)

      if (fs.existsSync(filepath)) {
        csvFiles[day] = fs.readFileSync(filepath, 'utf-8')
        filesFound++
        console.log(`✅ Loaded ${day} timetable (${filename})`)
      } else {
        console.log(`⚠️  ${day} timetable not found (${filename})`)
      }
    }

    if (filesFound === 0) {
      console.log('❌ No CSV files found. Please upload timetable CSVs.')
      process.exit(1)
    }

    console.log(`\n📊 Parsing ${filesFound} CSV files...`)

    // Parse timetable
    const timetable = parseTimetable(csvFiles)

    // Generate statistics
    const stats = {
      totalSections: Object.keys(timetable).length,
      totalCourses: Object.values(timetable).reduce((sum, courses) => sum + courses.length, 0),
      daysProcessed: filesFound,
      lastUpdated: new Date().toISOString()
    }

    // Save to JSON
    const output = {
      ...stats,
      data: timetable
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))

    console.log('\n✅ Timetable parsed successfully!')
    console.log(`📁 Sections: ${stats.totalSections}`)
    console.log(`📚 Total course entries: ${stats.totalCourses}`)
    console.log(`📅 Days processed: ${stats.daysProcessed}`)
    console.log(`💾 Saved to: ${OUTPUT_FILE}`)

  } catch (error) {
    console.error('❌ Error parsing timetable:', error)
    process.exit(1)
  }
}

main()

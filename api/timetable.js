// Vercel Serverless Function - Timetable API
// Returns parsed timetable data for students to search

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // For now, return empty timetable
    // This will be populated by GitHub Actions after CSV upload
    const timetable = req.query.mock === 'true' ? getMockData() : {}

    res.status(200).json({
      success: true,
      lastUpdated: new Date().toISOString(),
      sections: Object.keys(timetable).length,
      data: timetable
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

// Mock data for testing
function getMockData() {
  return {
    'BCS-5B': [
      {
        courseCode: 'DAA',
        courseName: 'Design & Analysis of Algorithms',
        section: 'BCS-5B',
        instructor: 'Fahad Sherwani',
        room: 'E-1',
        day: 'Monday',
        timeSlot: '08:55-09:45',
        slotNumber: 2,
        creditHours: 3
      },
      {
        courseCode: 'DBS',
        courseName: 'Database Systems',
        section: 'BCS-5B',
        instructor: 'Javeria Farooq',
        room: 'E-2',
        day: 'Monday',
        timeSlot: '11:40-12:30',
        slotNumber: 5,
        creditHours: 3
      }
    ]
  }
}

import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Header from './components/shared/Header'
import TabNavigation from './components/shared/TabNavigation'
import CoursesView from './components/courses/CoursesView'
import TimetableView from './components/timetable/TimetableView'
import AttendanceView from './components/attendance/AttendanceView'
import InstallPrompt from './components/shared/InstallPrompt'
import NotificationPrompt from './components/shared/NotificationPrompt'
import ErrorBoundary from './components/shared/ErrorBoundary'

function AppContent() {
  const [activeTab, setActiveTab] = useState('courses')

  return (
    <div className="min-h-screen bg-dark-bg dark:bg-dark-bg light:bg-gray-50 flex flex-col">
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'courses' && <CoursesView />}
        {activeTab === 'timetable' && <TimetableView />}
        {activeTab === 'attendance' && <AttendanceView />}
      </main>

      {/* Install and notification prompts */}
      <InstallPrompt />
      <NotificationPrompt />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App

import { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Header from './components/shared/Header'
import TabNavigation from './components/shared/TabNavigation'
import CoursesView from './components/courses/CoursesView'
import ExploreClassesView from './components/explore/ExploreClassesView'
import TimetableView from './components/timetable/TimetableView'
import AttendanceView from './components/attendance/AttendanceView'
import GPAView from './components/gpa/GPAView'
import InstallPrompt from './components/shared/InstallPrompt'
import NotificationPrompt from './components/shared/NotificationPrompt'
import ErrorBoundary from './components/shared/ErrorBoundary'
import { clearAllCaches } from './utils/cacheManager'

function AppContent() {
  const [activeTab, setActiveTab] = useState('courses')

  // Global keyboard shortcut: Ctrl+Shift+R to clear all caches
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        const success = clearAllCaches()
        if (success) {
          console.log('✅ All caches cleared! Reload the page to fetch fresh data.')
          alert('Cache cleared successfully!\n\nReload the page (Ctrl+R or F5) to fetch fresh timetable data.')
        } else {
          console.error('❌ Failed to clear caches')
          alert('Failed to clear caches. Please try again.')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-dark-bg dark:bg-dark-bg light:bg-gray-50 flex flex-col w-full overflow-x-hidden" style={{ minWidth: '100%', width: '100%' }}>
      <Header />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className={activeTab === 'courses' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <CoursesView onNavigate={setActiveTab} />
        </div>
        <div className={activeTab === 'explore' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <ExploreClassesView />
        </div>
        <div className={activeTab === 'timetable' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <TimetableView />
        </div>
        <div className={activeTab === 'attendance' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <AttendanceView />
        </div>
        <div className={activeTab === 'gpa' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden'}>
          <GPAView />
        </div>
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

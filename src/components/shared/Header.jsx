import { useState } from 'react'
import { Calendar, Sun, Moon, Settings } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import NotificationSettings from './NotificationSettings'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)

  // Haptic feedback
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  return (
    <>
      <header className="bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 sticky top-0 z-30 w-full" style={{ minWidth: '100%', width: '100%' }}>
        <div className="w-full px-3 sm:px-4 md:px-8 py-3.5 sm:py-4 md:py-5" style={{ minWidth: '100%', width: '100%' }}>
          <div className="flex items-center w-full" style={{ minWidth: '100%', width: '100%' }}>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
              <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/20 flex-shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-accent" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-content-primary leading-tight">
                  <span className="block sm:inline">FAST Course, Timetable &</span>
                  <span className="block sm:inline"> Attendance Tracker</span>
                </div>
                <p className="text-xs sm:text-xs md:text-sm text-content-tertiary hidden sm:block truncate mt-0.5">
                  Course management • Timetable • Attendance • Stay above 80%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
              {/* Settings Button */}
              <button
                onClick={() => {
                  vibrate(10)
                  setShowSettings(true)
                }}
                className="p-2 sm:p-2 md:p-2.5 md:p-3 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent"
                title="Notification settings"
                aria-label="Notification settings"
              >
                <Settings className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 sm:p-2 md:p-2.5 md:p-3 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                ) : (
                  <Moon className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Settings Modal */}
      {showSettings && (
        <NotificationSettings onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}

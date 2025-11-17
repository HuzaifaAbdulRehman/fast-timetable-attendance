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
      <header className="bg-dark-surface/95 backdrop-blur-xl border-b border-dark-border/50 sticky top-0 z-30 shadow-lg w-screen left-0 right-0">
        <div className="w-full px-4 md:px-6 py-3.5 md:py-2.5">
          <div className="flex items-center gap-2 w-full">
            {/* Settings and Theme Toggle Buttons - Left Side */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Settings Button */}
              <button
                onClick={() => {
                  vibrate(10)
                  setShowSettings(true)
                }}
                className="p-1.5 md:p-2 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent"
                title="Notification settings"
                aria-label="Notification settings"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-1.5 md:p-2 rounded-lg bg-dark-surface-raised/50 hover:bg-dark-surface-raised border border-dark-border/30 transition-all text-content-secondary hover:text-accent"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Moon className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </button>
            </div>

            {/* Title Section - Takes Full Remaining Width */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="p-1 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/20 flex-shrink-0">
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm md:text-base font-semibold text-content-primary truncate">
                  FAST Absence & Timetable Tracker
                </div>
                <p className="text-[9px] md:text-[10px] text-content-tertiary truncate hidden sm:block">
                  Track absences • Stay above 80%
                </p>
              </div>
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
